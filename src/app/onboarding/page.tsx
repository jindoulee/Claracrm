"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, Users, Brain } from "lucide-react";
import { hapticLight } from "@/lib/utils/haptics";

const slides = [
  {
    icon: Brain,
    iconBg: "bg-clara-coral-light",
    iconColor: "text-clara-coral",
    title: "Clara remembers people\nso you don't have to",
    subtitle:
      "After every coffee chat, call, or meeting — just tell Clara what happened. She'll remember the details for you.",
  },
  {
    icon: Mic,
    iconBg: "bg-clara-coral-light",
    iconColor: "text-clara-coral",
    title: "Just talk",
    subtitle:
      "Tell Clara about a conversation you had. She'll figure out who was involved, what was said, and what you need to follow up on.",
  },
  {
    icon: Users,
    iconBg: "bg-clara-coral-light",
    iconColor: "text-clara-coral",
    title: "Try it now",
    subtitle:
      "Think of someone you spoke to recently. Tap the mic and tell Clara about it — even a single sentence works.",
    isFinal: true,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = slides[step];

  const advance = useCallback(() => {
    hapticLight();
    if (step < slides.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Mark onboarding as seen and go to home
      try {
        localStorage.setItem("clara_onboarded", "1");
      } catch {
        // localStorage may be unavailable
      }
      router.replace("/");
    }
  }, [step, router]);

  const skip = useCallback(() => {
    try {
      localStorage.setItem("clara_onboarded", "1");
    } catch {
      // localStorage may be unavailable
    }
    router.replace("/");
  }, [router]);

  return (
    <div className="h-[100dvh] bg-clara-warm flex flex-col items-center justify-between px-6 py-12 safe-top safe-bottom">
      {/* Skip button */}
      <div className="w-full max-w-sm flex justify-end">
        <button
          onClick={skip}
          className="text-xs text-clara-text-muted hover:text-clara-text transition-colors px-2 py-1"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            {/* Icon */}
            <motion.div
              className={`w-20 h-20 rounded-full ${slide.iconBg} flex items-center justify-center mx-auto mb-8`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
            >
              <slide.icon size={36} className={slide.iconColor} />
            </motion.div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-clara-text leading-tight whitespace-pre-line mb-4">
              {slide.title}
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-clara-text-secondary leading-relaxed max-w-[280px] mx-auto">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section: dots + button */}
      <div className="w-full max-w-sm space-y-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-colors ${
                i === step ? "bg-clara-coral w-6" : "bg-clara-border w-1.5"
              }`}
              layout
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={advance}
          className="w-full py-3.5 rounded-xl bg-clara-coral text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-clara-coral-dark active:scale-[0.98] transition-all"
        >
          {slide.isFinal ? (
            <>
              <Mic size={16} />
              Let&apos;s go
            </>
          ) : (
            <>
              Next
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
