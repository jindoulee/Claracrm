"use client";

import { motion } from "framer-motion";
import { Coffee, Phone, Mail, MessageSquare, Users, Calendar } from "lucide-react";

interface TimelineInteraction {
  id: string;
  interaction_type: string;
  summary: string | null;
  occurred_at: string;
  sentiment: string;
  contacts: Array<{ full_name: string }>;
}

interface InteractionTimelineProps {
  interactions: TimelineInteraction[];
}

const typeIcons: Record<string, typeof Coffee> = {
  coffee: Coffee,
  call: Phone,
  email: Mail,
  text: MessageSquare,
  meeting: Users,
  dinner: Calendar,
  lunch: Calendar,
  general: MessageSquare,
};

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function InteractionTimeline({ interactions }: InteractionTimelineProps) {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-clara-text-secondary text-sm">
          No interactions yet.
        </p>
        <p className="text-clara-text-muted text-xs mt-1">
          Tap the mic to tell Clara about a recent conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1">
        Recent
      </h2>
      {interactions.map((interaction, i) => {
        const Icon = typeIcons[interaction.interaction_type] || MessageSquare;
        return (
          <motion.div
            key={interaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="clara-card p-4 flex gap-3"
          >
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                interaction.sentiment === "positive"
                  ? "bg-clara-green-light text-clara-green"
                  : interaction.sentiment === "negative"
                  ? "bg-red-50 text-red-400"
                  : "bg-clara-warm-gray text-clara-text-secondary"
              }`}
            >
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-clara-text truncate">
                  {interaction.contacts.map((c) => c.full_name).join(", ") ||
                    "Unknown"}
                </p>
                <span className="text-xs text-clara-text-muted flex-shrink-0">
                  {formatTimeAgo(interaction.occurred_at)}
                </span>
              </div>
              {interaction.summary && (
                <p className="text-xs text-clara-text-secondary mt-0.5 line-clamp-2">
                  {interaction.summary}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
