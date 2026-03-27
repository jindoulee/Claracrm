import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { DEMO_USER_ID } from "@/lib/config";

export async function GET() {
  const { data, error } = await supabase
    .from("interactions")
    .select("*, interaction_contacts(contact_id, contacts:contact_id(id, full_name))")
    .eq("user_id", DEMO_USER_ID)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten interaction_contacts join into a simple contacts array
  const flattened = (data ?? []).map(
    (interaction: Record<string, unknown>) => {
      const icJoin = interaction.interaction_contacts as
        | Array<{ contact_id: string; contacts: { id: string; full_name: string } }>
        | undefined;
      const contacts = (icJoin ?? []).map((ic) => ({
        id: ic.contacts.id,
        full_name: ic.contacts.full_name,
      }));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { interaction_contacts, ...rest } = interaction;
      return { ...rest, contacts };
    }
  );

  return NextResponse.json(flattened);
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
