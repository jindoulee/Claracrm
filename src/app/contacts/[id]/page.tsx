"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lightbulb,
  Users,
  MessageSquare,
  Plus,
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
} from "lucide-react";

// --- Demo Data (Alan Chen, id "1") ---

const DEMO_CONTACT = {
  id: "1",
  user_id: "demo",
  full_name: "Alan Chen",
  nickname: null,
  email: "alan.chen@techcorp.com",
  phone: "+1 (415) 555-0132",
  company: "TechCorp",
  role: "VP Engineering",
  avatar_url: null,
  notes: "Met at React Conf 2025. Very into climbing and specialty coffee.",
  tags: ["friend", "tech", "climbing"],
  relationship_strength: 75,
  last_interaction_at: new Date(Date.now() - 86400000).toISOString(),
  metadata: {},
  created_at: new Date(Date.now() - 86400000 * 120).toISOString(),
  updated_at: new Date(Date.now() - 86400000).toISOString(),
};

const DEMO_FACTS = [
  {
    id: "f1",
    contact_id: "1",
    fact_type: "family",
    fact: "Wife's name is Michelle, they have a 3-year-old daughter named Lily",
    source_interaction_id: null,
    confidence: 0.95,
    valid_from: new Date(Date.now() - 86400000 * 90).toISOString(),
    valid_until: null,
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
  {
    id: "f2",
    contact_id: "1",
    fact_type: "work",
    fact: "Leading the migration from monolith to microservices at TechCorp",
    source_interaction_id: null,
    confidence: 0.9,
    valid_from: new Date(Date.now() - 86400000 * 60).toISOString(),
    valid_until: null,
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: "f3",
    contact_id: "1",
    fact_type: "interest",
    fact: "Trains for bouldering competitions, goes to Movement Gym on weekends",
    source_interaction_id: null,
    confidence: 0.85,
    valid_from: new Date(Date.now() - 86400000 * 45).toISOString(),
    valid_until: null,
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: "f4",
    contact_id: "1",
    fact_type: "interest",
    fact: "Obsessed with pour-over coffee, owns a Comandante grinder",
    source_interaction_id: null,
    confidence: 0.8,
    valid_from: new Date(Date.now() - 86400000 * 30).toISOString(),
    valid_until: null,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "f5",
    contact_id: "1",
    fact_type: "health",
    fact: "Training for a half-marathon in April",
    source_interaction_id: null,
    confidence: 0.75,
    valid_from: new Date(Date.now() - 86400000 * 10).toISOString(),
    valid_until: null,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

const DEMO_RELATIONSHIPS = [
  {
    id: "r1",
    contact_id: "1",
    related_contact_id: "10",
    relationship_type: "spouse",
    label: "Wife",
    related_name: "Michelle Chen",
  },
  {
    id: "r2",
    contact_id: "1",
    related_contact_id: "11",
    relationship_type: "child",
    label: "Daughter",
    related_name: "Lily Chen",
  },
  {
    id: "r3",
    contact_id: "1",
    related_contact_id: "2",
    relationship_type: "colleague",
    label: "Works with",
    related_name: "Sarah Kim",
  },
];

const DEMO_INTERACTIONS = [
  {
    id: "i1",
    interaction_type: "coffee",
    summary:
      "Grabbed coffee at Blue Bottle. Alan mentioned he's training for a half-marathon and the microservices migration is ahead of schedule.",
    occurred_at: new Date(Date.now() - 86400000).toISOString(),
    sentiment: "positive",
    contacts: [{ full_name: "Alan Chen" }],
  },
  {
    id: "i2",
    interaction_type: "call",
    summary:
      "Quick call to catch up. He's excited about Lily starting preschool next month. Asked about my startup progress.",
    occurred_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    sentiment: "positive",
    contacts: [{ full_name: "Alan Chen" }],
  },
  {
    id: "i3",
    interaction_type: "meeting",
    summary:
      "Ran into Alan and Sarah at the TechCrunch meetup. Discussed potential collaboration between our teams.",
    occurred_at: new Date(Date.now() - 86400000 * 21).toISOString(),
    sentiment: "neutral",
    contacts: [{ full_name: "Alan Chen" }, { full_name: "Sarah Kim" }],
  },
  {
    id: "i4",
    interaction_type: "text",
    summary:
      "Sent him the link to that climbing documentary. He replied with some coffee bean recommendations.",
    occurred_at: new Date(Date.now() - 86400000 * 35).toISOString(),
    sentiment: "positive",
    contacts: [{ full_name: "Alan Chen" }],
  },
];

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

// --- Page Component ---

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  // In a real app, fetch contact by id. For now, use demo data.
  const contact = DEMO_CONTACT;
  const facts = DEMO_FACTS;
  const relationships = DEMO_RELATIONSHIPS;
  const interactions = DEMO_INTERACTIONS;

  const initials = getInitials(contact.full_name);

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
          <h1 className="text-lg font-semibold text-clara-text tracking-tight">
            {contact.full_name}
          </h1>
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
          <h2 className="text-xl font-semibold text-clara-text">
            {contact.full_name}
          </h2>

          {/* Company / role */}
          {(contact.role || contact.company) && (
            <p className="text-sm text-clara-text-secondary mt-0.5">
              {[contact.role, contact.company].filter(Boolean).join(" at ")}
            </p>
          )}

          {/* Contact info */}
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

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-clara-warm-gray text-clara-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Relationship strength */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${strengthColor(contact.relationship_strength)}`}
              >
                <StrengthIcon strength={contact.relationship_strength} />
                {contact.relationship_strength}
              </span>
              <span className="text-xs text-clara-text-muted">
                — {strengthLabel(contact.relationship_strength)}
              </span>
            </div>
            <div className="w-40 h-1.5 bg-clara-warm-gray rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${contact.relationship_strength}%` }}
                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${strengthBgColor(contact.relationship_strength)}`}
              />
            </div>
          </div>
        </motion.section>

        {/* ===== Clara Remembers ===== */}
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
                <p className="text-sm text-clara-text leading-relaxed">
                  {fact.fact}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ===== Relationships ===== */}
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
                    {rel.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ===== Interaction History ===== */}
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
                      <p className="text-sm font-medium text-clara-text truncate">
                        {interaction.contacts
                          .map((c) => c.full_name)
                          .join(", ")}
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

        {/* ===== Quick Actions ===== */}
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

            <button className="flex-1 clara-card p-3 flex flex-col items-center gap-1.5 text-center hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-full bg-clara-green-light text-clara-green flex items-center justify-center">
                <Pencil size={16} />
              </div>
              <span className="text-xs font-medium text-clara-text">
                Edit contact
              </span>
            </button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
