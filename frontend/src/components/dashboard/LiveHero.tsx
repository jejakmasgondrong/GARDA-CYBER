import { lazy, Suspense, useMemo, useState } from 'react';
import { ChartCard, Skeleton } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { useLiveTargets } from '../../hooks/useLiveTargets';
import { platform } from '../../platform/usePlatform';
import { ThreatLevel } from './ThreatLevel';
import '../../styles/live.css';

// three.js berat: globe dan topologi dimuat hanya saat dibutuhkan, satu per satu
const LiveGlobe = lazy(() => import('./LiveGlobe'));
const LiveTopology = lazy(() => import('./LiveTopology'));

type View = 'globe' | 'topology';
const VIEW_KEY = 'gc.live.view';

export function LiveHero() {
  const live = useLiveTargets();
  const { assets, jobs, errors } = useLiveData();
  const [view, setView] = useState<View>(() => (platform.storage.getItem(VIEW_KEY) === 'topology' ? 'topology' : 'globe'));

  const choose = (v: View) => {
    setView(v);
    platform.storage.setItem(VIEW_KEY, v);
  };

  const activeAssetIds = useMemo(
    () => new Set((errors.jobs ? [] : jobs?.items ?? []).filter(j => j.status === 'queued' || j.status === 'running').map(j => j.asset_id)),
    [jobs, errors.jobs],
  );

  const toggle = (
    <div className="inline-flex rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] p-0.5" role="tablist" aria-label="Tampilan">
      {([['globe', 'Globe'], ['topology', 'Topologi']] as const).map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={view === id}
          onClick={() => choose(id)}
          className={`min-h-touch rounded-gc px-3 text-xs font-medium transition-colors ${
            view === id ? 'bg-[var(--gc-card)] text-[var(--gc-primary)]' : 'text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const fallback = <Skeleton className="h-[220px] w-full sm:h-[340px]" />;

  return (
    <div className="gc-live mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard
        className="lg:col-span-2"
        title={view === 'globe' ? 'Target Aktif' : 'Topologi Aset'}
        subtitle={view === 'globe' ? 'Lokasi perkiraan target job yang sedang berjalan' : 'Aset terdaftar dan target job aktif'}
        actions={toggle}
        loading={view === 'topology' && !assets && !errors.assets}
        error={view === 'topology' && !assets ? errors.assets : null}
      >
        <Suspense fallback={fallback}>
          {view === 'globe' ? (
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="min-w-0 flex-1">
                <LiveGlobe targets={live.targets} activeCount={live.activeCount} unlocated={live.unlocated} backendDown={live.backendDown} />
              </div>
              <TargetRail live={live} />
            </div>
          ) : (
            <LiveTopology assets={assets ?? []} activeAssetIds={activeAssetIds} />
          )}
        </Suspense>
      </ChartCard>
      <ThreatLevel className="lg:col-span-1" />
    </div>
  );
}

/**
 * Kolom keterangan di samping globe.
 *
 * Globe itu bola (persegi), jadi di panel lebar selalu ada ruang kosong kiri-kanan.
 * Ruang itu dipakai untuk angka yang memang sudah dihitung: jumlah target aktif,
 * target tanpa lokasi, dan status backend. Tanpa data tetap jujur ("tidak ada job").
 */
function TargetRail({ live }: { live: ReturnType<typeof useLiveTargets> }) {
  const dot = (ended: boolean) => (ended ? 'var(--gc-text-secondary)' : 'var(--gc-primary)');
  const shown = live.targets.slice(0, 6);

  return (
    <aside className="flex shrink-0 flex-col gap-3 lg:w-52" aria-label="Ringkasan target job">
      <div className="rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-[var(--gc-text-secondary)]">Job berjalan</p>
        <p className="text-xl font-semibold text-[var(--gc-text)]">{live.activeCount}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <div className="rounded-gc border border-[var(--gc-border)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--gc-text-secondary)]">Tanpa lokasi</p>
          <p className="text-sm font-semibold text-[var(--gc-text)]">{live.unlocated}</p>
        </div>
        <div className="rounded-gc border border-[var(--gc-border)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--gc-text-secondary)]">Backend</p>
          <p className={`text-sm font-semibold ${live.backendDown ? 'text-[var(--gc-warning)]' : 'text-[var(--gc-success)]'}`}>
            {live.backendDown ? 'Terputus' : 'Tersambung'}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--gc-text-secondary)]">Daftar target</p>
        {shown.length === 0 ? (
          <p className="rounded-gc border border-dashed border-[var(--gc-border)] px-3 py-3 text-[11px] leading-relaxed text-[var(--gc-text-secondary)]">
            Belum ada job berjalan.
          </p>
        ) : (
          <ul className="space-y-1">
            {shown.map(t => (
              <li key={t.jobId} className="flex items-center gap-2 text-[11px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot(t.ended) }} aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono text-[var(--gc-text)]">{t.host}</span>
                <span className="shrink-0 text-[10px] text-[var(--gc-text-secondary)]">{t.place}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-[var(--gc-border)] pt-2 text-[10px] leading-relaxed text-[var(--gc-text-secondary)]">
        Satu titik = satu target job aktif. Titik abu-abu = job baru selesai.
      </p>
    </aside>
  );
}
