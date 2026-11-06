import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface InfoNoteProps {
  title?: string;
  children: ReactNode;
}

/** Penjelasan cara hitung yang bisa dibuka-tutup. Dipakai agar angka turunan transparan. */
export function InfoNote({ title = 'Cara perhitungan', children }: InfoNoteProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="inline-flex min-h-touch items-center gap-1.5 rounded-gc px-2 text-xs text-[var(--gc-text-secondary)] transition-colors hover:bg-[var(--gc-surface)] hover:text-[var(--gc-text)]"
      >
        <Info className="h-3.5 w-3.5" />
        {title}
      </button>
      {open && (
        <div className="mt-1 rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] p-3 text-[11px] leading-relaxed text-[var(--gc-text-secondary)]">
          {children}
        </div>
      )}
    </div>
  );
}
