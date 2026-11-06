import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { FileBarChart, Download, RefreshCw } from 'lucide-react';
import { PageLayout } from '../components/layout/PageLayout';
import { ChartCard, ErrorState, Button, StatusIndicator } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { CHART, TOOLTIP_STYLE } from '../lib/chartTheme';
import type { Asset, FindingListResponse, IncidentListResponse, JobListResponse } from '../types';

/**
 * Laporan dibuat di browser dari data API saat tombol ditekan.
 *
 * Kenapa di klien: backend belum punya endpoint export. Yang penting angka di
 * laporan berasal dari respons API sungguhan pada saat itu — bukan contoh.
 * Kalau backend nanti punya endpoint export, fungsi di sini bisa diganti fetch.
 */

type ReportKind = 'security' | 'vuln' | 'asset' | 'incident' | 'scan';

const REPORT_TYPES: { id: ReportKind; title: string; desc: string }[] = [
  { id: 'security', title: 'Security Summary', desc: 'Ringkasan postur keamanan keseluruhan' },
  { id: 'vuln', title: 'Vulnerability Report', desc: 'Laporan temuan kerentanan' },
  { id: 'asset', title: 'Asset Report', desc: 'Inventaris dan status aset' },
  { id: 'incident', title: 'Incident Report', desc: 'Riwayat dan detail insiden' },
  { id: 'scan', title: 'Scan Report', desc: 'Hasil scan dan job' },
];

interface Dataset {
  assets: Asset[];
  findings: FindingListResponse['items'];
  incidents: IncidentListResponse['items'];
  jobs: JobListResponse['items'];
}

const CATEGORY_LABEL: Record<string, string> = {
  ip_reputation: 'IP Reputation',
  osint: 'OSINT',
  secret_exposure: 'Secret Exposure',
  other: 'Lainnya',
};

const label = (category: string) => CATEGORY_LABEL[category] ?? category;

const line = (s = '') => `${s}\n`;
const table = (headers: string[], rows: string[][]) => {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  return rows.length === 0 ? '_Tidak ada data._\n' : `${head}\n${sep}\n${body}\n`;
};

