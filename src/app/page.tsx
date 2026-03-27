"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { SummaryCard } from "@/components/voice/SummaryCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChatSheet } from "@/components/chat/ChatSheet";
import {
  CalendarDays,
  Clock,
  Check,
  Coffee,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  Send,
  Mic,
} from "lucide-react";
import type { VoiceProcessingResult } from "@/lib/supabase/types";
import type { FollowUpQuestion } from "@/lib/ai/process-voice";
import { hapticSuccess } from "@/lib/utils/haptics";

// ---- Dashboard API response types ----

interface DashboardTask {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "done" | "snoozed" | "cancelled";
  contact_name: string | null;
}

interface RecentInteraction {
  id: string;
  interaction_type: string;
  summary: string | null;
  occurred_at: string;
  sentiment: string;
  contacts: Array<{ id: string; full_name: string }>;
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

// ==== Inner Page (uses useSearchParams) ====

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [askClaraText, setAskClaraText] = useState("");
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] =
    useState<VoiceProcessingResult | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>(
    []
  );
  const [showSummary, setShowSummary] = useState(false);
  const [summaryDbIds, setSummaryDbIds] = useState<{
    contactIds: string[];
    interactionId: string | null;
    factIds: string[];
    relationshipIds: string[];
    taskIds: string[];
  } | null>(null);

  // Dashboard data
  const [upcomingTasks, setUpcomingTasks] = useState<DashboardTask[]>([]);
  const [recentInteractions, setRecentInteractions] = useState<
    RecentInteraction[]
  >([]);

  // Read chat query param on mount to open chat sheet with initial message
  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam) {
      setInitialChatMessage(chatParam);
      setIsChatOpen(true);
      // Clean up the URL
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  // Fetch dashboard data on mount
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;
        const data = await res.json();
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
                contacts: (item.contacts as Array<{ id: string; full_name: string }>) ?? [],
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
        setSummaryDbIds(data.dbIds || null);
        setShowSummary(true);
        hapticSuccess();

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
    setFollowUpQuestions((prev) =>
      prev.filter((q) => q.chip_label !== question.chip_label)
    );
  };

  const handleOpenChat = useCallback((message: string) => {
    setShowSummary(false);
    setInitialChatMessage(message);
    setIsChatOpen(true);
  }, []);

  const handleDismiss = () => {
    setShowSummary(false);
    setProcessingResult(null);
    setFollowUpQuestions([]);
  };

  const handleCompleteTask = async (taskId: string) => {
    hapticSuccess();
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

  const hasNoData = upcomingTasks.length === 0 && recentInteractions.length === 0;

  return (
    <div className="flex flex-col min-h-0">
      <Header title="Clara" subtitle="remembers everything" />

      <div className="flex-1 flex flex-col items-center px-5">
        {/* Voice recorder — hero section */}
        <div className="flex flex-col items-center justify-center py-8 w-full max-w-sm">
          <VoiceRecorder
            onTranscriptComplete={handleTranscriptComplete}
            isProcessing={isProcessing}
          />

          {/* "Ask Clara" input bar — opens chat */}
          <form
            className="mt-5 w-full flex items-center gap-2 rounded-full bg-white border border-clara-border shadow-sm px-4 py-2.5 focus-within:border-clara-coral focus-within:shadow-md transition-all"
            onSubmit={(e) => {
              e.preventDefault();
              const msg = askClaraText.trim();
              if (msg) {
                setInitialChatMessage(msg);
                setAskClaraText("");
              } else {
                setInitialChatMessage(undefined);
              }
              setIsChatOpen(true);
            }}
          >
            <input
              type="text"
              value={askClaraText}
              onChange={(e) => setAskClaraText(e.target.value)}
              placeholder="Ask Clara anything..."
              className="flex-1 bg-transparent text-sm text-clara-text placeholder:text-clara-text-muted outline-none"
              onFocus={() => {
                if (!askClaraText.trim()) {
                  setInitialChatMessage(undefined);
                  setIsChatOpen(true);
                }
              }}
            />
            {askClaraText.trim() ? (
              <button
                type="submit"
                className="flex-shrink-0 w-8 h-8 rounded-full bg-clara-coral text-white flex items-center justify-center hover:bg-clara-coral/90 transition-colors"
                aria-label="Send message to Clara"
              >
                <Send size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setInitialChatMessage(undefined);
                  setIsChatOpen(true);
                }}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-clara-warm-gray text-clara-text-secondary flex items-center justify-center hover:bg-clara-coral hover:text-white transition-colors"
                aria-label="Voice chat with Clara"
              >
                <Mic size={14} />
              </button>
            )}
          </form>
        </div>

        {/* Dashboard sections */}
        <div className="w-full max-w-sm space-y-6 pb-8">
          {/* Consolidated empty state when user has no data */}
          {hasNoData && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-center py-8 px-4"
            >
              <p className="text-sm text-clara-text-secondary">
                Tell Clara about a recent conversation to get started.
              </p>
            </motion.div>
          )}

          {/* ---- Coming Up Section ---- */}
          {upcomingTasks.length > 0 && (
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
            </motion.section>
          )}

          {/* ---- Recent Activity Section ---- */}
          {recentInteractions.length > 0 && (
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

              <div className="space-y-2">
                {recentInteractions.slice(0, 5).map((interaction) => {
                  const Icon =
                    typeIcons[interaction.interaction_type] || MessageSquare;
                  const firstContactId = interaction.contacts?.[0]?.id;
                  return (
                    <motion.div
                      key={interaction.id}
                      variants={fadeUp}
                      className={`clara-card px-4 py-3 flex gap-3${firstContactId ? " cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
                      onClick={
                        firstContactId
                          ? () => router.push(`/contacts/${firstContactId}`)
                          : undefined
                      }
                      role={firstContactId ? "button" : undefined}
                      tabIndex={firstContactId ? 0 : undefined}
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
            </motion.section>
          )}
        </div>
      </div>

      {/* Summary bottom sheet — slides up after processing */}
      <BottomSheet isOpen={showSummary} onClose={handleDismiss}>
        {processingResult && (
          <SummaryCard
            result={processingResult}
            dbIds={summaryDbIds}
            followUpQuestions={followUpQuestions}
            onQuestionAnswer={handleQuestionAnswer}
            onOpenChat={handleOpenChat}
            onDismiss={handleDismiss}
          />
        )}
      </BottomSheet>

      {/* Chat with Clara */}
      <ChatSheet isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setInitialChatMessage(undefined); }} initialMessage={initialChatMessage} />
    </div>
  );
}

// ==== Page (wraps content in Suspense for useSearchParams) ====

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
