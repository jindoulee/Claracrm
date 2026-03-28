"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ImportSheet } from "@/components/contacts/ImportSheet";
import { Search, Upload, Users, AlertCircle, CheckCircle, Plus, EyeOff, ChevronDown, ChevronUp, ArrowDownAZ, Clock, TrendingUp } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { ContactListSkeleton } from "@/components/ui/Skeleton";


interface ContactData {
  id: string;
  full_name: string;
  company: string | null;
  role: string | null;
  tags: string[];
  relationship_strength: number;
  last_interaction_at: string | null;
}

type SortOption = "recent" | "name" | "strength";

const sortOptions: { value: SortOption; label: string; icon: typeof Clock }[] = [
  { value: "recent", label: "Recent", icon: Clock },
  { value: "name", label: "A–Z", icon: ArrowDownAZ },
  { value: "strength", label: "Strength", icon: TrendingUp },
];

function sortContacts(contacts: ContactData[], sort: SortOption): ContactData[] {
  return [...contacts].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.full_name.localeCompare(b.full_name);
      case "strength":
        return (b.relationship_strength ?? 0) - (a.relationship_strength ?? 0);
      case "recent":
      default:
        return (b.last_interaction_at || "").localeCompare(a.last_interaction_at || "");
    }
  });
}

