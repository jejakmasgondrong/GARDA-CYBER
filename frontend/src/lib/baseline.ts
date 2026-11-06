import type { Asset, AuditLogEntry, Finding, Incident, IntegrationStatus, JobResult } from '../types';
import { DAY, HOUR, parseApiDate } from './time';

export type ControlStatus = 'pass' | 'fail' | 'unknown';
export type ControlCategory = 'Asset' | 'Vulnerability' | 'Incident' | 'Monitoring' | 'Integrations';

/** Ambang yang dipakai kontrol otomatis. Ubah di sini. */
export const BASELINE_THRESHOLDS = {
  scanCoverageMin: 0.8, // minimal 80% aset pernah punya job
  findingMaxAgeDays: 14, // finding tinggi terbuka tidak boleh lebih lama dari ini
  incidentSlaHours: 72, // insiden open/in_progress tidak boleh lebih lama dari ini
  auditMaxAgeDays: 7, // audit log harus punya entri dalam rentang ini
  jobFailureMax: 0.2, // maksimal 20% job gagal dalam 7 hari
} as const;

export interface BaselineData {
  assets: Asset[] | null;
  jobs: JobResult[] | null;
  jobsTotal: number | null;
  findings: Finding[] | null;
  incidents: Incident[] | null;
  audit: AuditLogEntry[] | null;
  integrations: IntegrationStatus[] | null;
  now: number;
}

export interface EvalResult {
  status: ControlStatus;
  detail?: string;
}

export interface Control {
  id: string;
  name: string;
  category: ControlCategory;
  type: 'auto' | 'manual';
  /** Label referensi saja. Bukan klaim kepatuhan. */
  ref?: string;
  evaluate?: (d: BaselineData) => EvalResult;
}

const unknown = (detail: string): EvalResult => ({ status: 'unknown', detail });
const pct = (n: number) => `${Math.round(n * 100)}%`;

