import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { ChartCard, Badge } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { useNow } from '../../hooks/useNow';
import { platform } from '../../platform/usePlatform';
import { BASELINE_THRESHOLDS as T, MANUAL_STORAGE_KEY, evaluateBaseline, type ControlStatus } from '../../lib/baseline';
import { RingGauge } from './RingGauge';
import { InfoNote } from './InfoNote';
import '../../styles/live.css';

function loadManual(): Set<string> {
  const raw = platform.storage.getItem(MANUAL_STORAGE_KEY);
  if (!raw) return new Set();
  try {
    const p = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

const STATUS_ICON: Record<ControlStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'var(--gc-success)', label: 'Lulus' },
  fail: { icon: XCircle, color: 'var(--gc-critical)', label: 'Belum terpenuhi' },
  unknown: { icon: HelpCircle, color: 'var(--gc-text-secondary)', label: 'Belum diketahui' },
};

export function ComplianceBaseline({ className = '' }: { className?: string }) {
  const { assets, jobs, findings, incidents, audit, integrations, errors } = useLiveData();
  const now = useNow(60_000);
  const [manual, setManual] = useState<Set<string>>(loadManual);
  const [saveFailed, setSaveFailed] = useState(false);

  const result = useMemo(
    () =>
      evaluateBaseline(
        {
          assets, jobs: jobs?.items ?? null, jobsTotal: jobs?.total ?? null, findings: findings?.items ?? null,
          incidents: incidents?.items ?? null, audit, integrations, now,
        },
        manual,
      ),
    [assets, jobs, findings, incidents, audit, integrations, now, manual],
  );

  const toggleManual = (id: string) => {
    const next = new Set(manual);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setManual(next);
    const json = JSON.stringify(Array.from(next));
    platform.storage.setItem(MANUAL_STORAGE_KEY, json);
    setSaveFailed(platform.storage.getItem(MANUAL_STORAGE_KEY) !== json);
  };

  const noneLoaded = !assets && !jobs && !findings && !incidents && !audit && !integrations;
  const firstError = Object.values(errors)[0];
  const score = result.score;
  const ringColor = score === null ? 'var(--gc-text-secondary)' : score >= 80 ? 'var(--gc-success)' : score >= 50 ? 'var(--gc-warning)' : 'var(--gc-critical)';

  return (
    <ChartCard
      title="GARDA Security Baseline"
      subtitle="Penilaian mandiri berdasarkan data GARDA. Bukan sertifikasi."
      className={className}
      loading={noneLoaded && !firstError}
      error={noneLoaded ? firstError : null}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-5">
          <RingGauge
            value={score ?? 0}
            color={ringColor}
            size={104}
            stroke={9}
            label={score === null ? '—' : `${score}%`}
            ariaLabel={score === null ? 'Skor baseline belum tersedia' : `Skor baseline ${score} persen`}
          />
          <dl className="space-y-1 text-xs">
            <div className="flex gap-2"><dt className="w-28 text-[var(--gc-text-secondary)]">Lulus</dt><dd className="font-medium text-[var(--gc-text)]">{result.pass}</dd></div>
            <div className="flex gap-2"><dt className="w-28 text-[var(--gc-text-secondary)]">Belum terpenuhi</dt><dd className="font-medium text-[var(--gc-text)]">{result.fail}</dd></div>
            <div className="flex gap-2"><dt className="w-28 text-[var(--gc-text-secondary)]">Belum diketahui</dt><dd className="font-medium text-[var(--gc-text)]">{result.unknown}</dd></div>
          </dl>
        </div>

        <InfoNote>
          <p>Skor = lulus / (lulus + belum terpenuhi). Kontrol "belum diketahui" (data belum cukup) tidak dihitung. Kontrol manual yang belum dicentang dihitung belum terpenuhi.</p>
          <p className="mt-1.5">Ambang: cakupan scan ≥ {Math.round(T.scanCoverageMin * 100)}%, finding tinggi terbuka ≤ {T.findingMaxAgeDays} hari, insiden aktif ≤ {T.incidentSlaHours} jam, audit log dalam {T.auditMaxAgeDays} hari, job gagal ≤ {Math.round(T.jobFailureMax * 100)}% (7 hari). Label "Ref" hanya rujukan, bukan klaim kepatuhan.</p>
        </InfoNote>

        <ul className="max-h-[300px] space-y-1 overflow-y-auto">
          {result.items.map(({ control, status, detail }) => {
            const s = STATUS_ICON[status];
            const Icon = s.icon;
            const isManual = control.type === 'manual';
            const row = (
              <>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.color }} aria-label={s.label} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--gc-text)]">{control.name}</p>
                  <p className="text-[11px] text-[var(--gc-text-secondary)]">{detail}{control.ref ? ` · ${control.ref}` : ''}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{control.category}</Badge>
                    <Badge variant={isManual ? 'warning' : 'info'}>{isManual ? 'Diisi manual' : 'Auto'}</Badge>
                  </div>
                </div>
              </>
            );
            return (
              <li key={control.id}>
                {isManual ? (
                  <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-gc px-2 py-2 hover:bg-[var(--gc-surface)]">
                    <input type="checkbox" checked={manual.has(control.id)} onChange={() => toggleManual(control.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--gc-primary)]" />
                    {row}
                  </label>
                ) : (
                  <div className="flex min-h-touch items-start gap-3 rounded-gc px-2 py-2">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
        {saveFailed && <p className="text-[11px] text-[var(--gc-warning)]">Pilihan manual gagal disimpan di browser ini.</p>}
        <p className="text-[11px] text-[var(--gc-text-secondary)]">Pilihan manual tersimpan di browser ini.</p>
      </div>
    </ChartCard>
  );
}
