import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  const includeDone = req.nextUrl.searchParams.get("include_done") === "true";

  const statusFilter = includeDone
    ? ["pending", "snoozed", "done"]
    : ["pending", "snoozed"];

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      contacts:contact_id (id, full_name, avatar_url)
    `)
    .eq("user_id", userId)
    .in("status", statusFilter)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  const body = await req.json();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      ...body,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE() {
  const userId = await getUserId();
  const { error, count } = await supabase
    .from("tasks")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("status", "done");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  const { id, ...updates } = await req.json();

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
