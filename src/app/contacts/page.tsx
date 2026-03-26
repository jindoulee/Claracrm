"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ContactCard } from "@/components/contacts/ContactCard";
import { Search, UserPlus } from "lucide-react";

// Demo data — used as fallback if API returns empty/error
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

interface ContactData {
  id: string;
  full_name: string;
  company: string | null;
  role: string | null;
  tags: string[];
  relationship_strength: number;
  last_interaction_at: string | null;
}

export default function ContactsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch("/api/contacts");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setContacts(data);
        } else {
          setContacts(DEMO_CONTACTS);
        }
      } catch {
        setContacts(DEMO_CONTACTS);
      } finally {
        setIsLoading(false);
      }
    }
    fetchContacts();
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="People" subtitle={`${contacts.length} contacts`} />

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

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-clara-coral border-t-transparent rounded-full animate-spin" />
            <p className="text-clara-text-muted text-sm mt-3">Loading contacts...</p>
          </div>
        ) : (
          <>
            {/* Contact list */}
            <div className="space-y-2">
              {filtered.map((contact, i) => (
                <ContactCard key={contact.id} contact={contact} index={i} onClick={() => router.push(`/contacts/${contact.id}`)} />
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
          </>
        )}
      </div>
    </div>
  );
}
