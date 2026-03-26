import { NextRequest, NextResponse } from "next/server";
import {
  processVoiceTranscript,
  generateFollowUpQuestions,
} from "@/lib/ai/process-voice";

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

    return NextResponse.json({
      result,
      followUpQuestions,
    });
  } catch (error) {
    console.error("Voice processing error:", error);
    return NextResponse.json(
      { error: "Failed to process voice memo" },
      { status: 500 }
    );
  }
}
