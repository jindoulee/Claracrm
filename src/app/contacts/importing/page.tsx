"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, CheckCircle, AlertCircle } from "lucide-react";

type ImportState = "importing" | "success" | "error";

interface ImportResult {
  imported: number;
  skipped: number;
  mergeCandidates: number;
  total: number;
}

export default function ImportingPage() {
  const router = useRouter();
  const [state, setState] = useState<ImportState>("importing");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function runImport() {
      try {
        const res = await fetch("/api/import/google", { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || "Import failed");
          setState("error");
          return;
        }

        setResult(data);
        setState("success");
      } catch {
        setErrorMsg("Something went wrong. Please try again.");
        setState("error");
      }
    }

    runImport();
  }, []);

  const handleDone = () => {
    if (result) {
      const params = new URLSearchParams({
        import: "success",
        imported: result.imported.toString(),
        skipped: result.skipped.toString(),
        merge: result.mergeCandidates.toString(),
      });
      router.replace(`/contacts?${params.toString()}`);
    } else {
      router.replace("/contacts");
    }
  };

  return (
    <div className="min-h-screen bg-clara-warm flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {/* Importing state */}
        {state === "importing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Animated icon */}
            <motion.div
              className="w-20 h-20 rounded-full bg-clara-coral-light flex items-center justify-center mx-auto mb-6"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Users size={36} className="text-clara-coral" />
            </motion.div>

            <h1 className="text-xl font-semibold text-clara-text mb-2">
              Importing your contacts...
            </h1>
            <p className="text-sm text-clara-text-muted mb-8">
              Clara is reading your Google contacts. This may take a moment.
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-clara-coral"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Success state */}
        {state === "success" && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-clara-green-light flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
            >
              <CheckCircle size={40} className="text-clara-green" />
            </motion.div>

            <h1 className="text-xl font-semibold text-clara-text mb-2">
              {result.imported} {result.imported === 1 ? "person" : "people"} imported
            </h1>

            {result.skipped > 0 && (
              <p className="text-sm text-clara-text-muted">
                {result.skipped} already in Clara (skipped)
              </p>
            )}

            {result.mergeCandidates > 0 && (
              <p className="text-xs text-clara-text-muted mt-1">
                {result.mergeCandidates} possible {result.mergeCandidates === 1 ? "duplicate" : "duplicates"} found
              </p>
            )}

            <button
              onClick={handleDone}
              className="mt-8 w-full max-w-xs py-3.5 rounded-xl bg-clara-coral text-white font-medium text-sm hover:bg-clara-coral-dark active:scale-[0.98] transition-all"
            >
              View Your Contacts
            </button>
          </motion.div>
        )}

        {/* Error state */}
        {state === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={36} className="text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-clara-text mb-2">
              Import failed
            </h1>
            <p className="text-sm text-clara-text-muted mb-8">
              {errorMsg}
            </p>

            <button
              onClick={() => router.replace("/contacts")}
              className="w-full max-w-xs py-3.5 rounded-xl bg-clara-coral text-white font-medium text-sm hover:bg-clara-coral-dark active:scale-[0.98] transition-all"
            >
              Back to Contacts
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
