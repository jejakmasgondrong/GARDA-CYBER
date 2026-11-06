/**
 * Parse tanggal dari API. FastAPI sering mengirim datetime tanpa zona waktu
 * (mis. "2026-11-03T08:14:00.123"). JS akan menganggapnya waktu lokal, padahal
 * umumnya itu UTC. Asumsi: string tanpa zona = UTC.
 */
export function parseApiDate(value: string | null | undefined): number | null {
  if (!value) return null;
  let s = value.trim().replace(' ', 'T');
  const hasTime = /T\d{2}:\d{2}/.test(s);
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (hasTime && !hasZone) s += 'Z';
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function formatRelative(ts: number | null, now: number): string {
  if (ts === null) return '—';
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 45) return 'baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${Math.max(1, min)} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} j lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

export function formatDuration(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 1) return 'kurang dari 1 mnt';
  if (min < 60) return `${min} mnt`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} j ${min % 60} mnt`;
  return `${Math.floor(hr / 24)} hari ${hr % 24} j`;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
