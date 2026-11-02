import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-[var(--gc-border)] px-4 py-3">
      {totalItems !== undefined && itemsPerPage && (
        <p className="text-xs text-[var(--gc-text-secondary)]">
          {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, totalItems)} dari {totalItems}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-gc p-2 text-[var(--gc-text-secondary)] hover:bg-[var(--gc-surface)] disabled:opacity-40 min-w-touch min-h-touch flex items-center justify-center"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 text-xs font-medium text-[var(--gc-text)]">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-gc p-2 text-[var(--gc-text-secondary)] hover:bg-[var(--gc-surface)] disabled:opacity-40 min-w-touch min-h-touch flex items-center justify-center"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
