# Quick-Log Spec

## Overview
Two-tap interaction logging from the contact detail page. Instead of full voice recording, users can quickly log "had coffee", "quick call", etc. with an optional one-line note.

## Entry Points
1. Contact detail page — "Quick log" button below the contact header
2. Contact card long-press (stretch) — shows quick-log options inline

## Flow
1. User taps "Quick log" on a contact's detail page
2. Bottom sheet appears with interaction type pills: Coffee, Call, Email, Text, Meeting, Lunch, Dinner
3. User taps one (e.g. "Coffee")
4. Optional: one-line note input appears ("Add a note...")
5. User taps "Save" (or just taps the type pill if no note needed)
6. Interaction created, relationship strength boosted, toast confirms

## API
Uses existing `POST /api/interactions` with body:
```json
{
  "contact_ids": ["<contact-id>"],
  "interaction_type": "coffee",
  "summary": "Quick coffee catch-up",
  "occurred_at": "2026-05-02T10:00:00Z",
  "sentiment": "positive"
}
```

## Components
- `src/components/interactions/QuickLogSheet.tsx` — bottom sheet with type pills + optional note
- Modify `src/app/contacts/[id]/page.tsx` — add Quick Log button + sheet trigger

## Design
- Type pills: horizontal scroll, each with icon + label, clara-coral-light background when selected
- Note input: single line, placeholder "Had a great chat about..." (optional, can skip)
- Save button: full-width coral button
- On save: haptic feedback, toast "Logged! ☕", sheet closes

## Acceptance Criteria
- [ ] Quick log button visible on contact detail page
- [ ] Bottom sheet with all 7 interaction types
- [ ] Tapping a type + Save creates interaction
- [ ] Optional note is included in summary
- [ ] Relationship strength boosted after logging
- [ ] Toast confirmation shown
- [ ] Sheet closes after save
