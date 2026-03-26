"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import {
  Check,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react";
import { hapticSuccess } from "@/lib/utils/haptics";

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "done" | "snoozed" | "cancelled";
  priority: "low" | "medium" | "high";
  channel: string | null;
  contact_name: string;
  contacts?: { id: string; full_name: string; avatar_url: string | null } | null;
}

const INITIAL_TASKS: TaskData[] = [
  {
    id: "1",
    title: "Text Alan about his kids",
    description: "Check if they're feeling better",
    due_at: new Date(Date.now() + 86400000 * 14).toISOString(),
    status: "pending",
    priority: "medium",
    channel: "sms",
    contact_name: "Alan Chen",
  },
  {
    id: "2",
    title: "Wish Alan well on new role",
    description: "Send a congratulatory message",
    due_at: new Date(Date.now() + 86400000).toISOString(),
    status: "pending",
    priority: "high",
    channel: "any",
    contact_name: "Alan Chen",
  },
  {
    id: "3",
    title: "Follow up with Sarah on intro",
    description: "She mentioned connecting us with her investor friend",
    due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: "pending",
    priority: "medium",
    channel: "email",
    contact_name: "Sarah Kim",
  },
];

const channelIcons: Record<string, typeof MessageSquare> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
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

function priorityDot(priority: string) {
  if (priority === "high") return "bg-clara-coral";
  if (priority === "medium") return "bg-clara-amber";
  return "bg-clara-text-muted";
}

function normalizeTask(task: TaskData): TaskData {
  // If the task came from the API with a joined contacts object, extract the name
  if (task.contacts && !task.contact_name) {
    return { ...task, contact_name: task.contacts.full_name };
  }
  return task;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTasks(
            data.map((t: TaskData) => normalizeTask(t))
          );
        } else {
          setTasks(INITIAL_TASKS);
        }
      } catch {
        setTasks(INITIAL_TASKS);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "snoozed");
  const completedTasks = tasks.filter((t) => t.status === "done");

  const toggleTask = async (id: string) => {
    hapticSuccess();

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === "pending" || task.status === "snoozed" ? "done" : "pending";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus as TaskData["status"] } : t
      )
    );

    // Persist to API
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: task.status } : t
          )
        );
      }
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: task.status } : t
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Tasks"
        subtitle={`${pendingTasks.length} follow-ups`}
      />

      <div className="px-5 space-y-6">
        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-clara-coral border-t-transparent rounded-full animate-spin" />
            <p className="text-clara-text-muted text-sm mt-3">Loading tasks...</p>
          </div>
        ) : (
          <>
            {/* Pending tasks */}
            {pendingTasks.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1">
                  Upcoming
                </h2>
                {pendingTasks.map((task, i) => {
                  const ChannelIcon = channelIcons[task.channel || ""] || ChevronRight;
                  const isOverdue = task.due_at && new Date(task.due_at) < new Date();

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="clara-card p-4 flex items-start gap-3"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-clara-border hover:border-clara-coral transition-colors flex items-center justify-center"
                      >
                        {task.status === "done" && (
                          <Check size={12} className="text-clara-coral" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${priorityDot(task.priority)}`}
                          />
                          <p className="text-sm font-medium text-clara-text">
                            {task.title}
                          </p>
                        </div>
                        {task.description && (
                          <p className="text-xs text-clara-text-muted mt-0.5 pl-3">
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
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-clara-text-secondary text-sm">
                  All caught up!
                </p>
                <p className="text-clara-text-muted text-xs mt-1">
                  Clara will add follow-ups as you log interactions.
                </p>
              </div>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider px-1">
                  Done
                </h2>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="clara-card p-4 flex items-center gap-3 opacity-50"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex-shrink-0 w-5 h-5 rounded-full bg-clara-coral flex items-center justify-center"
                    >
                      <Check size={12} className="text-white" />
                    </button>
                    <p className="text-sm text-clara-text-secondary line-through">
                      {task.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
