import { NextRequest, NextResponse } from "next/server";
import {
  processVoiceTranscript,
  generateFollowUpQuestions,
} from "@/lib/ai/process-voice";
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
import type { ContactMatchInfo } from "@/lib/supabase/types";
import { getUserId } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
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

    // Step 2: Generate follow-up questions in parallel with DB persistence
    // (don't block the summary card on follow-ups)
    const followUpPromise = generateFollowUpQuestions(
      result,
      transcript
    ).catch(() => []);

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

    const matchInfo: ContactMatchInfo[] = [];

    try {
      // Resolve contacts — find or create each extracted contact
      const contactMap = new Map<string, string>(); // name -> id
      for (const extractedContact of result.contacts) {
        const matchResult = await findOrCreateContact(
          userId,
          extractedContact.name,
          extractedContact.match_hints
        );
        const contactId = matchResult.contact.id as string;
        contactMap.set(extractedContact.name, contactId);
        dbIds.contactIds.push(contactId);

        // Apply metadata updates from AI extraction (company, role, etc.)
        let updatedFields: string[] = [];
        if (
          extractedContact.updates &&
          Object.keys(extractedContact.updates).length > 0
        ) {
          // Only update fields that are empty or different on the existing contact
          const existingContact = matchResult.contact;
          const fieldsToUpdate: Record<string, string> = {};

          for (const [key, value] of Object.entries(
            extractedContact.updates
          )) {
            if (!value) continue;
            const existingValue = existingContact[key] as string | null;
            if (!existingValue || existingValue !== value) {
              fieldsToUpdate[key] = value;
            }
          }

          if (Object.keys(fieldsToUpdate).length > 0) {
            updatedFields = await updateContactFields(
              contactId,
              fieldsToUpdate
            );
          }
        }

        matchInfo.push({
          name: extractedContact.name,
          contactId,
          confidence: matchResult.confidence,
          score: matchResult.score,
          updatedFields,
        });
      }

      // Attach match info to result for UI consumption
      result.matchInfo = matchInfo;

      // Create the interaction linked to all resolved contacts
      if (result.interaction) {
        const interaction = await createInteraction(
          userId,
          result.interaction,
          dbIds.contactIds
        );
        dbIds.interactionId = interaction.id as string;

        // Boost relationship strength for all contacts in this interaction
        for (const contactId of dbIds.contactIds) {
          try {
            await boostRelationshipStrength(contactId, 15);
          } catch {
            console.error("Failed to boost strength for contact:", contactId);
          }
        }
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

        const task = await createTask(userId, {
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

    // Await follow-ups (ran in parallel with DB persistence above)
    const followUpQuestions = await followUpPromise;

    return NextResponse.json({
      result,
      followUpQuestions,
      dbIds,
      matchInfo,
    });
  } catch (error) {
    console.error("Voice processing error:", error);
    return NextResponse.json(
      { error: "Failed to process voice memo" },
      { status: 500 }
    );
  }
}
