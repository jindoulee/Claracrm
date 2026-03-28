import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";
import { boostRelationshipStrength } from "@/lib/supabase/queries";

/**
 * POST /api/calendar/log
 * Logs a calendar event as an interaction.
 *
 * Body: { eventId, summary, attendeeContactIds, location, occurredAt }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const { eventId, summary, attendeeContactIds, location, occurredAt } = await req.json();

    if (!eventId || !summary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if already logged
    const { data: existing } = await supabase
      .from("interactions")
      .select("id")
      .eq("user_id", userId)
      .eq("calendar_event_id", eventId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Event already logged", id: existing[0].id }, { status: 409 });
    }

    // Create the interaction
    const { data: interaction, error } = await supabase
      .from("interactions")
      .insert({
        user_id: userId,
        interaction_type: "meeting",
        summary,
        occurred_at: occurredAt || new Date().toISOString(),
        sentiment: "neutral",
        location: location || null,
        calendar_event_id: eventId,
        key_topics: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const interactionId = (interaction as Record<string, unknown>).id as string;

    // Link contacts
    const contactIds: string[] = attendeeContactIds || [];
    if (contactIds.length > 0) {
      const links = contactIds.map((contactId: string) => ({
        interaction_id: interactionId,
        contact_id: contactId,
      }));

      await supabase.from("interaction_contacts").insert(links);

      // Update last_interaction_at and boost strength
      for (const contactId of contactIds) {
        await supabase
          .from("contacts")
          .update({ last_interaction_at: occurredAt || new Date().toISOString() })
          .eq("id", contactId);

        try {
          await boostRelationshipStrength(contactId, 12);
        } catch {}
      }
    }

    return NextResponse.json({ id: interactionId, logged: true });
  } catch (error) {
    console.error("Calendar log error:", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