export const CONTROLS: Control[] = [
  {
    id: 'asset-inventory', name: 'Inventaris aset terisi', category: 'Asset', type: 'auto', ref: 'Ref: ISO 27001 A.5.9',
    evaluate: ({ assets }) => {
      if (!assets) return unknown('Data aset belum tersedia');
      return assets.length > 0
        ? { status: 'pass', detail: `${assets.length} aset terdaftar` }
        : { status: 'fail', detail: 'Belum ada aset terdaftar' };
    },
  },
  {
    id: 'asset-owner', name: 'Setiap aset punya pemilik', category: 'Asset', type: 'auto', ref: 'Ref: ISO 27001 A.5.9',
    evaluate: ({ assets }) => {
      if (!assets || assets.length === 0) return unknown('Belum ada aset untuk dinilai');
      const noOwner = assets.filter(a => !a.owner).length;
      return noOwner === 0
        ? { status: 'pass', detail: 'Semua aset punya pemilik' }
        : { status: 'fail', detail: `${noOwner} dari ${assets.length} aset tanpa pemilik` };
    },
  },
  {
    id: 'scan-coverage', name: 'Cakupan scan aset', category: 'Vulnerability', type: 'auto', ref: 'Ref: ISO 27001 A.8.8',
    evaluate: ({ assets, jobs, jobsTotal }) => {
      if (!assets || assets.length === 0 || !jobs) return unknown('Data aset atau job belum cukup');
      const scanned = new Set(jobs.map(j => j.asset_id));
      const covered = assets.filter(a => scanned.has(a.id)).length;
      const ratio = covered / assets.length;
      const partial = jobsTotal !== null && jobsTotal > jobs.length ? ` (dari ${jobs.length} job terbaru)` : '';
      return {
        status: ratio >= BASELINE_THRESHOLDS.scanCoverageMin ? 'pass' : 'fail',
        detail: `${covered}/${assets.length} aset (${pct(ratio)}) pernah di-scan${partial}`,
      };
    },
  },
  {
    id: 'finding-age', name: 'Tidak ada finding tinggi terbuka lama', category: 'Vulnerability', type: 'auto', ref: 'Ref: ISO 27001 A.8.8',
    evaluate: ({ findings, now }) => {
      if (!findings) return unknown('Data finding belum tersedia');
      const limit = BASELINE_THRESHOLDS.findingMaxAgeDays * DAY;
      const old = findings.filter(f => {
        const t = parseApiDate(f.collected_at);
        return f.confidence === 'high' && (f.status === 'open' || f.status === 'triaged') && t !== null && now - t > limit;
      }).length;
      return old === 0
        ? { status: 'pass', detail: `Tidak ada lebih dari ${BASELINE_THRESHOLDS.findingMaxAgeDays} hari` }
        : { status: 'fail', detail: `${old} finding tinggi terbuka > ${BASELINE_THRESHOLDS.findingMaxAgeDays} hari` };
    },
  },
  {
    id: 'incident-sla', name: 'Insiden aktif dalam batas SLA', category: 'Incident', type: 'auto', ref: 'Ref: ISO 27001 A.5.26',
    evaluate: ({ incidents, now }) => {
      if (!incidents) return unknown('Data insiden belum tersedia');
      const limit = BASELINE_THRESHOLDS.incidentSlaHours * HOUR;
      const late = incidents.filter(i => {
        const t = parseApiDate(i.created_at);
        return (i.status === 'open' || i.status === 'in_progress') && t !== null && now - t > limit;
      }).length;
      return late === 0
        ? { status: 'pass', detail: `Tidak ada yang melewati ${BASELINE_THRESHOLDS.incidentSlaHours} jam` }
        : { status: 'fail', detail: `${late} insiden melewati ${BASELINE_THRESHOLDS.incidentSlaHours} jam` };
    },
  },
  {
    id: 'incident-owner', name: 'Insiden terbuka punya penanggung jawab', category: 'Incident', type: 'auto', ref: 'Ref: ISO 27001 A.5.24',
    evaluate: ({ incidents }) => {
      if (!incidents) return unknown('Data insiden belum tersedia');
      const open = incidents.filter(i => i.status === 'open');
      if (open.length === 0) return { status: 'pass', detail: 'Tidak ada insiden terbuka' };
      const noOwner = open.filter(i => !i.assigned_to).length;
      return noOwner === 0
        ? { status: 'pass', detail: `${open.length} insiden terbuka sudah ditugaskan` }
        : { status: 'fail', detail: `${noOwner} insiden terbuka belum ditugaskan` };
    },
  },
  {
    id: 'audit-active', name: 'Audit log aktif', category: 'Monitoring', type: 'auto', ref: 'Ref: ISO 27001 A.8.15',
    evaluate: ({ audit, now }) => {
      if (!audit) return unknown('Data audit log belum tersedia');
      const times = audit.map(a => parseApiDate(a.created_at)).filter((t): t is number => t !== null);
      if (times.length === 0) return { status: 'fail', detail: 'Belum ada entri audit log' };
      const age = now - Math.max(...times);
      return age <= BASELINE_THRESHOLDS.auditMaxAgeDays * DAY
        ? { status: 'pass', detail: `Entri terakhir dalam ${BASELINE_THRESHOLDS.auditMaxAgeDays} hari` }
        : { status: 'fail', detail: `Entri terakhir ${Math.floor(age / DAY)} hari lalu` };
    },
  },
  {
    id: 'job-health', name: 'Tingkat kegagalan job rendah', category: 'Monitoring', type: 'auto',
    evaluate: ({ jobs, now }) => {
      if (!jobs) return unknown('Data job belum tersedia');
      const recent = jobs.filter(j => {
        const t = parseApiDate(j.created_at);
        return t !== null && now - t <= 7 * DAY;
      });
      if (recent.length === 0) return unknown('Belum ada job dalam 7 hari');
      const failed = recent.filter(j => j.status === 'failed').length;
      const ratio = failed / recent.length;
      return {
        status: ratio <= BASELINE_THRESHOLDS.jobFailureMax ? 'pass' : 'fail',
        detail: `${failed}/${recent.length} job gagal dalam 7 hari (${pct(ratio)})`,
      };
    },
  },
  {
    id: 'integration-on', name: 'Minimal satu integrasi terkonfigurasi', category: 'Integrations', type: 'auto',
    evaluate: ({ integrations }) => {
      if (!integrations) return unknown('Data integrasi belum tersedia');
      const n = integrations.filter(i => i.configured).length;
      return n > 0
        ? { status: 'pass', detail: `${n} dari ${integrations.length} terkonfigurasi` }
        : { status: 'fail', detail: 'Belum ada integrasi terkonfigurasi' };
    },
  },
  { id: 'manual-mfa', name: 'MFA aktif untuk akun admin', category: 'Asset', type: 'manual', ref: 'Ref: ISO 27001 A.8.5' },
  { id: 'manual-backup', name: 'Backup diuji berkala', category: 'Asset', type: 'manual', ref: 'Ref: ISO 27001 A.8.13' },
  { id: 'manual-irp', name: 'Prosedur respons insiden terdokumentasi', category: 'Incident', type: 'manual', ref: 'Ref: ISO 27001 A.5.24' },
];

export const MANUAL_STORAGE_KEY = 'gc.baseline.manual';

export interface EvaluatedControl {
  control: Control;
  status: ControlStatus;
  detail?: string;
}

export interface BaselineResult {
  items: EvaluatedControl[];
  pass: number;
  fail: number;
  unknown: number;
  /** pass / (pass + fail) dalam persen, atau null bila belum ada yang bisa dinilai. */
  score: number | null;
}

/**
 * Fungsi murni. Kontrol manual yang tidak dicentang dihitung "fail" (belum dipenuhi).
 * Kontrol otomatis "unknown" tidak masuk perhitungan skor.
 */
export function evaluateBaseline(data: BaselineData, manualChecked: ReadonlySet<string>): BaselineResult {
  const items: EvaluatedControl[] = CONTROLS.map(control => {
    if (control.type === 'manual') {
      return { control, status: manualChecked.has(control.id) ? 'pass' : 'fail', detail: manualChecked.has(control.id) ? 'Dikonfirmasi manual' : 'Belum dikonfirmasi' };
    }
    const r = control.evaluate ? control.evaluate(data) : unknown('Tidak ada evaluator');
    return { control, status: r.status, detail: r.detail };
  });
  const pass = items.filter(i => i.status === 'pass').length;
  const fail = items.filter(i => i.status === 'fail').length;
  const unk = items.filter(i => i.status === 'unknown').length;
  return { items, pass, fail, unknown: unk, score: pass + fail > 0 ? Math.round((pass / (pass + fail)) * 100) : null };
}
