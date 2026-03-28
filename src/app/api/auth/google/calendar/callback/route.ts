import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

/**
 * GET /api/auth/google/calendar/callback
 * Exchanges auth code for tokens and stores refresh token for ongoing calendar access.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(new URL("/?calendar=cancelled", req.url));
  }

  if (state !== "clara-calendar-connect") {
    return NextResponse.redirect(new URL("/?calendar=error", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?calendar=error", req.url));
  }

  const redirectUri = `${baseUrl}/api/auth/google/calendar/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Calendar token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/?calendar=error", req.url));
    }

    const tokenData = await tokenRes.json();
    const userId = await getUserId();

    // Store the refresh token in user_settings so we can fetch calendar data later
    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        google_calendar_refresh_token: tokenData.refresh_token || null,
        google_calendar_access_token: tokenData.access_token,
        google_calendar_token_expiry: new Date(
          Date.now() + (tokenData.expires_in || 3600) * 1000
        ).toISOString(),
        google_calendar_connected: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(new URL("/?calendar=connected", req.url));
  } catch (err) {
    console.error("Calendar callback error:", err);
    return NextResponse.redirect(new URL("/?calendar=error", req.url));
  }
}
