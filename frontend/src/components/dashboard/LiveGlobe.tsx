import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import countriesUrl from 'world-atlas/countries-110m.json?url';
import { ErrorState } from '../ui';
import { mixHex, usePrefersReducedMotion, useThemeTokens } from '../../hooks/useThemeTokens';
import type { LiveTarget } from '../../hooks/useLiveTargets';

/** Lokasi basis (SOC). Ubah di sini bila berpindah. */
export const HOME = { lat: -7.8, lng: 110.4 };
const HEIGHT = 340;

interface LiveGlobeProps {
  targets: LiveTarget[];
  activeCount: number;
  unlocated: number;
  backendDown: boolean;
}

type CountryFeature = { id?: string | number };

function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <ErrorState message="Globe tidak dapat ditampilkan di browser ini. Gunakan tampilan Topologi." />;
    return this.props.children;
  }
}

function GlobeInner({ targets, activeCount, unlocated, backendDown }: LiveGlobeProps) {
  const t = useThemeTokens();
  const reduced = usePrefersReducedMotion();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [ready, setReady] = useState(false);
  const [countries, setCountries] = useState<CountryFeature[]>([]);

  // Peta daratan dari paket lokal (tanpa CDN)
  useEffect(() => {
    let cancelled = false;
    fetch(countriesUrl)
      .then(r => r.json())
      .then((topo: unknown) => {
        const fc = feature(
          topo as Parameters<typeof feature>[0],
          (topo as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries,
        ) as unknown as { features: CountryFeature[] };
        if (!cancelled) setCountries(fc.features.filter(f => String(f.id) !== '010')); // tanpa Antarctica
      })
      .catch(() => { /* peta opsional: globe tetap tampil polos */ });
    return () => { cancelled = true; };
  }, []);

  // Ikuti lebar container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth || 640);
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ocean = useMemo(() => mixHex(t.surface, t.border, t.isLight ? 0.6 : 0.35), [t]);
  const land = useMemo(() => mixHex(ocean, t.textSecondary, t.isLight ? 0.5 : 0.3), [t, ocean]);
  const coast = useMemo(() => mixHex(land, t.textSecondary, 0.25), [t, land]);

  // Permukaan globe polos (tanpa tekstur), warnanya mengikuti tema
  const globeMat = useMemo(() => new MeshPhongMaterial({ shininess: 0, specular: '#000000' }), []);
  useEffect(() => {
    globeMat.color.set(ocean);
  }, [globeMat, ocean]);

  // Kamera: idle berputar sangat pelan, ada target -> berhenti dan menghadap target terbaru
  const latest = targets[0];
  const targetKey = targets.map(x => x.jobId).join('|');
  useEffect(() => {
    const g = globeRef.current;
    if (!ready || !g) return;
    const controls = g.controls();
    controls.enableZoom = false;
    const ms = reduced ? 0 : 1200;
    if (latest) {
      controls.autoRotate = false;
      g.pointOfView({ lat: latest.lat, lng: latest.lng, altitude: 1.9 }, ms);
    } else {
      controls.autoRotate = !reduced;
      controls.autoRotateSpeed = 0.12;
      g.pointOfView({ lat: HOME.lat, lng: HOME.lng, altitude: 2.4 }, ms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, targetKey, reduced]);

  const points = useMemo(
    () => [
      { lat: HOME.lat, lng: HOME.lng, color: t.teal, r: 0.45 },
      ...targets.map(x => ({ lat: x.lat, lng: x.lng, color: t.primary, r: 0.4 })),
    ],
    [targets, t],
  );

  const arcs = useMemo(
    () => targets.slice(0, 5).map(x => ({ startLat: HOME.lat, startLng: HOME.lng, endLat: x.lat, endLng: x.lng })),
    [targets],
  );

  const makeLabel = (d: object) => {
    const x = d as LiveTarget;
    const el = document.createElement('div');
    el.textContent = x.host;
    Object.assign(el.style, {
      fontSize: '11px', fontFamily: 'Inter, sans-serif', padding: '2px 6px', borderRadius: '6px',
      background: t.card, color: t.text, border: `1px solid ${t.border}`, whiteSpace: 'nowrap',
      pointerEvents: 'none', transform: 'translate(-50%, -140%)',
    });
    return el;
  };

  const statusText = backendDown
    ? 'Backend tidak terjangkau'
    : activeCount > 0
      ? `Job aktif: ${activeCount}${unlocated > 0 ? ` (${unlocated} tanpa lokasi)` : ''}`
      : 'Normal';
  const dotColor = backendDown ? 'var(--gc-warning)' : activeCount > 0 ? 'var(--gc-primary)' : 'var(--gc-success)';

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-gc" style={{ height: HEIGHT }}>
      <Globe
        ref={globeRef}
        width={width}
        height={HEIGHT}
        backgroundColor="rgba(0,0,0,0)"
        onGlobeReady={() => setReady(true)}
        globeMaterial={globeMat}
        showAtmosphere
        atmosphereColor={t.primary}
        atmosphereAltitude={0.1}
        polygonsData={countries}
        polygonCapColor={() => land}
        polygonSideColor={() => 'rgba(0,0,0,0)'}
        polygonStrokeColor={() => coast}
        polygonAltitude={0.004}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="r"
        pointAltitude={0.012}
        arcsData={arcs}
        arcColor={() => t.primary}
        arcStroke={0.3}
        arcAltitudeAutoScale={0.3}
        arcDashLength={reduced ? 1 : 0.5}
        arcDashGap={reduced ? 0 : 0.25}
        arcDashAnimateTime={reduced ? 0 : 3000}
        htmlElementsData={targets}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.02}
        htmlElement={makeLabel}
      />
      <div className="pointer-events-none absolute left-1 top-1 flex items-center gap-2 text-xs text-[var(--gc-text-secondary)]">
        <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} aria-hidden="true" />
        <span>{statusText}</span>
      </div>
      {activeCount > 0 && targets.length === 0 && !backendDown && (
        <p className="pointer-events-none absolute bottom-1 left-1 text-[11px] text-[var(--gc-text-secondary)]">
          Mencari lokasi target…
        </p>
      )}
    </div>
  );
}

export default function LiveGlobe(props: LiveGlobeProps) {
  const [supported] = useState(webglSupported);
  if (!supported) return <ErrorState message="WebGL tidak tersedia di browser ini. Gunakan tampilan Topologi." />;
  return (
    <GlobeBoundary>
      <GlobeInner {...props} />
    </GlobeBoundary>
  );
}
