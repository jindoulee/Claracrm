"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, X } from "lucide-react";
import {
  isSpeechSupported,
  createSpeechRecognition,
} from "@/lib/utils/speech";

interface ChatMessage {
  id: string;
  role: "user" | "clara";
  text: string;
  sources?: {
    contacts: { id: string; full_name: string }[];
    facts: { id: string; fact: string; contact_name: string }[];
    interactions: { id: string; summary: string; occurred_at: string }[];
  };
}

interface ChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "clara",
  text: "Hey! Ask Clara anything about your contacts.",
};

const CHAT_STORAGE_KEY = "clara_chat_history";

function loadChatHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      if (parsed.length > 0) return [WELCOME_MESSAGE, ...parsed];
    }
  } catch {}
  return [WELCOME_MESSAGE];
}

function saveChatHistory(messages: ChatMessage[]) {
  try {
    // Save all messages except the welcome message, keep last 50
    const toSave = messages.filter((m) => m.id !== "welcome").slice(-50);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export function ChatSheet({ isOpen, onClose, initialMessage }: ChatSheetProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Send initial message when sheet opens with one
  const initialMessageSentRef = useRef<string | null>(null);
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);

  useEffect(() => {
    if (isOpen && initialMessage && initialMessage !== initialMessageSentRef.current) {
      initialMessageSentRef.current = initialMessage;
      const timer = setTimeout(() => {
        sendMessageRef.current?.(initialMessage);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      initialMessageSentRef.current = null;
    }
  }, [isOpen, initialMessage]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
    };

    // Build conversation history from existing messages (exclude welcome)
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const data = await res.json();

      const claraMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "clara",
        text: data.response,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, claraMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "clara",
          text: "Sorry, something went wrong. Try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep ref in sync so the initialMessage effect can call sendMessage
  sendMessageRef.current = sendMessage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!isSpeechSupported()) return;

    const recognition = createSpeechRecognition(
      (result) => {
        if (result.isFinal) {
          setInput((prev) => prev + result.transcript);
        }
      },
      () => {
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  const handleSourceTap = (contactId: string) => {
    onClose();
    // Small delay to let the overlay fully close before navigating
    setTimeout(() => {
      router.push(`/contacts/${contactId}`);
    }, 100);
  };

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen backdrop — stops all touch events from reaching content below */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Chat panel — slides up from bottom, NOT draggable */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl bg-clara-white shadow-lg flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            {/* Handle bar + close button */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-clara-text">
                  Chat with Clara
                </h2>
                <p className="text-xs text-clara-text-muted">
                  Ask about your contacts, relationships, and more
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-clara-warm-gray flex items-center justify-center text-clara-text-secondary hover:bg-clara-border transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain space-y-3 px-5 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%]">
                      <div
                        className={
                          msg.role === "user"
                            ? "bg-clara-coral text-white rounded-2xl rounded-br-md px-4 py-2.5"
                            : "bg-white border border-clara-border rounded-2xl rounded-bl-md px-4 py-2.5"
                        }
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      </div>

                      {/* Source chips */}
                      {msg.sources &&
                        msg.sources.contacts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.sources.contacts.map((contact) => (
                              <button
                                key={contact.id}
                                onClick={() => handleSourceTap(contact.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-clara-coral-light text-clara-coral hover:bg-clara-coral hover:text-white transition-colors"
                              >
                                {contact.full_name}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-clara-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <motion.span
                        className="w-2 h-2 rounded-full bg-clara-text-muted"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="w-2 h-2 rounded-full bg-clara-text-muted"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.span
                        className="w-2 h-2 rounded-full bg-clara-text-muted"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0 bg-clara-cream border-t border-clara-border pt-3 pb-8 px-5">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white border border-clara-border rounded-full px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Clara anything..."
                    className="flex-1 text-sm bg-transparent outline-none text-clara-text placeholder:text-clara-text-muted"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      isListening
                        ? "text-clara-coral bg-clara-coral-light"
                        : "text-clara-text-muted hover:text-clara-text-secondary"
                    }`}
                    aria-label={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-clara-coral text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-clara-coral-dark active:scale-95 transition-all"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
