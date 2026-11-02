import { useEffect, useState, useMemo } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Select, Pagination, Drawer, ErrorState, Timeline, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { IncidentListResponse, Incident, IncidentStatus } from '../types';

const STATUS_MAP: Record<IncidentStatus, { variant: 'warning' | 'primary' | 'info' | 'success'; label: string }> = {
  open: { variant: 'warning', label: 'Open' },
  in_progress: { variant: 'primary', label: 'Investigating' },
  contained: { variant: 'info', label: 'Contained' },
  closed: { variant: 'success', label: 'Closed' },
};

export default function IncidentManagement() {
  const [data, setData] = useState<IncidentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Incident | null>(null);
  const pageSize = 15;

  useEffect(() => {
    apiClient.get<IncidentListResponse>('/incidents?limit=100')
      .then(setData).catch(() => setError('Backend tidak terjangkau.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.items.filter(i => {
      const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || i.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const columns: Column<Incident>[] = [
    { key: 'title', header: 'Judul', sortable: true, render: i => <span className="font-medium">{i.title}</span> },
    { key: 'status', header: 'Status', sortable: true, render: i => { const s = STATUS_MAP[i.status]; return <Badge variant={s.variant} dot>{s.label}</Badge>; }},
    { key: 'assigned', header: 'Assigned To', render: i => <span className="text-[var(--gc-text-secondary)]">{i.assigned_to ?? 'Unassigned'}</span> },
    { key: 'created', header: 'Created', render: i => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(i.created_at).toLocaleString('id-ID')}</span> },
    { key: 'updated', header: 'Updated', render: i => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(i.updated_at).toLocaleString('id-ID')}</span> },
  ];

  return (
    <PageLayout title="Incident Management" subtitle="Manajemen insiden keamanan — New → Investigating → Contained → Closed">
      {error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Cari insiden..." className="flex-1" />
            <Select options={[{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'Investigating' }, { value: 'contained', label: 'Contained' }, { value: 'closed', label: 'Closed' }]}
              placeholder="Semua Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-40" />
          </div>
          <DataTable columns={columns} data={paged} keyExtractor={i => i.id} loading={loading} onRowClick={setSelected}
            emptyTitle="Belum ada insiden" emptyDescription="Insiden akan muncul setelah dibuat melalui API POST /incidents." />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={pageSize} />
          <Drawer open={!!selected} onClose={() => setSelected(null)} title="Detail Insiden" width="max-w-xl">
            {selected && (
              <div className="space-y-5">
                <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Judul</p><p className="text-base font-semibold">{selected.title}</p></div>
                <div className="flex gap-3">
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Status</p><Badge variant={STATUS_MAP[selected.status].variant} dot>{STATUS_MAP[selected.status].label}</Badge></div>
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Assigned To</p><p className="text-sm">{selected.assigned_to ?? 'Unassigned'}</p></div>
                </div>
                <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Summary</p><p className="text-sm text-[var(--gc-text-secondary)]">{selected.summary ?? 'Tidak ada ringkasan'}</p></div>
                <div>
                  <p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)] mb-2">Status Flow</p>
                  <Timeline items={[
                    { id: '1', time: new Date(selected.created_at).toLocaleString('id-ID'), title: 'Insiden dibuat', variant: 'default' },
                    ...(selected.status !== 'open' ? [{ id: '2', time: '', title: 'Investigating', variant: 'warning' as const }] : []),
                    ...(selected.status === 'contained' || selected.status === 'closed' ? [{ id: '3', time: '', title: 'Contained', variant: 'success' as const }] : []),
                    ...(selected.status === 'closed' ? [{ id: '4', time: new Date(selected.updated_at).toLocaleString('id-ID'), title: 'Closed', variant: 'success' as const }] : []),
                  ]} />
                </div>
              </div>
            )}
          </Drawer>
        </>
      )}
    </PageLayout>
  );
}
