import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, loading, error, empty, emptyMessage, onRetry, actions, children, className = '' }: ChartCardProps) {
  return (
    <div className={`rounded-gc-lg border border-[var(--gc-border)] bg-[var(--gc-card)] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--gc-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--gc-text)]">{title}</h3>
          {subtitle && <p className="text-[11px] text-[var(--gc-text-secondary)]">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Skeleton className="h-48 w-full" /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : empty ? (
          <EmptyState title="Data belum tersedia" description={emptyMessage || 'Data belum tersedia dari backend.'} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
