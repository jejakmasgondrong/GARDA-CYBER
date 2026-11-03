import { useMemo, useState } from 'react';
import { ChartCard, Badge, Drawer } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { useNow } from '../../hooks/useNow';
import { formatDuration, parseApiDate } from '../../lib/time';
import type { Incident, IncidentStatus } from '../../types';
import '../../styles/live.css';

/**
 * Catatan: Incident di backend tidak punya field severity. Antrean diurutkan
 * berdasarkan urgensi status (open > in_progress > contained), lalu yang terbaru.
 */
const ORDER: Record<IncidentStatus, number> = { open: 0, in_progress: 1, contained: 2, closed: 3 };
const STATUS_UI: Record<IncidentStatus, { label: string; variant: 'critical' | 'warning' | 'primary' | 'success'; bar: string }> = {
  open: { label: 'Terbuka', variant: 'critical', bar: 'var(--gc-critical)' },
  in_progress: { label: 'Ditangani', variant: 'warning', bar: 'var(--gc-warning)' },
  contained: { label: 'Terkendali', variant: 'primary', bar: 'var(--gc-primary)' },
  closed: { label: 'Selesai', variant: 'success', bar: 'var(--gc-success)' },
};

export function IncidentQueue({ className = '' }: { className?: string }) {
  const { incidents, errors } = useLiveData();
  const now = useNow(30_000);
  const [selected, setSelected] = useState<Incident | null>(null);

  const active = useMemo(
    () =>
      (incidents?.items ?? [])
        .filter(i => i.status !== 'closed')
        .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (parseApiDate(b.created_at) ?? 0) - (parseApiDate(a.created_at) ?? 0)),
    [incidents],
  );

  const since = (i: Incident) => {
    const t = parseApiDate(i.created_at);
    return t === null ? '—' : formatDuration(now - t);
  };

  return (
    <ChartCard
      title="Antrean Insiden"
      subtitle={`Insiden aktif: ${active.length}`}
      className={className}
      loading={!incidents && !errors.incidents}
      error={!incidents ? errors.incidents : null}
      empty={incidents !== null && active.length === 0}
      emptyMessage="Tidak ada insiden aktif."
    >
      <ul className="max-h-[360px] space-y-2 overflow-y-auto">
        {active.map(i => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => setSelected(i)}
              className="flex min-h-touch w-full items-center gap-3 rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] py-2 pl-3 pr-3 text-left transition-colors hover:border-[var(--gc-primary)]/40"
              style={{ borderLeft: `3px solid ${STATUS_UI[i.status].bar}` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--gc-text)]">{i.title}</p>
                <p className="truncate text-[11px] text-[var(--gc-text-secondary)]">
                  Berjalan sejak {since(i)}{i.assigned_to ? ` · ${i.assigned_to}` : ' · belum ditugaskan'}
                </p>
              </div>
              <Badge variant={STATUS_UI[i.status].variant}>{STATUS_UI[i.status].label}</Badge>
            </button>
          </li>
        ))}
      </ul>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="Detail Insiden">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--gc-text)]">{selected.title}</h3>
              <div className="mt-2"><Badge variant={STATUS_UI[selected.status].variant}>{STATUS_UI[selected.status].label}</Badge></div>
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-[var(--gc-text-secondary)]">Penanggung jawab</dt><dd className="text-[var(--gc-text)]">{selected.assigned_to ?? 'Belum ditugaskan'}</dd></div>
              <div><dt className="text-xs text-[var(--gc-text-secondary)]">Berjalan sejak</dt><dd className="text-[var(--gc-text)]">{since(selected)}</dd></div>
              <div><dt className="text-xs text-[var(--gc-text-secondary)]">Dibuat</dt><dd className="text-[var(--gc-text)]">{new Date(parseApiDate(selected.created_at) ?? 0).toLocaleString('id-ID')}</dd></div>
              <div><dt className="text-xs text-[var(--gc-text-secondary)]">Diperbarui</dt><dd className="text-[var(--gc-text)]">{new Date(parseApiDate(selected.updated_at) ?? 0).toLocaleString('id-ID')}</dd></div>
              <div><dt className="text-xs text-[var(--gc-text-secondary)]">Ringkasan</dt><dd className="whitespace-pre-wrap text-[var(--gc-text)]">{selected.summary ?? 'Tidak ada ringkasan.'}</dd></div>
            </dl>
          </div>
        )}
      </Drawer>
    </ChartCard>
  );
}
