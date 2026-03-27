import { type NextRequest } from "next/server";
import OpenAI from "openai";
import { CLARA_CHAT_PROMPT } from "@/lib/ai/prompts";
import { supabase } from "@/lib/supabase/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "placeholder",
});

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Extract key search terms from a user message.
 * Strips common stop words but preserves proper nouns / names
 * (words that start with a capital letter in the original message).
 */
function extractSearchTerms(message: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "what", "who", "how",
    "when", "where", "why", "do", "does", "did", "can", "could", "would",
    "should", "tell", "me", "my", "i", "you", "with",
    "for", "from", "have", "has", "had", "this", "that", "these", "those",
    "of", "in", "on", "at", "to", "and", "or", "but", "not",
    "up", "out", "also", "very", "really", "so", "too", "been", "being",
  ]);

  const words = message.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);

  return words
    .filter((word) => {
      if (word.length <= 1) return false;
      // Keep proper nouns (capitalized words) even if they are stop words
      const isCapitalized = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
      if (isCapitalized) return true;
      return !stopWords.has(word.toLowerCase());
    })
    .map((w) => w.toLowerCase());
}

/**
 * Extract full names from a message — sequences of 2+ capitalized words.
 * e.g. "Tell me about Brooklyn Lee" -> ["Brooklyn Lee"]
 */
function extractFullNames(message: string): string[] {
  const matches = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
  return matches || [];
}

