# Settings Page — Implementation Tasks

Broken down from `settings-page.md`. Tasks are ordered by dependency — backend first, then UI, then wiring.

---

## Phase 1: Database & Backend

### Task 1: DB migration — extend user_settings
- **File**: `supabase/migrations/010_settings_columns.sql`
- **Work**:
  - Add `morning_reminders_enabled BOOLEAN DEFAULT true` to `user_settings`
  - Add `reminder_hour INTEGER DEFAULT 8` to `user_settings`
- **Depends on**: Migration 008 (user_settings table exists)
- **Size**: XS

### Task 2: GET /api/settings endpoint
- **File**: `src/app/api/settings/route.ts`
- **Work**:
  - Fetch user settings from `user_settings` table (calendar connected, morning reminders, reminder hour)
  - Fetch stats: count of contacts, interactions, tasks, facts for this user
  - Return combined JSON response
- **Response shape**:
  ```json
  {
    "calendar_connected": true,
    "morning_reminders_enabled": true,
    "reminder_hour": 8,
    "stats": { "contacts": 214, "interactions": 47, "tasks": 12, "facts": 89 }
  }
  ```
- **Depends on**: Task 1
- **Size**: S

### Task 3: PATCH /api/settings endpoint
- **File**: `src/app/api/settings/route.ts` (same file, add PATCH handler)
- **Work**:
  - Accept `{ morning_reminders_enabled?, reminder_hour? }`
  - Upsert into `user_settings` table
  - Return updated settings
- **Depends on**: Task 1
- **Size**: XS

### Task 4: DELETE /api/calendar/disconnect endpoint
- **File**: `src/app/api/calendar/disconnect/route.ts`
- **Work**:
  - Clear `google_calendar_refresh_token`, `google_calendar_access_token`, `google_calendar_token_expiry`
  - Set `google_calendar_connected = false`
  - Return `{ ok: true }`
- **Depends on**: Task 1
- **Size**: XS

### Task 5: GET /api/settings/export endpoint
- **File**: `src/app/api/settings/export/route.ts`
- **Work**:
  - Fetch all user data: contacts, interactions (with interaction_contacts join), facts, tasks, contact_relationships
  - Build JSON object with all data
  - Return with `Content-Disposition: attachment; filename="clara-export.json"` header
  - Set `Content-Type: application/json`
- **Depends on**: None (uses existing tables)
- **Size**: S

### Task 6: POST /api/auth/logout endpoint
- **File**: `src/app/api/auth/logout/route.ts`
- **Work**:
  - Call Supabase `auth.signOut()`
  - Clear any auth cookies
  - Return `{ ok: true }`
- **Depends on**: None
- **Size**: XS

### Task 7: DELETE /api/settings/account endpoint
- **File**: `src/app/api/settings/account/route.ts`
- **Work**:
  - Verify confirmation (body must include `{ confirm: "DELETE" }`)
  - Delete all user data from: tasks, interactions, interaction_contacts, contact_facts, contact_relationships, contacts, user_settings, push_subscriptions
  - Call Supabase admin `deleteUser()` or sign out and mark as deleted
  - Return `{ ok: true }`
- **Security**: Requires typed confirmation from client
- **Depends on**: None
- **Size**: S

---

## Phase 2: UI Components

### Task 8: Toggle switch component
- **File**: `src/components/ui/Toggle.tsx`
- **Work**:
  - Reusable toggle switch component
  - Props: `enabled: boolean`, `onChange: (val: boolean) => void`, `disabled?: boolean`
  - Clara design: `clara-coral` when on, `clara-border` when off
  - Animated knob with Framer Motion or CSS transition
- **Depends on**: None
- **Size**: S

### Task 9: Settings page — layout + profile section
- **File**: `src/app/settings/page.tsx`
- **Work**:
  - Page shell with Header (title "Settings", back button via `router.back()`)
  - Fetch user profile from Supabase `auth.getUser()` on client
  - Fetch settings from `GET /api/settings`
  - Profile card: avatar (initials), name, email
  - Section header component for reuse
  - Loading skeleton while data fetches
- **Depends on**: Task 2
- **Size**: M

