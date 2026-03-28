/**
 * Clara CRM — Chrome Extension Popup
 *
 * When clicked:
 * 1. Injects a content script to extract page text
 * 2. Shows a preview of what Clara found
 * 3. On confirm, sends to /api/clip for AI processing + persistence
 */

// Base URL of the Clara app — change for production
const CLARA_BASE_URL = (() => {
  // Try to read from storage, fall back to production URL
  return "https://claracrm.app"; // Update this to your actual deployed URL
})();

// DOM elements
const stateNotConnected = document.getElementById("stateNotConnected");
const stateExtracting = document.getElementById("stateExtracting");
const statePreview = document.getElementById("statePreview");
const stateSaving = document.getElementById("stateSaving");
const stateSuccess = document.getElementById("stateSuccess");
const stateError = document.getElementById("stateError");
const stateEmpty = document.getElementById("stateEmpty");
const statusDot = document.getElementById("statusDot");
const openAppLink = document.getElementById("openAppLink");

function showState(stateEl) {
  [stateNotConnected, stateExtracting, statePreview, stateSaving, stateSuccess, stateError, stateEmpty]
    .forEach((el) => el.classList.remove("active"));
  stateEl.classList.add("active");
}

// Extracted data from the page
let extractedContent = null;

// On popup open, start extraction
document.addEventListener("DOMContentLoaded", async () => {
  openAppLink.href = CLARA_BASE_URL;
  showState(stateExtracting);

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showState(stateEmpty);
      return;
    }

    // Inject content script to extract page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent,
    });

    const pageData = results?.[0]?.result;
    if (!pageData || !pageData.content || pageData.content.trim().length < 20) {
      showState(stateEmpty);
      return;
    }

    extractedContent = {
      content: pageData.content,
      url: tab.url || "",
      title: tab.title || "",
      contentType: pageData.contentType || "generic",
    };

    // Show preview
    const previewType = document.getElementById("previewType");
    const previewContacts = document.getElementById("previewContacts");
    const previewSummary = document.getElementById("previewSummary");
    const previewMeta = document.getElementById("previewMeta");

    previewType.textContent = formatContentType(extractedContent.contentType);
    previewContacts.textContent = extractedContent.title || "Untitled";
    previewSummary.textContent = extractedContent.content.slice(0, 300) + (extractedContent.content.length > 300 ? "..." : "");

    // Show metadata badges
    previewMeta.innerHTML = "";
    if (extractedContent.contentType !== "generic") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = extractedContent.contentType;
      previewMeta.appendChild(badge);
    }
    const charBadge = document.createElement("span");
    charBadge.className = "badge";
    charBadge.textContent = `${Math.round(extractedContent.content.length / 100) * 100} chars`;
    previewMeta.appendChild(charBadge);

    statusDot.classList.add("connected");
    showState(statePreview);
  } catch (err) {
    console.error("Extraction error:", err);
    showState(stateEmpty);
  }
});

// Save button
document.getElementById("btnSave").addEventListener("click", async () => {
  if (!extractedContent) return;

  showState(stateSaving);

  try {
    const res = await fetch(`${CLARA_BASE_URL}/api/clip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(extractedContent),
    });

    if (res.status === 401 || res.status === 403) {
      statusDot.classList.remove("connected");
      statusDot.classList.add("error");
      showState(stateNotConnected);
      return;
    }

    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    document.getElementById("successMsg").textContent = data.message || "Content saved to Clara.";
    statusDot.classList.add("connected");
    showState(stateSuccess);

    // Auto-close after 2 seconds
    setTimeout(() => window.close(), 2000);
  } catch (err) {
    console.error("Save error:", err);
    document.getElementById("errorMsg").textContent = "Couldn't save to Clara. Are you logged in?";
    statusDot.classList.add("error");
    showState(stateError);
  }
});

// Cancel button
document.getElementById("btnCancel").addEventListener("click", () => {
  window.close();
});

// Retry button
document.getElementById("btnRetry").addEventListener("click", () => {
  showState(stateSaving);
  document.getElementById("btnSave").click();
});

function formatContentType(type) {
  const labels = {
    gmail: "Email Thread",
    linkedin: "LinkedIn",
    calendar: "Calendar Event",
    generic: "Web Page",
  };
  return labels[type] || "Web Page";
}

/**
 * This function runs in the context of the active tab.
 * It extracts relevant text content from the page.
 */
function extractPageContent() {
  const url = window.location.href;

  // Gmail detection
  if (url.includes("mail.google.com")) {
    // Try to get the open email thread
    const emailBody = document.querySelector('[role="main"] [data-message-id]');
    const emailThread = document.querySelectorAll('[data-message-id]');

    if (emailThread.length > 0) {
      const messages = [];
      emailThread.forEach((msg) => {
        const sender = msg.querySelector('[email]')?.getAttribute("email") || "";
        const name = msg.querySelector('[email]')?.textContent?.trim() || "";
        const body = msg.querySelector('[data-message-id] > div')?.textContent?.trim() || msg.textContent?.trim() || "";
        const date = msg.closest("tr")?.querySelector("td:last-child")?.textContent?.trim() || "";
        messages.push(`From: ${name} <${sender}>\nDate: ${date}\n\n${body}`);
      });

      return {
        content: messages.join("\n\n---\n\n"),
        contentType: "gmail",
      };
    }

    // Fallback: get whatever text is in the main area
    const main = document.querySelector('[role="main"]');
    return {
      content: main?.textContent?.trim() || "",
      contentType: "gmail",
    };
  }

  // LinkedIn detection
  if (url.includes("linkedin.com")) {
    // Profile page
    const name = document.querySelector(".text-heading-xlarge")?.textContent?.trim() || "";
    const headline = document.querySelector(".text-body-medium")?.textContent?.trim() || "";
    const about = document.querySelector("#about ~ div .inline-show-more-text")?.textContent?.trim() || "";
    const experience = document.querySelector("#experience")?.parentElement?.textContent?.trim() || "";

    if (name) {
      return {
        content: `LinkedIn Profile: ${name}\nHeadline: ${headline}\nAbout: ${about}\n\nExperience:\n${experience}`.slice(0, 8000),
        contentType: "linkedin",
      };
    }
  }

  // Google Calendar detection
  if (url.includes("calendar.google.com")) {
    const eventDetail = document.querySelector('[data-eventid]')?.textContent?.trim() || "";
    const detailPanel = document.querySelector('[data-eventchip]')?.parentElement?.textContent?.trim() || "";
    const content = eventDetail || detailPanel || document.querySelector("main")?.textContent?.trim() || "";
    return {
      content,
      contentType: "calendar",
    };
  }

  // Generic page — get main content, skip nav/footer/sidebar
  const article = document.querySelector("article")?.textContent?.trim();
  if (article && article.length > 100) {
    return { content: article.slice(0, 8000), contentType: "generic" };
  }

  const main = document.querySelector("main")?.textContent?.trim()
    || document.querySelector('[role="main"]')?.textContent?.trim();
  if (main && main.length > 50) {
    return { content: main.slice(0, 8000), contentType: "generic" };
  }

  // Last resort: body text
  return {
    content: document.body.textContent?.trim().slice(0, 8000) || "",
    contentType: "generic",
  };
}
