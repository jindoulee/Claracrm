import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getFadingRelationships } from "@/lib/supabase/queries";
import { DEMO_USER_ID } from "@/lib/config";

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

    // Flatten interaction_contacts join into a simple contacts array
    const recentInteractions = (interactionsResult.data ?? []).map(
      (interaction: Record<string, unknown>) => {
        const icJoin = interaction.interaction_contacts as
          | Array<{ contact_id: string; contacts: { id: string; full_name: string; avatar_url: string | null } }>
          | undefined;
        const contacts = (icJoin ?? []).map((ic) => ({
          id: ic.contacts.id,
          full_name: ic.contacts.full_name,
        }));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interaction_contacts, ...rest } = interaction;
        return { ...rest, contacts };
      }
    );

    return NextResponse.json({
      upcomingTasks: tasksResult.data ?? [],
      fadingRelationships: fadingResult ?? [],
      recentInteractions,
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
