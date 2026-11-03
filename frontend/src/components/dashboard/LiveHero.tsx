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

  const fallback = <Skeleton className="h-[340px] w-full" />;

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
            <LiveGlobe targets={live.targets} activeCount={live.activeCount} unlocated={live.unlocated} backendDown={live.backendDown} />
          ) : (
            <LiveTopology assets={assets ?? []} activeAssetIds={activeAssetIds} />
          )}
        </Suspense>
      </ChartCard>
      <ThreatLevel className="lg:col-span-1" />
    </div>
  );
}
