import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getFadingRelationships } from "@/lib/supabase/queries";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    // Run all queries in parallel
    const [
      tasksResult,
      fadingResult,
      interactionsResult,
      contactCountResult,
      interactionCountResult,
      tasksDueTodayResult,
    ] = await Promise.all([
      // Upcoming tasks: next 5 not completed, ordered by due_at
      supabase
        .from("tasks")
        .select("*, contacts:contact_id (id, full_name, avatar_url)")
        .eq("user_id", DEMO_USER_ID)
        .in("status", ["pending", "snoozed"])
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(5),

      // Fading relationships
      getFadingRelationships(DEMO_USER_ID),

      // Recent interactions with contact names
      supabase
        .from("interactions")
        .select("*, interaction_contacts(contact_id, contacts:contact_id(id, full_name, avatar_url))")
        .eq("user_id", DEMO_USER_ID)
        .order("occurred_at", { ascending: false })
        .limit(5),

      // Total contacts count
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", DEMO_USER_ID),

      // Total interactions count
      supabase
        .from("interactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", DEMO_USER_ID),

      // Tasks due today
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", DEMO_USER_ID)
        .in("status", ["pending", "snoozed"])
        .gte("due_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("due_at", new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
    ]);

    return NextResponse.json({
      upcomingTasks: tasksResult.data ?? [],
      fadingRelationships: fadingResult ?? [],
      recentInteractions: interactionsResult.data ?? [],
      stats: {
        totalContacts: contactCountResult.count ?? 0,
        totalInteractions: interactionCountResult.count ?? 0,
        tasksDueToday: tasksDueTodayResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
