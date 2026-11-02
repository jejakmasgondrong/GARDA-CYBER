type StatusType = 'online' | 'offline' | 'warning' | 'error' | 'idle';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
}

const statusColors: Record<StatusType, string> = {
  online: 'bg-[var(--gc-success)]',
  offline: 'bg-[var(--gc-text-secondary)]',
  warning: 'bg-[var(--gc-warning)]',
  error: 'bg-[var(--gc-critical)]',
  idle: 'bg-[var(--gc-border)]',
};

export function StatusIndicator({ status, label, pulse }: StatusIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {pulse && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${statusColors[status]}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${statusColors[status]}`} />
      </span>
      {label && <span className="text-xs text-[var(--gc-text-secondary)]">{label}</span>}
    </span>
  );
}
