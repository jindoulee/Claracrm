"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    // Don't prompt on server or if not supported
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    // Register service worker
    navigator.serviceWorker.register("/sw.js").catch(console.error);

    // Check current permission
    const perm = Notification.permission;
    if (perm === "granted") {
      setStatus("granted");
      subscribeQuietly();
      return;
    }
    if (perm === "denied") {
      setStatus("denied");
      return;
    }

    // Show prompt after a short delay (don't interrupt first load)
    const dismissed = localStorage.getItem("clara_push_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function subscribeQuietly() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });
      }

      // Save to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }

  async function handleEnable() {
    setShow(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setStatus("granted");
      await subscribeQuietly();
    } else {
      setStatus("denied");
    }
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem("clara_push_dismissed", "1");
  }

  return (
    <AnimatePresence>
      {show && status === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-clara-border p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-clara-coral/10 flex items-center justify-center flex-shrink-0">
              <Bell size={20} className="text-clara-coral" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-clara-text">
                Never miss a follow-up
              </p>
              <p className="text-xs text-clara-text-muted mt-0.5">
                Clara can remind you when tasks are due so you stay on top of
                your relationships.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleEnable}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-clara-coral text-white hover:bg-clara-coral/90 transition-colors"
                >
                  Enable notifications
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-clara-text-muted hover:bg-clara-cream transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-clara-text-muted hover:text-clara-text transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}
