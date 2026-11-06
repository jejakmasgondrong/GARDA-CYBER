import { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Badge, ConfirmationDialog, DataTable, type Column } from '../components/ui';
import { apiClient, ApiError } from '../lib/apiClient';
import type { Asset, IntegrationStatusV2, JobResult } from '../types';

const RED_TEAM_TOOLS = [
  'nmap',
  'nuclei',
  'amass',
  'owasp_zap',
  'greenbone',
  // Adapter dari lab Kartika (draft) — engine stdlib, tanpa binary eksternal.
  'kartika_load',
  'kartika_sqli_probe',
  'kartika_wa_phish',
];
const JOB_STATUS: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'critical' }> = {
  queued: { label: 'Antre', variant: 'default' },
  running: { label: 'Berjalan', variant: 'warning' },
  completed: { label: 'Selesai', variant: 'success' },
  failed: { label: 'Gagal', variant: 'critical' },
  cancelled: { label: 'Dibatalkan', variant: 'default' },
};

/** Satu badge status per tool: gabungan terpasang + terkonfigurasi + bisa dieksekusi. */
function toolStatus(t: IntegrationStatusV2): { text: string; variant: 'success' | 'warning' | 'default' } {
  if (t.executable) return { text: 'Siap Eksekusi', variant: 'success' };
  if (t.configured) return { text: 'Terkonfigurasi, belum bisa jalan', variant: 'warning' };
  if (t.installed) return { text: 'Terpasang, belum dikonfigurasi', variant: 'warning' };
  return { text: 'Belum Terpasang', variant: 'default' };
}

export default function RedTeam() {
  const [tools, setTools] = useState<IntegrationStatusV2[]>(
    RED_TEAM_TOOLS.map(id => ({ tool_id: id, display_name: id, configured: false, required_env_vars: [], official_repo: '', capability_summary: '' }))
  );
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [selectedTool, setSelectedTool] = useState('nmap');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const refreshJobs = () => { apiClient.get<{ items: JobResult[] }>('/jobs?limit=20').then(r => setJobs(r.items)).catch(() => {}); };

  useEffect(() => {
    apiClient.get<IntegrationStatusV2[]>('/integrations').then(all => setTools(all.filter(t => RED_TEAM_TOOLS.includes(t.tool_id)))).catch(() => {});
    apiClient.get<Asset[]>('/assets').then(setAssets).catch(() => {});
    refreshJobs();
  }, []);

  function confirmRun(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    if (!selectedAsset) { setFormError('Pilih aset target dulu.'); return; }
    setShowConfirm(true);
  }

  async function handleRunJob() {
    setShowConfirm(false); setRunning(true);
    try {
      await apiClient.post('/jobs', { tool_id: selectedTool, asset_id: selectedAsset, parameters: { flags: ['-sV'] } });
      refreshJobs();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Backend tidak terjangkau.');
    } finally { setRunning(false); }
  }

  const jobColumns: Column<JobResult>[] = [
    { key: 'tool', header: 'Tool', render: j => <span className="text-xs">{tools.find(t => t.tool_id === j.tool_id)?.display_name ?? j.tool_id}</span> },
    { key: 'status', header: 'Status', render: j => { const s = JOB_STATUS[j.status] || { label: j.status, variant: 'default' as const }; return <Badge variant={s.variant} dot>{s.label}</Badge>; }},
    { key: 'created', header: 'Dibuat', render: j => <span className="text-xs text-[var(--gc-text-secondary)]">{new Date(j.created_at).toLocaleString('id-ID')}</span> },
    { key: 'result', header: 'Ringkasan / Alasan Gagal', className: 'max-w-[300px] truncate', render: j => <span className="text-xs text-[var(--gc-text-secondary)]">{j.failure_reason || j.output_summary || '—'}</span> },
  ];

  return (
    <PageLayout title="Red Team" subtitle="Ruang kerja pengujian keamanan — Hanya menargetkan aset berstatus aktif">
      {/* Tool status cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-5">
        {tools.map(t => (
          <div key={t.tool_id} className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-4">
            <h4 className="text-sm font-semibold text-[var(--gc-text)] mb-1">{t.display_name}</h4>
            <p className="text-[10.5px] text-[var(--gc-text-secondary)] mb-3">{t.capability_summary || t.official_repo || 'Lihat Integrations'}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={toolStatus(t).variant}>{toolStatus(t).text}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Run Job Form */}
      <div className="mb-5 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--gc-text)] mb-3">Jalankan Job Baru</h3>
        <div className="mb-3 rounded-[var(--gc-radius)] bg-[var(--gc-warning)]/10 border border-[var(--gc-warning)]/30 px-3 py-2 text-xs text-[var(--gc-warning)]">
          ⚠ Pastikan target dalam lingkup izin. Jangan gunakan pada aset tanpa otorisasi.
        </div>
        <form onSubmit={confirmRun} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-[var(--gc-text-secondary)] mb-1">Tool</label>
            <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)}
              className="rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 text-sm text-[var(--gc-text)]">
              {RED_TEAM_TOOLS.map(id => {
                const t = tools.find(x => x.tool_id === id);
                return <option key={id} value={id}>{t?.display_name ?? id}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--gc-text-secondary)] mb-1">Target Aset</label>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}
              className="min-w-[200px] rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 text-sm text-[var(--gc-text)]">
              <option value="">-- pilih aset --</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.status})</option>)}
            </select>
          </div>
          <button type="submit" disabled={running}
            className="rounded-[var(--gc-radius)] bg-[var(--gc-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {running ? 'Menjalankan…' : 'Jalankan'}
          </button>
        </form>
        {formError && <p className="mt-2 text-xs text-[var(--gc-critical)]">{formError}</p>}
        {assets.length === 0 && <p className="mt-2 text-xs text-[var(--gc-text-secondary)]">Belum ada aset. Tambahkan di Asset Inventory.</p>}
      </div>

      {/* Job History */}
      <h3 className="text-sm font-semibold text-[var(--gc-text)] mb-3">Riwayat Job</h3>
      <DataTable columns={jobColumns} data={jobs} keyExtractor={j => j.id}
        emptyTitle="Belum ada job" emptyDescription="Job yang dijalankan akan muncul di sini." />

      <ConfirmationDialog open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleRunJob}
        title="Konfirmasi Jalankan Job" message={`Yakin ingin menjalankan ${selectedTool} pada aset ini? Pastikan target dalam lingkup izin.`}
        confirmLabel="Jalankan" variant="danger" loading={running} />
    </PageLayout>
  );
}
