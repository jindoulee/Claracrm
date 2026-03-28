"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import {
  Check,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  ChevronRight,
  ChevronDown,
  Calendar,
  Tag,
  Undo2,
  Mic,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { hapticSuccess, hapticLight } from "@/lib/utils/haptics";
import { TaskListSkeleton } from "@/components/ui/Skeleton";

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "done" | "snoozed" | "cancelled";
  priority: "low" | "medium" | "high";
  channel: string | null;
  contact_name: string;
  contact_id?: string | null;
  interaction_id?: string | null;
  created_at?: string;
  contacts?: { id: string; full_name: string; avatar_url: string | null } | null;
}

const channelIcons: Record<string, typeof MessageSquare> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
};

const channelLabels: Record<string, string> = {
  sms: "Text",
  email: "Email",
  call: "Call",
  any: "Any",
};

function formatDueDate(date: string | null): string {
  if (!date) return "No date";
  const due = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(date: string | null): string {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function priorityDot(priority: string) {
  if (priority === "high") return "bg-clara-coral";
  if (priority === "medium") return "bg-clara-amber";
  return "bg-clara-text-muted";
}

function priorityLabel(priority: string) {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

function normalizeTask(task: TaskData): TaskData {
  if (task.contacts && !task.contact_name) {
    return {
      ...task,
      contact_name: task.contacts.full_name,
      contact_id: task.contacts.id,
    };
  }
  if (task.contacts) {
    return { ...task, contact_id: task.contacts.id };
  }
  return task;
}

// ── Undo Toast ──────────────────────────────────────────────
function UndoToast({
  visible,
  onUndo,
  onDismiss,
}: {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-[55] flex items-center justify-between bg-clara-text text-clara-cream rounded-xl px-4 py-3 shadow-lg"
        >
          <span className="text-sm font-medium">Task completed</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-clara-coral-light active:opacity-70 px-3 py-1 -mr-1 rounded-lg"
          >
            <Undo2 size={14} />
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Task Detail (expandable, editable) ─────────────────────
function TaskDetail({
  task,
  onUpdate,
}: {
  task: TaskData;
  onUpdate: (id: string, updates: Partial<TaskData>) => void;
}) {
  const ChannelIcon = channelIcons[task.channel || ""] || ChevronRight;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueAt, setEditDueAt] = useState(task.due_at ? task.due_at.slice(0, 10) : "");
  const [editPriority, setEditPriority] = useState(task.priority);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Record<string, unknown> = {};
    if (editTitle !== task.title) updates.title = editTitle;
    if (editPriority !== task.priority) updates.priority = editPriority;
    const newDue = editDueAt ? new Date(editDueAt + "T09:00:00").toISOString() : null;
    if (newDue !== task.due_at) updates.due_at = newDue;

    if (Object.keys(updates).length > 0) {
      onUpdate(task.id, updates as Partial<TaskData>);
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDueAt(task.due_at ? task.due_at.slice(0, 10) : "");
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="pt-3 mt-3 border-t border-clara-border space-y-2.5 pl-3">
        {isEditing ? (
          <>
            {/* Edit title */}
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-sm font-medium text-clara-text bg-white border border-clara-border rounded-lg px-3 py-2 outline-none focus:border-clara-coral"
            />

            {/* Edit due date */}
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-clara-text-muted" />
              <input
                type="date"
                value={editDueAt}
                onChange={(e) => setEditDueAt(e.target.value)}
                className="text-xs text-clara-text bg-white border border-clara-border rounded-lg px-3 py-1.5 outline-none focus:border-clara-coral"
              />
            </div>

            {/* Edit priority */}
            <div className="flex items-center gap-2">
              <Tag size={12} className="text-clara-text-muted" />
              <div className="flex gap-1.5">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditPriority(p)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      editPriority === p
                        ? "border-clara-coral bg-clara-coral-light text-clara-coral font-medium"
                        : "border-clara-border text-clara-text-secondary"
                    }`}
                  >
                    {priorityLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={isSaving || !editTitle.trim()}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-clara-coral rounded-full px-4 py-1.5 disabled:opacity-50 active:opacity-70 transition-opacity"
              >
                <Save size={12} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-xs font-medium text-clara-text-secondary rounded-full px-4 py-1.5 active:opacity-70 transition-opacity"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Full title + edit button */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-clara-text">{task.title}</p>
              {task.status !== "done" && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-shrink-0 p-1.5 rounded-full text-clara-text-muted hover:text-clara-coral hover:bg-clara-coral-light transition-colors"
                  aria-label="Edit task"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>

            {/* Contact */}
            {task.contact_name && (
              <div className="flex items-center gap-2 text-xs text-clara-text-secondary">
                <span className="text-clara-text-muted">Contact:</span>
                {task.contact_id ? (
                  <Link
                    href={`/contacts/${task.contact_id}`}
                    className="text-clara-coral font-medium underline underline-offset-2"
                  >
                    {task.contact_name}
                  </Link>
                ) : (
                  <span>{task.contact_name}</span>
                )}
              </div>
            )}

            {/* Due date */}
            <div className="flex items-center gap-2 text-xs text-clara-text-secondary">
              <Calendar size={12} className="text-clara-text-muted" />
              <span>{formatFullDate(task.due_at)}</span>
            </div>

            {/* Channel */}
            {task.channel && (
              <div className="flex items-center gap-2 text-xs text-clara-text-secondary">
                <ChannelIcon size={12} className="text-clara-text-muted" />
                <span>{channelLabels[task.channel] || task.channel}</span>
              </div>
            )}

            {/* Priority */}
            <div className="flex items-center gap-2 text-xs text-clara-text-secondary">
              <Tag size={12} className="text-clara-text-muted" />
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${priorityDot(task.priority)}`} />
                {priorityLabel(task.priority)} priority
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <div className="text-xs text-clara-text-muted bg-clara-warm-gray rounded-lg p-2.5 mt-1">
                {task.description}
              </div>
            )}

            {/* Created date */}
            {task.created_at && (
              <p className="text-[11px] text-clara-text-muted pt-1">
                Created {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Clear all done confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Undo toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<{ id: string; prevStatus: TaskData["status"] } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const clearToast = useCallback(() => {
    setToastVisible(false);
    setLastCompletedTask(null);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks?include_done=true");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data)) {
          setTasks(data.map((t: TaskData) => normalizeTask(t)));
        } else {
          setTasks([]);
        }
      } catch {
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "snoozed");
  const completedTasks = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => {
      // Most recently completed first (use updated_at or created_at as proxy)
      const aTime = new Date(a.due_at || a.created_at || 0).getTime();
      const bTime = new Date(b.due_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

  const completeTask = async (id: string) => {
    hapticSuccess();

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const prevStatus = task.status;

    // Start completion animation
    setCompletingTaskId(id);

    // Wait for checkmark draw + hold (300ms draw + 300ms hold)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // After exit animation completes (~400ms), move to done
    await new Promise((resolve) => setTimeout(resolve, 400));
    setCompletingTaskId(null);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "done" as const } : t))
    );

    // Show undo toast
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setLastCompletedTask({ id, prevStatus });
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setLastCompletedTask(null);
    }, 4000);

    // Persist
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "done" }),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: prevStatus } : t))
        );
        clearToast();
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: prevStatus } : t))
      );
      clearToast();
    }
  };

  const uncompleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "pending" as const } : t))
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "pending" }),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "done" as const } : t))
        );
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "done" as const } : t))
      );
    }
  };

  const updateTask = async (id: string, updates: Partial<TaskData>) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        // Revert on failure — refetch
        const refetch = await fetch("/api/tasks?include_done=true");
        if (refetch.ok) {
          const data = await refetch.json();
          setTasks(Array.isArray(data) ? data.map((t: TaskData) => normalizeTask(t)) : []);
        }
      }
    } catch {
      // Revert
      const refetch = await fetch("/api/tasks?include_done=true");
      if (refetch.ok) {
        const data = await refetch.json();
        setTasks(Array.isArray(data) ? data.map((t: TaskData) => normalizeTask(t)) : []);
      }
    }
  };

  const handleUndo = useCallback(() => {
    if (!lastCompletedTask) return;
    hapticLight();
    uncompleteTask(lastCompletedTask.id);
    clearToast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCompletedTask, clearToast]);

  const clearAllDone = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/tasks", { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.status !== "done"));
      }
    } catch {
      // silently fail
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Tasks"
        subtitle={`${pendingTasks.length} follow-up${pendingTasks.length !== 1 ? "s" : ""}`}
      />

      <div className="px-5 space-y-6 pb-32">
        {/* Loading state */}
        {isLoading ? (
          <TaskListSkeleton />
        ) : (
          <>
            {/* Pending tasks */}
            {pendingTasks.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1">
                  Upcoming
                </h2>
                <AnimatePresence>
                {pendingTasks.map((task, i) => {
                  const ChannelIcon = channelIcons[task.channel || ""] || ChevronRight;
                  const isOverdue = task.due_at && new Date(task.due_at) < new Date();
                  const isExpanded = expandedTaskId === task.id;
                  const isCompleting = completingTaskId === task.id;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={
                        isCompleting
                          ? { y: -20, scale: 0.95, opacity: 0 }
                          : { opacity: 1, y: 0 }
                      }
                      exit={{ y: -20, scale: 0.95, opacity: 0 }}
                      transition={
                        isCompleting
                          ? { duration: 0.4, ease: "easeIn" }
                          : { delay: i * 0.05 }
                      }
                      layout
                      className="clara-card p-4"
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox with animated checkmark */}
                        <button
                          onClick={() => completeTask(task.id)}
                          className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center ${
                            isCompleting
                              ? "border-clara-coral bg-clara-coral"
                              : "border-clara-border hover:border-clara-coral active:bg-clara-coral-light"
                          }`}
                          aria-label="Complete task"
                        >
                          {isCompleting && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <motion.path
                                d="M2 6L5 9L10 3"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              />
                            </svg>
                          )}
                        </button>

                        {/* Content — tappable for detail */}
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot(task.priority)}`}
                            />
                            <p className="text-sm font-medium text-clara-text">
                              {task.title}
                            </p>
                          </div>
                          {task.description && !isExpanded && (
                            <p className="text-xs text-clara-text-muted mt-0.5 pl-3 truncate">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 pl-3">
                            <span
                              className={`text-xs flex items-center gap-1 ${
                                isOverdue
                                  ? "text-red-500 font-medium"
                                  : "text-clara-text-muted"
                              }`}
                            >
                              <Clock size={11} />
                              {formatDueDate(task.due_at)}
                            </span>
                            <span className="text-xs text-clara-text-muted flex items-center gap-1">
                              <ChannelIcon size={11} />
                              {task.contact_name}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Expandable detail */}
                      <AnimatePresence>
                        {isExpanded && <TaskDetail task={task} onUpdate={updateTask} />}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <Check size={32} className="text-clara-green/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-clara-text">
                  All caught up
                </p>
                <p className="text-xs text-clara-text-muted mt-1.5 max-w-[220px] mx-auto">
                  When you record a voice note, Clara will create follow-ups here automatically.
                </p>
              </div>
            )}

            {/* Completed tasks — collapsible */}
            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => setDoneExpanded(!doneExpanded)}
                    className="flex items-center gap-1.5 text-left"
                  >
                    <motion.span
                      animate={{ rotate: doneExpanded ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronRight size={14} className="text-clara-text-muted" />
                    </motion.span>
                    <h2 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider">
                      Done ({completedTasks.length})
                    </h2>
                  </button>

                  {doneExpanded && !showClearConfirm && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs font-medium text-clara-coral active:opacity-70 transition-opacity"
                    >
                      Clear all
                    </button>
                  )}

                  {doneExpanded && showClearConfirm && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-clara-text-muted">Clear all done tasks?</span>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="text-xs font-medium text-clara-text-secondary active:opacity-70"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={clearAllDone}
                        disabled={isClearing}
                        className="text-xs font-medium text-clara-coral active:opacity-70 disabled:opacity-50"
                      >
                        {isClearing ? "Clearing..." : "Clear"}
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {doneExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden space-y-2"
                    >
                      {completedTasks.map((task) => {
                        const isExpanded = expandedTaskId === task.id;

                        return (
                          <div
                            key={task.id}
                            className="clara-card p-4 opacity-60"
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => uncompleteTask(task.id)}
                                className="flex-shrink-0 w-6 h-6 rounded-full bg-clara-coral flex items-center justify-center active:opacity-70 transition-opacity"
                                aria-label="Mark as pending"
                              >
                                <Check size={12} className="text-white" />
                              </button>
                              <button
                                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-sm text-clara-text-secondary line-through">
                                  {task.title}
                                </p>
                                {task.contact_name && (
                                  <p className="text-xs text-clara-text-muted mt-0.5">
                                    {task.contact_name}
                                  </p>
                                )}
                              </button>
                            </div>

                            <AnimatePresence>
                              {isExpanded && <TaskDetail task={task} onUpdate={updateTask} />}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Undo toast */}
      <UndoToast
        visible={toastVisible}
        onUndo={handleUndo}
        onDismiss={clearToast}
      />
    </div>
  );
}
