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
      l.client_ip?.includes(q) || l.event_type?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) || l.isp?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const uniqueIps = new Set(logs.map(l => l.client_ip)).size;
  const uniqueCities = new Set(logs.map(l => l.city).filter(Boolean)).size;

  const columns: Column<LogData>[] = [
    { key: 'time', header: 'Waktu', sortable: true, render: l => (
      <span className="text-xs font-mono text-[var(--gc-text-secondary)] whitespace-nowrap">{l.access_time}</span>
    )},
    { key: 'event', header: 'Event', sortable: true, render: l => (
      <Badge variant="primary" dot>
        {l.event_type}
      </Badge>
    )},
    { key: 'ip', header: 'IP Address', sortable: true, render: l => (
      <span className="font-mono text-xs font-medium bg-[var(--gc-surface)] px-2 py-1 rounded-[var(--gc-radius)]">{l.client_ip}</span>
    )},
    { key: 'detail', header: 'Detail', render: l => (
      <div className="flex items-center gap-2">
        <span className="text-xs">{l.city || 'Unknown'}</span>
        {l.isp && <span className="text-[10.5px] text-[var(--gc-text-secondary)]">• {l.isp}</span>}
      </div>
    )},
  ];

  return (
    <PageLayout title="Blue Team" subtitle="Security Operations Center — Live telemetry monitoring">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <StatCard label="Total Logs" value={logs.length}
          icon={<StatusIndicator status="online" pulse label="Live" />} />
        <StatCard label="Unique IPs" value={uniqueIps}
          icon={<Badge variant="success">Tracked</Badge>} />
        <StatCard label="Unique Cities" value={uniqueCities}
          icon={<StatusIndicator status="online" pulse label="Geo" />} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')}
          placeholder="Cari IP, Kota, ISP, Event..." />
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
