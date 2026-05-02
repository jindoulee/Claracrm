# Chrome Extension Spec

## Overview
Already built in `/chrome-extension/`. This spec documents the existing implementation and planned enhancements.

## Current State (v1 — shipped)
- Manifest V3 extension with popup UI
- Extracts content from active tab (Gmail, LinkedIn, Calendar, generic pages)
- Shows preview in popup, one-click "Save to Clara"
- Sends to `POST /api/clip` → AI extracts contacts, facts, tasks
- Auth via Supabase session cookie (same-origin)

## Files
- `chrome-extension/manifest.json` — extension manifest
- `chrome-extension/popup.html` — popup UI (360px wide)
- `chrome-extension/popup.js` — extraction + API logic
- `chrome-extension/content-gmail.js` — Gmail content script (lightweight)
- `chrome-extension/generate-icons.html` — icon generator helper

## Setup
1. Update `CLARA_BASE_URL` in `popup.js` to deployed URL
2. Open `generate-icons.html` in browser, save canvases as icon-16.png, icon-48.png, icon-128.png to `icons/`
3. Load unpacked in `chrome://extensions` (developer mode)
4. Log in to Clara in browser first (extension reads session cookie)

## Planned Enhancements (v2)
- Floating "Save to Clara" button injected into Gmail email view
- Right-click context menu: "Save to Clara"
- Keyboard shortcut: `Ctrl+Shift+C` to clip
- LinkedIn-specific parser for richer profile extraction
- Slack Web parser for conversation threads
- WhatsApp Web parser

## Acceptance Criteria (v1)
- [x] Extension loads and shows popup
- [x] Extracts content from Gmail, LinkedIn, Calendar, generic pages
- [x] Preview shown before saving
- [x] Save to Clara creates contacts/facts/tasks
- [ ] Icons generated and included
- [ ] Published to Chrome Web Store (future)
