"use client";

import { motion } from "framer-motion";
import { User, Clock, TrendingDown, TrendingUp } from "lucide-react";

interface ContactCardProps {
  contact: {
    id: string;
    full_name: string;
    company: string | null;
    role: string | null;
    tags: string[];
    relationship_strength: number;
    last_interaction_at: string | null;
  };
  index: number;
  onClick?: () => void;
}

function strengthColor(strength: number) {
  if (strength >= 70) return "text-clara-green";
  if (strength >= 40) return "text-clara-amber";
  return "text-red-400";
}

function strengthBgColor(strength: number) {
  if (strength >= 70) return "bg-clara-green";
  if (strength >= 40) return "bg-clara-amber";
  return "bg-red-400";
}

function strengthLabel(strength: number) {
  if (strength >= 70) return "Strong";
  if (strength >= 40) return "Okay";
  return "Fading";
}

function formatLastSeen(date: string | null): string {
  if (!date) return "Never";
  const now = new Date();
  const then = new Date(date);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function ContactCard({ contact, index, onClick }: ContactCardProps) {
  const initials = contact.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="clara-card p-4 flex items-center gap-3 w-full text-left"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-clara-coral-light text-clara-coral flex items-center justify-center">
        <span className="text-sm font-semibold">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-clara-text truncate">
          {contact.full_name}
        </p>
        {(contact.role || contact.company) && (
          <p className="text-xs text-clara-text-muted truncate">
            {[contact.role, contact.company].filter(Boolean).join(" at ")}
          </p>
        )}
        {contact.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {contact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-clara-warm-gray text-clara-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Strength + last seen */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <div className="flex flex-col items-end gap-0.5">
          <span className={`text-[10px] font-semibold ${strengthColor(contact.relationship_strength)}`}>
            {strengthLabel(contact.relationship_strength)}
          </span>
          <div className="w-12 h-1 bg-clara-warm-gray rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${strengthBgColor(contact.relationship_strength)}`}
              style={{ width: `${contact.relationship_strength}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] text-clara-text-muted flex items-center gap-0.5">
          <Clock size={10} />
          {formatLastSeen(contact.last_interaction_at)}
        </span>
      </div>
    </motion.button>
  );
}
