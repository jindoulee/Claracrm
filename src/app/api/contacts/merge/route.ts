import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { DEMO_USER_ID } from "@/lib/config";

/** GET — list pending merge candidates */
export async function GET() {
  const { data, error } = await supabase
    .from("contact_merge_candidates")
    .select(`
      id,
      similarity_score,
      resolution,
      contact_a:contact_id_a (id, full_name, email, phone, company, role),
      contact_b:contact_id_b (id, full_name, email, phone, company, role)
    `)
    .eq("user_id", DEMO_USER_ID)
    .eq("resolution", "pending")
    .order("similarity_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

/** POST — resolve a merge candidate */
export async function POST(req: NextRequest) {
  const { candidateId, action } = await req.json();

  if (!candidateId || !["merge", "keep_both"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid candidateId or action (merge | keep_both)" },
      { status: 400 }
    );
  }

  // Fetch the candidate
  const { data: candidate, error: fetchErr } = await supabase
    .from("contact_merge_candidates")
    .select("*, contact_a:contact_id_a(*), contact_b:contact_id_b(*)")
    .eq("id", candidateId)
    .single();

  if (fetchErr || !candidate) {
    return NextResponse.json(
      { error: "Merge candidate not found" },
      { status: 404 }
    );
  }

  if (action === "keep_both") {
    // Just mark as resolved
    await supabase
      .from("contact_merge_candidates")
      .update({ resolution: "kept_both", resolved_at: new Date().toISOString() })
      .eq("id", candidateId);

    return NextResponse.json({ success: true, action: "kept_both" });
  }

  // action === "merge"
  // Keep contact_a (the older/existing one), merge contact_b into it
  const keepId = candidate.contact_id_a;
  const mergeId = candidate.contact_id_b;
  const keepContact = candidate.contact_a as Record<string, unknown>;
  const mergeContact = candidate.contact_b as Record<string, unknown>;

  // Fill in missing fields from mergeContact
  const updates: Record<string, unknown> = {};
  for (const field of ["email", "phone", "company", "role"]) {
    if (!keepContact[field] && mergeContact[field]) {
      updates[field] = mergeContact[field];
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("contacts").update(updates).eq("id", keepId);
  }

  // Redirect all references from mergeId → keepId
  await Promise.all([
    supabase
      .from("contact_facts")
      .update({ contact_id: keepId })
      .eq("contact_id", mergeId),
    supabase
      .from("interaction_contacts")
      .update({ contact_id: keepId })
      .eq("contact_id", mergeId),
    supabase
      .from("tasks")
      .update({ contact_id: keepId })
      .eq("contact_id", mergeId),
    supabase
      .from("contact_relationships")
      .update({ contact_id: keepId })
      .eq("contact_id", mergeId),
    supabase
      .from("contact_relationships")
      .update({ related_contact_id: keepId })
      .eq("related_contact_id", mergeId),
  ]);

  // Delete the merged contact
  await supabase.from("contacts").delete().eq("id", mergeId);

  // Mark candidate as resolved
  await supabase
    .from("contact_merge_candidates")
    .update({ resolution: "merged", resolved_at: new Date().toISOString() })
    .eq("id", candidateId);

  // Also resolve any other candidates involving the merged contact
  await supabase
    .from("contact_merge_candidates")
    .update({ resolution: "merged", resolved_at: new Date().toISOString() })
    .or(`contact_id_a.eq.${mergeId},contact_id_b.eq.${mergeId}`)
    .eq("resolution", "pending");

  return NextResponse.json({ success: true, action: "merged", keptId: keepId });
}
