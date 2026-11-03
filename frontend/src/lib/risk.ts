import type { Finding, Incident, JobResult } from '../types';
import { DAY, parseApiDate } from './time';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Bobot sederhana. Skor = min(100, jumlah poin semua faktor). */
export const RISK_WEIGHTS = {
  findingHigh: 6,
  findingMedium: 3,
  findingLow: 1,
  incidentOpen: 12,
  incidentInProgress: 10,
  incidentContained: 4,
  jobFailed24h: 2,
  jobFailedCap: 10,
} as const;

export const RISK_LEVELS: { max: number; level: RiskLevel }[] = [
  { max: 24, level: 'LOW' },
  { max: 49, level: 'MEDIUM' },
  { max: 74, level: 'HIGH' },
  { max: 100, level: 'CRITICAL' },
];

export interface RiskFactor {
  id: string;
  label: string;
  count: number;
  points: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[]; // urut poin terbesar
}

interface RiskInput {
  findings: Finding[] | null;
  incidents: Incident[] | null;
  jobs: JobResult[] | null;
  now: number;
}

export function levelFor(score: number): RiskLevel {
  return (RISK_LEVELS.find(l => score <= l.max) ?? RISK_LEVELS[RISK_LEVELS.length - 1]).level;
}

/** Fungsi murni. Mengembalikan null bila semua sumber data kosong atau belum ada. */
export function calcRiskScore({ findings, incidents, jobs, now }: RiskInput): RiskResult | null {
  const hasData = (findings?.length ?? 0) + (incidents?.length ?? 0) + (jobs?.length ?? 0) > 0;
  if (!hasData) return null;

  const activeFindings = (findings ?? []).filter(f => f.status === 'open' || f.status === 'triaged');
  const fCount = (c: Finding['confidence']) => activeFindings.filter(f => f.confidence === c).length;
  const iCount = (s: Incident['status']) => (incidents ?? []).filter(i => i.status === s).length;
  const failed24h = (jobs ?? []).filter(j => {
    const t = parseApiDate(j.completed_at ?? j.created_at);
    return j.status === 'failed' && t !== null && now - t <= DAY;
  }).length;

  const W = RISK_WEIGHTS;
  const raw: RiskFactor[] = [
    { id: 'f-high', label: 'Finding aktif, confidence tinggi', count: fCount('high'), points: fCount('high') * W.findingHigh },
    { id: 'f-medium', label: 'Finding aktif, confidence sedang', count: fCount('medium'), points: fCount('medium') * W.findingMedium },
    { id: 'f-low', label: 'Finding aktif, confidence rendah', count: fCount('low'), points: fCount('low') * W.findingLow },
    { id: 'i-open', label: 'Insiden terbuka', count: iCount('open'), points: iCount('open') * W.incidentOpen },
    { id: 'i-progress', label: 'Insiden sedang ditangani', count: iCount('in_progress'), points: iCount('in_progress') * W.incidentInProgress },
    { id: 'i-contained', label: 'Insiden terkendali', count: iCount('contained'), points: iCount('contained') * W.incidentContained },
    { id: 'j-failed', label: 'Job gagal (24 jam)', count: failed24h, points: Math.min(failed24h * W.jobFailed24h, W.jobFailedCap) },
  ];
  const factors = raw.filter(f => f.count > 0).sort((a, b) => b.points - a.points);
  const score = Math.min(100, Math.round(factors.reduce((s, f) => s + f.points, 0)));
  return { score, level: levelFor(score), factors };
}
