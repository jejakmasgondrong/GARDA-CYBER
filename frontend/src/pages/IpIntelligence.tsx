import { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Badge, EmptyState } from '../components/ui';
import { apiClient, ApiError } from '../lib/apiClient';
import type { IpLookupResult } from '../types';

const CLASS_LABEL: Record<string, string> = {
  public: 'Publik — layak diperiksa provider eksternal',
  private: 'Privat — TIDAK dikirim ke provider eksternal',
  loopback: 'Loopback (localhost)', link_local: 'Link-local',
  multicast: 'Multicast', reserved: 'Reserved', unspecified: '0.0.0.0',
};

const PROVIDER_LABEL: Record<string, string> = {
  ok: 'Berhasil', not_configured: 'Provider belum dikonfigurasi',
  timeout: 'Timeout', rate_limited: 'Rate-limited', provider_error: 'Error',
};

export default function IpIntelligence() {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IpLookupResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null); setResult(null);
    try {
      setResult(await apiClient.post<IpLookupResult>('/ip-intelligence/lookup', { ip_address: ip }));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 422 ? 'Format IP tidak valid.' : 'Backend tidak terjangkau.');
    } finally { setLoading(false); }
  }

  return (
    <PageLayout title="IP Intelligence" subtitle="Validasi dan klasifikasi alamat IP — IP privat/reserved tidak diteruskan ke provider eksternal">
      <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
        <input value={ip} onChange={e => setIp(e.target.value)} placeholder="8.8.8.8 atau 2001:4860:4860::8888" required
          className="flex-1 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 text-sm text-[var(--gc-text)] placeholder:text-[var(--gc-text-secondary)]/60 focus:border-[var(--gc-primary)] focus:ring-1 focus:ring-[var(--gc-primary)] outline-none" />
        <button type="submit" disabled={loading}
          className="rounded-[var(--gc-radius)] bg-[var(--gc-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110 transition-all">
          {loading ? 'Memeriksa…' : 'Periksa IP'}
        </button>
      </form>

      {error && <div className="mb-4 rounded-[var(--gc-radius)] border border-[var(--gc-critical)]/20 bg-[var(--gc-critical)]/5 p-3 text-sm text-[var(--gc-critical)]">{error}</div>}

      {result && (
        <div className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
          <p className="font-mono text-lg font-bold text-[var(--gc-text)] mb-1">{result.ip_address}</p>
          <p className="text-xs text-[var(--gc-text-secondary)] mb-4">{CLASS_LABEL[result.classification] ?? result.classification}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Status Provider</p>
              <Badge variant={result.provider_status === 'ok' ? 'success' : result.provider_status === 'not_configured' ? 'warning' : 'critical'}>
                {PROVIDER_LABEL[result.provider_status]}
              </Badge>
            </div>
            <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Sumber</p><p className="text-sm font-medium">{result.provider_id ?? '—'}</p></div>
            <div><p className="text-[10.5px] uppercase text-[var(--gc-text-secondary)]">Waktu</p><p className="text-sm">{new Date(result.created_at).toLocaleString('id-ID')}</p></div>
          </div>
          {result.result_summary && <div className="mt-4 rounded-[var(--gc-radius)] bg-[var(--gc-surface)] p-3 text-sm text-[var(--gc-text)]">{result.result_summary}</div>}
          {!result.eligible_for_external_lookup && <p className="mt-3 text-xs text-[var(--gc-text-secondary)]">IP ini tidak diteruskan ke provider eksternal karena bukan alamat publik.</p>}
        </div>
      )}

      {!result && !error && <EmptyState title="Periksa alamat IP" description="Masukkan alamat IPv4/IPv6 untuk validasi dan klasifikasi. IP privat tidak akan pernah dikirim ke provider eksternal." />}
    </PageLayout>
  );
}
