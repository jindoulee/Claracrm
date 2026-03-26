export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Contact, "id">>;
      };
      contact_relationships: {
        Row: ContactRelationship;
        Insert: Omit<ContactRelationship, "id" | "created_at">;
        Update: Partial<Omit<ContactRelationship, "id">>;
      };
      interactions: {
        Row: Interaction;
        Insert: Omit<Interaction, "id" | "created_at">;
        Update: Partial<Omit<Interaction, "id">>;
      };
      interaction_contacts: {
        Row: InteractionContact;
        Insert: InteractionContact;
        Update: Partial<InteractionContact>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id">>;
      };
      contact_facts: {
        Row: ContactFact;
        Insert: Omit<ContactFact, "id" | "created_at">;
        Update: Partial<Omit<ContactFact, "id">>;
      };
    };
  };
}

export interface Contact {
  id: string;
  user_id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  avatar_url: string | null;
  notes: string | null;
  tags: string[];
  relationship_strength: number;
  last_interaction_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContactRelationship {
  id: string;
  contact_id: string;
  related_contact_id: string;
  relationship_type: string;
  label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Interaction {
  id: string;
  user_id: string;
  interaction_type: string;
  location: string | null;
  occurred_at: string;
  summary: string | null;
  transcript: string | null;
  audio_url: string | null;
  sentiment: string;
  key_topics: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InteractionContact {
  interaction_id: string;
  contact_id: string;
}

export interface Task {
  id: string;
  user_id: string;
  contact_id: string | null;
  interaction_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "done" | "snoozed" | "cancelled";
  priority: "low" | "medium" | "high";
  notification_sent: boolean;
  channel: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFact {
  id: string;
  contact_id: string;
  fact_type: string;
  fact: string;
  source_interaction_id: string | null;
  confidence: number;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

// ============================================
// AI Processing Types
// ============================================

export interface VoiceProcessingResult {
  contacts: ExtractedContact[];
  interaction: ExtractedInteraction;
  facts_learned: ExtractedFact[];
  relationships: ExtractedRelationship[];
  follow_ups: ExtractedFollowUp[];
  clarification_needed: string[];
}

export interface ExtractedContact {
  name: string;
  match_hints: string[];
  updates: Record<string, string>;
}

export interface ExtractedInteraction {
  type: string;
  participants: string[];
  topics: string[];
  sentiment: string;
  summary: string;
  location?: string;
}

export interface ExtractedFact {
  contact: string;
  fact_type: string;
  fact: string;
  temporal?: string;
}

export interface ExtractedRelationship {
  from: string;
  to: string;
  type: string;
  label: string;
}

export interface ExtractedFollowUp {
  contact: string;
  action: string;
  due: string;
  channel: string;
}
