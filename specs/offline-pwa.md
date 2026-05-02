# Offline PWA Shell Spec

## Overview
Enhance the service worker to cache the app shell (HTML, JS, CSS, icons) so Clara loads instantly and works offline. Currently the service worker only handles push notifications.

## Current State
`public/sw.js` — 52 lines, push notification display and click handling only. No caching.

## Cache Strategy

### App Shell (Cache First)
Pre-cache on install:
- `/` (home page)
- `/contacts`
- `/tasks`
- `/interactions`
- `/settings`
- `/manifest.json`
- `/icons/icon-192.png`
- `/icons/icon-512.png`
- Next.js static assets (`/_next/static/...`)

### API Responses (Network First, Cache Fallback)
- `GET /api/dashboard` — cache last response, show stale data if offline
- `GET /api/contacts` — cache last response
- `GET /api/tasks` — cache last response
- `GET /api/interactions` — cache last response

### Dynamic Pages (Network First)
- `/contacts/[id]` — try network, fall back to cached version if available

## Service Worker Changes
1. Add `install` event: pre-cache app shell assets
2. Add `fetch` event: intercept requests with appropriate strategy
3. Add `activate` event: clean up old caches on version bump
4. Keep existing push notification handlers

## Offline Indicator
- Add a small banner at top of Shell when `navigator.onLine === false`:
  "You're offline — showing cached data"
- `online`/`offline` event listeners to toggle

## Cache Versioning
- Cache name: `clara-v1` — bump version on deploy to bust stale caches
- On activate: delete old `clara-v*` caches

## Acceptance Criteria
- [ ] App loads on second visit with no network
- [ ] Contacts, tasks, interactions pages show cached data offline
- [ ] Offline banner appears when disconnected
- [ ] New deploys invalidate old caches
- [ ] Push notifications still work unchanged