function countBy<T>(items: T[], key: (t: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const it of items) map.set(key(it), (map.get(key(it)) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function buildReport(kind: ReportKind, d: Dataset): string {
  const stamp = new Date().toLocaleString('id-ID');
  const head =
    line(`# GARDA CYBER — ${REPORT_TYPES.find(r => r.id === kind)?.title ?? 'Report'}`) +
    line() +
    line(`Dibuat: ${stamp}`) +
    line(`Sumber: data langsung dari API GARDA CYBER saat laporan dibuat.`) +
    line();

  if (kind === 'asset') {
    return (
      head +
      line(`Total aset: **${d.assets.length}**`) +
      line() +
      line(`## Sebaran tipe`) +
      line() +
      table(['Tipe', 'Jumlah'], countBy(d.assets, a => a.asset_type).map(([k, v]) => [k, String(v)])) +
      line(`## Daftar aset`) +
      line() +
      table(
        ['Nama', 'Tipe', 'Identifier', 'Status', 'Pemilik'],
        d.assets.map(a => [a.name, a.asset_type, a.identifier, a.status, a.owner ?? '—']),
      )
    );
  }

  if (kind === 'vuln') {
    return (
      head +
      line(`Total temuan: **${d.findings.length}**`) +
      line() +
      line(`## Sebaran tingkat keyakinan`) +
      line() +
      table(['Confidence', 'Jumlah'], countBy(d.findings, f => f.confidence).map(([k, v]) => [k, String(v)])) +
      line(`## Sebaran kategori`) +
      line() +
      table(['Kategori', 'Jumlah'], countBy(d.findings, f => f.category).map(([k, v]) => [k, String(v)])) +
      line(`## Daftar temuan`) +
      line() +
      table(
        ['Judul', 'Kategori', 'Confidence', 'Status', 'Sumber', 'Dikumpulkan'],
        d.findings.map(f => [
          f.title,
          f.category,
          f.confidence,
          f.status,
          f.source,
          new Date(f.collected_at).toLocaleString('id-ID'),
        ]),
      )
    );
  }

  if (kind === 'incident') {
    return (
      head +
      line(`Total insiden: **${d.incidents.length}**`) +
      line() +
      line(`## Sebaran status`) +
      line() +
      table(['Status', 'Jumlah'], countBy(d.incidents, i => i.status).map(([k, v]) => [k, String(v)])) +
      line(`## Daftar insiden`) +
      line() +
      table(
        ['Judul', 'Status', 'Ditugaskan', 'Dibuat', 'Diperbarui'],
        d.incidents.map(i => [
          i.title,
          i.status,
          i.assigned_to ?? '—',
          new Date(i.created_at).toLocaleString('id-ID'),
          new Date(i.updated_at).toLocaleString('id-ID'),
        ]),
      )
    );
  }

  if (kind === 'scan') {
    return (
      head +
      line(`Total job: **${d.jobs.length}**`) +
      line() +
      line(`## Sebaran status job`) +
      line() +
      table(['Status', 'Jumlah'], countBy(d.jobs, j => j.status).map(([k, v]) => [k, String(v)])) +
      line(`## Sebaran tool`) +
      line() +
      table(['Tool', 'Jumlah'], countBy(d.jobs, j => j.tool_id).map(([k, v]) => [k, String(v)])) +
      line(`## Daftar job`) +
      line() +
      table(
        ['Tool', 'Status', 'Dibuat', 'Selesai', 'Ringkasan'],
        d.jobs.map(j => [
          j.tool_id,
          j.status,
          new Date(j.created_at).toLocaleString('id-ID'),
          j.completed_at ? new Date(j.completed_at).toLocaleString('id-ID') : '—',
          (j.failure_reason || j.output_summary || '—').replace(/\|/g, '\\|').slice(0, 120),
        ]),
      )
    );
  }

  // security summary
  const openFindings = d.findings.filter(f => f.status === 'open').length;
  const openIncidents = d.incidents.filter(i => i.status !== 'closed').length;
  const failedJobs = d.jobs.filter(j => j.status === 'failed').length;
  return (
    head +
    line(`## Angka pokok`) +
    line() +
    table(
      ['Ukuran', 'Nilai'],
      [
        ['Aset terdaftar', String(d.assets.length)],
        ['Temuan total', String(d.findings.length)],
        ['Temuan status open', String(openFindings)],
        ['Insiden belum ditutup', String(openIncidents)],
        ['Job total', String(d.jobs.length)],
        ['Job gagal', String(failedJobs)],
      ],
    ) +
    line(`## Temuan per kategori`) +
    line() +
    table(['Kategori', 'Jumlah'], countBy(d.findings, f => f.category).map(([k, v]) => [k, String(v)])) +
    line(`## Insiden per status`) +
    line() +
    table(['Status', 'Jumlah'], countBy(d.incidents, i => i.status).map(([k, v]) => [k, String(v)])) +
    line(`## Catatan`) +
    line() +
    line(
      'Laporan ini meringkas apa yang tercatat di API. Ia tidak menghitung skor risiko, tidak menilai keparahan, dan tidak menyimpulkan ada/tidaknya kompromi.',
    )
  );
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [findings, setFindings] = useState<FindingListResponse['items']>([]);
  const [incidents, setIncidents] = useState<IncidentListResponse['items']>([]);
  const [jobs, setJobs] = useState<JobListResponse['items']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<Asset[]>('/assets'),
      apiClient.get<FindingListResponse>('/findings?limit=200'),
      apiClient.get<IncidentListResponse>('/incidents?limit=200'),
      apiClient.get<JobListResponse>('/jobs?limit=200'),
    ])
      .then(([a, f, i, j]) => {
        setAssets(a ?? []);
        setFindings(f?.items ?? []);
        setIncidents(i?.items ?? []);
        setJobs(j?.items ?? []);
      })
      .catch(() => setError('Backend tidak terjangkau. Jalankan server FastAPI untuk menyusun laporan.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const dataset: Dataset = useMemo(
    () => ({ assets, findings, incidents, jobs }),
    [assets, findings, incidents, jobs],
  );

  const insightChart = useMemo(
    () => countBy(findings, f => f.category).map(([name, value]) => ({ name: label(name), value })),
    [findings],
  );

  const totalRows = assets.length + findings.length + incidents.length + jobs.length;

  const handleExport = (kind: ReportKind, title: string) => {
    const text = buildReport(kind, dataset);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const date = new Date().toISOString().slice(0, 10);
    download(`garda-${slug}-${date}.md`, text);
    setLastGenerated(new Date().toLocaleTimeString('id-ID'));
  };

  if (error) {
    return (
      <PageLayout title="Reports" subtitle="Laporan assessment dan ringkasan keamanan yang dapat diekspor">
        <ErrorState message={error} onRetry={load} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Reports"
      subtitle="Laporan dibuat dari data API saat tombol ditekan — tanpa angka contoh"
      actions={
        <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Muat Ulang
        </Button>
      }
    >
      <div className="mb-4 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--gc-text-secondary)]">
          <span>{assets.length} aset</span>
          <span>{findings.length} temuan</span>
          <span>{incidents.length} insiden</span>
          <span>{jobs.length} job</span>
          {loading ? (
            <StatusIndicator status="idle" label="Memuat…" />
          ) : (
            <StatusIndicator status="online" label="Data siap" />
          )}
          {lastGenerated && <span className="ml-auto">Terakhir diunduh {lastGenerated}</span>}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {REPORT_TYPES.map(r => (
          <div key={r.id} className="flex flex-col rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-[var(--gc-radius)] bg-[var(--gc-surface)] p-2">
                <FileBarChart className="h-5 w-5 text-[var(--gc-primary)]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--gc-text)]">{r.title}</h4>
                <p className="text-[10.5px] text-[var(--gc-text-secondary)]">{r.desc}</p>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <span className="text-[10.5px] text-[var(--gc-text-secondary)]">
                {totalRows === 0 ? 'Belum ada data' : 'Format Markdown (.md)'}
              </span>
              <Button variant="secondary" size="sm" onClick={() => handleExport(r.id, r.title)} disabled={loading}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Unduh
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ChartCard
        className="lg:col-span-2"
        title="Temuan per Kategori"
        subtitle="Isi yang akan masuk ke Vulnerability Report"
        loading={loading}
        empty={insightChart.length === 0}
        emptyMessage="Belum ada temuan, jadi laporan masih kosong. Jalankan IP Intelligence, OSINT, atau GitHub Exposure dulu."
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={insightChart} layout="vertical" barSize={18} margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke={CHART.border} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: CHART.text, fontSize: 11 }} stroke={CHART.border} />
            <ReTooltip contentStyle={TOOLTIP_STYLE} />
            <Bar isAnimationActive={false} dataKey="value" fill={CHART.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--gc-text-secondary)]">
        Laporan berisi apa adanya dari API: tidak ada skor risiko, tidak ada kesimpulan kompromi, dan tidak ada
        angka contoh. Kalau daftar masih kosong, laporan akan menyebutkan bahwa datanya nol.
      </p>
    </PageLayout>
  );
}
