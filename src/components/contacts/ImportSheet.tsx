"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Upload, FileText, CheckCircle, AlertCircle, Users } from "lucide-react";
import { hapticSuccess } from "@/lib/utils/haptics";

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

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  mergeCandidates: number;
  parseErrors: string[];
  importErrors: string[];
}

type ImportState = "choose" | "file" | "uploading" | "success" | "error";

interface ImportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportSheet({ isOpen, onClose, onImportComplete }: ImportSheetProps) {
  const [state, setState] = useState<ImportState>("choose");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isGoogleImporting, setIsGoogleImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState("choose");
    setResult(null);
    setErrorMessage("");
    setIsGoogleImporting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (state === "success") {
      onImportComplete();
    }
    onClose();
    // Reset after close animation
    setTimeout(resetState, 300);
  }, [state, onClose, onImportComplete, resetState]);

  const handleGoogleImport = () => {
    setIsGoogleImporting(true);
    window.location.href = "/api/auth/google";
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".vcf") && !name.endsWith(".vcard") && !name.endsWith(".csv")) {
      setErrorMessage("Please upload a .vcf or .csv file.");
      setState("error");
      return;
    }

    setState("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Import failed");
        setState("error");
        return;
      }

      setResult(data);
      setState("success");
      hapticSuccess();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setState("error");
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4 pb-4">
        <AnimatePresence mode="wait">
          {/* ── Choose Import Method ── */}
          {state === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="text-center mb-5">
                <h2 className="text-lg font-semibold text-clara-text">
                  Import Contacts
                </h2>
                <p className="text-xs text-clara-text-muted mt-1">
                  Bring in your people so Clara can recognize them
                </p>
              </div>

              <div className="space-y-3 max-w-xs mx-auto">
                {/* Google Contacts — primary */}
                <button
                  onClick={handleGoogleImport}
                  disabled={isGoogleImporting}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-white border border-clara-border text-sm font-medium text-clara-text hover:bg-clara-warm-gray active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                >
                  <GoogleIcon size={18} />
                  {isGoogleImporting ? "Connecting..." : "Import from Google"}
                </button>

                {/* File upload — secondary */}
                <button
                  onClick={() => setState("file")}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-clara-text-secondary hover:text-clara-coral hover:bg-clara-coral-light/5 transition-colors"
                >
                  <Upload size={16} />
                  Upload a .vcf or .csv file
                </button>
              </div>
            </motion.div>
          )}

          {/* ── File Select ── */}
          {state === "file" && (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="text-center mb-5">
                <h2 className="text-lg font-semibold text-clara-text">
                  Upload Contacts File
                </h2>
                <p className="text-xs text-clara-text-muted mt-1">
                  Choose a .vcf or .csv file from your device
                </p>
              </div>

              {/* Drop zone */}
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="w-full border-2 border-dashed border-clara-border rounded-2xl py-10 px-6 flex flex-col items-center gap-3 hover:border-clara-coral hover:bg-clara-coral-light/5 transition-colors active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-full bg-clara-coral-light flex items-center justify-center">
                  <Upload size={24} className="text-clara-coral" />
                </div>
                <div>
                  <p className="text-sm font-medium text-clara-text">
                    Tap to choose a file
                  </p>
                  <p className="text-xs text-clara-text-muted mt-0.5">
                    .vcf or .csv from your phone or computer
                  </p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,.vcard,.csv"
                onChange={handleInputChange}
                className="hidden"
              />

              {/* Help text */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2.5 px-1">
                  <FileText size={14} className="text-clara-text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-clara-text-muted leading-relaxed">
                    <strong>iPhone:</strong> Contacts app → Select All → Share → Export as VCF
                  </p>
                </div>
                <div className="flex items-start gap-2.5 px-1">
                  <FileText size={14} className="text-clara-text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-clara-text-muted leading-relaxed">
                    <strong>Google:</strong> contacts.google.com → Export → vCard
                  </p>
                </div>
              </div>

              {/* Back link */}
              <button
                onClick={() => setState("choose")}
                className="mt-4 w-full text-center text-xs text-clara-text-muted hover:text-clara-coral transition-colors"
              >
                ← Back to import options
              </button>
            </motion.div>
          )}

          {/* ── Uploading ── */}
          {state === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-12"
            >
              <div className="inline-block w-10 h-10 border-3 border-clara-coral border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-clara-text">
                Clara is learning your contacts...
              </p>
              <p className="text-xs text-clara-text-muted mt-1">
                This may take a moment
              </p>
            </motion.div>
          )}

          {/* ── Success ── */}
          {state === "success" && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-clara-green-light flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={32} className="text-clara-green" />
              </motion.div>

              <h2 className="text-lg font-semibold text-clara-text">
                {result.imported} {result.imported === 1 ? "person" : "people"} added
              </h2>

              {result.skipped > 0 && (
                <p className="text-xs text-clara-text-muted mt-1">
                  {result.skipped} already in Clara (skipped)
                </p>
              )}

              {result.mergeCandidates > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 mx-auto max-w-xs clara-card p-3 flex items-center gap-3"
                >
                  <Users size={16} className="text-clara-amber flex-shrink-0" />
                  <p className="text-xs text-clara-text-secondary text-left">
                    {result.mergeCandidates} {result.mergeCandidates === 1 ? "contact looks" : "contacts look"} like
                    {result.mergeCandidates === 1 ? " a " : " "}duplicate{result.mergeCandidates !== 1 ? "s" : ""}.
                    You can review later.
                  </p>
                </motion.div>
              )}

              {(result.parseErrors.length > 0 || result.importErrors.length > 0) && (
                <p className="text-xs text-clara-text-muted mt-3">
                  {result.parseErrors.length + result.importErrors.length} entries couldn&apos;t be read
                </p>
              )}

              <button
                onClick={handleClose}
                className="mt-6 w-full max-w-xs py-3 rounded-xl bg-clara-coral text-white font-medium text-sm hover:bg-clara-coral-dark active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </motion.div>
          )}

          {/* ── Error ── */}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8"
            >
              <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
              <p className="text-sm text-clara-text-secondary">
                {errorMessage}
              </p>
              <button
                onClick={resetState}
                className="mt-4 text-sm text-clara-coral font-medium"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
