import { type ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export function DataTable<T>({ columns, data, keyExtractor, loading, emptyTitle, emptyDescription, onRowClick, sortKey, sortOrder, onSort }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle || 'Tidak ada data'} description={emptyDescription || 'Belum ada data untuk ditampilkan.'} />;
  }

  return (
    <div className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gc-border)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]
                    ${col.sortable ? 'cursor-pointer select-none hover:text-[var(--gc-text)]' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gc-border)]">
            {data.map(item => (
              <tr
                key={keyExtractor(item)}
                className={`transition-colors hover:bg-[var(--gc-surface)]/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-[var(--gc-text)] ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
