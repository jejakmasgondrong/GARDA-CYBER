import { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Select, Pagination, Drawer, ErrorState, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { JobListResponse, JobResult } from '../types';

const JOB_STATUS: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'critical' }> = {
  queued: { label: 'Queued', variant: 'default' },
  running: { label: 'Running', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'critical' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

export default function JobManager() {
  const [data, setData] = useState<JobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<JobResult | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const loadJobs = () => {
    setLoading(true);
    apiClient.get<JobListResponse>('/jobs?limit=100')
      .then(setData).catch(() => setError('Backend tidak terjangkau.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJobs(); }, []);

  const filtered = (data?.items ?? []).filter(j => {
    const matchStatus = !statusFilter || j.status === statusFilter;
    const matchSearch = !search || j.tool_id.includes(search.toLowerCase()) || j.id.includes(search);
    return matchStatus && matchSearch;
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const columns: Column<JobResult>[] = [
    { key: 'id', header: 'Job ID', render: j => <span className="font-mono text-xs text-[var(--gc-text-secondary)]">{j.id.slice(0, 8)}…</span> },
    { key: 'tool', header: 'Tool', sortable: true, render: j => <Badge variant="info">{j.tool_id}</Badge> },
    { key: 'status', header: 'Status', sortable: true, render: j => { const s = JOB_STATUS[j.status] || { label: j.status, variant: 'default' as const }; return <Badge variant={s.variant} dot>{s.label}</Badge>; }},
    { key: 'created', header: 'Dibuat', render: j => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(j.created_at).toLocaleString('id-ID')}</span> },
    { key: 'result', header: 'Ringkasan', className: 'max-w-[300px] truncate', render: j => <span className="text-xs text-[var(--gc-text-secondary)]">{j.failure_reason || j.output_summary || '—'}</span> },
  ];

  return (
    <PageLayout title="Job Manager" subtitle="Pantau status semua pekerjaan scan dan analisis">
      {error ? <ErrorState message={error} onRetry={loadJobs} /> : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Cari tool atau job ID..." className="flex-1" />
            <Select options={Object.entries(JOB_STATUS).map(([v, { label }]) => ({ value: v, label }))}
              placeholder="Semua Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-36" />
          </div>
          <DataTable columns={columns} data={paged} keyExtractor={j => j.id} loading={loading} onRowClick={setSelected}
            emptyTitle="Belum ada job" emptyDescription="Job akan muncul setelah dijalankan dari Red Team." />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={pageSize} />
          <Drawer open={!!selected} onClose={() => setSelected(null)} title="Detail Job">
            {selected && (
              <div className="space-y-4">
                <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Job ID</p><p className="font-mono text-sm">{selected.id}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Tool</p><Badge variant="info">{selected.tool_id}</Badge></div>
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Status</p><Badge variant={JOB_STATUS[selected.status]?.variant || 'default'} dot>{JOB_STATUS[selected.status]?.label || selected.status}</Badge></div>
                </div>
                <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Asset ID</p><p className="font-mono text-xs">{selected.asset_id}</p></div>
                {selected.scenario && <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Scenario</p><p className="text-sm">{selected.scenario}</p></div>}
                {selected.output_summary && <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Output</p><pre className="text-xs text-[var(--gc-text-secondary)] bg-[var(--gc-surface)] p-3 rounded-[var(--gc-radius)] overflow-auto max-h-40 whitespace-pre-wrap">{selected.output_summary}</pre></div>}
                {selected.failure_reason && <div><p className="text-[10.5px] uppercase text-[var(--gc-critical)]">Failure Reason</p><p className="text-sm text-[var(--gc-critical)]">{selected.failure_reason}</p></div>}
                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--gc-text-secondary)]">
                  <div><p className="text-[10.5px] uppercase">Started</p><p>{selected.started_at ? new Date(selected.started_at).toLocaleString('id-ID') : '—'}</p></div>
                  <div><p className="text-[10.5px] uppercase">Completed</p><p>{selected.completed_at ? new Date(selected.completed_at).toLocaleString('id-ID') : '—'}</p></div>
                </div>
              </div>
            )}
          </Drawer>
        </>
      )}
    </PageLayout>
  );
}
