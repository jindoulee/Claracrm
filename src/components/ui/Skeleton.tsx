"use client";

import { motion } from "framer-motion";

function Bone({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`bg-clara-warm-gray rounded-lg ${className}`}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function HomeSkeleton() {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* "Coming up" section */}
      <div>
        <Bone className="h-3 w-20 mb-3 ml-1" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="clara-card p-3.5 flex items-center gap-3"
            >
              <Bone className="w-5 h-5 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3.5 w-3/4" />
                <Bone className="h-2.5 w-1/2" />
              </div>
              <Bone className="h-6 w-6 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* "Recent" section */}
      <div>
        <Bone className="h-3 w-16 mb-3 ml-1" />
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="clara-card p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Bone className="w-4 h-4 rounded-full flex-shrink-0" />
                <Bone className="h-3 w-24" />
                <div className="flex-1" />
                <Bone className="h-2.5 w-12" />
              </div>
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactListSkeleton() {
  return (
    <div className="space-y-2">
      {/* Search bar skeleton */}
      <Bone className="h-10 w-full rounded-xl mb-3" />
      {/* Contact cards */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="clara-card p-3.5 flex items-center gap-3"
        >
          <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-3.5 w-2/5" />
            <Bone className="h-2.5 w-3/5" />
          </div>
          <Bone className="h-3 w-8 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ContactDetailSkeleton() {
  return (
    <div className="px-5 pb-8">
      {/* Avatar + name */}
      <div className="flex flex-col items-center pt-6 pb-5">
        <Bone className="w-20 h-20 rounded-full mb-3" />
        <Bone className="h-5 w-36 mb-1.5" />
        <Bone className="h-3 w-24" />
      </div>

      {/* Strength bar */}
      <div className="clara-card p-3.5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <Bone className="h-3 w-28" />
          <Bone className="h-3 w-12" />
        </div>
        <Bone className="h-2 w-full rounded-full" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-5">
        <Bone className="h-9 flex-1 rounded-xl" />
        <Bone className="h-9 flex-1 rounded-xl" />
        <Bone className="h-9 flex-1 rounded-xl" />
      </div>

      {/* Facts section */}
      <Bone className="h-3 w-20 mb-3 ml-1" />
      <div className="space-y-2 mb-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="clara-card p-3 flex items-start gap-2.5">
            <Bone className="w-5 h-5 rounded flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <Bone className="h-3 w-full" />
              <Bone className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>

      {/* Timeline section */}
      <Bone className="h-3 w-16 mb-3 ml-1" />
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="clara-card p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <Bone className="w-4 h-4 rounded-full flex-shrink-0" />
              <Bone className="h-3 w-16" />
              <div className="flex-1" />
              <Bone className="h-2.5 w-14" />
            </div>
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="h-3 w-16 mb-3 ml-1" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="clara-card p-3.5 flex items-center gap-3"
        >
          <Bone className="w-6 h-6 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-3.5 w-4/5" />
            <div className="flex items-center gap-2">
              <Bone className="h-2.5 w-16" />
              <Bone className="h-2.5 w-20" />
            </div>
          </div>
          <Bone className="h-4 w-4 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
