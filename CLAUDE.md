@AGENTS.md

# ClaraCRM

Voice-first personal CRM. "Clara remembers everything so you don't have to."

## Commands
- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build (Turbopack)
- `npm run lint` — ESLint
- No test framework configured yet

## Tech Stack
- **Framework**: Next.js 16.2.1 (App Router, React 19, Turbopack)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **AI**: OpenAI GPT-4o (voice/clip extraction), Anthropic Claude (chat, follow-ups)
- **Styling**: Tailwind CSS 4 + Framer Motion 12
- **Icons**: Lucide React
- **Push**: web-push (VAPID)
- **Language**: TypeScript (strict)

## Git Workflow
- **Always commit and push directly to `main`** — no feature branches
- Vercel auto-deploys from `main`

## Project Structure

```
src/
├── app/                          # Pages + API routes (App Router)
│   ├── page.tsx                  # Home — voice recorder, dashboard, calendar suggestions
│   ├── layout.tsx                # Root layout, metadata, viewport
│   ├── contacts/
│   │   ├── page.tsx              # Contact list — search, sort (A-Z/Recent/Strength), swipe-to-hide, infinite scroll
│   │   ├── [id]/page.tsx         # Contact detail — profile, facts, relationships, interactions, tasks, delete
│   │   └── importing/page.tsx    # Google import loading/result screen
│   ├── tasks/page.tsx            # Task list — pending/done, complete with undo, inline editing
│   ├── interactions/page.tsx     # Activity timeline — grouped by date, expandable
│   ├── login/page.tsx            # Google OAuth + magic link sign-in
│   ├── onboarding/page.tsx       # 3-slide intro carousel
│   ├── auth/callback/route.ts    # Supabase auth callback
│   └── api/
│       ├── voice/route.ts        # POST — process voice transcript via AI pipeline
│       ├── clip/route.ts         # POST — process clipped web content (Chrome extension)
│       ├── chat/route.ts         # POST — Clara chat with CRM context
│       ├── contacts/route.ts     # GET/POST — list/create contacts (status filter, trimmed select)
│       ├── contacts/[id]/route.ts # GET/PATCH/DELETE — single contact CRUD
│       ├── contacts/merge/route.ts # POST — merge duplicate contacts
│       ├── interactions/route.ts # GET/POST — interactions with contact join
│       ├── tasks/route.ts        # GET/POST/PATCH/DELETE — full task CRUD
│       ├── dashboard/route.ts    # GET — home page data (tasks, interactions, fading contacts, stats)
│       ├── search/route.ts       # GET — search contacts, facts, interactions
│       ├── calendar/events/route.ts  # GET — fetch Google Calendar events, match attendees
│       ├── calendar/log/route.ts     # POST — log calendar event as interaction
│       ├── cron/reminders/route.ts   # GET — Vercel Cron daily push notifications
│       ├── push/subscribe/route.ts   # POST/DELETE — manage push subscriptions
│       ├── push/send/route.ts        # POST — send push notifications
│       ├── import/route.ts           # POST — import contacts from CSV/VCF
│       ├── import/google/route.ts    # POST — import from Google People API
│       ├── facts/[id]/route.ts       # DELETE — remove a contact fact
│       ├── auth/google/route.ts          # GET — initiate Google OAuth (contacts scope)
│       ├── auth/google/callback/route.ts # GET — handle Google OAuth callback
│       ├── auth/google/calendar/route.ts          # GET — initiate Google OAuth (calendar scope)
│       └── auth/google/calendar/callback/route.ts # GET — handle calendar OAuth callback
│
├── components/
│   ├── voice/
│   │   ├── VoiceRecorder.tsx     # Mic button + Web Speech API recording
│   │   ├── SummaryCard.tsx       # Post-recording extraction summary, editable
│   │   ├── VoiceWaveform.tsx     # Animated waveform during recording
│   │   └── TranscriptPreview.tsx # Live transcript display
│   ├── chat/
│   │   └── ChatSheet.tsx         # Full chat with Clara (localStorage persistence, voice input)
│   ├── contacts/
│   │   ├── ContactCard.tsx       # Contact card with swipe-to-hide (Framer Motion drag)
│   │   └── ImportSheet.tsx       # File upload for CSV/VCF import
│   ├── interactions/
│   │   └── InteractionTimeline.tsx # Reusable timeline component
│   ├── notifications/
│   │   └── PushPrompt.tsx        # Non-intrusive push notification permission banner
│   ├── layout/
│   │   ├── Shell.tsx             # App shell — ToastProvider, ErrorBoundary, MobileNav, PushPrompt
│   │   ├── Header.tsx            # Sticky header with title, subtitle, action buttons
│   │   └── MobileNav.tsx         # 4-tab bottom nav (Home, People, Activity, Tasks)
│   └── ui/
│       ├── BottomSheet.tsx       # Reusable bottom sheet modal
│       ├── ErrorBoundary.tsx     # React error boundary with retry
│       ├── Skeleton.tsx          # Loading skeletons (Home, ContactList, TaskList, ContactDetail, Interaction)
│       └── Toast.tsx             # Toast notifications with optional undo action
│
├── lib/
│   ├── ai/
│   │   ├── process-voice.ts     # GPT-4o extraction + Claude follow-up questions
│   │   └── prompts.ts           # System prompts: CLARA_SYSTEM_PROMPT, CLARA_FOLLOWUP_PROMPT, CLARA_CHAT_PROMPT, CLARA_CLIP_PROMPT
│   ├── supabase/
│   │   ├── client.ts            # Supabase clients (anon, service role, auth) + getUserId helper
│   │   ├── browser.ts           # Browser-side Supabase client
│   │   ├── queries.ts           # DB helpers: findOrCreateContact, createInteraction, createTask, boostRelationshipStrength, etc.
│   │   └── types.ts             # TypeScript interfaces for all DB tables + AI extraction types
│   ├── utils/
│   │   ├── format.ts            # formatTimeAgo, formatDueDate
│   │   ├── speech.ts            # Web Speech API helpers
│   │   ├── haptics.ts           # Haptic feedback (vibrate API)
│   │   ├── csv-parser.ts        # CSV contact parsing
│   │   └── vcf-parser.ts        # VCF contact parsing
│   └── config.ts                # App configuration
│
chrome-extension/                 # Chrome Extension (Manifest V3)
├── manifest.json                 # Extension manifest
├── popup.html                    # Popup UI (360px)
├── popup.js                      # Extraction + save logic
├── content-gmail.js              # Gmail content script
└── generate-icons.html           # Icon generator helper

supabase/migrations/              # Database schema (run in order)
├── 001_initial_schema.sql        # contacts, interactions, interaction_contacts, tasks, contact_facts, contact_relationships
├── 002_fuzzy_matching.sql        # pg_trgm extension, find_similar_contacts RPC
├── 003_relationship_decay.sql    # decay_relationships RPC (scheduled strength decay)
├── 004_contact_import.sql        # import_batches table
├── 005_auth_rls.sql              # Row Level Security policies
├── 006_push_subscriptions.sql    # push_subscriptions table
├── 007_contact_status.sql        # contact status column (active/hidden/deleted)
├── 008_user_settings.sql         # user_settings table (OAuth tokens, preferences)
└── 009_calendar_integration.sql  # calendar_event_id on interactions

specs/                            # Feature specs and task breakdowns
├── settings-page.md              # Settings page spec (next to build)
├── tasks.md                      # Settings page implementation task breakdown
├── quick-log.md
├── global-search.md
├── morning-briefing.md
├── contextual-tips.md
├── offline-pwa.md
├── chrome-extension.md
└── calendar-integration.md

public/
├── sw.js                         # Service worker (push notifications only, no caching yet)
├── manifest.json                 # PWA manifest
└── icons/                        # App icons (192, 512)
```

