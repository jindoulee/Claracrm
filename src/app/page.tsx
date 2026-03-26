"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { SummaryCard } from "@/components/voice/SummaryCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { InteractionTimeline } from "@/components/interactions/InteractionTimeline";
import type { VoiceProcessingResult } from "@/lib/supabase/types";
import type { FollowUpQuestion } from "@/lib/ai/process-voice";

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<VoiceProcessingResult | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<Array<{
    id: string;
    interaction_type: string;
    summary: string | null;
    occurred_at: string;
    sentiment: string;
    contacts: Array<{ full_name: string }>;
  }>>([]);

  const handleTranscriptComplete = useCallback(async (transcript: string) => {
    setIsProcessing(true);
    setProcessingResult(null);
    setFollowUpQuestions([]);
    setShowSummary(false);

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) throw new Error("Processing failed");

      const data = await response.json();
      setProcessingResult(data.result);
      setFollowUpQuestions(data.followUpQuestions || []);
      setShowSummary(true);

      // Add to local timeline
      if (data.result?.interaction) {
        setRecentInteractions((prev) => [
          {
            id: Date.now().toString(),
            interaction_type: data.result.interaction.type,
            summary: data.result.interaction.summary,
            occurred_at: new Date().toISOString(),
            sentiment: data.result.interaction.sentiment,
            contacts: data.result.contacts.map((c: { name: string }) => ({ full_name: c.name })),
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error("Failed to process voice memo:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleQuestionAnswer = (question: FollowUpQuestion) => {
    // TODO: Open a mini input for the user to answer this question
    console.log("Answer question:", question);
    setFollowUpQuestions((prev) =>
      prev.filter((q) => q.chip_label !== question.chip_label)
    );
  };

  const handleDismiss = () => {
    setShowSummary(false);
    setProcessingResult(null);
    setFollowUpQuestions([]);
  };

  return (
    <div className="flex flex-col min-h-0">
      <Header title="Clara" subtitle="remembers everything" />

      <div className="flex-1 flex flex-col items-center px-5">
        {/* Voice recorder — hero section */}
        <div className="flex flex-col items-center justify-center py-8 w-full">
          <VoiceRecorder
            onTranscriptComplete={handleTranscriptComplete}
            isProcessing={isProcessing}
          />
        </div>

        {/* Recent interactions timeline */}
        <div className="w-full max-w-sm pb-8">
          <InteractionTimeline interactions={recentInteractions} />
        </div>
      </div>

      {/* Summary bottom sheet — slides up after processing */}
      <BottomSheet isOpen={showSummary} onClose={handleDismiss}>
        {processingResult && (
          <SummaryCard
            result={processingResult}
            followUpQuestions={followUpQuestions}
            onQuestionAnswer={handleQuestionAnswer}
            onDismiss={handleDismiss}
          />
        )}
      </BottomSheet>
    </div>
  );
}
