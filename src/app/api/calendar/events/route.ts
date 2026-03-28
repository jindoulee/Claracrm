import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/client";

/**
 * GET /api/calendar/events
 * Fetches recent Google Calendar events (past 24h + upcoming 24h)
 * and matches attendees to existing contacts.
 */
export async function GET() {
  const userId = await getUserId();

  // Get calendar tokens from user settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!settings?.google_calendar_connected) {
    return NextResponse.json({ connected: false, events: [] });
  }

  let accessToken = settings.google_calendar_access_token;
  const tokenExpiry = settings.google_calendar_token_expiry;
  const refreshToken = settings.google_calendar_refresh_token;

  // Refresh token if expired
  if (tokenExpiry && new Date(tokenExpiry) < new Date() && refreshToken) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (clientId && clientSecret) {
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;

          // Update stored token
          await supabase
            .from("user_settings")
            .update({
              google_calendar_access_token: accessToken,
              google_calendar_token_expiry: new Date(
                Date.now() + (tokenData.expires_in || 3600) * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } else {
          // Refresh failed — mark as disconnected
          await supabase
            .from("user_settings")
            .update({
              google_calendar_connected: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          return NextResponse.json({ connected: false, events: [], needsReconnect: true });
        }
      } catch {
        return NextResponse.json({ connected: false, events: [], error: "Token refresh failed" });
      }
    }
  }

  // Fetch events from Google Calendar API
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin: past24h.toISOString(),
          timeMax: next24h.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "20",
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calRes.ok) {
      if (calRes.status === 401) {
        return NextResponse.json({ connected: false, events: [], needsReconnect: true });
      }
      return NextResponse.json({ connected: true, events: [] });
    }

    const calData = await calRes.json();
    const events = calData.items || [];

    // Get existing contacts for matching
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, email")
      .eq("user_id", userId)
      .or("status.eq.active,status.is.null");

    // Get existing interactions to check which events are already logged
    const { data: existingInteractions } = await supabase
      .from("interactions")
      .select("id, calendar_event_id")
      .eq("user_id", userId)
      .not("calendar_event_id", "is", null);

    const loggedEventIds = new Set(
      (existingInteractions || []).map((i) => (i as Record<string, unknown>).calendar_event_id)
    );

    // Build contact lookup maps
    const contactByEmail = new Map<string, { id: string; full_name: string }>();
    const contactByName = new Map<string, { id: string; full_name: string }>();
    for (const c of contacts || []) {
      if (c.email) contactByEmail.set(c.email.toLowerCase(), { id: c.id, full_name: c.full_name });
      contactByName.set(c.full_name.toLowerCase(), { id: c.id, full_name: c.full_name });
    }

    // Process events and match attendees
    interface CalendarEvent {
      id: string;
      summary: string;
      start: string;
      end: string;
      attendees: Array<{
        email: string;
        displayName: string;
        matched_contact: { id: string; full_name: string } | null;
      }>;
      location: string | null;
      isPast: boolean;
      alreadyLogged: boolean;
    }

    const processedEvents: CalendarEvent[] = events
      .filter((e: Record<string, unknown>) => {
        // Skip all-day events and cancelled events
        const start = e.start as Record<string, string> | undefined;
        if (!start?.dateTime) return false;
        if (e.status === "cancelled") return false;
        return true;
      })
      .map((e: Record<string, unknown>) => {
        const attendees = ((e.attendees as Array<Record<string, string>>) || [])
          .filter((a) => !a.self) // Exclude the user themselves
          .map((a) => {
            const email = a.email?.toLowerCase() || "";
            const displayName = a.displayName || email.split("@")[0] || "";

            // Try to match to existing contact
            let matchedContact = contactByEmail.get(email) || null;
            if (!matchedContact && displayName) {
              matchedContact = contactByName.get(displayName.toLowerCase()) || null;
            }

            return {
              email: a.email || "",
              displayName,
              matched_contact: matchedContact,
            };
          });

        const start = (e.start as Record<string, string>)?.dateTime || "";
        const end = (e.end as Record<string, string>)?.dateTime || "";

        return {
          id: e.id as string,
          summary: (e.summary as string) || "Untitled event",
          start,
          end,
          attendees,
          location: (e.location as string) || null,
          isPast: new Date(start) < now,
          alreadyLogged: loggedEventIds.has(e.id),
        };
      });

    // Sort: past unlogged events first (suggestions), then future events
    processedEvents.sort((a: CalendarEvent, b: CalendarEvent) => {
      if (a.isPast && !a.alreadyLogged && (!b.isPast || b.alreadyLogged)) return -1;
      if (b.isPast && !b.alreadyLogged && (!a.isPast || a.alreadyLogged)) return 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

    return NextResponse.json({
      connected: true,
      events: processedEvents,
    });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json({ connected: true, events: [], error: "Failed to fetch events" });
  }
}
