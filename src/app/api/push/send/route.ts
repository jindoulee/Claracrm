import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:hello@claracrm.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * POST /api/push/send
 * Send push notifications for tasks due soon.
 * Can also be called with a specific payload to notify the current user.
 */
export async function POST(request: NextRequest) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const body = await request.json();

  // If a specific notification payload is provided, send to current user
  if (body.title) {
    const userId = await getUserId();
    return await sendToUser(userId, {
      title: body.title,
      body: body.body || "",
      url: body.url || "/",
      tag: body.tag || "clara-notification",
    });
  }

  // Otherwise, check for due tasks and notify
  return await notifyDueTasks();
}

async function sendToUser(
  userId: string,
  payload: { title: string; body: string; url: string; tag: string }
) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscriptions found" });
  }

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      // Remove expired/invalid subscriptions
      if (statusCode === 410 || statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      console.error("Push send error:", err);
    }
  }

  return NextResponse.json({ sent });
}

async function notifyDueTasks() {
  // Find tasks due in the next hour that haven't been notified yet
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, contact_id, due_at")
    .eq("status", "pending")
    .eq("notification_sent", false)
    .gte("due_at", now.toISOString())
    .lte("due_at", oneHourLater.toISOString());

  if (error || !tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, tasks: 0 });
  }

  let totalSent = 0;

  for (const task of tasks) {
    const result = await sendToUser(task.user_id, {
      title: "Clara Reminder",
      body: task.title,
      url: "/tasks",
      tag: `task-${task.id}`,
    });

    const resultData = await result.json();
    if (resultData.sent > 0) {
      totalSent += resultData.sent;
      // Mark task as notified
      await supabase
        .from("tasks")
        .update({ notification_sent: true })
        .eq("id", task.id);
    }
  }

  return NextResponse.json({ sent: totalSent, tasks: tasks.length });
}
