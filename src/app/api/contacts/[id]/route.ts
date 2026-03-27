import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch facts, relationships, and interactions in parallel
    const [factsRes, relsRes, interactionsRes] = await Promise.all([
      supabase
        .from("contact_facts")
        .select("*")
        .eq("contact_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("contact_relationships")
        .select("*")
        .or(`contact_id.eq.${id},related_contact_id.eq.${id}`),

      supabase
        .from("interaction_contacts")
        .select("interaction_id")
        .eq("contact_id", id),
    ]);

    // Fetch full interaction details if we have any
    let interactions: Record<string, unknown>[] = [];
    const interactionIds = (interactionsRes.data || []).map(
      (ic: Record<string, unknown>) => ic.interaction_id
    );

    if (interactionIds.length > 0) {
      const { data: interactionData } = await supabase
        .from("interactions")
        .select("*")
        .in("id", interactionIds)
        .order("occurred_at", { ascending: false });

      interactions = interactionData || [];
    }

    // For relationships, resolve the related contact names
    const relationships = [];
    for (const rel of relsRes.data || []) {
      const relRecord = rel as Record<string, unknown>;
      const relatedId =
        relRecord.contact_id === id
          ? relRecord.related_contact_id
          : relRecord.contact_id;

      const { data: relatedContact } = await supabase
        .from("contacts")
        .select("id, full_name")
        .eq("id", relatedId)
        .single();

      relationships.push({
        ...relRecord,
        related_name: relatedContact?.full_name || "Unknown",
      });
    }

    return NextResponse.json({
      ...contact,
      facts: factsRes.data || [],
      relationships,
      interactions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = [
      "full_name",
      "company",
      "role",
      "email",
      "phone",
      "notes",
      "tags",
      "nickname",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update contact" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}
