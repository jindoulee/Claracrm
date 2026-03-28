import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/client";
import { supabase } from "@/lib/supabase/client";

/**
 * POST /api/push/subscribe
 * Save a push subscription for the current user.
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  const { subscription } = await request.json();

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription.
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  const { endpoint } = await request.json();

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
