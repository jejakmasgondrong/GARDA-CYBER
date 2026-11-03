import { useSyncExternalStore } from 'react';
import { apiClient, ApiError } from '../lib/apiClient';
import type {
  Asset, AuditLogEntry, FindingListResponse, IncidentListResponse,
  IntegrationStatus, JobListResponse,
} from '../types';

/**
 * Store polling bersama untuk widget live. Semua panggilan lewat apiClient,
 * endpoint yang sama dengan Dashboard. Polling hanya berjalan selama ada widget
 * yang berlangganan dan berhenti saat tab tersembunyi.
 */
export type LiveKey = 'jobs' | 'assets' | 'findings' | 'incidents' | 'audit' | 'integrations';

export interface LiveSnapshot {
  jobs: JobListResponse | null;
  assets: Asset[] | null;
  findings: FindingListResponse | null;
  incidents: IncidentListResponse | null;
  audit: AuditLogEntry[] | null;
  integrations: IntegrationStatus[] | null;
  errors: Partial<Record<LiveKey, string>>;
}

const CONFIG: Record<LiveKey, { path: string; every: number }> = {
  jobs: { path: '/jobs?limit=50', every: 3_000 },
  assets: { path: '/assets', every: 15_000 },
  findings: { path: '/findings?limit=100', every: 10_000 },
  incidents: { path: '/incidents?limit=100', every: 10_000 },
  audit: { path: '/audit-logs?limit=20', every: 10_000 },
  integrations: { path: '/integrations', every: 30_000 },
};
const KEYS = Object.keys(CONFIG) as LiveKey[];

let snapshot: LiveSnapshot = {
  jobs: null, assets: null, findings: null, incidents: null, audit: null, integrations: null, errors: {},
};
const listeners = new Set<() => void>();
const timers = new Map<LiveKey, ReturnType<typeof setInterval>>();
const inflight = new Set<LiveKey>();

function setSnapshot(patch: Partial<LiveSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(l => l());
}

function isValid(key: LiveKey, data: unknown): boolean {
  if (key === 'assets' || key === 'audit' || key === 'integrations') return Array.isArray(data);
  return typeof data === 'object' && data !== null && Array.isArray((data as { items?: unknown }).items);
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return `Error ${err.status}: ${err.message.slice(0, 120)}`;
  return 'Backend tidak terjangkau. Pastikan server FastAPI berjalan.';
}

async function load(key: LiveKey): Promise<void> {
  if (inflight.has(key)) return;
  inflight.add(key);
  try {
    const data = await apiClient.get<unknown>(CONFIG[key].path);
    const errors = { ...snapshot.errors };
    if (isValid(key, data)) {
      delete errors[key];
      setSnapshot({ [key]: data, errors } as Partial<LiveSnapshot>);
    } else {
      setSnapshot({ errors: { ...errors, [key]: 'Format respons backend tidak dikenali.' } });
    }
  } catch (err) {
    setSnapshot({ errors: { ...snapshot.errors, [key]: errorMessage(err) } });
  } finally {
    inflight.delete(key);
  }
}

const onVisible = () => {
  if (!document.hidden) KEYS.forEach(k => void load(k));
};

function start() {
  KEYS.forEach(k => {
    void load(k);
    timers.set(k, setInterval(() => { if (!document.hidden) void load(k); }, CONFIG[k].every));
  });
  document.addEventListener('visibilitychange', onVisible);
}

function stop() {
  timers.forEach(t => clearInterval(t));
  timers.clear();
  document.removeEventListener('visibilitychange', onVisible);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function useLiveData(): LiveSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function refreshLive(): void {
  KEYS.forEach(k => void load(k));
}
