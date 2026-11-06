import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Select, Pagination, Drawer, ErrorState, ChartCard, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { CHART, TOOLTIP_STYLE } from '../lib/chartTheme';
import type { Asset } from '../types';

const ASSET_TYPE_LABEL: Record<string, string> = {
  domain: 'Domain', ip: 'IP', application: 'Aplikasi', device: 'Perangkat', other: 'Lainnya',
};

const ASSET_STATUS_LABEL: Record<string, string> = {
  active: 'Aktif', inactive: 'Nonaktif', pending_review: 'Perlu Tinjauan',
};

const ASSET_STATUS_COLOR: Record<string, string> = {
  active: CHART.success, inactive: CHART.text, pending_review: CHART.warning,
};

export default function AssetInventory() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Asset | null>(null);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    apiClient.get<Asset[]>('/assets')
      .then(setAssets)
      .catch(() => setError('Backend tidak terjangkau. Jalankan server FastAPI untuk memuat data aset.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.identifier.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || a.asset_type === typeFilter;
      const matchStatus = !statusFilter || a.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [assets, search, typeFilter, statusFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(a.asset_type, (counts.get(a.asset_type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([k, v]) => ({ name: ASSET_TYPE_LABEL[k] ?? k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const byStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
    return [...counts.entries()].map(([k, v]) => ({ key: k, name: ASSET_STATUS_LABEL[k] ?? k, value: v }));
  }, [assets]);

  const statusBadge = (s: string) => {
    const map: Record<string, 'success' | 'warning' | 'default'> = {
      active: 'success', inactive: 'default', pending_review: 'warning',
    };
    return <Badge variant={map[s] || 'default'}>{s.replace('_', ' ')}</Badge>;
  };

  const columns: Column<Asset>[] = [
    { key: 'name', header: 'Nama Aset', sortable: true, render: a => (
      <div>
        <p className="font-medium text-[var(--gc-text)]">{a.name}</p>
        <p className="text-[10.5px] text-[var(--gc-text-secondary)] font-mono">{a.identifier}</p>
      </div>
    )},
    { key: 'type', header: 'Tipe', sortable: true, render: a => <Badge variant="info">{a.asset_type}</Badge> },
    { key: 'owner', header: 'Pemilik', render: a => <span className="text-[var(--gc-text-secondary)]">{a.owner ?? '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: a => statusBadge(a.status) },
    { key: 'updated', header: 'Diperbarui', render: a => (
      <span className="text-xs text-[var(--gc-text-secondary)]">
        {new Date(a.updated_at).toLocaleString('id-ID')}
      </span>
    )},
  ];

  return (
    <PageLayout title="Asset Inventory" subtitle="Daftar aset yang diotorisasi untuk dipantau dan dinilai">
      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Aset per Tipe"
              subtitle="Sebaran jenis aset yang terdaftar"
              loading={loading}
              empty={byType.length === 0}
              emptyMessage="Belum ada aset. Tambahkan lewat API POST /assets atau halaman ini."
            >
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={byType} barSize={32} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid stroke={CHART.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
                  <YAxis allowDecimals={false} tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar isAnimationActive={false} dataKey="value" fill={CHART.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Status Aset"
              subtitle="Siap dipakai atau belum"
              loading={loading}
              empty={byStatus.length === 0}
              emptyMessage="Status muncul setelah ada aset terdaftar."
            >
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie isAnimationActive={false} data={byStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
                    {byStatus.map(d => <Cell key={d.key} fill={ASSET_STATUS_COLOR[d.key] ?? CHART.text} />)}
                  </Pie>
                  <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: CHART.text }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
            <SearchInput
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              onClear={() => setSearch('')}
              placeholder="Cari nama atau identifier..."
              className="flex-1"
            />
            <Select
              options={[
                { value: 'domain', label: 'Domain' },
                { value: 'ip', label: 'IP' },
                { value: 'application', label: 'Application' },
                { value: 'device', label: 'Device' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder="Semua Tipe"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="w-36"
            />
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending_review', label: 'Pending Review' },
              ]}
              placeholder="Semua Status"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-40"
            />
          </div>

          <DataTable
            columns={columns}
            data={paged}
            keyExtractor={a => a.id}
            loading={loading}
            onRowClick={setSelected}
            emptyTitle="Belum ada aset terdaftar"
            emptyDescription="Tambahkan aset pertama melalui API POST /assets."
          />

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
            totalItems={filtered.length} itemsPerPage={pageSize} />

          {/* Detail Drawer */}
          <Drawer open={!!selected} onClose={() => setSelected(null)} title="Detail Aset">
            {selected && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Nama</p>
                  <p className="text-sm font-semibold text-[var(--gc-text)]">{selected.name}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Identifier</p>
                  <p className="text-sm font-mono text-[var(--gc-text)]">{selected.identifier}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Tipe</p>
                    <Badge variant="info">{selected.asset_type}</Badge>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Status</p>
                    {statusBadge(selected.status)}
                  </div>
                </div>
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Pemilik</p>
                  <p className="text-sm text-[var(--gc-text)]">{selected.owner ?? 'Tidak ditentukan'}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Catatan</p>
                  <p className="text-sm text-[var(--gc-text-secondary)]">{selected.scope_notes ?? 'Tidak ada catatan'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Dibuat</p>
                    <p className="text-xs text-[var(--gc-text-secondary)]">{new Date(selected.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--gc-text-secondary)]">Diperbarui</p>
                    <p className="text-xs text-[var(--gc-text-secondary)]">{new Date(selected.updated_at).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            )}
          </Drawer>
        </>
      )}
    </PageLayout>
  );
}
