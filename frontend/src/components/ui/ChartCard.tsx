import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { ErrorState } from './ErrorState';

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
          /* Bingkai berpetak menandakan "ini area diagram yang masih kosong",
             bukan kartu rusak. Tetap tanpa angka karangan. */
          <div className="relative flex min-h-[180px] flex-col items-center justify-center overflow-hidden rounded-gc border border-dashed border-[var(--gc-border)] px-6 py-8 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, var(--gc-border) 1px, transparent 1px), linear-gradient(to bottom, var(--gc-border) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <div className="relative">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gc-surface)] text-[var(--gc-text-secondary)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M4 19V5M4 19h16" strokeLinecap="round" />
                  <path d="M8 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--gc-text)]">Data belum tersedia</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--gc-text-secondary)]">
                {emptyMessage || 'Data belum tersedia dari backend.'}
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