## Key Design Decisions
- Mobile-first PWA (Paper by WeTransfer-inspired)
- Voice-first interaction model — mic button is the hero element on home page
- Warm cream/coral design palette (`clara-cream`, `clara-coral`, `clara-text`, `clara-border`)
- Untyped Supabase client (types in `types.ts` but not wired to client generics)
- Optimistic UI updates with revert-on-failure pattern throughout
- `getUserId()` helper falls back to a demo user UUID when not authenticated
- Contact status lifecycle: active → hidden (swipe, reversible) → deleted (detail page, permanent)
- Chat history persisted to localStorage (last 50 messages)
- Chrome extension sends to `/api/clip` using same-origin session cookie for auth

## AI Pipeline
Voice and clip content flows through the same extraction pattern:
1. **Input** → transcript (voice) or page content (clip)
2. **GPT-4o** → extracts contacts, interaction, facts, relationships, follow-ups (JSON structured output)
3. **Contact matching** → `findOrCreateContact` with fuzzy matching via `pg_trgm`
4. **Persistence** → creates/updates all extracted entities in Supabase
5. **Follow-up questions** → Claude generates 2-3 clarification chips (async, non-blocking)

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=              # Used by chat route
GOOGLE_CLIENT_ID=               # Shared by contacts import + calendar
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:hello@claracrm.app
CRON_SECRET=                    # Vercel Cron auth
NEXT_PUBLIC_APP_URL=            # Base URL for OAuth redirects
```

## Common Patterns

### API Routes
- All API routes use `getUserId()` from `@/lib/supabase/client` for auth
- Return `NextResponse.json()` with appropriate status codes
- Contact queries filter with `.or("status.eq.active,status.is.null")` for backward compat

### UI Components
- Cards use `clara-card` class (white bg, border, rounded-xl, shadow-sm)
- Section headers: `text-xs font-semibold text-clara-text-muted uppercase tracking-wider`
- Animations: Framer Motion for sheets, cards, page transitions
- Haptic feedback on key actions (complete task, save, etc.)
- Toast notifications via `useToast()` from `@/components/ui/Toast`
- Bottom padding `pb-32` on scrollable pages to clear the nav bar

### Data Fetching
- Client-side `useEffect` + `fetch()` (no RSC data fetching — all pages are `"use client"`)
- Loading states use Skeleton components from `@/components/ui/Skeleton`
- Infinite scroll via `IntersectionObserver` on sentinel div (contacts page)

## What's Not Built Yet
- Settings page (spec ready in `specs/settings-page.md`, tasks in `specs/tasks.md`)
- Global search page
- Quick-log (2-tap interaction logging)
- Offline PWA caching
- Test suite (no test framework configured)
