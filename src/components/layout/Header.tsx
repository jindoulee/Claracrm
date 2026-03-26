"use client";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Clara", subtitle }: HeaderProps) {
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
      </div>
    </header>
  );
}
