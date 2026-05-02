# Calendar Integration Spec

## Overview
Already built. This spec documents the existing implementation and planned enhancements.

## Current State (v1 — shipped)
- Google OAuth flow with `calendar.events.readonly` scope
- Token storage in `user_settings` table with refresh token support
- `GET /api/calendar/events` — fetches past 24h + upcoming 24h events
- Attendee matching against existing contacts (by email and name)
- `POST /api/calendar/log` — creates interaction from calendar event
- Home page shows "Recent meetings" with one-tap "Log" button
- "Connect Google Calendar" prompt for unconnected users
- Dedup via `calendar_event_id` on interactions table

## DB Tables
- `user_settings` — stores OAuth tokens, calendar connection status
- `interactions.calendar_event_id` — tracks which events are already logged

## Setup
- Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- Add redirect URI: `{base_url}/api/auth/google/calendar/callback` to Google OAuth console
- Enable Google Calendar API in Google Cloud Console
- Run migrations: `008_user_settings.sql`, `009_calendar_integration.sql`

## Planned Enhancements (v2)
- Auto-sync: cron job every 30 min to fetch new events and auto-log meetings with known contacts
- Meeting prep: before a meeting starts, show a brief of each attendee (facts, last interaction, relationship strength)
- Post-meeting prompt: after a meeting ends, prompt user to add notes
- Calendar event creation: when Clara creates a follow-up task, optionally create a Google Calendar event

## Acceptance Criteria (v1)
- [x] OAuth connect/disconnect flow
- [x] Fetch and display calendar events
- [x] Match attendees to contacts
- [x] One-tap logging of past meetings
- [x] Dedup (no double-logging)
- [ ] Disconnect button in settings (needs settings page)
