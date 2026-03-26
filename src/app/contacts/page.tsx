"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ContactCard } from "@/components/contacts/ContactCard";
import { Search, UserPlus } from "lucide-react";

// Demo data — will be replaced with Supabase queries
const DEMO_CONTACTS = [
  {
    id: "1",
    full_name: "Alan Chen",
    company: "TechCorp",
    role: "VP Engineering",
    tags: ["friend", "tech"],
    relationship_strength: 75,
    last_interaction_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "2",
    full_name: "Sarah Kim",
    company: "StartupXYZ",
    role: "CEO",
    tags: ["investor-intro", "founder"],
    relationship_strength: 60,
    last_interaction_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "3",
    full_name: "Mike Rodriguez",
    company: null,
    role: "Designer",
    tags: ["friend"],
    relationship_strength: 35,
    last_interaction_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
];

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = DEMO_CONTACTS.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="People" subtitle={`${DEMO_CONTACTS.length} contacts`} />

      <div className="px-5 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-clara-text-muted"
          />
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-clara-white border border-clara-border text-sm text-clara-text placeholder:text-clara-text-muted focus:outline-none focus:border-clara-coral focus:ring-1 focus:ring-clara-coral/20 transition-colors"
          />
        </div>

        {/* Contact list */}
        <div className="space-y-2">
          {filtered.map((contact, i) => (
            <ContactCard key={contact.id} contact={contact} index={i} />
          ))}
        </div>

        {filtered.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-clara-text-secondary text-sm">
              No one named &ldquo;{searchQuery}&rdquo; yet.
            </p>
            <button className="mt-3 inline-flex items-center gap-1.5 text-sm text-clara-coral font-medium">
              <UserPlus size={16} />
              Add them via voice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
