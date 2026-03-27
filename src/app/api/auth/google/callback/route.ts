import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { DEMO_USER_ID } from "@/lib/config";

interface GooglePerson {
  names?: { displayName?: string; givenName?: string; familyName?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string }[];
  organizations?: { name?: string; title?: string }[];
}

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google, exchanges code for token,
 * fetches contacts from People API, and imports them.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  // User denied access or something went wrong
  if (error || !code) {
    return NextResponse.redirect(
      new URL("/contacts?import=cancelled", req.url)
    );
  }

  // Verify state to prevent CSRF
  if (state !== "clara-google-import") {
    return NextResponse.redirect(
      new URL("/contacts?import=error&reason=invalid_state", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/contacts?import=error&reason=not_configured", req.url)
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        new URL("/contacts?import=error&reason=token_failed", req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch contacts from Google People API (paginated)
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
      return NextResponse.redirect(
        new URL("/contacts?import=empty", req.url)
      );
    }

    // 3. Parse Google contacts into our format
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

    // 4. Dedup within batch
    const seen = new Map<string, typeof parsed[0]>();
    for (const c of parsed) {
      const key = c.full_name.toLowerCase().trim() + "|" + (c.email?.toLowerCase() || "");
      if (!seen.has(key)) seen.set(key, c);
    }
    const deduped = Array.from(seen.values());

    // 5. Create import batch
    const { data: batch } = await supabase
      .from("import_batches")
      .insert({
        user_id: DEMO_USER_ID,
        source: "google",
        filename: "Google Contacts",
        total_records: deduped.length,
        status: "processing",
      })
      .select("id")
      .single();

    const batchId = batch?.id;

    // 6. Import contacts (match against existing)
    let imported = 0;
    let skipped = 0;
    let mergeCandidates = 0;

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, full_name, email")
      .eq("user_id", DEMO_USER_ID);

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
        const { data: similar } = await supabase.rpc("find_similar_contacts", {
          search_name: contact.full_name,
          p_user_id: DEMO_USER_ID,
          similarity_threshold: 0.5,
        });
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
          user_id: DEMO_USER_ID,
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
            user_id: DEMO_USER_ID,
            contact_id_a: fuzzyMatchId,
            contact_id_b: newContact.id,
            similarity_score: fuzzyScore,
            import_batch_id: batchId,
          });
          mergeCandidates++;
        }
      }
    }

    // 7. Update batch record
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

    // 8. Redirect back to contacts page with results
    const params = new URLSearchParams({
      import: "success",
      imported: imported.toString(),
      skipped: skipped.toString(),
      merge: mergeCandidates.toString(),
    });

    return NextResponse.redirect(
      new URL(`/contacts?${params.toString()}`, req.url)
    );
  } catch (err) {
    console.error("Google import error:", err);
    return NextResponse.redirect(
      new URL("/contacts?import=error&reason=unknown", req.url)
    );
  }
}
