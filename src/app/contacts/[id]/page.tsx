"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Lightbulb,
  Users,
  MessageSquare,
  Phone,
  Mail,
  Coffee,
  Calendar,
  Mic,
  Pencil,
  CheckSquare,
  TrendingUp,
  Minus,
  TrendingDown,
  X,
  Plus,
  Save,
} from "lucide-react";

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function strengthColor(strength: number): string {
  if (strength >= 70) return "text-clara-green";
  if (strength >= 40) return "text-clara-amber";
  return "text-red-400";
}

function strengthBgColor(strength: number): string {
  if (strength >= 70) return "bg-clara-green";
  if (strength >= 40) return "bg-clara-amber";
  return "bg-red-400";
}

function strengthLabel(strength: number): string {
  if (strength >= 70) return "Strong";
  if (strength >= 40) return "Moderate";
  return "Fading";
}

function StrengthIcon({ strength }: { strength: number }) {
  if (strength >= 70) return <TrendingUp size={14} />;
  if (strength >= 40) return <Minus size={14} />;
  return <TrendingDown size={14} />;
}

const factTypeBadgeColors: Record<string, string> = {
  family: "bg-clara-purple-light text-clara-purple",
  work: "bg-clara-blue-light text-clara-blue",
  interest: "bg-clara-green-light text-clara-green",
  health: "bg-clara-coral-light text-clara-coral",
  personal: "bg-clara-purple-light text-clara-purple",
  preference: "bg-clara-green-light text-clara-green",
};

const typeIcons: Record<string, typeof Coffee> = {
  coffee: Coffee,
  call: Phone,
  email: Mail,
  text: MessageSquare,
  meeting: Users,
  dinner: Calendar,
  lunch: Calendar,
  general: MessageSquare,
  voice_note: Mic,
};

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- Types ---

interface ContactDetail {
  id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  avatar_url: string | null;
  notes: string | null;
  tags: string[] | null;
  relationship_strength: number | null;
  last_interaction_at: string | null;
  created_at: string;
  facts: {
    id: string;
    fact_type: string;
    fact: string;
    confidence: number;
    created_at: string;
  }[];
  relationships: {
    id: string;
    contact_id: string;
    related_contact_id: string;
    relationship_type: string;
    label: string | null;
    related_name: string;
  }[];
  interactions: {
    id: string;
    interaction_type: string;
    summary: string | null;
    occurred_at: string;
    sentiment: string | null;
  }[];
}

interface EditForm {
  full_name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
  tags: string[];
}

