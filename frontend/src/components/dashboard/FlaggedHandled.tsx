import { useMemo } from 'react';
import { Flag, CheckCheck } from 'lucide-react';
import { ChartCard, StatCard } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { useNow } from '../../hooks/useNow';
import { DAY, parseApiDate } from '../../lib/time';
import { InfoNote } from './InfoNote';
import type { Finding } from '../../types';
import '../../styles/live.css';

/** Ambang "ditandai": confidence finding yang dianggap tinggi. Ubah di sini. */
const FLAG_CONFIDENCE: readonly Finding['confidence'][] = ['high'];

export function FlaggedHandled({ className = '' }: { className?: string }) {
  const { findings, incidents, jobs, errors } = useLiveData();
  const now = useNow(60_000);

  const flagged = useMemo(
    () => (findings?.items ?? []).filter(f => (f.status === 'open' || f.status === 'triaged') && FLAG_CONFIDENCE.includes(f.confidence)).length,
    [findings],
  );
  const closed24 = useMemo(
    () => (incidents?.items ?? []).filter(i => {
      const t = parseApiDate(i.updated_at);
      return i.status === 'closed' && t !== null && now - t <= DAY;
    }).length,
    [incidents, now],
  );
  const cancelled24 = useMemo(
    () => (jobs?.items ?? []).filter(j => {
      const t = parseApiDate(j.completed_at ?? j.started_at ?? j.created_at);
      return j.status === 'cancelled' && t !== null && now - t <= DAY;
    }).length,
    [jobs, now],
  );

  const noneLoaded = !findings && !incidents && !jobs;
  const firstError = errors.findings ?? errors.incidents ?? errors.jobs;

  return (
    <ChartCard
      title="Ditandai dan Ditangani"
      subtitle="Ringkasan perhatian dan penanganan"
      className={className}
      loading={noneLoaded && !firstError}
      error={noneLoaded ? firstError : null}
    >
      <div className="space-y-3">
        <StatCard
          label="Ditandai"
          value={flagged}
          subtitle={flagged === 0 ? 'Tidak ada finding prioritas tinggi yang aktif' : 'Finding aktif confidence tinggi'}
          icon={<Flag className="h-5 w-5 text-[var(--gc-warning)]" />}
        />
        <StatCard
          label="Ditangani 24j"
          value={closed24 + cancelled24}
          subtitle={`Insiden selesai: ${closed24} · Job dibatalkan: ${cancelled24}`}
          icon={<CheckCheck className="h-5 w-5 text-[var(--gc-success)]" />}
        />
        <InfoNote>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>Ditandai: finding berstatus open/triaged dengan confidence {FLAG_CONFIDENCE.join('/')}. Data tidak menyimpan relasi finding ke insiden, jadi tidak disaring berdasarkan insiden.</li>
            <li>Ditangani 24j: insiden berstatus closed yang diperbarui dalam 24 jam, ditambah job berstatus cancelled dalam 24 jam.</li>
            <li>GARDA tidak memblokir lalu lintas, jadi tidak ada angka pemblokiran.</li>
          </ul>
        </InfoNote>
      </div>
    </ChartCard>
  );
}
