import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  const status = req.nextUrl.searchParams.get("status") || "active";

  let query = supabase
    .from("contacts")
    .select("id, full_name, company, role, tags, relationship_strength, last_interaction_at, status")
    .eq("user_id", userId)
    .order("last_interaction_at", { ascending: false, nullsFirst: false });

  if (status === "hidden") {
    query = query.eq("status", "hidden");
  } else {
    // Default: only active contacts
    query = query.or("status.eq.active,status.is.null");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  const body = await req.json();

  const { data, error } = await supabase
    .from("contacts")
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
