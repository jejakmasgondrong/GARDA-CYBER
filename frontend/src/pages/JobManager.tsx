import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Select, Pagination, Drawer, ErrorState, ChartCard, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { CHART, TOOLTIP_STYLE } from '../lib/chartTheme';
import type { JobListResponse, JobResult } from '../types';

const JOB_STATUS: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'critical' }> = {
  queued: { label: 'Antre', variant: 'default' },
  running: { label: 'Berjalan', variant: 'warning' },
  completed: { label: 'Selesai', variant: 'success' },
  failed: { label: 'Gagal', variant: 'critical' },
  cancelled: { label: 'Dibatalkan', variant: 'default' },
};

const JOB_STATUS_COLORS: Record<string, string> = {
  queued: CHART.text,
  running: CHART.warning,
  completed: CHART.success,
  failed: CHART.critical,
  cancelled: CHART.border,
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

  const byStatus = useMemo(() => {
    const items = data?.items ?? [];
    return Object.entries(JOB_STATUS)
      .map(([key, meta]) => ({ key, name: meta.label, value: items.filter(j => j.status === key).length }))
      .filter(d => d.value > 0);
  }, [data]);

  // Durasi hanya dihitung untuk job yang punya started_at DAN completed_at.
  // Job tanpa dua stempel waktu tidak dikira-kira. Tool cepat (mis. analisis
  // teks offline) bisa selesai dalam milidetik, jadi satuannya menyesuaikan.
  const duration = useMemo(() => {
    const items = data?.items ?? [];
    const acc = new Map<string, { total: number; n: number }>();
    for (const j of items) {
      if (!j.started_at || !j.completed_at) continue;
      const ms = new Date(j.completed_at).getTime() - new Date(j.started_at).getTime();
      if (!Number.isFinite(ms) || ms < 0) continue;
      const cur = acc.get(j.tool_id) ?? { total: 0, n: 0 };
      acc.set(j.tool_id, { total: cur.total + ms, n: cur.n + 1 });
    }
    const rows = [...acc.entries()]
      .map(([tool, { total, n }]) => ({ name: tool, ms: total / n }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 6);
    const useMs = rows.length > 0 && Math.max(...rows.map(r => r.ms)) < 1000;
    return {
      unit: useMs ? 'ms' : 'detik',
      rows: rows.map(r => ({
        name: r.name,
        value: useMs ? Math.max(1, Math.round(r.ms)) : Math.round(r.ms / 100) / 10,
      })),
    };
  }, [data]);

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
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard
              title="Status Job"
              subtitle="Sebaran status seluruh job"
              loading={loading}
              empty={byStatus.length === 0}
              emptyMessage="Belum ada job. Jalankan tool dari halaman Red Team."
            >
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie isAnimationActive={false} data={byStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
                    {byStatus.map(d => <Cell key={d.key} fill={JOB_STATUS_COLORS[d.key] ?? CHART.text} />)}
                  </Pie>
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: CHART.text }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              className="lg:col-span-2"
              title="Durasi Rata-rata per Tool"
              subtitle={`Satuan ${duration.unit} — hanya job yang punya waktu mulai dan selesai`}
              loading={loading}
              empty={duration.rows.length === 0}
              emptyMessage="Belum ada job yang selesai, jadi durasi belum bisa dihitung."
            >
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={duration.rows} layout="vertical" barSize={16} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke={CHART.border} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} unit="s" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar isAnimationActive={false} dataKey="value" fill={CHART.electric} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

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
