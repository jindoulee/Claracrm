"use client";

import { motion } from "framer-motion";

interface TranscriptPreviewProps {
  finalText: string;
  interimText: string;
}

export function TranscriptPreview({ finalText, interimText }: TranscriptPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-sm bg-clara-white rounded-2xl border border-clara-border p-4 shadow-sm"
    >
      <p className="text-sm text-clara-text leading-relaxed">
        {finalText}
        {interimText && (
          <span className="text-clara-text-muted"> {interimText}</span>
        )}
      </p>
    </motion.div>
  );
}
