"use client";

import { MobileNav } from "./MobileNav";
import { ToastProvider } from "@/components/ui/Toast";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex flex-col h-full bg-clara-cream">
        <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
          {children}
        </main>
        <MobileNav />
      </div>
    </ToastProvider>
  );
}
