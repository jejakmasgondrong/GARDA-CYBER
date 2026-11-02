import { useEffect, useState, useMemo } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Pagination, ErrorState, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { AuditLogEntry } from '../types';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    apiClient.get<AuditLogEntry[]>('/audit-logs?limit=200')
      .then(setLogs).catch(() => setError('Backend tidak terjangkau.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter(l => l.action.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q) || l.target?.toLowerCase().includes(q));
  }, [logs, search]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const columns: Column<AuditLogEntry>[] = [
    { key: 'time', header: 'Waktu', sortable: true, render: l => <span className="text-xs text-[var(--gc-text-secondary)] whitespace-nowrap">{new Date(l.created_at).toLocaleString('id-ID')}</span> },
    { key: 'actor', header: 'Aktor', render: l => <span className="text-sm font-medium">{l.actor}</span> },
    { key: 'action', header: 'Tindakan', render: l => <Badge variant="primary">{l.action}</Badge> },
    { key: 'target', header: 'Target', render: l => <span className="text-xs text-[var(--gc-text-secondary)] max-w-[200px] truncate block">{l.target ?? '—'}</span> },
    { key: 'outcome', header: 'Hasil', render: l => <Badge variant={l.outcome === 'success' ? 'success' : 'default'}>{l.outcome}</Badge> },
    { key: 'detail', header: 'Detail', render: l => <span className="text-xs text-[var(--gc-text-secondary)] max-w-[200px] truncate block">{l.detail ?? '—'}</span> },
  ];

  return (
    <PageLayout title="Audit Logs" subtitle="Riwayat tindakan tercatat — read-only, token/credential tidak pernah dicatat">
      {error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : (
        <>
          <div className="mb-4">
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Cari aktor, tindakan, atau target..." />
          </div>
          <DataTable columns={columns} data={paged} keyExtractor={l => l.id} loading={loading}
            emptyTitle="Belum ada aktivitas tercatat" emptyDescription="Log akan muncul begitu ada aksi tercatat di sistem." />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={pageSize} />
        </>
      )}
    </PageLayout>
  );
}
