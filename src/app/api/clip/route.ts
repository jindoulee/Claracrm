import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CLARA_CLIP_PROMPT } from "@/lib/ai/prompts";
import {
  findOrCreateContact,
  updateContactFields,
  createInteraction,
  createContactFact,
  createContactRelationship,
  createTask,
  calculateDueDate,
  boostRelationshipStrength,
} from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";
import type { VoiceProcessingResult } from "@/lib/supabase/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "placeholder",
});

/**
 * POST /api/clip
 * Receives clipped web content from the Chrome extension,
 * processes it through AI, and persists the extracted data.
 *
 * Body: { content: string, url: string, title: string, contentType?: string }
 * Auth: Uses the same Supabase session cookie as the main app.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const { content, url, title, contentType } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // Fetch existing contacts for matching
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("id, full_name, nickname")
      .eq("user_id", userId)
      .or("status.eq.active,status.is.null");

    const contactContext = existingContacts?.length
      ? `\n\nExisting contacts in the user's CRM (use these to match mentions):\n${existingContacts.map((c) => `- ${c.full_name}${c.nickname ? ` (aka ${c.nickname})` : ""}`).join("\n")}`
      : "";

    // Process through AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: CLARA_CLIP_PROMPT + contactContext,
        },
        {
          role: "user",
          content: `Please analyze this clipped content and extract all relevant CRM data.\n\nSource: ${url || "unknown"}\nPage title: ${title || "unknown"}\nContent type hint: ${contentType || "auto-detect"}\n\n---\n\n${content.slice(0, 8000)}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    let result: VoiceProcessingResult;

    try {
      result = JSON.parse(text) as VoiceProcessingResult;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Persist data — same pipeline as voice processing
    const dbIds = {
      contactIds: [] as string[],
      interactionId: null as string | null,
      factIds: [] as string[],
      taskIds: [] as string[],
    };

    const contactMap = new Map<string, string>();

    // Resolve contacts
    for (const extracted of result.contacts) {
      const matchResult = await findOrCreateContact(
        userId,
        extracted.name,
        extracted.match_hints
      );
      const contactId = matchResult.contact.id as string;
      contactMap.set(extracted.name, contactId);
      dbIds.contactIds.push(contactId);

      // Apply updates (company, role, etc.)
      if (extracted.updates && Object.keys(extracted.updates).length > 0) {
        const fieldsToUpdate: Record<string, string> = {};
        for (const [key, value] of Object.entries(extracted.updates)) {
          if (!value) continue;
          const existing = matchResult.contact[key] as string | null;
          if (!existing || existing !== value) {
            fieldsToUpdate[key] = value;
          }
        }
        if (Object.keys(fieldsToUpdate).length > 0) {
          await updateContactFields(contactId, fieldsToUpdate);
        }
      }
    }

    // Create interaction
    if (result.interaction && result.interaction.summary) {
      const interaction = await createInteraction(
        userId,
        result.interaction,
        dbIds.contactIds
      );
      dbIds.interactionId = interaction.id as string;

      for (const contactId of dbIds.contactIds) {
        try {
          await boostRelationshipStrength(contactId, 10);
        } catch {}
      }
    }

    // Create facts
    for (const factData of result.facts_learned) {
      const contactId = contactMap.get(factData.contact);
      if (!contactId) continue;
      const fact = await createContactFact({
        contact_id: contactId,
        fact_type: factData.fact_type,
        fact: factData.fact,
        source_interaction_id: dbIds.interactionId,
        confidence: 0.7,
      });
      if (fact) dbIds.factIds.push((fact as Record<string, unknown>).id as string);
    }

    // Create relationships
    for (const rel of result.relationships || []) {
      const fromId = contactMap.get(rel.from);
      const toId = contactMap.get(rel.to);
      if (!fromId || !toId) continue;
      try {
        await createContactRelationship({
          contact_id: fromId,
          related_contact_id: toId,
          relationship_type: rel.type,
          label: rel.label,
        });
      } catch {}
    }

    // Create tasks
    for (const followUp of result.follow_ups) {
      const contactId = contactMap.get(followUp.contact) || null;
      const task = await createTask(userId, {
        title: followUp.action,
        due_at: calculateDueDate(followUp.due),
        channel: followUp.channel,
        contact_id: contactId,
        interaction_id: dbIds.interactionId,
        priority: "medium",
      });
      if (task) dbIds.taskIds.push(task.id as string);
    }

    return NextResponse.json({
      result,
      dbIds,
      message: `Saved: ${dbIds.contactIds.length} contact${dbIds.contactIds.length !== 1 ? "s" : ""}, ${dbIds.factIds.length} fact${dbIds.factIds.length !== 1 ? "s" : ""}, ${dbIds.taskIds.length} task${dbIds.taskIds.length !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Clip processing error:", error);
    return NextResponse.json(
      { error: "Failed to process clipped content" },
      { status: 500 }
    );
  }
}
