import { useEffect, useState, useMemo } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { StatCard, Badge, SearchInput, DataTable, ErrorState, StatusIndicator, type Column } from '../components/ui';

interface LogData {
  id: number;
  event_type: string;
  client_ip: string;
  city: string;
  isp: string;
  access_time: string;
}

/** "GET /api/v1/assets 200" -> 200 */
function statusOf(eventType: string): number {
  const m = /\s(\d{3})$/.exec(eventType || '');
  return m ? Number(m[1]) : 0;
}

/** "GET /api/v1/assets 200" -> "/api/v1/assets" */
function pathOf(eventType: string): string {
  const parts = (eventType || '').split(' ');
  return parts.length >= 2 ? parts.slice(1, parts.length - 1).join(' ') || '/?': '/?';
}

/** "GET /api/v1/assets 200" -> "GET" */
function methodOf(eventType: string): string {
  return (eventType || '').split(' ')[0] || '—';
}

export default function BlueTeam() {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = () => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      // Blue Team uses /api/v1/logs which is defined directly on the app, not the v1 router
      const logsUrl = baseUrl.replace('/api/v1', '') + '/api/v1/logs';
      fetch(logsUrl)
        .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
        .then(data => { setLogs(data); setError(null); })
        .catch(() => setError('Backend tidak terjangkau. Jalankan server FastAPI.'));
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      l.client_ip?.includes(q) || l.event_type?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const uniqueIps = new Set(logs.map(l => l.client_ip)).size;
  const jumlahGalat = logs.filter(l => statusOf(l.event_type) >= 400).length;

  const columns: Column<LogData>[] = [
    { key: 'time', header: 'Waktu', sortable: true, render: l => (
      <span className="text-xs font-mono text-[var(--gc-text-secondary)] whitespace-nowrap">{l.access_time}</span>
    )},
    { key: 'event', header: 'Permintaan', sortable: true, render: l => {
      const s = statusOf(l.event_type);
      const variant = s >= 500 ? 'critical' : s >= 400 ? 'warning' : s >= 200 ? 'success' : 'default';
      return (
        <span className="flex items-center gap-2">
          <Badge variant={variant} dot>{s || '—'}</Badge>
          <span className="font-mono text-xs text-[var(--gc-text)]">{pathOf(l.event_type)}</span>
        </span>
      );
    }},
    { key: 'ip', header: 'IP Address', sortable: true, render: l => (
      <span className="font-mono text-xs font-medium bg-[var(--gc-surface)] px-2 py-1 rounded-[var(--gc-radius)]">{l.client_ip}</span>
    )},
    { key: 'detail', header: 'Metode', render: l => (
      <span className="font-mono text-xs text-[var(--gc-text-secondary)]">{methodOf(l.event_type)}</span>
    )},
  ];

  return (
    <PageLayout title="Blue Team" subtitle="Security Operations Center — Live telemetry monitoring">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <StatCard label="Total Log" value={logs.length}
          icon={<StatusIndicator status="online" pulse label="Live" />} />
        <StatCard label="IP Unik" value={uniqueIps}
          icon={<Badge variant="info">Terpantau</Badge>} />
        <StatCard label="Respons 4xx/5xx" value={jumlahGalat}
          icon={<Badge variant={jumlahGalat > 0 ? 'warning' : 'success'}>Galat</Badge>} />
      </div>

      <p className="mb-4 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--gc-text-secondary)]">
        Log akses API: metode, path, kode status, IP, dan waktu. Tidak ada isi request,
        cookie, header otorisasi, email, atau password yang dicatat.
      </p>

      {/* Search */}
      <div className="mb-4">
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')}
          placeholder="Cari IP, path, atau kode status..." />
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      {!error && (
        <>
          <DataTable columns={columns} data={filtered} keyExtractor={l => String(l.id)}
            emptyTitle="Tidak ada security log" emptyDescription="Log akan muncul ketika ada aktivitas yang terdeteksi." />
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--gc-text-secondary)]">
            <StatusIndicator status="online" pulse label="Live Monitoring Active" />
            <span>Menampilkan {filtered.length} dari {logs.length} log</span>
          </div>
        </>
      )}
    </PageLayout>
  );
}
