import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}
