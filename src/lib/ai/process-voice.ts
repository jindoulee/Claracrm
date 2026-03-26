import Anthropic from "@anthropic-ai/sdk";
import { CLARA_SYSTEM_PROMPT, CLARA_FOLLOWUP_PROMPT } from "./prompts";
import type { VoiceProcessingResult } from "../supabase/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function processVoiceTranscript(
  transcript: string,
  existingContacts: { id: string; full_name: string; nickname: string | null }[] = []
): Promise<VoiceProcessingResult> {
  const contactContext =
    existingContacts.length > 0
      ? `\n\nExisting contacts in the user's CRM (use these to match mentions):\n${existingContacts.map((c) => `- ${c.full_name}${c.nickname ? ` (aka ${c.nickname})` : ""}`).join("\n")}`
      : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: CLARA_SYSTEM_PROMPT + contactContext,
    messages: [
      {
        role: "user",
        content: `Please analyze this voice memo transcript and extract all relevant data:\n\n"${transcript}"`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  try {
    return JSON.parse(jsonStr) as VoiceProcessingResult;
  } catch {
    // If parsing fails, return empty result with the raw text as clarification
    return {
      contacts: [],
      interaction: {
        type: "general",
        participants: [],
        topics: [],
        sentiment: "neutral",
        summary: transcript,
      },
      facts_learned: [],
      relationships: [],
      follow_ups: [],
      clarification_needed: [
        "I had trouble understanding that. Could you try again?",
      ],
    };
  }
}

export interface FollowUpQuestion {
  chip_label: string;
  full_question: string;
  field: string;
  priority: string;
}

export async function generateFollowUpQuestions(
  result: VoiceProcessingResult,
  transcript: string
): Promise<FollowUpQuestion[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: CLARA_FOLLOWUP_PROMPT,
    messages: [
      {
        role: "user",
        content: `Transcript: "${transcript}"\n\nExtracted data: ${JSON.stringify(result, null, 2)}\n\nSuggest follow-up questions for missing or useful information.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.questions || [];
  } catch {
    return [];
  }
}
