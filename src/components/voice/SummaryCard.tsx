"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  UserPlus,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Pencil,
  Check,
} from "lucide-react";
import type { VoiceProcessingResult, ContactMatchInfo } from "@/lib/supabase/types";
import type { FollowUpQuestion } from "@/lib/ai/process-voice";
import { hapticLight, hapticSuccess } from "@/lib/utils/haptics";

interface DbIds {
  contactIds: string[];
  interactionId: string | null;
  factIds: string[];
  relationshipIds: string[];
  taskIds: string[];
}

interface SummaryCardProps {
  result: VoiceProcessingResult;
  dbIds: DbIds | null;
  followUpQuestions: FollowUpQuestion[];
  onQuestionAnswer: (question: FollowUpQuestion) => void;
  onDismiss: () => void;
}

// Inline editable text component
function EditableText({
  value,
  onSave,
  className = "",
  inputClassName = "",
}: {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = useCallback(() => {
    setEditValue(value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [value]);

  const handleSave = useCallback(async () => {
    setIsEditing(false);
    if (editValue.trim() === value) return;
    if (!editValue.trim()) {
      setEditValue(value);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editValue.trim());
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 1200);
    } catch {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditValue(value);
            setIsEditing(false);
          }
        }}
        className={`bg-clara-white border border-clara-border rounded-xl px-3 py-2 text-sm text-clara-text outline-none focus:border-clara-coral transition-colors ${inputClassName}`}
      />
    );
  }

  return (
    <span
      onClick={handleStartEdit}
      className={`cursor-pointer group inline-flex items-center gap-1 ${className}`}
    >
      <span className={isSaving ? "opacity-50" : ""}>{editValue}</span>
      <AnimatePresence mode="wait">
        {showCheck ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Check size={12} className="text-clara-green" />
          </motion.span>
        ) : (
          <motion.span
            key="pencil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil size={10} className="text-clara-text-muted" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// Editable contact pill
function EditableContactPill({
  name,
  contactId,
  isNew,
  isUncertain,
}: {
  name: string;
  contactId: string | undefined;
  isNew: boolean;
  isUncertain: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [currentName, setCurrentName] = useState(name);
  const [showCheck, setShowCheck] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const prefix = isNew ? "+" : "\u00b7";

  const handleSave = useCallback(async () => {
    setIsEditing(false);
    if (editName.trim() === currentName || !editName.trim()) {
      setEditName(currentName);
      return;
    }
    if (!contactId) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName.trim() }),
      });
      if (res.ok) {
        setCurrentName(editName.trim());
        setShowCheck(true);
        setTimeout(() => setShowCheck(false), 1200);
      }
    } catch {
      setEditName(currentName);
    }
  }, [editName, currentName, contactId]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditName(currentName);
            setIsEditing(false);
          }
        }}
        className="bg-clara-white border border-clara-border rounded-full px-3 py-1 text-xs font-medium text-clara-text outline-none focus:border-clara-coral transition-colors w-32"
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => {
        setEditName(currentName);
        setIsEditing(true);
      }}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer group ${
        isUncertain
          ? "bg-transparent border border-clara-coral text-clara-coral"
          : "bg-clara-blue-light text-clara-blue"
      }`}
    >
      {isNew ? <UserPlus size={12} /> : <User size={12} />}
      <span className="font-semibold mr-0.5">{prefix}</span>
      {currentName}
      <AnimatePresence mode="wait">
        {showCheck ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check size={10} className="text-clara-green" />
          </motion.span>
        ) : (
          <Pencil size={9} className="text-current opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </AnimatePresence>
    </span>
  );
}

export function SummaryCard({
  result,
  dbIds,
  followUpQuestions,
  onQuestionAnswer,
  onDismiss,
}: SummaryCardProps) {
  const { interaction, contacts, follow_ups, facts_learned, matchInfo } = result;

  // Build a lookup from contact name to match info
  const matchLookup = new Map<string, ContactMatchInfo>();
  if (matchInfo) {
    for (const m of matchInfo) {
      matchLookup.set(m.name, m);
    }
  }

  // Build a lookup from contact name to contactId via matchInfo
  const contactIdByName = new Map<string, string>();
  if (matchInfo) {
    for (const m of matchInfo) {
      contactIdByName.set(m.name, m.contactId);
    }
  }

  // Collect enrichment updates for display
  const enrichmentUpdates: { name: string; field: string }[] = [];
  if (matchInfo) {
    for (const m of matchInfo) {
      for (const field of m.updatedFields) {
        enrichmentUpdates.push({ name: m.name, field });
      }
    }
  }

  // Handler to update a fact
  const handleFactSave = useCallback(
    async (factIndex: number, newText: string) => {
      if (!dbIds?.factIds?.[factIndex]) return;
      const factId = dbIds.factIds[factIndex];
      const res = await fetch(`/api/facts/${factId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact: newText }),
      });
      if (!res.ok) throw new Error("Failed to update fact");
    },
    [dbIds]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="text-center pt-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-clara-green-light mb-3"
        >
          <CheckCircle2 size={24} className="text-clara-green" />
        </motion.div>
        <h2 className="text-lg font-semibold text-clara-text">Got it!</h2>
        <p className="text-sm text-clara-text-secondary mt-1 leading-relaxed">
          {interaction.summary || "Interaction logged"}
        </p>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-coral-light text-clara-coral">
          <MessageSquare size={12} />
          {interaction.type}
        </span>

        {contacts.map((c) => {
          const match = matchLookup.get(c.name);
          const isNew = match?.confidence === "new";
          const isUncertain = match?.confidence === "uncertain";
          const contactId = contactIdByName.get(c.name);

          return (
            <EditableContactPill
              key={c.name}
              name={c.name}
              contactId={contactId}
              isNew={isNew}
              isUncertain={isUncertain}
            />
          );
        })}

        {interaction.location && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-purple-light text-clara-purple">
            <MapPin size={12} />
            {interaction.location}
          </span>
        )}

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            interaction.sentiment === "positive"
              ? "bg-clara-green-light text-clara-green"
              : interaction.sentiment === "negative"
              ? "bg-red-50 text-red-500"
              : "bg-clara-warm-gray text-clara-text-secondary"
          }`}
        >
          {interaction.sentiment === "positive" ? "+" : interaction.sentiment === "negative" ? "-" : "~"}{" "}
          {interaction.sentiment}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-clara-border" />

      {/* Contact enrichment updates */}
      {enrichmentUpdates.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw size={13} />
            Contacts updated
          </h3>
          <div className="space-y-2">
            {enrichmentUpdates.map((upd, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="flex items-center gap-2 bg-clara-cream rounded-xl px-3 py-2.5"
              >
                <span className="text-sm text-clara-text">
                  Updated {upd.name} &middot; <span className="text-clara-text-muted">{upd.field}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Facts learned — editable */}
      {facts_learned.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb size={13} />
            Clara learned
            <Pencil size={10} className="text-clara-text-muted ml-1" />
          </h3>
          <div className="space-y-2">
            {facts_learned.map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-2 bg-clara-cream rounded-xl px-3 py-2.5"
              >
                <span className="text-xs text-clara-text-muted mt-0.5 capitalize flex-shrink-0">
                  {fact.fact_type}
                </span>
                <EditableText
                  value={fact.fact}
                  onSave={(newText) => handleFactSave(i, newText)}
                  className="text-sm text-clara-text"
                  inputClassName="flex-1 w-full"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {follow_ups.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRight size={13} />
            Follow-ups created
          </h3>
          <div className="space-y-2">
            {follow_ups.map((fu, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-start justify-between gap-3 bg-clara-cream rounded-xl px-3 py-2.5"
              >
                <span className="text-sm text-clara-text">{fu.action}</span>
                <span className="text-xs text-clara-text-muted whitespace-nowrap flex-shrink-0">{fu.due}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up questions */}
      {followUpQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="h-px bg-clara-border" />
          <h3 className="text-xs font-semibold text-clara-text-muted uppercase tracking-wider">
            Want to add more?
          </h3>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  hapticLight();
                  onQuestionAnswer(q);
                }}
                className="clara-chip text-xs"
              >
                {q.chip_label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Done button */}
      <button
        onClick={() => {
          hapticSuccess();
          onDismiss();
        }}
        className="w-full py-3 rounded-2xl bg-clara-coral text-white font-medium text-sm active:scale-[0.98] transition-transform"
      >
        Done
      </button>
    </div>
  );
}
