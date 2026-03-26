import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      contacts:contact_id (id, full_name, avatar_url)
    `)
    .eq("user_id", DEMO_USER_ID)
    .in("status", ["pending", "snoozed"])
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: DEMO_USER_ID,
      ...body,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
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
