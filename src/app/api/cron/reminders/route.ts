import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase/client";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:hello@claracrm.app";
const CRON_SECRET = process.env.CRON_SECRET || "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * GET /api/cron/reminders
 * Called by Vercel Cron daily at 8am.
 * Sends push notifications for:
 * 1. Tasks due today
 * 2. Overdue tasks still pending
 * 3. Fading relationships (optional nudge)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  // 1. Find tasks due today or overdue
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, user_id, title, due_at")
    .eq("status", "pending")
    .lte("due_at", todayEnd)
    .order("due_at", { ascending: true });

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, tasks: 0 });
  }

  // Group tasks by user
  const tasksByUser = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const existing = tasksByUser.get(task.user_id) || [];
    existing.push(task);
    tasksByUser.set(task.user_id, existing);
  }

  let totalSent = 0;

  for (const [userId, userTasks] of tasksByUser) {
    // Get push subscriptions for this user
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) continue;

    const overdue = userTasks.filter((t) => t.due_at && new Date(t.due_at) < new Date(todayStart));
    const dueToday = userTasks.filter(
      (t) => t.due_at && new Date(t.due_at) >= new Date(todayStart) && new Date(t.due_at) < new Date(todayEnd)
    );

    let body: string;
    if (dueToday.length === 1 && overdue.length === 0) {
      body = dueToday[0].title;
    } else if (dueToday.length > 0 && overdue.length > 0) {
      body = `${dueToday.length} due today, ${overdue.length} overdue`;
    } else if (dueToday.length > 1) {
      body = `${dueToday.length} follow-ups due today`;
    } else if (overdue.length > 0) {
      body = `${overdue.length} overdue follow-up${overdue.length > 1 ? "s" : ""}`;
    } else {
      continue;
    }

    const payload = JSON.stringify({
      title: "Clara Reminder",
      body,
      url: "/tasks",
      tag: "daily-reminder",
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        totalSent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    // Mark today's tasks as notified
    for (const task of dueToday) {
      await supabase
        .from("tasks")
        .update({ notification_sent: true })
        .eq("id", task.id);
    }
  }

  return NextResponse.json({ sent: totalSent, tasks: tasks.length });
}
