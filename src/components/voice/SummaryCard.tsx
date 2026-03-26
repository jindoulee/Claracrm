"use client";

import { motion } from "framer-motion";
import { User, MessageSquare, Lightbulb, ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import type { VoiceProcessingResult } from "@/lib/supabase/types";
import type { FollowUpQuestion } from "@/lib/ai/process-voice";
import { hapticLight, hapticSuccess } from "@/lib/utils/haptics";

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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="text-center pt-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-clara-green-light mb-3"
        >
          <CheckCircle2 size={24} className="text-clara-green" />
        </motion.div>
        <h2 className="text-lg font-semibold text-clara-text">Got it!</h2>
        <p className="text-sm text-clara-text-secondary mt-1 leading-relaxed">
          {interaction.summary || "Interaction logged"}
        </p>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-coral-light text-clara-coral">
          <MessageSquare size={12} />
          {interaction.type}
        </span>

        {contacts.map((c) => (
          <span
            key={c.name}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-blue-light text-clara-blue"
          >
            <User size={12} />
            {c.name}
          </span>
        ))}

        {interaction.location && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-purple-light text-clara-purple">
            <MapPin size={12} />
            {interaction.location}
          </span>
        )}

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            interaction.sentiment === "positive"
              ? "bg-clara-green-light text-clara-green"
              : interaction.sentiment === "negative"
              ? "bg-red-50 text-red-500"
              : "bg-clara-warm-gray text-clara-text-secondary"
          }`}
        >
          {interaction.sentiment === "positive" ? "+" : interaction.sentiment === "negative" ? "-" : "~"}{" "}
          {interaction.sentiment}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-clara-border" />

      {/* Facts learned */}
      {facts_learned.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb size={13} />
            Clara learned
          </h3>
          <div className="space-y-2">
            {facts_learned.map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-2 bg-clara-cream rounded-xl px-3 py-2.5"
              >
                <span className="text-xs text-clara-text-muted mt-0.5 capitalize">{fact.fact_type}</span>
                <span className="text-sm text-clara-text">{fact.fact}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {follow_ups.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRight size={13} />
            Follow-ups created
          </h3>
          <div className="space-y-2">
            {follow_ups.map((fu, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-start justify-between gap-3 bg-clara-cream rounded-xl px-3 py-2.5"
              >
                <span className="text-sm text-clara-text">{fu.action}</span>
                <span className="text-xs text-clara-text-muted whitespace-nowrap flex-shrink-0">{fu.due}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up questions */}
      {followUpQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="h-px bg-clara-border" />
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider">
            Want to add more?
          </h3>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  hapticLight();
                  onQuestionAnswer(q);
                }}
                className="clara-chip text-xs"
              >
                {q.chip_label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Done button */}
      <button
        onClick={() => {
          hapticSuccess();
          onDismiss();
        }}
        className="w-full py-3 rounded-2xl bg-clara-coral text-white font-medium text-sm active:scale-[0.98] transition-transform"
      >
        Done
      </button>
    </div>
  );
}
