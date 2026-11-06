import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveData } from './useLiveStore';
import { extractHost, geolocate, type GeoResult } from '../lib/geolocate';
import { parseApiDate } from '../lib/time';

/**
 * Target job aktif untuk globe.
 *
 * Catatan field: JobResult TIDAK punya field "target". Host diambil dari
 * Asset.identifier lewat job.asset_id. Job aktif = status "queued" atau "running".
 * Job yang baru selesai tetap ditampilkan LINGER_MS agar job cepat terlihat.
 *
 * Privasi: host dikirim ke layanan pihak ketiga untuk geolokasi (lihat
 * lib/geolocate.ts). geolocate() mudah diganti endpoint backend nanti.
 */
const ACTIVE = new Set(['queued', 'running']);
const LINGER_MS = 10_000;

export interface LiveTarget {
  jobId: string;
  host: string;
  lat: number;
  lng: number;
  place: string;
  since: number;
  ended: boolean;
}

interface Known {
  host: string;
  since: number;
  endedAt: number | null;
}

export interface LiveTargetsState {
  targets: LiveTarget[];
  /** Jumlah job aktif saat ini (termasuk yang belum punya lokasi). */
  activeCount: number;
  /** Target yang sedang tampil tapi lokasinya tidak ketemu atau tidak diizinkan. */
  unlocated: number;
  backendDown: boolean;
}

export function useLiveTargets(): LiveTargetsState {
  const { jobs, assets, errors } = useLiveData();
  const backendDown = Boolean(errors.jobs);
  const [geo, setGeo] = useState<Record<string, GeoResult | null>>({});
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState<{ jobId: string; host: string; since: number; ended: boolean }[]>([]);
  const known = useRef(new Map<string, Known>());

  const activeCount = useMemo(
    () => (backendDown ? 0 : (jobs?.items ?? []).filter(j => ACTIVE.has(j.status)).length),
    [jobs, backendDown],
  );

  useEffect(() => {
    const now = Date.now();
    const map = known.current;

    if (backendDown) {
      map.clear(); // backend mati: daftar kosong
      setVisible([]);
      return;
    }

    const hostByAsset = new Map<string, string | null>();
    (assets ?? []).forEach(a => hostByAsset.set(a.id, extractHost(a.identifier)));

    const activeIds = new Set<string>();
    (jobs?.items ?? []).forEach(j => {
      if (!ACTIVE.has(j.status)) return;
      const host = hostByAsset.get(j.asset_id);
      if (!host) return; // tanpa host valid -> tidak digambar
      activeIds.add(j.id);
      const prev = map.get(j.id);
      map.set(j.id, {
        host,
        since: prev?.since ?? parseApiDate(j.started_at ?? j.created_at) ?? now,
        endedAt: null,
      });
    });

    let nextExpiry: number | null = null;
    map.forEach((v, id) => {
      if (activeIds.has(id)) return;
      if (v.endedAt === null) v.endedAt = now;
      const remaining = LINGER_MS - (now - v.endedAt);
      if (remaining <= 0) map.delete(id);
      else nextExpiry = nextExpiry === null ? remaining : Math.min(nextExpiry, remaining);
    });

    setVisible(Array.from(map, ([jobId, v]) => ({ jobId, host: v.host, since: v.since, ended: v.endedAt !== null })));

    if (nextExpiry === null) return;
    const timer = setTimeout(() => setTick(t => t + 1), nextExpiry + 50);
    return () => clearTimeout(timer);
  }, [jobs, assets, backendDown, tick]);

  // Geolokasi host baru (di-cache di lib/geolocate)
  useEffect(() => {
    let cancelled = false;
    const missing = Array.from(new Set(visible.map(v => v.host))).filter(h => !(h in geo));
    missing.forEach(host => {
      void geolocate(host).then(res => {
        if (!cancelled) setGeo(prev => (host in prev ? prev : { ...prev, [host]: res }));
      });
    });
    return () => { cancelled = true; };
  }, [visible, geo]);

  const targets = useMemo<LiveTarget[]>(
    () =>
      visible
        .flatMap(v => {
          const g = geo[v.host];
          return g ? [{ jobId: v.jobId, host: v.host, lat: g.lat, lng: g.lng, place: g.place, since: v.since, ended: v.ended }] : [];
        })
        .sort((a, b) => b.since - a.since),
    [visible, geo],
  );

  const unlocated = visible.filter(v => v.host in geo && geo[v.host] === null).length;

  return { targets, activeCount, unlocated, backendDown };
}
