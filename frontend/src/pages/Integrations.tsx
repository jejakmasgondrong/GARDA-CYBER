import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageLayout } from '../components/layout/PageLayout';
import { Badge, ErrorState, StatusIndicator } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { IntegrationStatus } from '../types';

type Filter = 'all' | 'active' | 'inactive';

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Semua',
  active: 'Aktif',
  inactive: 'Belum aktif',
};

export default function Integrations() {
  const [tools, setTools] = useState<IntegrationStatus[] | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const load = () => {
    setLoading(true);
    apiClient.get<IntegrationStatus[]>('/integrations')
      .then(data => { setTools(data); setConnected(true); })
      .catch(() => { setTools([]); setConnected(false); })
      .finally(() => setLoading(false));
  };

  // Status dibaca ulang berkala: mengubah .env lalu restart backend tidak boleh
  // membuat halaman ini menampilkan status lama sampai browser di-reload manual.
  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const aktif = useMemo(() => (tools ?? []).filter(t => t.executable || t.configured).length, [tools]);
  const tampil = useMemo(() => {
    if (!tools) return [];
    if (filter === 'active') return tools.filter(t => t.executable || t.configured);
    if (filter === 'inactive') return tools.filter(t => !t.executable && !t.configured);
    return tools;
  }, [tools, filter]);

  const getLabel = (t: IntegrationStatus) => {
    if (!t.implemented) return { text: 'Belum Diimplementasikan', variant: 'default' as const };
    if (t.configured) return { text: 'Terkonfigurasi', variant: 'success' as const };
    return { text: 'Belum Dikonfigurasi', variant: 'warning' as const };
  };

  return (
    <PageLayout title="Integrations" subtitle="Status konfigurasi dan koneksi tools keamanan">
      {!connected && <ErrorState message="Backend tidak terjangkau. Jalankan server FastAPI untuk melihat status integrasi." />}

      {connected && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-3 text-xs text-[var(--gc-text-secondary)]">
            <StatusIndicator status={loading ? 'idle' : 'online'} label={loading ? 'Memuat…' : 'Diperbarui otomatis tiap 30 detik'} />
            <span>
              <strong className="text-[var(--gc-text)]">{aktif}</strong> dari {tools?.length ?? 0} aktif
              (bisa dijalankan atau terkonfigurasi)
            </span>
          </div>

          <div className="inline-flex rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-0.5">
            {(['all', 'active', 'inactive'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-[var(--gc-radius)] px-3 py-1.5 text-xs transition-colors ${
                  filter === f ? 'bg-[var(--gc-card)] text-[var(--gc-primary)]' : 'text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)]'
                }`}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-1.5 text-xs text-[var(--gc-text)] hover:border-[var(--gc-primary)]/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
          </button>
        </div>
      )}

      {connected && tampil.length === 0 && (
        <p className="rounded-[var(--gc-radius)] border border-dashed border-[var(--gc-border)] px-4 py-6 text-center text-xs text-[var(--gc-text-secondary)]">
          {filter === 'active'
            ? 'Belum ada integrasi aktif. Pasang binary tool atau isi variabel di backend/.env (lihat scripts/install_optional_tools.sh).'
            : 'Semua integrasi sudah aktif.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tampil.map(t => {
          const l = getLabel(t);
          return (
            <div key={t.tool_id} className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-4 transition-all hover:border-[var(--gc-primary)]/30">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-[var(--gc-text)]">{t.display_name}</h4>
                <Badge variant={l.variant} dot>{l.text}</Badge>
              </div>
              <p className="text-xs text-[var(--gc-text-secondary)] mb-3 leading-relaxed">{t.capability_summary}</p>
              {t.required_env_vars.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)] mb-1">Variabel Wajib</p>
                  <div className="flex flex-wrap gap-1">
                    {t.required_env_vars.map(v => (
                      <code key={v} className="rounded bg-[var(--gc-surface)] px-1.5 py-0.5 text-[10px] text-[var(--gc-text-secondary)]">{v}</code>
                    ))}
                  </div>
                </div>
              )}
              {t.official_repo && (
                <p className="text-[10.5px] text-[var(--gc-text-secondary)] truncate">
                  Repo: <span className="text-[var(--gc-primary)]">{t.official_repo}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
