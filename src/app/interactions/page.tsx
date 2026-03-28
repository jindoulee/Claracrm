"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import {
  Coffee,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  MapPin,
  ChevronDown,
  Mic,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";

interface InteractionContact {
  id: string;
  full_name: string;
}

interface Interaction {
  id: string;
  interaction_type: string;
  summary: string | null;
  occurred_at: string;
  sentiment: string;
  location: string | null;
  key_topics: string[] | null;
  contacts: InteractionContact[];
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

const typeLabels: Record<string, string> = {
  coffee: "Coffee",
  call: "Call",
  email: "Email",
  text: "Text",
  meeting: "Meeting",
  dinner: "Dinner",
  lunch: "Lunch",
  general: "Note",
};

function sentimentColor(sentiment: string) {
  if (sentiment === "positive") return "bg-clara-green-light text-clara-green";
  if (sentiment === "negative") return "bg-red-50 text-red-400";
  return "bg-clara-warm-gray text-clara-text-secondary";
}

function groupByDate(interactions: Interaction[]): Map<string, Interaction[]> {
  const groups = new Map<string, Interaction[]>();
  for (const interaction of interactions) {
    const date = new Date(interaction.occurred_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    let label: string;
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = "This week";
    else if (diffDays < 30) label = "This month";
    else {
      label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    const existing = groups.get(label) || [];
    existing.push(interaction);
    groups.set(label, existing);
  }
  return groups;
}

function InteractionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="clara-card p-4 flex gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-clara-warm-gray" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-clara-warm-gray rounded w-2/3" />
            <div className="h-3 bg-clara-warm-gray rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInteractions() {
      try {
        const res = await fetch("/api/interactions");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setInteractions(data);
      } catch {
        setError("Couldn't load activity");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInteractions();
  }, []);

  const groups = groupByDate(interactions);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Activity"
        subtitle={isLoading ? "Loading..." : `${interactions.length} interaction${interactions.length !== 1 ? "s" : ""}`}
      />

      <div className="px-5 space-y-5 pb-32">
        {isLoading ? (
          <InteractionSkeleton />
        ) : error ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-clara-text-secondary">{error}</p>
          </div>
        ) : interactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Mic size={32} className="text-clara-coral/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-clara-text">No activity yet</p>
            <p className="text-xs text-clara-text-muted mt-1.5 max-w-[240px] mx-auto">
              Record a voice note from the home screen to start logging interactions.
            </p>
          </div>
        ) : (
          Array.from(groups.entries()).map(([label, items]) => (
            <div key={label} className="space-y-2">
              <h2 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1">
                {label}
              </h2>
              {items.map((interaction) => {
                const Icon = typeIcons[interaction.interaction_type] || MessageSquare;
                const isExpanded = expandedId === interaction.id;

                return (
                  <motion.button
                    key={interaction.id}
                    onClick={() => setExpandedId(isExpanded ? null : interaction.id)}
                    className="clara-card p-4 w-full text-left"
                    layout
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${sentimentColor(interaction.sentiment)}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-clara-text truncate">
                            {interaction.contacts.map((c) => c.full_name).join(", ") || "Unknown"}
                          </p>
                          <span className="text-xs text-clara-text-muted flex-shrink-0">
                            {formatTimeAgo(interaction.occurred_at)}
                          </span>
                        </div>
                        {interaction.summary && (
                          <p className={`text-xs text-clara-text-secondary mt-0.5 ${isExpanded ? "" : "line-clamp-2"}`}>
                            {interaction.summary}
                          </p>
                        )}

                        {/* Type badge */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-clara-warm-gray text-clara-text-secondary font-medium">
                            {typeLabels[interaction.interaction_type] || interaction.interaction_type}
                          </span>
                          {interaction.location && (
                            <span className="text-[10px] text-clara-text-muted flex items-center gap-0.5">
                              <MapPin size={9} />
                              {interaction.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 mt-3 border-t border-clara-border space-y-2.5 pl-12">
                            {/* Contact links */}
                            {interaction.contacts.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {interaction.contacts.map((c) => (
                                  <Link
                                    key={c.id}
                                    href={`/contacts/${c.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs px-2.5 py-1 rounded-full bg-clara-coral-light text-clara-coral font-medium hover:bg-clara-coral hover:text-white transition-colors"
                                  >
                                    {c.full_name}
                                  </Link>
                                ))}
                              </div>
                            )}

                            {/* Topics */}
                            {interaction.key_topics && interaction.key_topics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {interaction.key_topics.map((topic) => (
                                  <span
                                    key={topic}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-clara-warm-gray text-clara-text-secondary"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Date */}
                            <p className="text-[11px] text-clara-text-muted">
                              {new Date(interaction.occurred_at).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
