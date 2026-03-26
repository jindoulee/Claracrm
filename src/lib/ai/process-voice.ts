import OpenAI from "openai";
import { CLARA_SYSTEM_PROMPT, CLARA_FOLLOWUP_PROMPT } from "./prompts";
import type { VoiceProcessingResult } from "../supabase/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "placeholder",
});

export async function processVoiceTranscript(
  transcript: string,
  existingContacts: { id: string; full_name: string; nickname: string | null }[] = []
): Promise<VoiceProcessingResult> {
  const contactContext =
    existingContacts.length > 0
      ? `\n\nExisting contacts in the user's CRM (use these to match mentions):\n${existingContacts.map((c) => `- ${c.full_name}${c.nickname ? ` (aka ${c.nickname})` : ""}`).join("\n")}`
      : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: CLARA_SYSTEM_PROMPT + contactContext,
      },
      {
        role: "user",
        content: `Please analyze this voice memo transcript and extract all relevant data:\n\n"${transcript}"`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  try {
    return JSON.parse(text) as VoiceProcessingResult;
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
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: CLARA_FOLLOWUP_PROMPT,
      },
      {
        role: "user",
        content: `Transcript: "${transcript}"\n\nExtracted data: ${JSON.stringify(result, null, 2)}\n\nSuggest follow-up questions for missing or useful information.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(text);
    return parsed.questions || [];
  } catch {
    return [];
  }
}
