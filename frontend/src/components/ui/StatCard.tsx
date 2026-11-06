import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, subtitle, icon, trend, loading, onClick, className = '' }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-gc-lg border border-[var(--gc-border)] bg-[var(--gc-card)] p-4 text-left transition-all
        ${onClick ? 'cursor-pointer hover:border-[var(--gc-primary)]/40 hover:shadow-lg active:scale-[0.98] min-h-touch' : ''}
        ${className}`}
      aria-label={onClick ? `${label}: ${value}` : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--gc-text)]">{value}</p>
          )}
          {subtitle && <p className="mt-1 text-[11px] text-[var(--gc-text-secondary)]">{subtitle}</p>}
          {trend && (
            <p className={`mt-1 text-[11px] font-medium ${trend.positive ? 'text-[var(--gc-success)]' : 'text-[var(--gc-critical)]'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 rounded-gc bg-[var(--gc-surface)] p-2.5">
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
