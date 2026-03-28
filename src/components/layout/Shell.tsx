"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "./MobileNav";
import { ToastProvider } from "@/components/ui/Toast";
import { PushPrompt } from "@/components/notifications/PushPrompt";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const fullscreenPages = ["/onboarding", "/login"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = fullscreenPages.includes(pathname);

  return (
    <ToastProvider>
      <div className="flex flex-col h-full bg-clara-cream">
        <main className={`flex-1 overflow-y-auto overscroll-contain ${isFullscreen ? "" : "pb-20"}`}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <MobileNav />
        <PushPrompt />
      </div>
    </ToastProvider>
  );
}
