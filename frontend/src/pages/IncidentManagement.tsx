import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Select, Pagination, Drawer, ErrorState, ChartCard, Timeline, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { CHART, INCIDENT_STATUS_COLORS, TOOLTIP_STYLE } from '../lib/chartTheme';
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

  const byStatus = useMemo(() => {
    const items = data?.items ?? [];
    return (Object.keys(STATUS_MAP) as IncidentStatus[])
      .map(k => ({ key: k, name: STATUS_MAP[k].label, value: items.filter(i => i.status === k).length }))
      .filter(d => d.value > 0);
  }, [data]);

  /** Usia insiden yang belum ditutup — dasar prioritas, bukan tebakan severity. */
  const ageBuckets = useMemo(() => {
    const items = (data?.items ?? []).filter(i => i.status !== 'closed');
    const buckets = [
      { name: '< 1 hari', max: 1 },
      { name: '1–3 hari', max: 3 },
      { name: '3–7 hari', max: 7 },
      { name: '> 7 hari', max: Infinity },
    ].map(b => ({ ...b, value: 0 }));
    const now = Date.now();
    for (const i of items) {
      const days = (now - new Date(i.created_at).getTime()) / 86_400_000;
      const bucket = buckets.find(b => days <= b.max);
      if (bucket) bucket.value += 1;
    }
    return buckets;
  }, [data]);

  const columns: Column<Incident>[] = [
    { key: 'title', header: 'Judul', sortable: true, render: i => <span className="font-medium">{i.title}</span> },
    { key: 'status', header: 'Status', sortable: true, render: i => { const s = STATUS_MAP[i.status]; return <Badge variant={s.variant} dot>{s.label}</Badge>; }},
    { key: 'assigned', header: 'Ditugaskan', render: i => <span className="text-[var(--gc-text-secondary)]">{i.assigned_to ?? 'Belum ditugaskan'}</span> },
    { key: 'created', header: 'Dibuat', render: i => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(i.created_at).toLocaleString('id-ID')}</span> },
    { key: 'updated', header: 'Diperbarui', render: i => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(i.updated_at).toLocaleString('id-ID')}</span> },
  ];

  return (
    <PageLayout title="Incident Management" subtitle="Manajemen insiden keamanan — New → Investigating → Contained → Closed">
      {error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard
              title="Status Insiden"
              subtitle="Sebaran status saat ini"
              loading={loading}
              empty={byStatus.length === 0}
              emptyMessage="Belum ada insiden. Insiden dibuat dari temuan yang dieskalasi."
            >
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie isAnimationActive={false} data={byStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
                    {byStatus.map(d => <Cell key={d.key} fill={INCIDENT_STATUS_COLORS[d.key] ?? CHART.text} />)}
                  </Pie>
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: CHART.text }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              className="lg:col-span-2"
              title="Usia Insiden Belum Ditutup"
              subtitle="Makin lama terbuka, makin perlu perhatian"
              loading={loading}
              empty={ageBuckets.every(b => b.value === 0)}
              emptyMessage="Tidak ada insiden terbuka — atau belum ada insiden sama sekali."
            >
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={ageBuckets} barSize={36} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid stroke={CHART.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
                  <YAxis allowDecimals={false} tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar isAnimationActive={false} dataKey="value" radius={[4, 4, 0, 0]}>
                    {ageBuckets.map((b, i) => (
                      <Cell key={b.name} fill={[CHART.success, CHART.electric, CHART.warning, CHART.critical][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

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
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Assigned To</p><p className="text-sm">{selected.assigned_to ?? 'Belum ditugaskan'}</p></div>
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
