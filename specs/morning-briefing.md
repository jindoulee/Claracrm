# Richer Morning Briefing Spec

## Overview
Enhance the "Your day" section on the home page to show more relevant daily information: upcoming calendar meetings, birthday reminders, relationship nudges, and a logging streak counter.

## Current State
Home page shows:
- Tasks due today (count + link to /tasks)
- Fading contacts (top 3 by decay)

## Additions

### 1. Calendar Preview
- Show next 2-3 upcoming meetings from Google Calendar (if connected)
- Each shows: time, title, matched attendees
- Tap → opens calendar app or logs meeting (same as "Recent meetings" section)
- **Data source**: `GET /api/calendar/events` — filter for `isPast: false`

### 2. Birthday Reminders
- Check contact facts for `fact_type: "milestone"` containing birthday-related keywords
- Show: "🎂 Sarah's birthday is tomorrow" or "🎂 2 birthdays this week"
- Tap → navigate to contact detail
- **Data source**: New query in `/api/dashboard` — scan facts for birthdays within 7 days

### 3. Relationship Nudges
- Already showing fading contacts — enhance with specific context:
  - "You haven't talked to Sarah in 3 weeks"
  - "Your relationship with John is fading (was Strong, now Okay)"
- Show last interaction summary as subtitle
- **Data source**: Enhance existing `fadingRelationships` query to include `last_interaction_at` and latest interaction summary

### 4. Logging Streak
- Track consecutive days with at least 1 logged interaction
- Show at top of briefing: "🔥 5-day streak" or "Log an interaction to start your streak"
- Store in localStorage: `clara_streak_data: { lastLogDate, count }`
- **Data source**: Client-side localStorage + check against latest interaction date

## API Changes
Enhance `GET /api/dashboard` response:
```json
{
  "upcomingTasks": [...],
  "recentInteractions": [...],
  "fadingRelationships": [...],
  "stats": { "tasksDueToday": 3 },
  "birthdays": [
    { "contact_id": "...", "full_name": "Sarah", "fact": "Birthday May 5", "days_away": 3 }
  ],
  "upcomingMeetings": [...]
}
```

## Acceptance Criteria
- [ ] Calendar meetings shown in briefing (if connected)
- [ ] Birthday reminders appear within 7-day window
- [ ] Fading contact nudges include time since last interaction
- [ ] Streak counter tracks consecutive logging days
- [ ] Each card is tappable with correct navigation
