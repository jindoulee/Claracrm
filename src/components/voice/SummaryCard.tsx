"use client";

import { motion } from "framer-motion";
import { User, MessageSquare, Lightbulb, ArrowRight, X } from "lucide-react";
import type { VoiceProcessingResult } from "@/lib/supabase/types";
import type { FollowUpQuestion } from "@/lib/ai/process-voice";
import { hapticLight } from "@/lib/utils/haptics";

interface SummaryCardProps {
  result: VoiceProcessingResult;
  followUpQuestions: FollowUpQuestion[];
  onQuestionAnswer: (question: FollowUpQuestion) => void;
  onDismiss: () => void;
}

export function SummaryCard({
  result,
  followUpQuestions,
  onQuestionAnswer,
  onDismiss,
}: SummaryCardProps) {
  const { interaction, contacts, follow_ups, facts_learned } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-full max-w-sm"
    >
      <div className="clara-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-clara-coral uppercase tracking-wide">
              Got it!
            </p>
            <p className="text-base font-semibold text-clara-text mt-0.5">
              {interaction.summary || "Interaction logged"}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-clara-text-muted hover:text-clara-text rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Extracted info pills */}
        <div className="flex flex-wrap gap-2">
          {/* Interaction type */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-coral-light text-clara-coral">
            <MessageSquare size={12} />
            {interaction.type}
          </span>

          {/* Contacts */}
          {contacts.map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-blue-light text-clara-blue"
            >
              <User size={12} />
              {c.name}
            </span>
          ))}

          {/* Sentiment */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              interaction.sentiment === "positive"
                ? "bg-clara-green-light text-clara-green"
                : interaction.sentiment === "negative"
                ? "bg-red-50 text-red-500"
                : "bg-clara-warm-gray text-clara-text-secondary"
            }`}
          >
            {interaction.sentiment === "positive" ? "😊" : interaction.sentiment === "negative" ? "😔" : "😐"}{" "}
            {interaction.sentiment}
          </span>
        </div>

        {/* Facts learned */}
        {facts_learned.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-clara-text-secondary flex items-center gap-1">
              <Lightbulb size={12} />
              Clara learned
            </p>
            {facts_learned.map((fact, i) => (
              <p key={i} className="text-sm text-clara-text pl-4">
                • {fact.fact}
              </p>
            ))}
          </div>
        )}

        {/* Follow-ups created */}
        {follow_ups.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-clara-text-secondary flex items-center gap-1">
              <ArrowRight size={12} />
              Follow-ups
            </p>
            {follow_ups.map((fu, i) => (
              <p key={i} className="text-sm text-clara-text pl-4">
                • {fu.action}{" "}
                <span className="text-clara-text-muted">({fu.due})</span>
              </p>
            ))}
          </div>
        )}

        {/* Smart follow-up question chips */}
        {followUpQuestions.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-clara-text-muted">
              A couple quick things...
            </p>
            <div className="flex flex-wrap gap-2">
              {followUpQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    hapticLight();
                    onQuestionAnswer(q);
                  }}
                  className="clara-chip text-xs"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  {q.chip_label}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
