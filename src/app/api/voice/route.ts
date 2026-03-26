import { NextRequest, NextResponse } from "next/server";
import {
  processVoiceTranscript,
  generateFollowUpQuestions,
} from "@/lib/ai/process-voice";
import {
  findOrCreateContact,
  createInteraction,
  createContactFact,
  createContactRelationship,
  createTask,
  calculateDueDate,
} from "@/lib/supabase/queries";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  try {
    const { transcript, existingContacts } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid transcript" },
        { status: 400 }
      );
    }

    // Step 1: Process the transcript with Claude
    const result = await processVoiceTranscript(
      transcript,
      existingContacts || []
    );

    // Step 2: Generate follow-up questions
    const followUpQuestions = await generateFollowUpQuestions(
      result,
      transcript
    );

    // Step 3: Persist data to Supabase
    let dbIds: {
      contactIds: string[];
      interactionId: string | null;
      factIds: string[];
      relationshipIds: string[];
      taskIds: string[];
    } = {
      contactIds: [],
      interactionId: null,
      factIds: [],
      relationshipIds: [],
      taskIds: [],
    };

    try {
      // Resolve contacts — find or create each extracted contact
      const contactMap = new Map<string, string>(); // name -> id
      for (const extractedContact of result.contacts) {
        const contact = await findOrCreateContact(
          DEMO_USER_ID,
          extractedContact.name,
          extractedContact.match_hints
        );
        const contactId = contact.id as string;
        contactMap.set(extractedContact.name, contactId);
        dbIds.contactIds.push(contactId);

        // Apply any updates from the extraction (company, role, etc.)
        // This is handled via contact facts below
      }

      // Create the interaction linked to all resolved contacts
      if (result.interaction) {
        const interaction = await createInteraction(
          DEMO_USER_ID,
          result.interaction,
          dbIds.contactIds
        );
        dbIds.interactionId = interaction.id as string;
      }

      // Create contact facts
      for (const factData of result.facts_learned) {
        const contactId = contactMap.get(factData.contact);
        if (!contactId) continue;

        const fact = await createContactFact({
          contact_id: contactId,
          fact_type: factData.fact_type,
          fact: factData.fact,
          source_interaction_id: dbIds.interactionId,
          confidence: 0.8,
        });
        if (fact) {
          dbIds.factIds.push((fact as Record<string, unknown>).id as string);
        }
      }

      // Create contact relationships
      for (const relData of result.relationships) {
        const fromId = contactMap.get(relData.from);
        const toId = contactMap.get(relData.to);
        if (!fromId || !toId) continue;

        try {
          const rel = await createContactRelationship({
            contact_id: fromId,
            related_contact_id: toId,
            relationship_type: relData.type,
            label: relData.label,
          });
          if (rel) {
            dbIds.relationshipIds.push(
              (rel as Record<string, unknown>).id as string
            );
          }
        } catch {
          // Relationship may already exist (unique constraint), skip
        }
      }

      // Create tasks for follow-ups
      for (const followUp of result.follow_ups) {
        const contactId = contactMap.get(followUp.contact) || null;
        const dueAt = calculateDueDate(followUp.due);

        const task = await createTask(DEMO_USER_ID, {
          title: followUp.action,
          due_at: dueAt,
          channel: followUp.channel,
          contact_id: contactId,
          interaction_id: dbIds.interactionId,
          priority: "medium",
        });
        if (task) {
          dbIds.taskIds.push(task.id as string);
        }
      }
    } catch (persistError) {
      // Log but don't fail — AI results are still valid even if DB persistence fails
      console.error("Failed to persist voice processing results:", persistError);
    }

    return NextResponse.json({
      result,
      followUpQuestions,
      dbIds,
    });
  } catch (error) {
    console.error("Voice processing error:", error);
    return NextResponse.json(
      { error: "Failed to process voice memo" },
      { status: 500 }
    );
  }
}
