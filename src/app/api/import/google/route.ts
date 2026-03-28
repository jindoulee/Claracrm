import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

interface GooglePerson {
  names?: { displayName?: string; givenName?: string; familyName?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string }[];
  organizations?: { name?: string; title?: string }[];
}

/**
 * POST /api/import/google
 * Reads the Google access token from the httpOnly cookie,
 * fetches contacts from People API, and imports them.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  const accessToken = req.cookies.get("google_import_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Google access token found. Please try importing again." },
      { status: 401 }
    );
  }

  try {
    // 1. Fetch contacts from Google People API (paginated)
    const allPeople: GooglePerson[] = [];
    let nextPageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        personFields: "names,emailAddresses,phoneNumbers,organizations",
        pageSize: "1000",
      });
      if (nextPageToken) params.set("pageToken", nextPageToken);

      const peopleRes = await fetch(
        `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!peopleRes.ok) {
        console.error("People API failed:", await peopleRes.text());
        break;
      }

      const peopleData = await peopleRes.json();
      if (peopleData.connections) {
        allPeople.push(...peopleData.connections);
      }
      nextPageToken = peopleData.nextPageToken;
    } while (nextPageToken);

    if (allPeople.length === 0) {
      // Clear the cookie
      const res = NextResponse.json({
        imported: 0,
        skipped: 0,
        mergeCandidates: 0,
        total: 0,
      });
      res.cookies.delete("google_import_token");
      return res;
    }

    // 2. Parse Google contacts into our format
    const parsed = allPeople
      .map((person) => {
        const name =
          person.names?.[0]?.displayName ||
          [person.names?.[0]?.givenName, person.names?.[0]?.familyName]
            .filter(Boolean)
            .join(" ");

        if (!name) return null;

        return {
          full_name: name,
          email: person.emailAddresses?.[0]?.value || null,
          phone: person.phoneNumbers?.[0]?.value || null,
          company: person.organizations?.[0]?.name || null,
          role: person.organizations?.[0]?.title || null,
        };
      })
      .filter(Boolean) as {
        full_name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        role: string | null;
      }[];

    // 3. Dedup within batch
    const seen = new Map<string, (typeof parsed)[0]>();
    for (const c of parsed) {
      const key =
        c.full_name.toLowerCase().trim() + "|" + (c.email?.toLowerCase() || "");
      if (!seen.has(key)) seen.set(key, c);
    }
    const deduped = Array.from(seen.values());

    // 4. Create import batch
    const { data: batch } = await supabase
      .from("import_batches")
      .insert({
        user_id: userId,
        source: "google",
        filename: "Google Contacts",
        total_records: deduped.length,
        status: "processing",
      })
      .select("id")
      .single();

    const batchId = batch?.id;

    // 5. Import contacts (match against existing)
    let imported = 0;
    let skipped = 0;
    let mergeCandidates = 0;

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, full_name, email")
      .eq("user_id", userId);

    const existingByName = new Map(
      (existing || []).map((c) => [
        (c.full_name as string).toLowerCase().trim(),
        c,
      ])
    );

    for (const contact of deduped) {
      const normalName = contact.full_name.toLowerCase().trim();

      // Skip if exact name match exists
      if (existingByName.has(normalName)) {
        skipped++;
        continue;
      }

      // Try fuzzy match
      let fuzzyMatchId: string | null = null;
      let fuzzyScore = 0;
      try {
        const { data: similar } = await supabase.rpc(
          "find_similar_contacts",
          {
            search_name: contact.full_name,
            p_user_id: userId,
            similarity_threshold: 0.5,
          }
        );
        if (similar?.[0]) {
          if (similar[0].similarity >= 0.85) {
            skipped++;
            continue;
          }
          fuzzyMatchId = similar[0].id;
          fuzzyScore = similar[0].similarity;
        }
      } catch {
        // RPC may not exist, continue without fuzzy matching
      }

      // Insert new contact
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          full_name: contact.full_name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          role: contact.role,
          import_batch_id: batchId,
          relationship_strength: 30,
        })
        .select("id")
        .single();

      if (newContact) {
        imported++;
        existingByName.set(normalName, {
          id: newContact.id,
          full_name: contact.full_name,
          email: contact.email,
        });

        // Flag fuzzy match as merge candidate
        if (fuzzyMatchId) {
          await supabase.from("contact_merge_candidates").insert({
            user_id: userId,
            contact_id_a: fuzzyMatchId,
            contact_id_b: newContact.id,
            similarity_score: fuzzyScore,
            import_batch_id: batchId,
          });
          mergeCandidates++;
        }
      }
    }

    // 6. Update batch record
    if (batchId) {
      await supabase
        .from("import_batches")
        .update({
          imported,
          skipped,
          merge_candidates: mergeCandidates,
          status: "completed",
        })
        .eq("id", batchId);
    }

    // 7. Clear the cookie and return results
    const res = NextResponse.json({
      imported,
      skipped,
      mergeCandidates,
      total: deduped.length,
    });
    res.cookies.delete("google_import_token");
    return res;
  } catch (err) {
    console.error("Google import error:", err);
    return NextResponse.json(
      { error: "Import failed. Please try again." },
      { status: 500 }
    );
  }
}
