import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = 'max-w-lg' }: DrawerProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className={`relative ${width} w-full bg-[var(--gc-card)] border-l border-[var(--gc-border)] shadow-2xl flex flex-col animate-slide-right`}>
        <div className="flex items-center justify-between border-b border-[var(--gc-border)] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--gc-text)]">{title}</h2>
          <button onClick={onClose} className="rounded-gc p-1.5 hover:bg-[var(--gc-surface)] text-[var(--gc-text-secondary)] min-w-touch min-h-touch flex items-center justify-center" aria-label="Close drawer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
