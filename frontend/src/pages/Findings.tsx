import { useEffect, useState, useMemo } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable, Badge, SearchInput, Select, Pagination, Drawer, ErrorState, type Column } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { FindingListResponse, Finding, FindingStatus } from '../types';

const STATUS_BADGE: Record<FindingStatus, { variant: 'warning' | 'primary' | 'success' | 'default'; label: string }> = {
  open: { variant: 'warning', label: 'Open' },
  triaged: { variant: 'primary', label: 'Triaged' },
  remediated: { variant: 'success', label: 'Remediated' },
  false_positive: { variant: 'default', label: 'False Positive' },
};
const CAT_LABEL: Record<string, string> = { ip_reputation: 'IP Reputation', osint: 'OSINT', secret_exposure: 'Secret Exposure', other: 'Other' };

export default function Findings() {
  const [data, setData] = useState<FindingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Finding | null>(null);
  const pageSize = 20;

  useEffect(() => {
    apiClient.get<FindingListResponse>('/findings?limit=200')
      .then(setData).catch(() => setError('Backend tidak terjangkau.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.items.filter(f => {
      const matchSearch = !search || f.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || f.status === statusFilter;
      const matchCat = !catFilter || f.category === catFilter;
      return matchSearch && matchStatus && matchCat;
    });
  }, [data, search, statusFilter, catFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const columns: Column<Finding>[] = [
    { key: 'title', header: 'Judul', sortable: true, render: f => <span className="font-medium">{f.title}</span> },
    { key: 'category', header: 'Kategori', render: f => <Badge variant="info">{CAT_LABEL[f.category] ?? f.category}</Badge> },
    { key: 'source', header: 'Sumber', render: f => <span className="text-[var(--gc-text-secondary)] text-xs">{f.source}</span> },
    { key: 'confidence', header: 'Confidence', render: f => <Badge variant={f.confidence === 'high' ? 'critical' : f.confidence === 'medium' ? 'warning' : 'default'}>{f.confidence}</Badge> },
    { key: 'status', header: 'Status', render: f => { const b = STATUS_BADGE[f.status]; return <Badge variant={b.variant}>{b.label}</Badge>; }},
    { key: 'time', header: 'Waktu', render: f => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(f.collected_at).toLocaleString('id-ID')}</span> },
  ];

  return (
    <PageLayout title="Findings" subtitle="Semua temuan dari IP Intelligence, OSINT, dan GitHub Exposure">
      {error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Cari judul finding..." className="flex-1" />
            <Select options={[{ value: 'open', label: 'Open' }, { value: 'triaged', label: 'Triaged' }, { value: 'remediated', label: 'Remediated' }, { value: 'false_positive', label: 'False Positive' }]}
              placeholder="Semua Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-36" />
            <Select options={[{ value: 'ip_reputation', label: 'IP Reputation' }, { value: 'osint', label: 'OSINT' }, { value: 'secret_exposure', label: 'Secret Exposure' }]}
              placeholder="Semua Kategori" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} className="w-40" />
          </div>
          <DataTable columns={columns} data={paged} keyExtractor={f => f.id} loading={loading} onRowClick={setSelected}
            emptyTitle="Belum ada temuan" emptyDescription="Temuan akan muncul setelah menjalankan IP Intelligence, OSINT, atau GitHub Exposure Monitor." />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={pageSize} />
          <Drawer open={!!selected} onClose={() => setSelected(null)} title="Detail Finding">
            {selected && (
              <div className="space-y-4">
                <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Judul</p><p className="text-sm font-semibold">{selected.title}</p></div>
                <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Deskripsi</p><p className="text-sm text-[var(--gc-text-secondary)]">{selected.description ?? 'Tidak ada deskripsi'}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Kategori</p><Badge variant="info">{CAT_LABEL[selected.category] ?? selected.category}</Badge></div>
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Status</p><Badge variant={STATUS_BADGE[selected.status].variant}>{STATUS_BADGE[selected.status].label}</Badge></div>
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Confidence</p><Badge variant={selected.confidence === 'high' ? 'critical' : 'default'}>{selected.confidence}</Badge></div>
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Source</p><p className="text-sm">{selected.source}</p></div>
                </div>
                {selected.source_url && <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Source URL</p><p className="text-sm text-[var(--gc-primary)] break-all">{selected.source_url}</p></div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Collected At</p><p className="text-xs text-[var(--gc-text-secondary)]">{new Date(selected.collected_at).toLocaleString('id-ID')}</p></div>
                  <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Created At</p><p className="text-xs text-[var(--gc-text-secondary)]">{new Date(selected.created_at).toLocaleString('id-ID')}</p></div>
                </div>
              </div>
            )}
          </Drawer>
        </>
      )}
    </PageLayout>
  );
}
