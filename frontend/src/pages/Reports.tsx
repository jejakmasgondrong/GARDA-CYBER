import { PageLayout } from '../components/layout/PageLayout';
import { EmptyState } from '../components/ui';
import { FileBarChart, Download } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'security', title: 'Security Summary', desc: 'Ringkasan postur keamanan keseluruhan' },
  { id: 'vuln', title: 'Vulnerability Report', desc: 'Laporan temuan kerentanan' },
  { id: 'asset', title: 'Asset Report', desc: 'Inventaris dan status aset' },
  { id: 'incident', title: 'Incident Report', desc: 'Riwayat dan detail insiden' },
  { id: 'scan', title: 'Scan Report', desc: 'Hasil scan dan job' },
];

export default function Reports() {
  return (
    <PageLayout title="Reports" subtitle="Laporan assessment dan ringkasan keamanan yang dapat diekspor">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {REPORT_TYPES.map(r => (
          <div key={r.id} className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-[var(--gc-radius)] bg-[var(--gc-surface)] p-2">
                <FileBarChart className="h-5 w-5 text-[var(--gc-primary)]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--gc-text)]">{r.title}</h4>
                <p className="text-[10.5px] text-[var(--gc-text-secondary)]">{r.desc}</p>
              </div>
            </div>
            <button disabled
              className="mt-2 flex items-center gap-1.5 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-1.5 text-xs text-[var(--gc-text-secondary)] opacity-50 cursor-not-allowed"
              title="Export belum tersedia — mekanisme export belum ada di backend">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        ))}
      </div>

      <EmptyState
        title="Export belum tersedia"
        description="Laporan dibuat dari data Red Team, Blue Team, dan Vulnerability Management. Fitur export (PDF/CSV) akan tersedia setelah mekanisme backend disiapkan."
      />
    </PageLayout>
  );
}
