/**
 * Geolokasi target job untuk globe.
 *
 * PERHATIAN PRIVASI: host target dikirim ke layanan pihak ketiga:
 *  - domain  -> Cloudflare DNS-over-HTTPS (cloudflare-dns.com) untuk resolve IP
 *  - IP      -> ipwho.is untuk koordinat perkiraan
 * Alamat privat/loopback/lokal TIDAK pernah dikirim.
 *
 * Fungsi geolocate() sengaja dipisah supaya mudah diganti dengan endpoint backend
 * sendiri nanti. Matikan total dengan VITE_GEOLOCATE=off di .env frontend.
 *
 * Keterbatasan: lokasi hanyalah perkiraan. Target di belakang CDN (Cloudflare,
 * Akamai, dst.) akan muncul sebagai lokasi CDN, bukan server asli.
 */
export interface GeoResult {
  lat: number;
  lng: number;
  place: string;
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function isIPv4(h: string): boolean {
  return IPV4.test(h);
}
export function isIPv6(h: string): boolean {
  return h.includes(':') && IPV6.test(h);
}

/** Ambil host dari identifier aset (URL, domain, IP, host:port, atau CIDR). */
export function extractHost(identifier: string | null | undefined): string | null {
  if (!identifier) return null;
  let s = identifier.trim();
  if (!s) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    try {
      s = new URL(s).hostname;
    } catch {
      return null;
    }
  } else {
    s = s.split('/')[0]; // buang path atau mask CIDR
    const m = /^(.+):(\d{1,5})$/.exec(s);
    if (m && !m[1].includes(':')) s = m[1]; // buang port (bukan IPv6)
  }
  s = s.toLowerCase().replace(/^\*\./, '').replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (isIPv4(s) || isIPv6(s) || DOMAIN.test(s)) return s;
  return null;
}

export function isPrivateOrLocal(host: string): boolean {
  if (isIPv4(host)) {
    const [a, b] = host.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (isIPv6(host)) {
    const h = host.toLowerCase();
    return h === '::1' || h === '::' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80');
  }
  return host === 'localhost' || /\.(local|internal|lan|localhost|home|corp)$/.test(host);
}

const ENABLED = import.meta.env.VITE_GEOLOCATE !== 'off';
const TTL_MISS_MS = 120_000;
const cache = new Map<string, { value: GeoResult | null; at: number }>();
const inflight = new Map<string, Promise<GeoResult | null>>();

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveIp(host: string): Promise<string | null> {
  if (isIPv4(host) || isIPv6(host)) return host;
  const dns = await fetchJson<{ Answer?: { type: number; data: string }[] }>(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
    { headers: { accept: 'application/dns-json' } },
  );
  return dns.Answer?.find(a => a.type === 1 && isIPv4(a.data))?.data ?? null;
}

async function lookup(host: string): Promise<GeoResult | null> {
  if (!ENABLED || isPrivateOrLocal(host)) return null;
  try {
    const ip = await resolveIp(host);
    if (!ip || isPrivateOrLocal(ip)) return null;
    const geo = await fetchJson<{
      success?: boolean; latitude?: number; longitude?: number; city?: string; country?: string;
    }>(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,latitude,longitude,city,country`);
    if (!geo.success || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') return null;
    const place = [geo.city, geo.country].filter(Boolean).join(', ');
    return { lat: geo.latitude, lng: geo.longitude, place };
  } catch {
    return null;
  }
}

export function geolocate(host: string): Promise<GeoResult | null> {
  const hit = cache.get(host);
  if (hit && (hit.value || Date.now() - hit.at < TTL_MISS_MS)) return Promise.resolve(hit.value);
  const pending = inflight.get(host);
  if (pending) return pending;
  const p = lookup(host).then(value => {
    cache.set(host, { value, at: Date.now() });
    inflight.delete(host);
    return value;
  });
  inflight.set(host, p);
  return p;
}
