/**
 * Clara CRM — Gmail Content Script
 *
 * Runs on mail.google.com to provide richer email extraction.
 * Adds a small "Save to Clara" button on email threads (optional enhancement).
 *
 * For now this is a lightweight presence — the main extraction happens
 * via chrome.scripting.executeScript in popup.js. This file is reserved
 * for future enhancements like:
 * - Floating "Save to Clara" button on email threads
 * - Auto-detection of known contacts in emails
 * - Right-click context menu integration
 */

// Future: Add floating button on email view
// For now, this script just marks the page as Clara-ready
// so the popup knows it can do enhanced Gmail extraction.
document.documentElement.setAttribute("data-clara-extension", "true");
