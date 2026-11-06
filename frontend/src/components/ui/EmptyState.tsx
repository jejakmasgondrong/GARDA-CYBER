import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-gc-lg border border-dashed border-[var(--gc-border)] bg-[var(--gc-surface)]/50 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gc-surface)]">
        {icon || <Inbox className="h-6 w-6 text-[var(--gc-text-secondary)]" />}
      </div>
      <h3 className="mb-1 text-sm font-semibold text-[var(--gc-text)]">{title}</h3>
      <p className="mb-4 max-w-sm text-xs text-[var(--gc-text-secondary)] leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
