import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/client";

/**
 * GET /auth/callback
 * Handles Supabase auth callback (magic link + OAuth).
 * Exchanges the code for a session and redirects to home.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createAuthClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
