import { ChartCard, DataTable, Badge, type Column } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { useNow } from '../../hooks/useNow';
import { formatRelative, parseApiDate } from '../../lib/time';
import type { AuditLogEntry } from '../../types';
import '../../styles/live.css';

function outcomeVariant(outcome: string): 'success' | 'critical' | 'default' {
  if (/fail|error|denied|reject|block|gagal|ditolak/i.test(outcome)) return 'critical';
  if (/success|ok|allow|berhasil|complete|selesai/i.test(outcome)) return 'success';
  return 'default';
}

export function EventFeed({ className = '' }: { className?: string }) {
  const { audit, errors } = useLiveData();
  const now = useNow(30_000);

  const rows = [...(audit ?? [])]
    .sort((a, b) => (parseApiDate(b.created_at) ?? 0) - (parseApiDate(a.created_at) ?? 0))
    .slice(0, 12);

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'time', header: 'Waktu',
      render: e => (
        <span className="whitespace-nowrap text-xs text-[var(--gc-text-secondary)]" title={new Date(parseApiDate(e.created_at) ?? 0).toLocaleString('id-ID')}>
          {formatRelative(parseApiDate(e.created_at), now)}
        </span>
      ),
    },
    { key: 'action', header: 'Aksi', render: e => <Badge variant="primary">{e.action}</Badge> },
    {
      key: 'who', header: 'Aktor / Target',
      render: e => (
        <div className="max-w-[220px]">
          <p className="truncate text-xs font-medium text-[var(--gc-text)]">{e.actor}</p>
          <p className="truncate text-[11px] text-[var(--gc-text-secondary)]">{e.target ?? '—'}</p>
        </div>
      ),
    },
    { key: 'outcome', header: 'Hasil', render: e => <Badge variant={outcomeVariant(e.outcome)}>{e.outcome}</Badge> },
  ];

  return (
    <ChartCard
      title="Event Terbaru"
      subtitle="Audit log, diperbarui tiap 10 detik"
      className={className}
      loading={!audit && !errors.audit}
      error={!audit ? errors.audit : null}
      empty={audit !== null && audit.length === 0}
      emptyMessage="Data belum tersedia dari backend."
    >
      <div className="max-h-[360px] overflow-auto">
        <DataTable columns={columns} data={rows} keyExtractor={e => e.id} />
      </div>
      {errors.audit && audit && (
        <p className="mt-2 text-[11px] text-[var(--gc-warning)]">Pembaruan terakhir gagal. Menampilkan data sebelumnya.</p>
      )}
    </ChartCard>
  );
}