async function searchData(terms: string[], originalMessage: string) {
  const contacts: Record<string, unknown>[] = [];
  const facts: Record<string, unknown>[] = [];
  const interactions: Record<string, unknown>[] = [];

  // Helper to deduplicate by id
  function addUnique(arr: Record<string, unknown>[], items: Record<string, unknown>[]) {
    for (const item of items) {
      if (!arr.find((existing) => existing.id === item.id)) {
        arr.push(item);
      }
    }
  }

  // 1. Try searching by full names first (e.g. "Brooklyn Lee")
  const fullNames = extractFullNames(originalMessage);
  for (const name of fullNames) {
    const pattern = `%${name}%`;
    const { data: contactHits } = await supabase
      .from("contacts")
      .select("id, full_name, nickname, company, role, email, phone, relationship_strength, last_interaction_at")
      .eq("user_id", DEMO_USER_ID)
      .ilike("full_name", pattern)
      .limit(5);
    if (contactHits) addUnique(contacts, contactHits as Record<string, unknown>[]);
  }

  // 2. Search by individual terms
  for (const term of terms.slice(0, 5)) {
    const pattern = `%${term}%`;

    // Search contacts
    const { data: contactHits } = await supabase
      .from("contacts")
      .select("id, full_name, nickname, company, role, email, phone, relationship_strength, last_interaction_at")
      .eq("user_id", DEMO_USER_ID)
      .or(
        `full_name.ilike.${pattern},company.ilike.${pattern},role.ilike.${pattern},nickname.ilike.${pattern}`
      )
      .limit(5);

    if (contactHits) addUnique(contacts, contactHits as Record<string, unknown>[]);

    // Search facts
    const { data: factHits } = await supabase
      .from("contact_facts")
      .select("id, contact_id, fact_type, fact")
      .ilike("fact", pattern)
      .limit(5);

    if (factHits) addUnique(facts, factHits as Record<string, unknown>[]);

    // Search interactions
    const { data: interactionHits } = await supabase
      .from("interactions")
      .select("id, interaction_type, summary, occurred_at, sentiment")
      .eq("user_id", DEMO_USER_ID)
      .ilike("summary", pattern)
      .order("occurred_at", { ascending: false })
      .limit(5);

    if (interactionHits) addUnique(interactions, interactionHits as Record<string, unknown>[]);
  }

  // 3. Fallback: if term-based search found nothing, load ALL contacts + facts
  if (contacts.length === 0 && facts.length === 0 && interactions.length === 0) {
    const { data: allContacts } = await supabase
      .from("contacts")
      .select("id, full_name, nickname, company, role, email, phone, relationship_strength, last_interaction_at")
      .eq("user_id", DEMO_USER_ID)
      .order("last_interaction_at", { ascending: false })
      .limit(100);

    if (allContacts && allContacts.length > 0) {
      addUnique(contacts, allContacts as Record<string, unknown>[]);

      // Load all facts for these contacts
      const allContactIds = allContacts.map((c: Record<string, unknown>) => c.id as string);
      const { data: allFacts } = await supabase
        .from("contact_facts")
        .select("id, contact_id, fact_type, fact")
        .in("contact_id", allContactIds)
        .limit(500);

      if (allFacts) addUnique(facts, allFacts as Record<string, unknown>[]);

      // Load recent interactions
      const { data: recentInteractions } = await supabase
        .from("interactions")
        .select("id, interaction_type, summary, occurred_at, sentiment")
        .eq("user_id", DEMO_USER_ID)
        .order("occurred_at", { ascending: false })
        .limit(20);

      if (recentInteractions) addUnique(interactions, recentInteractions as Record<string, unknown>[]);
    }
  }

  // Enrich facts with contact names
  const factContactIds = [...new Set(facts.map((f) => f.contact_id as string))];
  if (factContactIds.length > 0) {
    const { data: factContacts } = await supabase
      .from("contacts")
      .select("id, full_name")
      .in("id", factContactIds);

    const lookup = new Map(
      (factContacts || []).map((c: Record<string, unknown>) => [c.id as string, c.full_name as string])
    );
    for (const f of facts) {
      (f as Record<string, unknown>).contact_name = lookup.get(f.contact_id as string) || "Unknown";
    }
  }

  // For matched contacts, also grab their facts
  const contactIds = contacts.map((c) => c.id as string);
  if (contactIds.length > 0) {
    const { data: contactFacts } = await supabase
      .from("contact_facts")
      .select("id, contact_id, fact_type, fact")
      .in("contact_id", contactIds)
      .limit(20);

    if (contactFacts) {
      for (const f of contactFacts) {
        if (!facts.find((existing) => (existing as Record<string, unknown>).id === (f as Record<string, unknown>).id)) {
          const contact = contacts.find((c) => c.id === (f as Record<string, unknown>).contact_id);
          (f as Record<string, unknown>).contact_name = contact ? (contact.full_name as string) : "Unknown";
          facts.push(f as Record<string, unknown>);
        }
      }
    }
  }

  // Always load pending tasks — they're critical for follow-up/task questions
  const tasks: Record<string, unknown>[] = [];
  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, status, priority, channel, contact_id")
    .eq("user_id", DEMO_USER_ID)
    .in("status", ["pending", "snoozed"])
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);

  if (pendingTasks) {
    // Enrich tasks with contact names
    const taskContactIds = [...new Set(
      pendingTasks
        .map((t: Record<string, unknown>) => t.contact_id as string | null)
        .filter(Boolean)
    )] as string[];

    let taskContactLookup = new Map<string, string>();
    if (taskContactIds.length > 0) {
      const { data: taskContacts } = await supabase
        .from("contacts")
        .select("id, full_name")
        .in("id", taskContactIds);
      if (taskContacts) {
        taskContactLookup = new Map(
          taskContacts.map((c: Record<string, unknown>) => [c.id as string, c.full_name as string])
        );
      }
    }

    for (const t of pendingTasks) {
      const task = t as Record<string, unknown>;
      task.contact_name = task.contact_id
        ? taskContactLookup.get(task.contact_id as string) || "Unknown"
        : null;
      tasks.push(task);
    }
  }

  return { contacts, facts, interactions, tasks };
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "Missing or invalid message" },
        { status: 400 }
      );
    }

    // Extract search terms and fetch relevant data
    const terms = extractSearchTerms(message);
    const sources = await searchData(terms, message);

    // Build context for the AI
    let dataContext = "";

    if (sources.contacts.length > 0) {
      dataContext += "\n\nRELEVANT CONTACTS:\n";
      for (const c of sources.contacts) {
        dataContext += `- ${c.full_name}`;
        if (c.company) dataContext += ` (${c.company})`;
        if (c.role) dataContext += ` — ${c.role}`;
        if (c.email) dataContext += ` | ${c.email}`;
        if (c.phone) dataContext += ` | ${c.phone}`;
        if (c.relationship_strength) dataContext += ` | Strength: ${c.relationship_strength}%`;
        if (c.last_interaction_at) dataContext += ` | Last seen: ${c.last_interaction_at}`;
        dataContext += "\n";
      }
    }

    if (sources.facts.length > 0) {
      dataContext += "\nKNOWN FACTS:\n";
      for (const f of sources.facts) {
        dataContext += `- [${(f as Record<string, unknown>).contact_name || "Unknown"}] (${f.fact_type}): ${f.fact}\n`;
      }
    }

    if (sources.interactions.length > 0) {
      dataContext += "\nRECENT INTERACTIONS:\n";
      for (const i of sources.interactions) {
        dataContext += `- ${i.occurred_at} (${i.interaction_type}, ${i.sentiment}): ${i.summary}\n`;
      }
    }

    if (sources.tasks.length > 0) {
      dataContext += "\nPENDING TASKS & FOLLOW-UPS:\n";
      for (const t of sources.tasks) {
        dataContext += `- [${t.priority || "medium"}] ${t.title}`;
        if ((t as Record<string, unknown>).contact_name) dataContext += ` (for ${(t as Record<string, unknown>).contact_name})`;
        if (t.due_at) dataContext += ` — due: ${t.due_at}`;
        if (t.channel) dataContext += ` via ${t.channel}`;
        if (t.status === "snoozed") dataContext += ` [snoozed]`;
        dataContext += "\n";
      }
    }

    if (!dataContext) {
      dataContext = "\n\nNo matching data found in the CRM for this query.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: CLARA_CHAT_PROMPT + dataContext,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const responseText =
      response.choices[0]?.message?.content || "Sorry, I couldn't process that. Try again?";

    // Build source references for the UI
    const sourceContacts = sources.contacts.map((c) => ({
      id: c.id,
      full_name: c.full_name,
    }));

    return Response.json({
      response: responseText,
      sources: {
        contacts: sourceContacts,
        facts: sources.facts.map((f) => ({
          id: f.id,
          fact: f.fact,
          contact_name: (f as Record<string, unknown>).contact_name,
        })),
        interactions: sources.interactions.map((i) => ({
          id: i.id,
          summary: i.summary,
          occurred_at: i.occurred_at,
        })),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