// Google icon SVG as a component
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function ContactsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [hiddenContacts, setHiddenContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", email: "", phone: "", company: "", notes: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [isGoogleImporting, setIsGoogleImporting] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [googleResult, setGoogleResult] = useState<{
    imported: number;
    skipped: number;
    merge: number;
  } | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const [activeRes, hiddenRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/contacts?status=hidden"),
      ]);
      if (!activeRes.ok) throw new Error("Failed to fetch");
      const activeData = await activeRes.json();
      const hiddenData = hiddenRes.ok ? await hiddenRes.json() : [];
      if (Array.isArray(activeData)) setContacts(activeData);
      if (Array.isArray(hiddenData)) setHiddenContacts(hiddenData);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle Google OAuth redirect results
  useEffect(() => {
    const importStatus = searchParams.get("import");
    if (!importStatus) return;

    if (importStatus === "success") {
      const imported = parseInt(searchParams.get("imported") || "0");
      const skipped = parseInt(searchParams.get("skipped") || "0");
      const merge = parseInt(searchParams.get("merge") || "0");
      setGoogleResult({ imported, skipped, merge });
      fetchContacts(); // Refresh the list
    } else if (importStatus === "cancelled") {
      showToast("Google import cancelled", "error");
    } else if (importStatus === "empty") {
      showToast("No contacts found in your Google account", "error");
    } else if (importStatus === "error") {
      showToast("Google import failed. Please try again.", "error");
    }

    // Clean up URL params
    router.replace("/contacts", { scroll: false });
  }, [searchParams, router, fetchContacts, showToast]);

  const handleImportComplete = useCallback(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleGoogleImport = () => {
    setIsGoogleImporting(true);
    window.location.href = "/api/auth/google";
  };

  const handleAddContact = async () => {
    if (!addForm.full_name.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: addForm.full_name.trim(),
          email: addForm.email.trim() || null,
          phone: addForm.phone.trim() || null,
          company: addForm.company.trim() || null,
          notes: addForm.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const newContact = await res.json();
      showToast(`Added ${addForm.full_name.trim()}`);
      setIsAddOpen(false);
      setAddForm({ full_name: "", email: "", phone: "", company: "", notes: "" });
      fetchContacts();
      if (newContact?.id) {
        router.push(`/contacts/${newContact.id}`);
      }
    } catch {
      showToast("Couldn't add contact. Try again?", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleHideContact = async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    // Optimistic update
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setHiddenContacts((prev) => [contact, ...prev]);

    // Show first-time hint
    const hasSeenHint = localStorage.getItem("clara_hide_hint");
    const toastMessage = !hasSeenHint
      ? `${contact.full_name} hidden — won't show in lists or be re-imported`
      : `${contact.full_name} hidden`;

    if (!hasSeenHint) {
      localStorage.setItem("clara_hide_hint", "1");
    }

    // Toast with undo
    showToast(toastMessage, "success", {
      action: {
        label: "Undo",
        onClick: () => restoreContact(contactId, contact),
      },
      duration: 5000,
    });

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "hidden" }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert on failure
      setContacts((prev) => [...prev, contact].sort((a, b) => {
        const aTime = a.last_interaction_at || "";
        const bTime = b.last_interaction_at || "";
        return bTime.localeCompare(aTime);
      }));
      setHiddenContacts((prev) => prev.filter((c) => c.id !== contactId));
      showToast("Couldn't hide contact. Try again?", "error");
    }
  };

  const restoreContact = async (contactId: string, contactData?: ContactData) => {
    const contact = contactData || hiddenContacts.find((c) => c.id === contactId);
    if (!contact) return;

    // Optimistic update
    setHiddenContacts((prev) => prev.filter((c) => c.id !== contactId));
    setContacts((prev) => [...prev, contact].sort((a, b) => {
      const aTime = a.last_interaction_at || "";
      const bTime = b.last_interaction_at || "";
      return bTime.localeCompare(aTime);
    }));

    showToast(`${contact.full_name} restored`);

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert on failure
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setHiddenContacts((prev) => [contact, ...prev]);
      showToast("Couldn't restore contact. Try again?", "error");
    }
  };

  const filtered = sortContacts(
    contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    sortBy
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="People"
        subtitle={contacts.length > 0 ? `${contacts.length} contacts` : undefined}
        actions={
          contacts.length > 0
            ? [
                { icon: Plus, label: "Add", onClick: () => setIsAddOpen(true) },
                { icon: Upload, label: "Import", onClick: () => setIsImportOpen(true) },
              ]
            : undefined
        }
      />

      <div className="px-5 space-y-4">
        {/* Google import success banner */}
        <AnimatePresence>
          {googleResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="clara-card p-4 flex items-start gap-3"
            >
              <CheckCircle size={20} className="text-clara-green flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-clara-text">
                  {googleResult.imported} {googleResult.imported === 1 ? "contact" : "contacts"} imported from Google
                </p>
                {googleResult.skipped > 0 && (
                  <p className="text-xs text-clara-text-muted mt-0.5">
                    {googleResult.skipped} already in Clara
                  </p>
                )}
                {googleResult.merge > 0 && (
                  <p className="text-xs text-clara-amber mt-0.5">
                    {googleResult.merge} possible {googleResult.merge === 1 ? "duplicate" : "duplicates"} to review
                  </p>
                )}
              </div>
              <button
                onClick={() => setGoogleResult(null)}
                className="text-xs text-clara-text-muted"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar + sort — only show when there are contacts */}
        {contacts.length > 0 && (
          <div className="space-y-3">
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

            {/* Sort pills */}
            <div className="flex gap-1.5">
              {sortOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sortBy === value
                      ? "bg-clara-coral text-white"
                      : "bg-clara-warm-gray text-clara-text-secondary hover:bg-clara-border"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <ContactListSkeleton />
        ) : error ? (
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
              {filtered.map((contact, i) => {
                // Show letter header when sorting A-Z
                const rawLetter = contact.full_name[0]?.toUpperCase() || "";
                const letter = /^[A-Z]$/.test(rawLetter) ? rawLetter : "#";
                const prevRawLetter = filtered[i - 1]?.full_name[0]?.toUpperCase() || "";
                const prevLetter = /^[A-Z]$/.test(prevRawLetter) ? prevRawLetter : "#";
                const showLetterHeader =
                  sortBy === "name" &&
                  !searchQuery &&
                  (i === 0 || prevLetter !== letter);

                return (
                  <div key={contact.id}>
                    {showLetterHeader && (
                      <div className="sticky top-14 z-10 -mx-5 px-5 py-1.5 bg-clara-cream/95 backdrop-blur-sm">
                        <span className="text-xs font-bold text-clara-coral uppercase">
                          {letter}
                        </span>
                      </div>
                    )}
                    <ContactCard
                      contact={contact}
                      index={i}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      onHide={handleHideContact}
                      mode="active"
                    />
                  </div>
                );
              })}
            </div>

            {/* Search empty state */}
            {filtered.length === 0 && contacts.length > 0 && (
              <div className="text-center py-12 px-4">
                <Search size={28} className="text-clara-text-muted mx-auto mb-3" />
                <p className="text-clara-text-secondary text-sm">
                  No one matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}

            {/* No contacts empty state */}
            {contacts.length === 0 && hiddenContacts.length === 0 && (
              <div className="text-center py-12 px-4">
                <Users size={36} className="text-clara-coral/30 mx-auto mb-4" />
                <p className="text-sm font-medium text-clara-text">
                  Your people will show up here
                </p>
                <p className="text-xs text-clara-text-muted mt-1.5 max-w-[240px] mx-auto">
                  Import your contacts so Clara can recognize them when you record voice notes.
                </p>

                <div className="mt-5 space-y-2.5 max-w-[260px] mx-auto">
                  {/* Google Contacts — primary CTA */}
                  <button
                    onClick={handleGoogleImport}
                    disabled={isGoogleImporting}
                    className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white border border-clara-border text-sm font-medium text-clara-text hover:bg-clara-warm-gray active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                  >
                    <GoogleIcon size={18} />
                    {isGoogleImporting ? "Connecting..." : "Import from Google"}
                  </button>

                  {/* File upload — secondary */}
                  <button
                    onClick={() => setIsImportOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-medium text-clara-text-secondary hover:text-clara-coral transition-colors"
                  >
                    <Upload size={14} />
                    Upload a .vcf or .csv file instead
                  </button>

                  {/* Manual add */}
                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-medium text-clara-text-muted hover:text-clara-coral transition-colors"
                  >
                    <Plus size={14} />
                    Or add someone manually
                  </button>
                </div>
              </div>
            )}

            {/* Hidden contacts section */}
            {hiddenContacts.length > 0 && (
              <div className="pt-4 pb-24">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className="flex items-center gap-2 text-xs text-clara-text-muted hover:text-clara-text transition-colors mx-auto"
                >
                  <EyeOff size={14} />
                  <span>{hiddenContacts.length} hidden</span>
                  {showHidden ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showHidden && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {hiddenContacts.map((contact, i) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          index={i}
                          onClick={() => router.push(`/contacts/${contact.id}`)}
                          onRestore={(id) => restoreContact(id)}
                          mode="hidden"
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* File import sheet */}
      <ImportSheet
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Add contact sheet */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <div className="space-y-4 pb-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-clara-text">Add a contact</h2>
          </div>

          <div className="space-y-3">
            <input
              value={addForm.full_name}
              onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Name *"
              className="w-full bg-clara-white border border-clara-border rounded-xl px-4 py-3 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
              autoFocus
            />
            <input
              value={addForm.company}
              onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Company"
              className="w-full bg-clara-white border border-clara-border rounded-xl px-4 py-3 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
            />
            <div className="flex gap-2">
              <input
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                type="email"
                className="flex-1 bg-clara-white border border-clara-border rounded-xl px-4 py-3 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
              />
              <input
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
                type="tel"
                className="flex-1 bg-clara-white border border-clara-border rounded-xl px-4 py-3 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors"
              />
            </div>
            <textarea
              value={addForm.notes}
              onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full bg-clara-white border border-clara-border rounded-xl px-4 py-3 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleAddContact}
            disabled={!addForm.full_name.trim() || isAdding}
            className="w-full py-3 rounded-xl bg-clara-coral text-white font-medium text-sm hover:bg-clara-coral-dark active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "Add Contact"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsPageContent />
    </Suspense>
  );
}
