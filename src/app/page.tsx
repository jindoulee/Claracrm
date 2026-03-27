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
import { formatTimeAgo, formatDueDate } from "@/lib/utils/format";
import { useToast } from "@/components/ui/Toast";
import { HomeSkeleton } from "@/components/ui/Skeleton";

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
  const { showToast } = useToast();

  // Redirect to onboarding if first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem("clara_onboarded")) {
        router.replace("/onboarding");
      }
    } catch {
      // localStorage unavailable — skip onboarding check
    }
  }, [router]);

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
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [briefing, setBriefing] = useState<{
    tasksDueToday: number;
    fadingContacts: string[];
  } | null>(null);

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

        // Build briefing data
        const fadingNames = (data.fadingRelationships || [])
          .slice(0, 3)
          .map((c: { full_name: string }) => c.full_name);
        const dueToday = data.stats?.tasksDueToday || 0;
        if (dueToday > 0 || fadingNames.length > 0) {
          setBriefing({ tasksDueToday: dueToday, fadingContacts: fadingNames });
        }
      } catch {
        // Silently fail — sections will show empty states
      } finally {
        setIsDashboardLoading(false);
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
      } catch {
        showToast("Couldn't process that. Try recording again?", "error");
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
    const hadResult = processingResult !== null;
    setShowSummary(false);
    setProcessingResult(null);
    setFollowUpQuestions([]);
    if (hadResult) {
      showToast("Saved. Clara will remember this.");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    hapticSuccess();
    const prev = upcomingTasks;
    // Optimistic update
    setUpcomingTasks((tasks) => tasks.filter((t) => t.id !== taskId));
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "done" }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setUpcomingTasks(prev);
      showToast("Couldn't complete task. Try again?", "error");
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
          {/* Skeleton while loading */}
          {isDashboardLoading && <HomeSkeleton />}

          {/* Empty state — tappable prompt cards */}
          {!isDashboardLoading && hasNoData && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-3"
            >
              <p className="text-xs text-clara-text-muted text-center mb-1">
                Try one of these to get started
              </p>
              {[
                {
                  icon: Coffee,
                  label: "I had coffee with someone today",
                  message: "I had coffee with someone today",
                },
                {
                  icon: Phone,
                  label: "I just got off a phone call",
                  message: "I just got off a phone call",
                },
                {
                  icon: Users,
                  label: "Import my contacts",
                  href: "/contacts",
                },
              ].map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => {
                    if (prompt.href) {
                      router.push(prompt.href);
                    } else if (prompt.message) {
                      setInitialChatMessage(prompt.message);
                      setIsChatOpen(true);
                    }
                  }}
                  className="w-full clara-card p-3.5 flex items-center gap-3 text-left hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-clara-coral-light text-clara-coral flex items-center justify-center flex-shrink-0">
                    <prompt.icon size={16} />
                  </div>
                  <span className="text-sm text-clara-text font-medium">
                    {prompt.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ---- Your Morning Briefing ---- */}
          {!isDashboardLoading && briefing && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="flex items-center gap-1.5 text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1 mb-3">
                <Calendar size={13} className="text-clara-coral" />
                Your day
              </h2>
              <div className="clara-card p-4 space-y-2">
                {briefing.tasksDueToday > 0 && (
                  <p className="text-sm text-clara-text">
                    You have <strong>{briefing.tasksDueToday}</strong>{" "}
                    follow-up{briefing.tasksDueToday !== 1 ? "s" : ""} due today.
                  </p>
                )}
                {briefing.fadingContacts.length > 0 && (
                  <p className="text-sm text-clara-text-secondary">
                    {briefing.fadingContacts.length === 1
                      ? `${briefing.fadingContacts[0]} might be worth checking in on.`
                      : `${briefing.fadingContacts.slice(0, -1).join(", ")} and ${briefing.fadingContacts.at(-1)} might be worth checking in on.`}
                  </p>
                )}
              </div>
            </motion.section>
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
