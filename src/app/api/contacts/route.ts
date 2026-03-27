import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { DEMO_USER_ID } from "@/lib/config";

export async function GET() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("last_interaction_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("contacts")
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
