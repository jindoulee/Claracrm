# ClaraCRM

**Clara remembers everything so you don't have to.**

A voice-first personal CRM that helps you maintain meaningful relationships. Speak naturally about your interactions, and Clara extracts contacts, relationships, follow-ups, and builds a social knowledge graph — automatically.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env.local
# Fill in your Supabase and Anthropic API keys

# Run development server
npm run dev
```

Open on your phone at `http://localhost:3000` — Clara is designed mobile-first.

## How It Works

1. **Tap the mic** and speak naturally: "Just had coffee with Alan Chen. His kids have been sick..."
2. **Clara processes** your voice memo with AI to extract contacts, facts, relationships, and follow-ups
3. **Review the summary card** — Clara shows what she captured and asks smart follow-up questions
4. **Stay in touch** — Clara reminds you when to follow up and tracks relationship strength over time

## Tech Stack

- **Frontend**: Next.js 16 (PWA, mobile-first)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Claude API (entity extraction, relationship mapping)
- **Design**: Tailwind CSS + Framer Motion (Paper-inspired)
