import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { DEMO_USER_ID } from "@/lib/config";
import { parseVCF } from "@/lib/utils/vcf-parser";
import { parseCSV } from "@/lib/utils/csv-parser";
import type { ParsedContact } from "@/lib/utils/vcf-parser";

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  mergeCandidates: number;
  errors: string[];
}

/**
 * Normalize a name for comparison: lowercase, collapse whitespace, trim.
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Dedup within a batch: if two contacts in the import have the same
 * normalized name + email, keep only the first one (most complete).
 */
function dedupBatch(contacts: ParsedContact[]): ParsedContact[] {
  const seen = new Map<string, ParsedContact>();
  for (const c of contacts) {
    const key = normalizeName(c.full_name) + "|" + (c.email?.toLowerCase() || "");
    if (!seen.has(key)) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

/**
 * Import a batch of parsed contacts.
 * - Exact match on name → skip (already exists)
 * - Fuzzy match 0.5-0.85 → import but flag as merge candidate
 * - No match → create new contact
 */
async function importContacts(
  userId: string,
  batchId: string,
  contacts: ParsedContact[]
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: contacts.length,
    imported: 0,
    skipped: 0,
    mergeCandidates: 0,
    errors: [],
  };

  // Load all existing contacts for this user (for matching)
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, full_name, email, phone")
    .eq("user_id", userId);

  const existingContacts = existing || [];
  const existingByName = new Map(
    existingContacts.map((c) => [normalizeName(c.full_name as string), c])
  );

  for (const parsed of contacts) {
    try {
      const normalName = normalizeName(parsed.full_name);

      // 1. Exact name match → skip
      const exactMatch = existingByName.get(normalName);
      if (exactMatch) {
        stats.skipped++;
        continue;
      }

      // 2. Try fuzzy match via the RPC function (if it exists)
      let fuzzyMatch: { id: string; similarity: number } | null = null;
      try {
        const { data: similar } = await supabase.rpc("find_similar_contacts", {
          search_name: parsed.full_name,
          p_user_id: userId,
          similarity_threshold: 0.5,
        });
        if (similar && similar.length > 0) {
          const best = similar[0];
          if (best.similarity >= 0.85) {
            // Very high match — treat as existing, skip
            stats.skipped++;
            continue;
          }
          // Moderate match — import but flag
          fuzzyMatch = { id: best.id, similarity: best.similarity };
        }
      } catch {
        // RPC might not exist yet — that's fine, just skip fuzzy matching
      }

      // 3. Insert the new contact
      const { data: newContact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          full_name: parsed.full_name,
          email: parsed.email,
          phone: parsed.phone,
          company: parsed.company,
          role: parsed.role,
          import_batch_id: batchId,
          relationship_strength: 30, // imported contacts start at "Fading"
        })
        .select("id")
        .single();

      if (insertError || !newContact) {
        stats.errors.push(`Failed to import ${parsed.full_name}: ${insertError?.message}`);
        continue;
      }

      stats.imported++;

      // Add to local lookup so subsequent contacts can match against this batch
      existingByName.set(normalName, {
        id: newContact.id,
        full_name: parsed.full_name,
        email: parsed.email,
        phone: parsed.phone,
      });

      // 4. If fuzzy match was found, create a merge candidate
      if (fuzzyMatch) {
        const { error: mergeErr } = await supabase
          .from("contact_merge_candidates")
          .insert({
            user_id: userId,
            contact_id_a: fuzzyMatch.id,
            contact_id_b: newContact.id,
            similarity_score: fuzzyMatch.similarity,
            import_batch_id: batchId,
          });
        // Unique constraint violation is fine — already flagged
        if (!mergeErr) {
          stats.mergeCandidates++;
        }
      }
    } catch {
      stats.errors.push(`Failed to import ${parsed.full_name}`);
    }
  }

  return stats;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const content = await file.text();
    const filename = file.name.toLowerCase();

    // Detect format and parse
    let parsed: ParsedContact[];
    let parseErrors: string[];

    if (filename.endsWith(".vcf") || filename.endsWith(".vcard")) {
      const result = parseVCF(content);
      parsed = result.contacts;
      parseErrors = result.errors;
    } else if (filename.endsWith(".csv")) {
      const result = parseCSV(content);
      parsed = result.contacts;
      parseErrors = result.errors;
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload a .vcf or .csv file." },
        { status: 400 }
      );
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error: "No contacts found in the file.",
          parseErrors,
        },
        { status: 400 }
      );
    }

    // Dedup within the batch
    const deduped = dedupBatch(parsed);

    // Create import batch record
    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        user_id: DEMO_USER_ID,
        source: filename.endsWith(".csv") ? "csv" : "vcf",
        filename: file.name,
        total_records: deduped.length,
        status: "processing",
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: "Failed to create import batch" },
        { status: 500 }
      );
    }

    // Run the import
    const stats = await importContacts(DEMO_USER_ID, batch.id, deduped);

    // Update batch record with results
    await supabase
      .from("import_batches")
      .update({
        imported: stats.imported,
        skipped: stats.skipped,
        merge_candidates: stats.mergeCandidates,
        status: "completed",
      })
      .eq("id", batch.id);

    return NextResponse.json({
      batchId: batch.id,
      total: stats.total,
      imported: stats.imported,
      skipped: stats.skipped,
      mergeCandidates: stats.mergeCandidates,
      parseErrors,
      importErrors: stats.errors,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to process import" },
      { status: 500 }
    );
  }
}
