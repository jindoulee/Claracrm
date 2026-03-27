"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { SummaryCard } from "@/components/voice/SummaryCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  Heart,
  CalendarDays,
  Clock,
  Check,
  Coffee,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Calendar,
} from "lucide-react";
import type { VoiceProcessingResult } from "@/lib/supabase/types";
import type { FollowUpQuestion } from "@/lib/ai/process-voice";

// ---- Dashboard API response types ----

interface DashboardTask {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "done" | "snoozed" | "cancelled";
  contact_name: string | null;
}

interface FadingRelationship {
  id: string;
  full_name: string;
  relationship_strength: number;
  last_interaction_at: string | null;
}

interface RecentInteraction {
  id: string;
  interaction_type: string;
  summary: string | null;
  occurred_at: string;
  sentiment: string;
  contacts: Array<{ full_name: string }>;
}

// ---- Helpers ----

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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatDueDate(date: string): string {
  const now = new Date();
  const due = new Date(date);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function strengthBarColor(strength: number): string {
  if (strength >= 50) return "bg-clara-amber";
  if (strength >= 30) return "bg-[#e8725c]";
  return "bg-red-400";
}

function strengthTextColor(strength: number): string {
  if (strength >= 50) return "text-clara-amber";
  if (strength >= 30) return "text-[#e8725c]";
  return "text-red-400";
}

function priorityDotColor(priority: "low" | "medium" | "high"): string {
  if (priority === "high") return "bg-red-400";
  if (priority === "medium") return "bg-clara-amber";
  return "bg-clara-green";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ---- Stagger animation variants ----

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ==== Page ====

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] =
    useState<VoiceProcessingResult | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>(
    []
  );
  const [showSummary, setShowSummary] = useState(false);

  // Dashboard data
  const [fadingRelationships, setFadingRelationships] = useState<
    FadingRelationship[]
  >([]);
  const [upcomingTasks, setUpcomingTasks] = useState<DashboardTask[]>([]);
  const [recentInteractions, setRecentInteractions] = useState<
    RecentInteraction[]
  >([]);

  // Fetch dashboard data on mount
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;
        const data = await res.json();
        if (data.fadingRelationships) setFadingRelationships(data.fadingRelationships);
        if (data.upcomingTasks) setUpcomingTasks(data.upcomingTasks);
        if (data.recentInteractions) setRecentInteractions(data.recentInteractions);
      } catch {
        // Silently fail — sections will show empty states
      }
    }
    fetchDashboard();
  }, []);

  // Fallback: also fetch from interactions endpoint if dashboard doesn't provide them
  useEffect(() => {
    if (recentInteractions.length > 0) return;
    async function fetchInteractions() {
      try {
        const res = await fetch("/api/interactions");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRecentInteractions(
            data
              .slice(0, 5)
              .map((item: Record<string, unknown>) => ({
                id: item.id as string,
                interaction_type:
                  (item.interaction_type as string) || "general",
                summary: (item.summary as string) || null,
                occurred_at:
                  (item.occurred_at as string) || new Date().toISOString(),
                sentiment: (item.sentiment as string) || "neutral",
                contacts: [],
              }))
          );
        }
      } catch {
        // Silently fail
      }
    }
    fetchInteractions();
  }, [recentInteractions.length]);

  const handleTranscriptComplete = useCallback(
    async (transcript: string) => {
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

        // Add to local timeline immediately for instant feedback
        if (data.result?.interaction) {
          setRecentInteractions((prev) => [
            {
              id: data.dbIds?.interactionId || Date.now().toString(),
              interaction_type: data.result.interaction.type,
              summary: data.result.interaction.summary,
              occurred_at: new Date().toISOString(),
              sentiment: data.result.interaction.sentiment,
              contacts: data.result.contacts.map(
                (c: { name: string }) => ({ full_name: c.name })
              ),
            },
            ...prev,
          ]);
        }
      } catch (error) {
        console.error("Failed to process voice memo:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const handleQuestionAnswer = (question: FollowUpQuestion) => {
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

  const handleCompleteTask = async (taskId: string) => {
    // Optimistic update
    setUpcomingTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
    } catch {
      // If it fails, we already removed it optimistically — fine for MVP
    }
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

        {/* Dashboard sections */}
        <div className="w-full max-w-sm space-y-6 pb-8">
          {/* ---- Reconnect Section ---- */}
          {fadingRelationships.length > 0 && (
            <motion.section
              initial="hidden"
              animate="show"
              variants={staggerContainer}
            >
              <motion.h2
                variants={fadeUp}
                className="flex items-center gap-1.5 text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1 mb-3"
              >
                <Heart size={13} className="text-clara-coral" />
                Reconnect
              </motion.h2>
              <motion.div
                variants={fadeUp}
                className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {fadingRelationships.map((contact) => (
                  <motion.div
                    key={contact.id}
                    variants={fadeUp}
                    className="clara-card flex-shrink-0 w-32 p-3 flex flex-col items-center gap-2 text-center"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-clara-coral-light text-clara-coral flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {getInitials(contact.full_name)}
                      </span>
                    </div>

                    {/* Name */}
                    <p className="text-sm font-medium text-clara-text truncate w-full">
                      {contact.full_name}
                    </p>

                    {/* Strength bar */}
                    <div className="w-full">
                      <div className="h-1.5 rounded-full bg-clara-warm-gray overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${strengthBarColor(contact.relationship_strength)}`}
                          style={{
                            width: `${contact.relationship_strength}%`,
                          }}
                        />
                      </div>
                      <p
                        className={`text-[10px] mt-0.5 font-medium ${strengthTextColor(contact.relationship_strength)}`}
                      >
                        {contact.relationship_strength}%
                      </p>
                    </div>

                    {/* Time since last interaction */}
                    <p className="text-[10px] text-clara-text-muted flex items-center gap-0.5">
                      <Clock size={9} />
                      {contact.last_interaction_at
                        ? formatTimeAgo(contact.last_interaction_at)
                        : "Never"}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {/* ---- Coming Up Section ---- */}
          <motion.section
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeUp}
              className="flex items-center gap-1.5 text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1 mb-3"
            >
              <CalendarDays size={13} className="text-clara-blue" />
              Coming up
            </motion.h2>

            {upcomingTasks.length === 0 ? (
              <motion.div
                variants={fadeUp}
                className="text-center py-6 px-4"
              >
                <p className="text-sm text-clara-text-secondary">
                  All clear! No upcoming tasks.
                </p>
                <p className="text-xs text-clara-text-muted mt-1">
                  Clara will add follow-ups from your voice memos.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    variants={fadeUp}
                    className="clara-card px-4 py-3 flex items-start gap-3"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-clara-border flex items-center justify-center hover:border-clara-green active:scale-90 transition-all"
                      aria-label={`Complete task: ${task.title}`}
                    >
                      <AnimatePresence>
                        {task.status === "done" && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-clara-green"
                          >
                            <Check size={12} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${priorityDotColor(task.priority)}`}
                        />
                        <p className="text-sm font-medium text-clara-text truncate">
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.contact_name && (
                          <span className="text-xs text-clara-text-secondary truncate">
                            {task.contact_name}
                          </span>
                        )}
                        {task.due_at && (
                          <span
                            className={`text-xs flex-shrink-0 ${
                              formatDueDate(task.due_at) === "Overdue"
                                ? "text-red-400 font-medium"
                                : "text-clara-text-muted"
                            }`}
                          >
                            {formatDueDate(task.due_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* ---- Recent Activity Section ---- */}
          <motion.section
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeUp}
              className="flex items-center gap-1.5 text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1 mb-3"
            >
              <Clock size={13} className="text-clara-text-muted" />
              Recent
            </motion.h2>

            {recentInteractions.length === 0 ? (
              <motion.div
                variants={fadeUp}
                className="text-center py-6 px-4"
              >
                <p className="text-sm text-clara-text-secondary">
                  No interactions yet.
                </p>
                <p className="text-xs text-clara-text-muted mt-1">
                  Tap the mic to tell Clara about a recent conversation.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {recentInteractions.slice(0, 5).map((interaction) => {
                  const Icon =
                    typeIcons[interaction.interaction_type] || MessageSquare;
                  return (
                    <motion.div
                      key={interaction.id}
                      variants={fadeUp}
                      className="clara-card px-4 py-3 flex gap-3"
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          interaction.sentiment === "positive"
                            ? "bg-clara-green-light text-clara-green"
                            : interaction.sentiment === "negative"
                              ? "bg-red-50 text-red-400"
                              : "bg-clara-warm-gray text-clara-text-secondary"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-clara-text truncate">
                            {interaction.contacts
                              .map((c) => c.full_name)
                              .join(", ") || "Unknown"}
                          </p>
                          <span className="text-[10px] text-clara-text-muted flex-shrink-0">
                            {formatTimeAgo(interaction.occurred_at)}
                          </span>
                        </div>
                        {interaction.summary && (
                          <p className="text-xs text-clara-text-secondary mt-0.5 line-clamp-1">
                            {interaction.summary}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
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
