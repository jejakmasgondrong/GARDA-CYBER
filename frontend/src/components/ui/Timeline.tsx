import type { ReactNode } from 'react';

interface TimelineItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'critical';
}

interface TimelineProps {
  items: TimelineItem[];
}

const dotColors: Record<string, string> = {
  default: 'bg-[var(--gc-primary)]',
  success: 'bg-[var(--gc-success)]',
  warning: 'bg-[var(--gc-warning)]',
  critical: 'bg-[var(--gc-critical)]',
};

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-[var(--gc-border)]" />
      {items.map(item => (
        <div key={item.id} className="relative">
          <span className={`absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--gc-card)] ${dotColors[item.variant || 'default']}`} />
          <p className="text-[10.5px] text-[var(--gc-text-secondary)]">{item.time}</p>
          <p className="text-sm font-medium text-[var(--gc-text)]">{item.title}</p>
          {item.description && <p className="text-xs text-[var(--gc-text-secondary)]">{item.description}</p>}
        </div>
      ))}
    </div>
  );
}