### Task 10: Settings page — integrations section
- **File**: `src/app/settings/page.tsx` (add to page)
- **Work**:
  - Google Calendar row: green dot + "Connected" or "Connect" button
  - Disconnect button → calls `DELETE /api/calendar/disconnect`, updates state
  - Google Contacts row: "Import contacts" → navigate to `/contacts`
  - Chrome Extension row: "Install" link (placeholder URL)
- **Depends on**: Task 4, Task 9
- **Size**: S

### Task 11: Settings page — notifications section
- **File**: `src/app/settings/page.tsx` (add to page)
- **Work**:
  - Push notifications: check `Notification.permission` on mount
    - `granted`: show enabled toggle (display only — can't revoke from JS)
    - `denied`: show "Blocked" message with instructions
    - `default`: show "Enable" button → request permission → subscribe
  - Morning reminders toggle: bound to `morning_reminders_enabled`
    - On change → `PATCH /api/settings` with new value
  - Use Toggle component from Task 8
- **Depends on**: Task 3, Task 8, Task 9
- **Size**: S

### Task 12: Settings page — data & privacy section
- **File**: `src/app/settings/page.tsx` (add to page)
- **Work**:
  - Stats line: "214 contacts · 47 interactions · 12 tasks" from settings API
  - Export button: triggers `GET /api/settings/export`, downloads file
    - Show loading spinner while fetching
    - Create blob + download link on client
  - Clear chat history button: confirmation dialog → `localStorage.removeItem("clara_chat_history")` → toast
  - Delete account button: two-step confirmation
    - First tap: show warning text
    - Second step: text input where user must type "DELETE"
    - On confirm → `DELETE /api/settings/account` → clear localStorage → redirect to `/login`
- **Depends on**: Task 5, Task 7, Task 9
- **Size**: M

### Task 13: Settings page — about section + logout
- **File**: `src/app/settings/page.tsx` (add to page)
- **Work**:
  - App version: hardcoded or read from env
  - "Report a bug" link (mailto or GitHub URL)
  - Log out button:
    - Calls `POST /api/auth/logout`
    - Clears localStorage (`clara_onboarded`, `clara_chat_history`, `clara_push_dismissed`, all `clara_tip_*`)
    - Redirects to `/login`
- **Depends on**: Task 6, Task 9
- **Size**: S

---

## Phase 3: Navigation Wiring

### Task 14: Add gear icon to home page header
- **File**: `src/app/page.tsx`
- **Work**:
  - Import `Settings` icon from lucide-react
  - Add action to Header component: `{ icon: Settings, label: "", onClick: () => router.push("/settings") }`
  - Should render as a small gear icon in the top-right
- **Depends on**: Task 9
- **Size**: XS

---

## Summary

| Task | Description | Size | Depends on |
|------|-------------|------|-----------|
| 1 | DB migration — extend user_settings | XS | — |
| 2 | GET /api/settings | S | 1 |
| 3 | PATCH /api/settings | XS | 1 |
| 4 | DELETE /api/calendar/disconnect | XS | 1 |
| 5 | GET /api/settings/export | S | — |
| 6 | POST /api/auth/logout | XS | — |
| 7 | DELETE /api/settings/account | S | — |
| 8 | Toggle switch component | S | — |
| 9 | Settings page — layout + profile | M | 2 |
| 10 | Settings page — integrations | S | 4, 9 |
| 11 | Settings page — notifications | S | 3, 8, 9 |
| 12 | Settings page — data & privacy | M | 5, 7, 9 |
| 13 | Settings page — about + logout | S | 6, 9 |
| 14 | Gear icon on home page | XS | 9 |

**Total: 14 tasks** — 5 XS, 5 S, 2 M (no L)

### Recommended build order
1. **Parallel batch 1** (no dependencies): Tasks 1, 5, 6, 7, 8
2. **Parallel batch 2** (need Task 1): Tasks 2, 3, 4
3. **Task 9** (needs Task 2 — page shell + profile)
4. **Parallel batch 3** (need Task 9): Tasks 10, 11, 12, 13
5. **Task 14** (gear icon on home page)
