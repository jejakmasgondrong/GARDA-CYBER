import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Pagination, ErrorState, ChartCard, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { CHART, TOOLTIP_STYLE } from '../lib/chartTheme';
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

  // Aktivitas 14 hari terakhir — dihitung dari created_at yang benar-benar ada.
  const activity = useMemo(() => {
    const days = 14;
    const buckets = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const l of logs) {
      const key = new Date(l.created_at).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, value]) => ({
      day: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      value,
    }));
  }, [logs]);

  const hasActivity = activity.some(d => d.value > 0);

  const byOutcome = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(l.outcome, (counts.get(l.outcome) ?? 0) + 1);
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [logs]);

  const uniqueActors = useMemo(() => new Set(logs.map(l => l.actor)).size, [logs]);

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
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Aktivitas 14 Hari"
              subtitle="Jumlah aksi tercatat per hari"
              loading={loading}
              empty={!hasActivity}
              emptyMessage="Belum ada aksi tercatat dalam 14 hari terakhir. Log muncul begitu ada operasi dijalankan."
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activity} barSize={14} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid stroke={CHART.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: CHART.text, fontSize: 10 }} stroke={CHART.border} />
                  <YAxis allowDecimals={false} tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar isAnimationActive={false} dataKey="value" fill={CHART.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Hasil Tindakan"
              subtitle={`${logs.length} log · ${uniqueActors} aktor unik`}
              loading={loading}
              empty={byOutcome.length === 0}
              emptyMessage="Belum ada hasil tindakan untuk ditampilkan."
            >
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie isAnimationActive={false} data={byOutcome} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {byOutcome.map(d => (
                      <Cell key={d.name} fill={d.name === 'success' ? CHART.success : CHART.text} />
                    ))}
                  </Pie>
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: CHART.text }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

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
