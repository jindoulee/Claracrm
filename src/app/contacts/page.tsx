"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ContactCard } from "@/components/contacts/ContactCard";
import { Search, UserPlus, Users, AlertCircle } from "lucide-react";


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
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch("/api/contacts");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data)) {
          setContacts(data);
        }
      } catch {
        setError(true);
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
      <Header title="People" subtitle={contacts.length > 0 ? `${contacts.length} contacts` : undefined} />

      <div className="px-5 space-y-4">
        {/* Search bar — only show when there are contacts */}
        {contacts.length > 0 && (
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
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-clara-coral border-t-transparent rounded-full animate-spin" />
            <p className="text-clara-text-muted text-sm mt-3">Loading contacts...</p>
          </div>
        ) : error ? (
          /* Error state */
          <div className="text-center py-16 px-4">
            <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
            <p className="text-sm text-clara-text-secondary">
              Couldn&apos;t load your contacts right now.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-clara-coral font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Contact list */}
            <div className="space-y-2">
              {filtered.map((contact, i) => (
                <ContactCard key={contact.id} contact={contact} index={i} onClick={() => router.push(`/contacts/${contact.id}`)} />
              ))}
            </div>

            {/* Empty states */}
            {filtered.length === 0 && contacts.length > 0 && (
              <div className="text-center py-12 px-4">
                <Search size={28} className="text-clara-text-muted mx-auto mb-3" />
                <p className="text-clara-text-secondary text-sm">
                  No one matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}

            {contacts.length === 0 && (
              <div className="text-center py-16 px-4">
                <Users size={36} className="text-clara-coral/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-clara-text">
                  Your people will show up here
                </p>
                <p className="text-xs text-clara-text-muted mt-1.5 max-w-[220px] mx-auto">
                  Record a voice note on the home screen and Clara will add anyone you mention.
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-clara-coral font-medium"
                >
                  <UserPlus size={16} />
                  Record a voice note
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
