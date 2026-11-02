import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] ${sizeStyles[size]} rounded-gc-lg border border-[var(--gc-border)] bg-[var(--gc-card)] p-0 shadow-2xl backdrop:bg-black/60 animate-fade-in`}
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-[var(--gc-border)] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[var(--gc-text)]">{title}</h2>
        <button onClick={onClose} className="rounded-gc p-1.5 hover:bg-[var(--gc-surface)] text-[var(--gc-text-secondary)] min-w-touch min-h-touch flex items-center justify-center" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
