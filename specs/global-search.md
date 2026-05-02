# Global Search Spec

## Overview
A dedicated `/search` page that searches across contacts, interactions, tasks, and facts in one unified view. Accessible from a search icon in the home page header or MobileNav.

## Route
`/search` — standalone page with auto-focused search input.

## Search Behavior
- Debounced input (300ms) triggers `GET /api/search?q=<query>`
- Results grouped by type: Contacts, Interactions, Tasks, Facts
- Empty state: show recent searches (localStorage) or popular contacts
- Min 2 characters to trigger search

## API
Extends existing `GET /api/search` to also include tasks:
```json
{
  "contacts": [...],
  "interactions": [...],
  "tasks": [...],
  "facts": [...]
}
```

## UI Layout
```
┌──────────────────────────────┐
│  🔍 [Search everything...]   │
├──────────────────────────────┤
│                              │
│  CONTACTS (3)                │
│  [Contact card] [Card] [C]  │
│                              │
│  INTERACTIONS (2)            │
│  [Timeline item]             │
│  [Timeline item]             │
│                              │
│  TASKS (1)                   │
│  [Task card]                 │
│                              │
│  FACTS (4)                   │
│  "Sarah likes sushi" — S.C.  │
│  "Works at Acme" — J.D.     │
│                              │
└──────────────────────────────┘
```

## Components
- `src/app/search/page.tsx` — search page with results
- Modify `src/app/api/search/route.ts` — add task search

## Navigation
- Tapping a contact → `/contacts/[id]`
- Tapping an interaction → expand inline or navigate to `/interactions`
- Tapping a task → `/tasks` (scroll to task)
- Tapping a fact → `/contacts/[contact_id]`

## Acceptance Criteria
- [ ] Search page with auto-focused input
- [ ] Results from all 4 data types
- [ ] Debounced search (300ms)
- [ ] Each result navigates to the right place
- [ ] Empty state with helpful prompt
- [ ] Recent searches in localStorage
