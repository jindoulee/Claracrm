"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";
import { isSpeechSupported, createSpeechRecognition } from "@/lib/utils/speech";
import { hapticMedium, hapticSuccess } from "@/lib/utils/haptics";
import { VoiceWaveform } from "./VoiceWaveform";
import { TranscriptPreview } from "./TranscriptPreview";

interface VoiceRecorderProps {
  onTranscriptComplete: (transcript: string) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({ onTranscriptComplete, isProcessing = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef("");
  const interimRef = useRef("");

  useEffect(() => {
    setIsSupported(isSpeechSupported());
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    interimRef.current = interimText;
  }, [interimText]);

  const startRecording = useCallback(() => {
    setError(null);
    setTranscript("");
    setInterimText("");
    transcriptRef.current = "";
    interimRef.current = "";
    hapticMedium();

    const recognition = createSpeechRecognition(
      (result) => {
        if (result.isFinal) {
          setTranscript((prev) => {
            const next = prev + (prev ? " " : "") + result.transcript;
            transcriptRef.current = next;
            return next;
          });
          setInterimText("");
          interimRef.current = "";
        } else {
          setInterimText(result.transcript);
          interimRef.current = result.transcript;
        }
      },
      (err) => {
        setError(err);
        setIsRecording(false);
        isRecordingRef.current = false;
      },
      () => {
        // onEnd — use ref to check current recording state (avoids stale closure)
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            // already started or stopped
          }
        }
      }
    );

    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      isRecordingRef.current = true;
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Mark as not recording FIRST to prevent onEnd from restarting
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }

    hapticSuccess();

    // Use refs for the most current transcript values
    const finalTranscript = transcriptRef.current + (interimRef.current ? " " + interimRef.current : "");
    if (finalTranscript.trim()) {
      onTranscriptComplete(finalTranscript.trim());
    }
    setInterimText("");
    interimRef.current = "";
  }, [onTranscriptComplete]);

  const handleVoiceButton = useCallback(() => {
    if (isProcessing) return;
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isProcessing, stopRecording, startRecording]);

  if (!isSupported) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-clara-text-secondary text-sm">
          Voice recording isn&apos;t supported in this browser.
          Try Chrome or Safari on your phone.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Transcript preview */}
      <AnimatePresence>
        {(transcript || interimText) && (
          <TranscriptPreview
            finalText={transcript}
            interimText={interimText}
          />
        )}
      </AnimatePresence>

      {/* Waveform animation */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <VoiceWaveform />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice button */}
      <button
        onClick={handleVoiceButton}
        disabled={isProcessing}
        className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all active:scale-90 ${
          isProcessing
            ? "bg-clara-warm-gray cursor-wait"
            : isRecording
            ? "bg-clara-coral scale-110"
            : "bg-clara-coral hover:bg-clara-coral-dark"
        } ${!isRecording && !isProcessing ? "voice-btn-glow" : ""}`}
      >
        {isProcessing ? (
          <Loader2 className="text-clara-text-muted animate-spin" size={28} />
        ) : isRecording ? (
          <Square className="text-white" size={24} fill="white" />
        ) : (
          <Mic className="text-white" size={28} />
        )}
      </button>

      {/* Status text */}
      <p className="text-sm text-clara-text-muted">
        {isProcessing
          ? "Clara is thinking..."
          : isRecording
          ? "Listening... tap to stop"
          : "Tap to talk to Clara"}
      </p>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 text-center px-4">
          {error === "not-allowed"
            ? "Microphone access denied. Please enable it in your browser settings."
            : `Something went wrong: ${error}`}
        </p>
      )}
    </div>
  );
}
