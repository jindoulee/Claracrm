import { supabase } from "./client";
import type {
  ExtractedContact,
  ExtractedFact,
  ExtractedRelationship,
  ExtractedFollowUp,
  ExtractedInteraction,
  ContactMatchResult,
} from "./types";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// ============================================
// CONTACTS
// ============================================

export async function getContacts(userId: string = DEMO_USER_ID) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("last_interaction_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function getContactById(id: string) {
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  // Fetch relationships where this contact is on either side
  const { data: relationships } = await supabase
    .from("contact_relationships")
    .select("*")
    .or(`contact_id.eq.${id},related_contact_id.eq.${id}`);

  // Fetch facts about this contact
  const { data: facts } = await supabase
    .from("contact_facts")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false });

  return {
    ...contact,
    relationships: relationships || [],
    facts: facts || [],
  };
}

export async function findOrCreateContact(
  userId: string,
  name: string,
  matchHints: string[] = []
): Promise<ContactMatchResult> {
  // Fast path: exact match on full_name (case-insensitive)
  const { data: byName } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .ilike("full_name", name);

  if (byName && byName.length > 0) {
    return {
      contact: byName[0] as Record<string, unknown>,
      confidence: "exact",
      score: 1.0,
    };
  }

  // Fast path: exact match on nickname
  const { data: byNickname } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .ilike("nickname", name);

  if (byNickname && byNickname.length > 0) {
    return {
      contact: byNickname[0] as Record<string, unknown>,
      confidence: "exact",
      score: 1.0,
    };
  }

  // Fuzzy path: use trigram similarity via RPC
  try {
    const { data: fuzzyMatches, error: rpcError } = await supabase.rpc(
      "find_similar_contacts",
      {
        p_user_id: userId,
        p_name: name,
        p_threshold: 0.3,
      }
    );

    if (!rpcError && fuzzyMatches && fuzzyMatches.length > 0) {
      const best = fuzzyMatches[0] as Record<string, unknown>;
      const score = best.similarity_score as number;

      if (score >= 0.85) {
        // High confidence fuzzy match — auto-match
        return { contact: best, confidence: "fuzzy", score };
      }

      if (score >= 0.5) {
        // Medium confidence — return as uncertain so UI can flag it
        return { contact: best, confidence: "uncertain", score };
      }
    }
  } catch {
    // RPC not available (migration not run yet) — fall through to hint matching
    console.warn("find_similar_contacts RPC not available, falling back to hint matching");
  }

  // Fallback: try match hints (company, role, etc.)
  for (const hint of matchHints) {
    if (!hint) continue;
    const { data: byHint } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .or(`company.ilike.%${hint}%,role.ilike.%${hint}%`);

    if (byHint && byHint.length === 1) {
      return {
        contact: byHint[0] as Record<string, unknown>,
        confidence: "fuzzy",
        score: 0.7,
      };
    }
  }

  // No match found — create a new contact
  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      full_name: name,
      tags: [],
      relationship_strength: 50,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;
  return {
    contact: newContact as Record<string, unknown>,
    confidence: "new",
    score: 0,
  };
}

export async function updateContactFields(
  contactId: string,
  updates: Record<string, string>
): Promise<string[]> {
  // Only update allowed fields, and only if provided
  const allowedFields = ["company", "role", "email", "phone", "nickname"];
  const updatePayload: Record<string, string> = {};
  const updatedFields: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value) {
      updatePayload[key] = value;
      updatedFields.push(key);
    }
  }

  if (Object.keys(updatePayload).length === 0) return [];

  const { error } = await supabase
    .from("contacts")
    .update(updatePayload)
    .eq("id", contactId);

  if (error) {
    console.error("Failed to update contact fields:", error);
    return [];
  }

  return updatedFields;
}

// ============================================
// INTERACTIONS
// ============================================

export async function createInteraction(
  userId: string,
  data: ExtractedInteraction,
  contactIds: string[]
) {
  const { data: interaction, error } = await supabase
    .from("interactions")
    .insert({
      user_id: userId,
      interaction_type: data.type,
      location: data.location || null,
      summary: data.summary,
      sentiment: data.sentiment,
      key_topics: data.topics,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;

  const interactionRecord = interaction as Record<string, unknown>;
  const interactionId = interactionRecord.id as string;
  const occurredAt = interactionRecord.occurred_at as string;

  // Link contacts to this interaction
  if (contactIds.length > 0) {
    const links = contactIds.map((contactId) => ({
      interaction_id: interactionId,
      contact_id: contactId,
    }));

    await supabase.from("interaction_contacts").insert(links);

    // Update last_interaction_at for each contact
    for (const contactId of contactIds) {
      await supabase
        .from("contacts")
        .update({ last_interaction_at: occurredAt })
        .eq("id", contactId);
    }
  }

  return interactionRecord;
}

// ============================================
// TASKS
// ============================================

export async function createTask(
  userId: string,
  data: {
    title: string;
    description?: string | null;
    due_at?: string | null;
    priority?: string;
    channel?: string | null;
    contact_id?: string | null;
    interaction_id?: string | null;
  }
) {
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description || null,
      due_at: data.due_at || null,
      priority: data.priority || "medium",
      channel: data.channel || null,
      contact_id: data.contact_id || null,
      interaction_id: data.interaction_id || null,
      status: "pending",
      notification_sent: false,
    })
    .select()
    .single();

  if (error) throw error;
  return task as Record<string, unknown>;
}

export async function getTasks(userId: string = DEMO_USER_ID) {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      contacts:contact_id (id, full_name, avatar_url)
    `)
    .eq("user_id", userId)
    .in("status", ["pending", "snoozed"])
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function updateTaskStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// CONTACT FACTS
// ============================================

export async function createContactFact(data: {
  contact_id: string;
  fact_type: string;
  fact: string;
  source_interaction_id?: string | null;
  confidence?: number;
}) {
  const { data: fact, error } = await supabase
    .from("contact_facts")
    .insert({
      contact_id: data.contact_id,
      fact_type: data.fact_type,
      fact: data.fact,
      source_interaction_id: data.source_interaction_id || null,
      confidence: data.confidence ?? 0.8,
    })
    .select()
    .single();

  if (error) throw error;
  return fact;
}

// ============================================
// CONTACT RELATIONSHIPS
// ============================================

export async function createContactRelationship(data: {
  contact_id: string;
  related_contact_id: string;
  relationship_type: string;
  label?: string | null;
}) {
  const { data: rel, error } = await supabase
    .from("contact_relationships")
    .insert({
      contact_id: data.contact_id,
      related_contact_id: data.related_contact_id,
      relationship_type: data.relationship_type,
      label: data.label || null,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;
  return rel;
}

// ============================================
// UTILITIES
// ============================================

export function calculateDueDate(relative: string): string {
  const now = new Date();
  const match = relative.match(/^\+?(\d+)\s*(day|days|week|weeks|month|months)$/i);

  if (!match) {
    // If we can't parse, default to 1 week from now
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "day":
    case "days":
      now.setDate(now.getDate() + amount);
      break;
    case "week":
    case "weeks":
      now.setDate(now.getDate() + amount * 7);
      break;
    case "month":
    case "months":
      now.setMonth(now.getMonth() + amount);
      break;
  }

  return now.toISOString();
}
