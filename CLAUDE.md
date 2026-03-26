@AGENTS.md

# ClaraCRM

Voice-first personal CRM. "Clara remembers everything so you don't have to."

## Tech Stack
- Next.js 16 (App Router, PWA)
- Supabase (PostgreSQL)
- Claude API (AI processing)
- Tailwind CSS + Framer Motion
- TypeScript

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## Project Structure
- `src/app/` — Pages and API routes
- `src/components/` — React components (voice/, contacts/, interactions/, tasks/, layout/, ui/)
- `src/lib/ai/` — AI processing pipeline (Claude API)
- `src/lib/supabase/` — Database client and types
- `src/lib/utils/` — Speech API, haptics
- `supabase/migrations/` — Database schema
- `agents/` — Advisory agent prompts (CTO, PM, Designer, Marketing)

## Key Design Decisions
- Mobile-first PWA (Paper by WeTransfer-inspired)
- Voice-first interaction model
- Warm cream/coral design palette
- Untyped Supabase client (types generated later via CLI)
