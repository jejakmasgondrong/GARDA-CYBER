import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'critical' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--gc-surface)] text-[var(--gc-text-secondary)]',
  primary: 'bg-[var(--gc-primary)]/15 text-[var(--gc-primary)]',
  success: 'bg-[var(--gc-success)]/15 text-[var(--gc-success)]',
  warning: 'bg-[var(--gc-warning)]/15 text-[var(--gc-warning)]',
  critical: 'bg-[var(--gc-critical)]/15 text-[var(--gc-critical)]',
  info: 'bg-[var(--gc-electric)]/15 text-[var(--gc-electric)]',
};

export function Badge({ variant = 'default', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${variantStyles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${variant === 'critical' ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  );
}
