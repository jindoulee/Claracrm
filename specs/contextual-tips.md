# Contextual Feature Tips Spec

## Overview
First-time hints that appear once when a user encounters a feature for the first time. Helps discoverability without cluttering the UI on repeat visits.

## Mechanism
- Each tip has a unique key stored in localStorage: `clara_tip_<feature>_seen`
- Tip appears once, then never again
- User can dismiss by tapping anywhere or the "Got it" button
- Tips appear as a small floating tooltip or highlight overlay

## Tips

| Feature | Trigger | Tip Text | localStorage Key |
|---------|---------|----------|-----------------|
| Swipe to hide | First time on contacts page with 5+ contacts | "Swipe left on a contact to hide them" | `clara_tip_swipe_seen` |
| Alphabet scrubber | First time sorting A-Z | "Drag the letters to jump to a name" | `clara_tip_scrubber_seen` |
| Chat with Clara | First time on home page (after onboarding) | "Tap here to ask Clara about your contacts" | `clara_tip_chat_seen` |
| Quick log | First time on contact detail page | "Tap Quick Log to record an interaction in 2 taps" | `clara_tip_quicklog_seen` |
| Task editing | First time expanding a task | "Tap the pencil to edit this task" | `clara_tip_taskedit_seen` |
| Calendar connect | First time seeing empty calendar section | "Connect your calendar to auto-suggest meetings" | `clara_tip_calendar_seen` |

## Component
`src/components/ui/FeatureTip.tsx`:
- Props: `tipKey: string`, `text: string`, `position?: "top" | "bottom"`
- Renders as an absolute-positioned tooltip with arrow
- Framer Motion fade-in/out
- Auto-dismisses after 5 seconds or on tap
- Checks localStorage on mount, sets flag on dismiss

## Design
- Dark tooltip: `bg-clara-text text-clara-cream` with rounded corners
- Small arrow pointing to the feature
- "Got it" text button inside
- Appears with gentle fade + slide animation

## Acceptance Criteria
- [ ] Each tip appears exactly once per feature
- [ ] Tips are dismissible by tap or timeout
- [ ] Tips don't block interaction with the feature
- [ ] localStorage flags prevent re-showing
