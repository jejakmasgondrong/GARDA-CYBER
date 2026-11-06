import { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Badge, ErrorState } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import type { IntegrationStatus } from '../types';

export default function Integrations() {
  const [tools, setTools] = useState<IntegrationStatus[] | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    apiClient.get<IntegrationStatus[]>('/integrations')
      .then(data => { setTools(data); setConnected(true); })
      .catch(() => { setTools([]); setConnected(false); });
  }, []);

  const getLabel = (t: IntegrationStatus) => {
    if (!t.implemented) return { text: 'Not Implemented', variant: 'default' as const };
    if (t.configured) return { text: 'Configured', variant: 'success' as const };
    return { text: 'Not Configured', variant: 'warning' as const };
  };

  return (
    <PageLayout title="Integrations" subtitle="Status konfigurasi dan koneksi tools keamanan">
      {!connected && <ErrorState message="Backend tidak terjangkau. Jalankan server FastAPI untuk melihat status integrasi." />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools?.map(t => {
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
                  <p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)] mb-1">Required Variables</p>
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
