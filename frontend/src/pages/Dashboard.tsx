import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, Bug, AlertOctagon, ListTodo, Plug, Shield,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import { PageLayout } from '../components/layout/PageLayout';
import { StatCard, ChartCard, Badge } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type {
  Asset, FindingListResponse, IncidentListResponse, JobListResponse,
  IntegrationStatus, AuditLogEntry,
} from '../types';
import { LiveHero, LiveFeedRow, LiveBottomRow } from '../components/dashboard';

// Chart colors from design tokens
const COLORS = {
  primary: '#2685F6',
  electric: '#38BDF8',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  text: '#94A3B8',
  border: '#26364D',
  card: '#162338',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.critical,
  high: COLORS.warning,
  medium: COLORS.electric,
  low: COLORS.success,
  info: COLORS.text,
};

const STATUS_COLORS: Record<string, string> = {
  open: COLORS.warning,
  in_progress: COLORS.primary,
  contained: COLORS.electric,
  closed: COLORS.success,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [findings, setFindings] = useState<FindingListResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentListResponse | null>(null);
  const [jobs, setJobs] = useState<JobListResponse | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // KPI dan diagram ikut menyegarkan diri; sebelumnya hanya widget "live" yang
  // polling, sehingga angka di kartu diam sampai halaman di-reload.
  useEffect(() => {
    let pertama = true;
    const fetchAll = async () => {
      if (pertama) setLoading(true);
      const errs: Record<string, string> = {};

      await Promise.allSettled([
        apiClient.get<Asset[]>('/assets').then(setAssets).catch(() => { errs.assets = 'Gagal memuat aset'; }),
        apiClient.get<FindingListResponse>('/findings?limit=100').then(setFindings).catch(() => { errs.findings = 'Gagal memuat findings'; }),
        apiClient.get<IncidentListResponse>('/incidents?limit=100').then(setIncidents).catch(() => { errs.incidents = 'Gagal memuat incidents'; }),
        apiClient.get<JobListResponse>('/jobs?limit=50').then(setJobs).catch(() => { errs.jobs = 'Gagal memuat jobs'; }),
        apiClient.get<IntegrationStatus[]>('/integrations').then(setIntegrations).catch(() => { errs.integrations = 'Gagal memuat integrations'; }),
        apiClient.get<AuditLogEntry[]>('/audit-logs?limit=10').then(setAuditLogs).catch(() => { errs.auditLogs = 'Gagal memuat audit logs'; }),
      ]);

      setErrors(errs);
      setLoading(false);
      pertama = false;
    };
    void fetchAll();
    const timer = setInterval(() => {
      if (!document.hidden) void fetchAll();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Computed stats
  const totalAssets = assets.length;
  const openFindings = findings?.items.filter(f => f.status === 'open').length ?? 0;
  const totalFindings = findings?.total ?? 0;
  const openIncidents = incidents?.items.filter(i => i.status === 'open' || i.status === 'in_progress').length ?? 0;
  const runningJobs = jobs?.items.filter(j => j.status === 'running' || j.status === 'queued').length ?? 0;
  const configuredIntegrations = integrations.filter(i => i.configured).length;

  // Findings by category (for pie chart)
  const findingsBySeverity = useMemo(() => {
    if (!findings?.items.length) return [];
    const counts: Record<string, number> = {};
    findings.items.forEach(f => {
      const severity = f.confidence || 'info';
      counts[severity] = (counts[severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [findings]);

  // Findings by category
  const findingsByCategory = useMemo(() => {
    if (!findings?.items.length) return [];
    const counts: Record<string, number> = {};
    findings.items.forEach(f => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'ip_reputation' ? 'IP Reputation' : name === 'secret_exposure' ? 'Secret Exposure' : name === 'osint' ? 'OSINT' : name,
      value,
    }));
  }, [findings]);

  // Incidents by status
  const incidentsByStatus = useMemo(() => {
    if (!incidents?.items.length) return [];
    const counts: Record<string, number> = {};
    incidents.items.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // Jobs by status
  const jobsByStatus = useMemo(() => {
    if (!jobs?.items.length) return [];
    const counts: Record<string, number> = {};
    jobs.items.forEach(j => {
      counts[j.status] = (counts[j.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  // Activity timeline (from audit logs)
  const activityData = useMemo(() => {
    if (!auditLogs.length) return [];
    const dayMap: Record<string, number> = {};
    auditLogs.forEach(log => {
      const day = new Date(log.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    return Object.entries(dayMap).map(([date, count]) => ({ date, count })).reverse();
  }, [auditLogs]);

  // Assets by type
  const assetsByType = useMemo(() => {
    if (!assets.length) return [];
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      counts[a.asset_type] = (counts[a.asset_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const allErrored = Object.keys(errors).length >= 5;

  return (
    <PageLayout title="Dashboard" subtitle="Security Command Center — ringkasan postur keamanan, diperbarui tiap 15 detik">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <StatCard
          label="Total Assets"
          value={loading ? '—' : totalAssets}
          subtitle="Aset terdaftar"
          icon={<Server className="h-5 w-5 text-[var(--gc-primary)]" />}
          loading={loading}
          onClick={() => navigate('/assets')}
        />
        <StatCard
          label="Open Findings"
          value={loading ? '—' : openFindings}
          subtitle={`dari ${totalFindings} total`}
          icon={<Bug className="h-5 w-5 text-[var(--gc-warning)]" />}
          loading={loading}
          onClick={() => navigate('/findings')}
        />
        <StatCard
          label="Active Incidents"
          value={loading ? '—' : openIncidents}
          subtitle="Open & In Progress"
          icon={<AlertOctagon className="h-5 w-5 text-[var(--gc-critical)]" />}
          loading={loading}
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          label="Running Jobs"
          value={loading ? '—' : runningJobs}
          subtitle="Queued & Running"
          icon={<ListTodo className="h-5 w-5 text-[var(--gc-electric)]" />}
          loading={loading}
          onClick={() => navigate('/jobs')}
        />
        <StatCard
          label="Integrations"
          value={loading ? '—' : `${configuredIntegrations} / ${integrations.length}`}
          subtitle="Terkonfigurasi"
          icon={<Plug className="h-5 w-5 text-[var(--gc-success)]" />}
          loading={loading}
          onClick={() => navigate('/integrations')}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {allErrored && (
        <div className="mb-6 rounded-[var(--gc-radius-lg)] border border-[var(--gc-critical)]/20 bg-[var(--gc-critical)]/5 p-5 text-center">
          <Shield className="mx-auto mb-2 h-8 w-8 text-[var(--gc-critical)]" />
          <p className="text-sm font-medium text-[var(--gc-text)]">Backend tidak terjangkau</p>
          <p className="mt-1 text-xs text-[var(--gc-text-secondary)]">Jalankan server FastAPI untuk menampilkan data dashboard.</p>
        </div>
      )}

      <LiveHero />

      {/* Charts Row 1: Findings + Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Findings by Confidence"
          subtitle="Distribusi temuan berdasarkan tingkat keyakinan"
          loading={loading}
          error={errors.findings}
          empty={findingsBySeverity.length === 0}
          emptyMessage="Belum ada findings tercatat. Jalankan scan atau lookup untuk menghasilkan findings."
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={findingsBySeverity}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {findingsBySeverity.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || COLORS.text} />
                ))}
              </Pie>
              <ReTooltip
                contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#E5EDF7' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: COLORS.text }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Incidents by Status"
          subtitle="Distribusi insiden berdasarkan status"
          loading={loading}
          error={errors.incidents}
          empty={incidentsByStatus.length === 0}
          emptyMessage="Belum ada insiden tercatat."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={incidentsByStatus} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: COLORS.text }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.text }} />
              <ReTooltip
                contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#E5EDF7' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {incidentsByStatus.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || COLORS.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2: Activity + Findings by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Aktivitas Keamanan"
          subtitle="Tren aktivitas dari audit log"
          loading={loading}
          error={errors.auditLogs}
          empty={activityData.length === 0}
          emptyMessage="Belum ada aktivitas tercatat di audit log."
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.text }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.text }} />
              <ReTooltip
                contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#E5EDF7' }}
              />
              <Area type="monotone" dataKey="count" stroke={COLORS.primary} fill="url(#colorActivity)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Findings by Category"
          subtitle="Distribusi temuan berdasarkan kategori sumber"
          loading={loading}
          error={errors.findings}
          empty={findingsByCategory.length === 0}
          emptyMessage="Belum ada findings tercatat."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={findingsByCategory} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.text }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: COLORS.text }} width={100} />
              <ReTooltip
                contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#E5EDF7' }}
              />
              <Bar dataKey="value" fill={COLORS.electric} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3: Assets + Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Asset Risk Overview"
          subtitle="Distribusi aset berdasarkan tipe"
          loading={loading}
          error={errors.assets}
          empty={assetsByType.length === 0}
          emptyMessage="Belum ada aset terdaftar. Tambahkan di Asset Inventory."
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={assetsByType}
                cx="50%"
                cy="50%"
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {assetsByType.map((_, index) => (
                  <Cell key={index} fill={[COLORS.primary, COLORS.electric, COLORS.success, COLORS.warning, COLORS.critical][index % 5]} />
                ))}
              </Pie>
              <ReTooltip
                contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#E5EDF7' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: COLORS.text }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Job Status"
          subtitle="Status pekerjaan scan dan analisis"
          loading={loading}
          error={errors.jobs}
          empty={jobsByStatus.length === 0}
          emptyMessage="Belum ada job dijalankan. Jalankan dari Red Team."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={jobsByStatus} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: COLORS.text }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.text }} />
              <ReTooltip
                contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#E5EDF7' }}
              />
              <Bar dataKey="value" fill={COLORS.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <LiveFeedRow />

      {/* Recent Security Events Table */}
      <ChartCard
        title="Recent Security Events"
        subtitle="Aktivitas audit terbaru dari backend"
        loading={loading}
        error={errors.auditLogs}
        empty={auditLogs.length === 0}
        emptyMessage="Belum ada aktivitas tercatat di audit log."
        className="mb-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gc-border)]">
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]">Waktu</th>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]">Aktor</th>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]">Tindakan</th>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]">Target</th>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]">Hasil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gc-border)]">
              {auditLogs.slice(0, 8).map(log => (
                <tr key={log.id} className="hover:bg-[var(--gc-surface)]/50 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-[var(--gc-text-secondary)] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium">{log.actor}</td>
                  <td className="px-3 py-2.5"><Badge variant="primary">{log.action}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-[var(--gc-text-secondary)] max-w-[200px] truncate">{log.target ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{log.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Integration Health */}
      {!loading && integrations.length > 0 && (
        <ChartCard
          title="Integration Health"
          subtitle="Status konfigurasi integrasi tools"
          className="mb-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrations.map(tool => (
              <div key={tool.tool_id} className="flex items-center justify-between rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--gc-text)]">{tool.display_name}</p>
                  <p className="text-[10.5px] text-[var(--gc-text-secondary)]">{tool.capability_summary || tool.tool_id}</p>
                </div>
                <Badge variant={tool.configured ? 'success' : tool.implemented ? 'warning' : 'default'}>
                  {tool.configured ? 'Active' : tool.implemented ? 'Not Configured' : 'Not Implemented'}
                </Badge>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
      <LiveBottomRow />
    </PageLayout>
  );
}
