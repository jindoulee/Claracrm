"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, CheckSquare } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/contacts", label: "People", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export function MobileNav() {
  const pathname = usePathname();

  // Hide nav on fullscreen pages
  if (pathname === "/onboarding") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-clara-white/90 backdrop-blur-lg border-t border-clara-border safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                isActive
                  ? "text-clara-coral"
                  : "text-clara-text-muted hover:text-clara-text-secondary"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
