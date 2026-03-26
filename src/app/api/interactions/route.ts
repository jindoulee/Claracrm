import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { contact_ids, ...interactionData } = body;

  // Create interaction
  const { data: interaction, error } = await supabase
    .from("interactions")
    .insert({
      user_id: DEMO_USER_ID,
      ...interactionData,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Link contacts to interaction
  if (interaction && contact_ids && contact_ids.length > 0) {
    const interactionId = (interaction as Record<string, unknown>).id as string;
    const occurredAt = (interaction as Record<string, unknown>).occurred_at as string;

    const links = contact_ids.map((contactId: string) => ({
      interaction_id: interactionId,
      contact_id: contactId,
    }));

    await supabase.from("interaction_contacts").insert(links);

    // Update last_interaction_at for each contact
    for (const contactId of contact_ids) {
      await supabase
        .from("contacts")
        .update({ last_interaction_at: occurredAt })
        .eq("id", contactId);
    }
  }

  return NextResponse.json(interaction, { status: 201 });
}