// --- Page Component ---

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    company: "",
    role: "",
    email: "",
    phone: "",
    notes: "",
    tags: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    async function fetchContact() {
      try {
        const res = await fetch(`/api/contacts/${id}`);
        if (!res.ok) throw new Error("Contact not found");
        const data = await res.json();
        setContact(data);
      } catch {
        setError("Could not load contact");
      } finally {
        setIsLoading(false);
      }
    }
    fetchContact();
  }, [id]);

  const enterEditMode = useCallback(() => {
    if (!contact) return;
    setEditForm({
      full_name: contact.full_name,
      company: contact.company || "",
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      tags: contact.tags || [],
    });
    setIsEditing(true);
  }, [contact]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setNewTag("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!contact) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.full_name !== contact.full_name) body.full_name = editForm.full_name;
      if (editForm.company !== (contact.company || "")) body.company = editForm.company || null;
      if (editForm.role !== (contact.role || "")) body.role = editForm.role || null;
      if (editForm.email !== (contact.email || "")) body.email = editForm.email || null;
      if (editForm.phone !== (contact.phone || "")) body.phone = editForm.phone || null;
      if (editForm.notes !== (contact.notes || "")) body.notes = editForm.notes || null;
      if (JSON.stringify(editForm.tags) !== JSON.stringify(contact.tags || [])) body.tags = editForm.tags;

      if (Object.keys(body).length > 0) {
        const res = await fetch(`/api/contacts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to save");
        const updated = await res.json();
        setContact((prev) => (prev ? { ...prev, ...updated } : prev));
      }
      setIsEditing(false);
    } catch {
      // stay in edit mode on error
    } finally {
      setIsSaving(false);
    }
  }, [contact, editForm, id]);

  const deleteFact = useCallback(
    async (factId: string) => {
      try {
        const res = await fetch(`/api/facts/${factId}`, { method: "DELETE" });
        if (res.ok) {
          setContact((prev) =>
            prev ? { ...prev, facts: prev.facts.filter((f) => f.id !== factId) } : prev
          );
        }
      } catch {
        // silently fail
      }
    },
    []
  );

  const addTag = useCallback(() => {
    const tag = newTag.trim();
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTag("");
    }
  }, [newTag, editForm.tags]);

  const removeTag = useCallback((tag: string) => {
    setEditForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-40 bg-clara-cream/90 backdrop-blur-lg safe-top">
          <div className="flex items-center gap-3 px-5 h-14 max-w-lg mx-auto">
            <Link
              href="/contacts"
              className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-clara-warm-gray transition-colors"
            >
              <ArrowLeft size={20} className="text-clara-text" />
            </Link>
            <h1 className="text-lg font-semibold text-clara-text tracking-tight">
              Loading...
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block w-6 h-6 border-2 border-clara-coral border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-40 bg-clara-cream/90 backdrop-blur-lg safe-top">
          <div className="flex items-center gap-3 px-5 h-14 max-w-lg mx-auto">
            <Link
              href="/contacts"
              className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-clara-warm-gray transition-colors"
            >
              <ArrowLeft size={20} className="text-clara-text" />
            </Link>
            <h1 className="text-lg font-semibold text-clara-text tracking-tight">
              Not Found
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-clara-text-secondary text-sm text-center">
            {error || "Contact not found"}
          </p>
        </div>
      </div>
    );
  }

  const initials = getInitials(isEditing ? editForm.full_name || contact.full_name : contact.full_name);
  const displayTags = isEditing ? editForm.tags : contact.tags || [];
  const strength = contact.relationship_strength ?? 50;
  const facts = contact.facts || [];
  const relationships = contact.relationships || [];
  const interactions = contact.interactions || [];

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-clara-cream/90 backdrop-blur-lg safe-top"
      >
        <div className="flex items-center gap-3 px-5 h-14 max-w-lg mx-auto">
          <Link
            href="/contacts"
            className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-clara-warm-gray transition-colors"
          >
            <ArrowLeft size={20} className="text-clara-text" />
          </Link>
          <h1 className="text-lg font-semibold text-clara-text tracking-tight flex-1">
            {isEditing ? "Edit Contact" : contact.full_name}
          </h1>
          <AnimatePresence mode="wait">
            {isEditing && (
              <motion.div
                key="edit-actions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2"
              >
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-clara-text-secondary border border-clara-border hover:bg-clara-warm-gray transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium bg-clara-coral text-white hover:bg-clara-coral-dark transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Save size={12} />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Scrollable content */}
      <div className="flex-1 scroll-area px-5 pb-24 space-y-6">
        {/* ===== Hero / Header Section ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col items-center pt-4 pb-2"
        >
          {/* Large avatar */}
          <div className="w-20 h-20 rounded-full bg-clara-coral-light text-clara-coral flex items-center justify-center mb-3">
            <span className="text-2xl font-bold">{initials}</span>
          </div>

          {/* Name */}
          {isEditing ? (
            <input
              value={editForm.full_name}
              onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
              className="text-xl font-semibold text-clara-text text-center bg-clara-white border border-clara-border rounded-xl px-3 py-2 w-64 outline-none focus:border-clara-coral transition-colors"
              placeholder="Full name"
            />
          ) : (
            <h2 className="text-xl font-semibold text-clara-text">
              {contact.full_name}
            </h2>
          )}

          {/* Company / role */}
          {isEditing ? (
            <div className="flex gap-2 mt-2 w-full max-w-xs">
              <input
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                className="flex-1 bg-clara-white border border-clara-border rounded-xl px-3 py-2 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
                placeholder="Role"
              />
              <input
                value={editForm.company}
                onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                className="flex-1 bg-clara-white border border-clara-border rounded-xl px-3 py-2 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
                placeholder="Company"
              />
            </div>
          ) : (
            (contact.role || contact.company) && (
              <p className="text-sm text-clara-text-secondary mt-0.5">
                {[contact.role, contact.company].filter(Boolean).join(" at ")}
              </p>
            )
          )}

          {/* Contact info */}
          {isEditing ? (
            <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-clara-text-muted flex-shrink-0" />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="flex-1 bg-clara-white border border-clara-border rounded-xl px-3 py-2 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
                  placeholder="Email"
                  type="email"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-clara-text-muted flex-shrink-0" />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="flex-1 bg-clara-white border border-clara-border rounded-xl px-3 py-2 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
                  placeholder="Phone"
                  type="tel"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1 text-xs text-clara-text-muted hover:text-clara-coral transition-colors"
                >
                  <Mail size={12} />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1 text-xs text-clara-text-muted hover:text-clara-coral transition-colors"
                >
                  <Phone size={12} />
                  {contact.phone}
                </a>
              )}
            </div>
          )}

          {/* Tags */}
          {(displayTags.length > 0 || isEditing) && (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-clara-warm-gray text-clara-text-secondary inline-flex items-center gap-1"
                >
                  {tag}
                  {isEditing && (
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-clara-coral transition-colors"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <div className="inline-flex items-center gap-1">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="w-20 bg-clara-white border border-clara-border rounded-full px-2.5 py-1 text-xs text-clara-text outline-none focus:border-clara-coral transition-colors"
                    placeholder="Add tag"
                  />
                  <button
                    onClick={addTag}
                    className="w-6 h-6 rounded-full bg-clara-coral-light text-clara-coral flex items-center justify-center hover:bg-clara-coral hover:text-white transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes (edit mode) */}
          {isEditing && (
            <div className="w-full max-w-xs mt-3">
              <label className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider block mb-1.5">
                Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full bg-clara-white border border-clara-border rounded-xl px-3 py-2 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors resize-none"
                placeholder="Add notes about this contact..."
                rows={3}
              />
            </div>
          )}

          {/* Notes (view mode) */}
          {!isEditing && contact.notes && (
            <p className="text-xs text-clara-text-secondary mt-2 text-center max-w-xs">
              {contact.notes}
            </p>
          )}

          {/* Relationship strength */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${strengthColor(strength)}`}
              >
                <StrengthIcon strength={strength} />
                {strength}
              </span>
              <span className="text-xs text-clara-text-muted">
                — {strengthLabel(strength)}
              </span>
            </div>
            <div className="w-40 h-1.5 bg-clara-warm-gray rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${strength}%` }}
                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${strengthBgColor(strength)}`}
              />
            </div>
          </div>
        </motion.section>

        {/* ===== Clara Remembers ===== */}
        {facts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <Lightbulb size={16} className="text-clara-amber" />
              <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider">
                Clara remembers
              </h3>
            </div>
            <div className="space-y-2">
              {facts.map((fact, i) => (
                <motion.div
                  key={fact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className="clara-card p-3.5 flex gap-3 items-start"
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                      factTypeBadgeColors[fact.fact_type] ||
                      "bg-clara-warm-gray text-clara-text-secondary"
                    }`}
                  >
                    {fact.fact_type}
                  </span>
                  <p className="text-sm text-clara-text leading-relaxed flex-1">
                    {fact.fact}
                  </p>
                  {isEditing && (
                    <button
                      onClick={() => deleteFact(fact.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-clara-text-muted hover:bg-red-50 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ===== Relationships ===== */}
        {relationships.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <Users size={16} className="text-clara-blue" />
              <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider">
                Relationships
              </h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {relationships.map((rel, i) => (
                <motion.div
                  key={rel.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="clara-card p-3 flex flex-col items-center gap-2 min-w-[110px] flex-shrink-0"
                >
                  <div className="w-10 h-10 rounded-full bg-clara-blue-light text-clara-blue flex items-center justify-center">
                    <span className="text-xs font-semibold">
                      {getInitials(rel.related_name)}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-clara-text truncate max-w-[90px]">
                      {rel.related_name}
                    </p>
                    <p className="text-[10px] text-clara-text-muted mt-0.5">
                      {rel.label || rel.relationship_type}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ===== Interaction History ===== */}
        {interactions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <MessageSquare size={16} className="text-clara-coral" />
              <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider">
                Interaction History
              </h3>
            </div>
            <div className="space-y-2">
              {interactions.map((interaction, i) => {
                const Icon =
                  typeIcons[interaction.interaction_type] || MessageSquare;
                return (
                  <motion.div
                    key={interaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="clara-card p-4 flex gap-3"
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                        interaction.sentiment === "positive"
                          ? "bg-clara-green-light text-clara-green"
                          : interaction.sentiment === "negative"
                            ? "bg-red-50 text-red-400"
                            : "bg-clara-warm-gray text-clara-text-secondary"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-clara-text capitalize">
                          {interaction.interaction_type.replace("_", " ")}
                        </p>
                        <span className="text-xs text-clara-text-muted flex-shrink-0">
                          {formatTimeAgo(interaction.occurred_at)}
                        </span>
                      </div>
                      {interaction.summary && (
                        <p className="text-xs text-clara-text-secondary mt-0.5 line-clamp-2">
                          {interaction.summary}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Empty state when no facts or interactions yet */}
        {facts.length === 0 && interactions.length === 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center py-8"
          >
            <Lightbulb size={32} className="text-clara-text-muted mx-auto mb-3" />
            <p className="text-sm text-clara-text-secondary">
              Clara doesn&apos;t know much about {contact.full_name} yet.
            </p>
            <p className="text-xs text-clara-text-muted mt-1">
              Record a voice note to add details.
            </p>
          </motion.section>
        )}

        {/* ===== Quick Actions ===== */}
        {!isEditing && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pb-4"
          >
            <div className="flex gap-2">
              <Link
                href="/"
                className="flex-1 clara-card p-3 flex flex-col items-center gap-1.5 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-full bg-clara-coral-light text-clara-coral flex items-center justify-center">
                  <Mic size={16} />
                </div>
                <span className="text-xs font-medium text-clara-text">
                  Log interaction
                </span>
              </Link>

              <button className="flex-1 clara-card p-3 flex flex-col items-center gap-1.5 text-center hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-full bg-clara-blue-light text-clara-blue flex items-center justify-center">
                  <CheckSquare size={16} />
                </div>
                <span className="text-xs font-medium text-clara-text">
                  Add task
                </span>
              </button>

              <button
                onClick={enterEditMode}
                className="flex-1 clara-card p-3 flex flex-col items-center gap-1.5 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-full bg-clara-green-light text-clara-green flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <span className="text-xs font-medium text-clara-text">
                  Edit contact
                </span>
              </button>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
