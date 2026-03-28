"use client";

import type { LucideIcon } from "lucide-react";

interface HeaderAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: HeaderAction;
  actions?: HeaderAction[];
}

export function Header({ title = "Clara", subtitle, action, actions }: HeaderProps) {
  const allActions = actions || (action ? [action] : []);

  return (
    <header className="sticky top-0 z-40 bg-clara-cream/90 backdrop-blur-lg safe-top">
      <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-clara-text tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-clara-text-muted -mt-0.5">{subtitle}</p>
          )}
        </div>
        {allActions.length > 0 && (
          <div className="flex items-center gap-2">
            {allActions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-clara-coral bg-clara-coral-light hover:bg-clara-coral hover:text-white transition-colors"
                aria-label={a.label}
              >
                <a.icon size={14} />
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
