import { EmptyState } from '../ui';
import type { Asset, AssetType } from '../../types';
import '../../styles/live.css';

interface LiveTopologyProps {
  assets: Asset[];
  /** id aset yang sedang dikerjakan job aktif */
  activeAssetIds: ReadonlySet<string>;
}

const W = 640;
const H = 340;
const CX = W / 2;
const CY = H / 2;
const MAX_NODES = 24;

const TYPE_COLOR: Record<AssetType, string> = {
  domain: 'var(--gc-primary)',
  ip: 'var(--gc-teal)',
  application: 'var(--gc-violet)',
  device: 'var(--gc-orange)',
  other: 'var(--gc-text-secondary)',
};
const TYPE_LABEL: Record<AssetType, string> = {
  domain: 'Domain', ip: 'IP', application: 'Aplikasi', device: 'Perangkat', other: 'Lainnya',
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function LiveTopology({ assets, activeAssetIds }: LiveTopologyProps) {
  if (assets.length === 0) {
    return <EmptyState title="Data belum tersedia" description="Data belum tersedia dari backend." />;
  }

  const shown = assets.slice(0, MAX_NODES);
  const hidden = assets.length - shown.length;
  const ring1 = shown.slice(0, 12);
  const ring2 = shown.slice(12);

  const place = (list: Asset[], rx: number, ry: number, offset: number) =>
    list.map((a, i) => {
      const ang = (2 * Math.PI * i) / list.length - Math.PI / 2 + offset;
      return { asset: a, x: CX + rx * Math.cos(ang), y: CY + ry * Math.sin(ang) };
    });
  const nodes = [...place(ring1, 175, 95, 0), ...place(ring2, 270, 140, Math.PI / Math.max(ring2.length, 1))];
  const usedTypes = Array.from(new Set(shown.map(a => a.asset_type)));

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full min-w-[420px] max-w-[760px]" role="img" aria-label="Topologi aset dan target job aktif">
          {nodes.map(({ asset, x, y }) => {
            const active = activeAssetIds.has(asset.id);
            return (
              <line
                key={`l-${asset.id}`} x1={CX} y1={CY} x2={x} y2={y}
                strokeWidth={active ? 1.5 : 1}
                style={{ stroke: active ? 'var(--gc-primary)' : 'var(--gc-border)', opacity: active ? 1 : 0.6 }}
              />
            );
          })}
          <circle cx={CX} cy={CY} r={24} style={{ fill: 'var(--gc-surface)', stroke: 'var(--gc-primary)' }} strokeWidth={1.5} />
          <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: 'var(--gc-text)' }}>GARDA</text>
          {nodes.map(({ asset, x, y }) => {
            const active = activeAssetIds.has(asset.id);
            const color = TYPE_COLOR[asset.asset_type] ?? TYPE_COLOR.other;
            return (
              <g key={asset.id} style={{ opacity: asset.status === 'inactive' ? 0.45 : 1 }}>
                <title>{`${asset.name} (${asset.identifier})${active ? ' · job aktif' : ''}`}</title>
                {active && <circle cx={x} cy={y} r={12} fill="none" strokeWidth={1.5} style={{ stroke: 'var(--gc-primary)' }} />}
                <circle cx={x} cy={y} r={7} style={{ fill: color }} />
                <text x={x} y={y + 22} textAnchor="middle" fontSize="10" style={{ fill: 'var(--gc-text-secondary)' }}>{clip(asset.name, 18)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--gc-text-secondary)]">
        {usedTypes.map(tp => (
          <span key={tp} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[tp] ?? TYPE_COLOR.other }} />
            {TYPE_LABEL[tp] ?? tp}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: 'var(--gc-primary)' }} />
          Job aktif
        </span>
        {hidden > 0 && <span>+{hidden} aset lainnya tidak ditampilkan</span>}
      </div>
    </div>
  );
}
