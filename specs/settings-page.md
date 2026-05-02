# Settings Page Spec

## Overview
A full settings page at `/settings` where users can manage their account, integrations, notification preferences, and data. Accessible from a gear icon on the home page header.

## Route
`/settings` — added to Shell's fullscreen exclusion list (no bottom nav padding needed, but keep nav visible).

## Sections

### 1. Profile
- **Display**: User avatar (initials fallback), name, email — pulled from Supabase `auth.getUser()`
- **Actions**: None in v1 (Supabase manages profile via OAuth/magic link)
- **Component**: Static card at top of page

### 2. Integrations

#### Google Calendar
- **Connected state**: Show green dot + "Connected" label, "Disconnect" button
- **Disconnected state**: Show "Connect Google Calendar" button → redirects to `/api/auth/google/calendar`
- **Disconnect action**: `DELETE /api/calendar/disconnect` — clears tokens from `user_settings`, sets `google_calendar_connected: false`
- **Data source**: `GET /api/settings` → returns `{ calendar_connected: boolean }`

#### Google Contacts
- **Show**: "Import contacts" button → navigates to `/contacts` (existing import flow)
- **Show**: Last import date if available

#### Chrome Extension
- **Show**: Status indicator — check if any push subscriptions exist from extension user-agent
- **Show**: "Install Chrome Extension" link to Chrome Web Store (placeholder URL for now)

### 3. Notifications
- **Push notifications toggle**: 
  - If `Notification.permission === 'granted'`: show enabled toggle
  - If `'denied'`: show "Blocked — enable in browser settings" with instructions
  - If `'default'`: show "Enable notifications" button (reuse PushPrompt logic)
- **Morning reminder toggle**: Enable/disable the 8am daily reminder cron (stored in `user_settings.morning_reminders_enabled`, default true)
- **Reminder time picker**: Let user choose reminder time (stored in `user_settings.reminder_hour`, default 8) — stretch goal for v2

### 4. Data & Privacy
- **Export my data**: Button that triggers `GET /api/settings/export` → returns a JSON file with all user contacts, interactions, facts, tasks, and relationships
- **Contact count**: "214 contacts, 47 interactions, 12 tasks"
- **Clear chat history**: Button to clear localStorage `clara_chat_history` with confirmation
- **Delete account**: Red destructive button with two-step confirmation ("Delete my account" → "This is permanent. Type DELETE to confirm" → calls Supabase `auth.admin.deleteUser()`)

### 5. About
- **App version**: Read from `package.json` version
- **"Built with Clara"**: Link to project
- **"Report a bug"**: mailto or GitHub issues link

## API Endpoints

### `GET /api/settings`
Returns user settings:
```json
{
  "calendar_connected": true,
  "morning_reminders_enabled": true,
  "reminder_hour": 8,
  "stats": {
    "contacts": 214,
    "interactions": 47,
    "tasks": 12,
    "facts": 89
  }
}
```

### `PATCH /api/settings`
Updates user settings. Body: `{ morning_reminders_enabled?: boolean, reminder_hour?: number }`

### `DELETE /api/calendar/disconnect`
Clears Google Calendar tokens. Sets `google_calendar_connected: false`.

### `GET /api/settings/export`
Returns full data export as JSON download (`Content-Disposition: attachment`).

## DB Changes
Add columns to `user_settings` table:
```sql
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS morning_reminders_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_hour INTEGER DEFAULT 8;
```

## UI Layout

```
┌─────────────────────────────────┐
│  ← Settings                     │
├─────────────────────────────────┤
│                                 │
│  [Avatar]                       │
│  John Doe                       │
│  john@example.com               │
│                                 │
├─────────────────────────────────┤
│  INTEGRATIONS                   │
│                                 │
│  📅 Google Calendar    Connected│
│     [Disconnect]                │
│                                 │
│  👥 Google Contacts             │
│     [Import contacts →]         │
│                                 │
│  🧩 Chrome Extension            │
│     [Install →]                 │
│                                 │
├─────────────────────────────────┤
│  NOTIFICATIONS                  │
│                                 │
│  Push notifications    [Toggle] │
│  Morning reminders     [Toggle] │
│                                 │
├─────────────────────────────────┤
│  DATA & PRIVACY                 │
│                                 │
│  214 contacts · 47 interactions │
│                                 │
│  [Export my data]               │
│  [Clear chat history]           │
│  [Delete account]               │
│                                 │
├─────────────────────────────────┤
│  Clara v0.1.0                   │
│  Report a bug                   │
│                                 │
│  [Log out]                      │
│                                 │
└─────────────────────────────────┘
```

## Navigation
- Add gear icon to home page Header: `{ icon: Settings, label: "", onClick: () => router.push("/settings") }`
- Add "Settings" to MobileNav? **No** — keep nav clean at 4 tabs. Settings is reachable from home page header.
- Back button at top-left navigates to previous page via `router.back()`

## Components
- `src/app/settings/page.tsx` — main page (~300-400 lines)
- `src/app/api/settings/route.ts` — GET/PATCH for user settings
- `src/app/api/settings/export/route.ts` — GET data export
- `src/app/api/calendar/disconnect/route.ts` — DELETE to disconnect calendar

## Design
- Follow existing Clara design language (clara-card, clara-coral for accents, cream background)
- Section headers: same `text-xs font-semibold text-clara-text-muted uppercase tracking-wider` pattern
- Toggle switches: custom component with clara-coral active color
- Destructive actions: red text, two-step confirmation pattern (same as contact delete)

## Edge Cases
- User not logged in → redirect to `/login`
- Calendar token expired → show "Reconnect" instead of "Connected"
- Push permission denied at browser level → show instructions to re-enable
- Export with large dataset → stream response, show loading indicator
- Delete account → clear all localStorage, redirect to `/login`

## Acceptance Criteria
- [ ] Settings page renders with all 5 sections
- [ ] Profile shows current user's name and email
- [ ] Calendar connect/disconnect works
- [ ] Push notification toggle reflects actual browser permission state
- [ ] Morning reminders toggle persists to DB
- [ ] Export downloads a valid JSON file
- [ ] Clear chat history works with confirmation
- [ ] Delete account works with typed confirmation
- [ ] Log out clears session and redirects to /login
- [ ] Gear icon on home page navigates to settings
- [ ] Back navigation works
