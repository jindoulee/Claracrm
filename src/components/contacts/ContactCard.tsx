"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { User, Clock, TrendingDown, TrendingUp, EyeOff, RotateCcw } from "lucide-react";

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
  onHide?: (id: string) => void;
  onRestore?: (id: string) => void;
  mode?: "active" | "hidden";
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

export function ContactCard({ contact, index, onClick, onHide, onRestore, mode = "active" }: ContactCardProps) {
  const initials = contact.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-120, -60], [1, 0]);
  const actionScale = useTransform(x, [-120, -60], [1, 0.8]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = () => {
    const xVal = x.get();
    if (xVal < -80 && mode === "active" && onHide) {
      onHide(contact.id);
    } else if (xVal < -80 && mode === "hidden" && onRestore) {
      onRestore(contact.id);
    }
    setIsDragging(false);
  };

  const isSwipeable = (mode === "active" && onHide) || (mode === "hidden" && onRestore);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe action background */}
      {isSwipeable && (
        <motion.div
          style={{ opacity: actionOpacity, scale: actionScale }}
          className={`absolute inset-0 flex items-center justify-end pr-6 rounded-2xl ${
            mode === "active" ? "bg-gray-400" : "bg-clara-green"
          }`}
        >
          <div className="flex flex-col items-center gap-0.5 text-white">
            {mode === "active" ? (
              <>
                <EyeOff size={18} />
                <span className="text-[10px] font-semibold">Hide</span>
              </>
            ) : (
              <>
                <RotateCcw size={18} />
                <span className="text-[10px] font-semibold">Restore</span>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Card */}
      <motion.button
        onClick={isDragging ? undefined : onClick}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        style={isSwipeable ? { x } : undefined}
        drag={isSwipeable ? "x" : false}
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.3, right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className={`clara-card p-4 flex items-center gap-3 w-full text-left relative z-10 ${
          mode === "hidden" ? "opacity-60" : ""
        }`}
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
    </div>
  );
}
