import { useMemo } from 'react';
import { ChartCard } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { useNow } from '../../hooks/useNow';
import { calcRiskScore, RISK_WEIGHTS as W, type RiskLevel } from '../../lib/risk';
import { RingGauge } from './RingGauge';
import { InfoNote } from './InfoNote';
import '../../styles/live.css';

const LEVEL_STYLE: Record<RiskLevel, { color: string; chip: string; label: string }> = {
  LOW: { color: 'var(--gc-success)', chip: 'bg-[var(--gc-success)]/15 text-[var(--gc-success)]', label: 'LOW' },
  MEDIUM: { color: 'var(--gc-warning)', chip: 'bg-[var(--gc-warning)]/15 text-[var(--gc-warning)]', label: 'MEDIUM' },
  HIGH: { color: 'var(--gc-orange)', chip: 'bg-[var(--gc-orange)]/15 text-[var(--gc-orange)]', label: 'HIGH' },
  CRITICAL: { color: 'var(--gc-critical)', chip: 'bg-[var(--gc-critical)]/15 text-[var(--gc-critical)]', label: 'CRITICAL' },
};

export function ThreatLevel({ className = '' }: { className?: string }) {
  const { findings, incidents, jobs, errors } = useLiveData();
  const now = useNow(60_000);

  const result = useMemo(
    () => calcRiskScore({ findings: findings?.items ?? null, incidents: incidents?.items ?? null, jobs: jobs?.items ?? null, now }),
    [findings, incidents, jobs, now],
  );

  const noneLoaded = !findings && !incidents && !jobs;
  const firstError = errors.findings ?? errors.incidents ?? errors.jobs;
  const truncated = (findings?.total ?? 0) > (findings?.items.length ?? 0);

  return (
    <ChartCard
      title="Tingkat Risiko"
      subtitle="Skor turunan dari data GARDA saat ini"
      className={className}
      loading={noneLoaded && !firstError}
      error={noneLoaded ? firstError : null}
      empty={!noneLoaded && result === null}
      emptyMessage="Belum ada data."
    >
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <RingGauge
              value={result.score}
              color={LEVEL_STYLE[result.level].color}
              ariaLabel={`Skor risiko ${result.score} dari 100, level ${result.level}`}
              sub="dari 100"
            />
            <div className="min-w-0">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEVEL_STYLE[result.level].chip}`}>
                {LEVEL_STYLE[result.level].label}
              </span>
              <p className="mt-2 text-xs text-[var(--gc-text-secondary)]">
                {result.factors.length === 0 ? 'Tidak ada faktor risiko aktif.' : 'Tiga faktor penyumbang terbesar:'}
              </p>
            </div>
          </div>

          {result.factors.length > 0 && (
            <ul className="space-y-2.5">
              {result.factors.slice(0, 3).map(f => (
                <li key={f.id}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-[var(--gc-text)]">{f.label} ({f.count})</span>
                    <span className="shrink-0 text-[var(--gc-text-secondary)]">+{f.points}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--gc-surface)]">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (f.points / Math.max(result.score, 1)) * 100)}%`, background: LEVEL_STYLE[result.level].color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {truncated && (
            <p className="text-[11px] text-[var(--gc-text-secondary)]">
              Dihitung dari {findings?.items.length} finding terbaru dari total {findings?.total}.
            </p>
          )}

          <InfoNote>
            <p>Skor = min(100, jumlah poin faktor). Ini angka turunan di frontend, bukan penilaian resmi.</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              <li>Finding aktif (open/triaged): tinggi {W.findingHigh}, sedang {W.findingMedium}, rendah {W.findingLow} poin per item</li>
              <li>Insiden: open {W.incidentOpen}, in progress {W.incidentInProgress}, contained {W.incidentContained} poin per item</li>
              <li>Job gagal 24 jam: {W.jobFailed24h} poin per job, maksimal {W.jobFailedCap}</li>
              <li>Level: 0-24 LOW, 25-49 MEDIUM, 50-74 HIGH, 75-100 CRITICAL</li>
            </ul>
          </InfoNote>
        </div>
      )}
    </ChartCard>
  );
}
