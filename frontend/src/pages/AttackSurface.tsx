import { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Tabs, Badge, EmptyState } from '../components/ui';
import { apiClient, ApiError } from '../lib/apiClient';
import type { OsintLookupResult } from '../types';

const STATUS_MAP: Record<string, { text: string; variant: 'success' | 'warning' | 'critical' | 'default' }> = {
  ok: { text: 'DNS + TLS Berhasil', variant: 'success' },
  partial: { text: 'DNS OK, TLS Gagal', variant: 'warning' },
  blocked: { text: 'Diblokir (anti-SSRF)', variant: 'critical' },
  dns_error: { text: 'DNS Error', variant: 'default' },
  invalid_input: { text: 'Input Tidak Valid', variant: 'default' },
};

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export default function AttackSurface() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OsintLookupResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await apiClient.post<OsintLookupResult>('/osint/lookup', { domain });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? 'Terjadi kesalahan saat memproses permintaan.' : 'Backend tidak terjangkau. Jalankan server FastAPI.');
    } finally { setLoading(false); }
  }

  const dns = result ? parseJson<{ addresses: { ip: string; type: string }[]; mx: string[]; ns: string[]; txt: string[] }>(result.dns_records_json) : null;
  const tls = result ? parseJson<{ subject: string; issuer: string; not_before: string; not_after: string; san: string[] }>(result.tls_info_json) : null;

  return (
    <PageLayout title="Attack Surface" subtitle="Domain Intelligence — DNS & TLS lookup untuk domain yang diotorisasi">
      <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
        <input
          value={domain} onChange={e => setDomain(e.target.value)}
          placeholder="Contoh: example.com" required
          className="flex-1 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 text-sm text-[var(--gc-text)] placeholder:text-[var(--gc-text-secondary)]/60 focus:border-[var(--gc-primary)] focus:ring-1 focus:ring-[var(--gc-primary)] outline-none"
        />
        <button type="submit" disabled={loading}
          className="rounded-[var(--gc-radius)] bg-[var(--gc-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110 transition-all">
          {loading ? 'Memeriksa…' : 'Periksa Domain'}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-[var(--gc-radius)] border border-[var(--gc-critical)]/20 bg-[var(--gc-critical)]/5 p-3 text-sm text-[var(--gc-critical)]">{error}</div>
      )}

      {result && (
        <div className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-base font-bold text-[var(--gc-text)]">{result.domain}</p>
            <Badge variant={STATUS_MAP[result.status]?.variant || 'default'} dot>
              {STATUS_MAP[result.status]?.text || result.status}
            </Badge>
          </div>

          {result.error_message && (
            <div className="mb-4 rounded-[var(--gc-radius)] bg-[var(--gc-surface)] p-3 text-xs text-[var(--gc-text-secondary)]">{result.error_message}</div>
          )}

          <Tabs tabs={[
            { id: 'dns', label: 'DNS Records', disabled: !dns },
            { id: 'tls', label: 'TLS Certificate', disabled: !tls },
          ]} defaultTab={dns ? 'dns' : 'tls'}>
            {(tab) => (
              <>
                {tab === 'dns' && dns && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)] mb-2">A / AAAA Records</p>
                      {dns.addresses.map(a => (
                        <p key={a.ip} className="font-mono text-sm text-[var(--gc-text)]">{a.type} → {a.ip}</p>
                      ))}
                      {dns.addresses.length === 0 && <p className="text-xs text-[var(--gc-text-secondary)]">Tidak ada</p>}
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)] mb-2">MX Records</p>
                      {dns.mx.length === 0 ? <p className="text-xs text-[var(--gc-text-secondary)]">—</p> : dns.mx.map(m => <p key={m} className="text-sm">{m}</p>)}
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)] mb-2">NS Records</p>
                      {dns.ns.length === 0 ? <p className="text-xs text-[var(--gc-text-secondary)]">—</p> : dns.ns.map(n => <p key={n} className="text-sm">{n}</p>)}
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)] mb-2">TXT Records</p>
                      {dns.txt.length === 0 ? <p className="text-xs text-[var(--gc-text-secondary)]">—</p> : dns.txt.map((t, i) => <p key={i} className="text-sm break-all">{t}</p>)}
                    </div>
                  </div>
                )}
                {tab === 'tls' && tls && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div><p className="text-[10.5px] font-semibold uppercase text-[var(--gc-text-secondary)]">Subject</p><p className="text-sm">{tls.subject || '—'}</p></div>
                      <div><p className="text-[10.5px] font-semibold uppercase text-[var(--gc-text-secondary)]">Issuer</p><p className="text-sm">{tls.issuer || '—'}</p></div>
                      <div><p className="text-[10.5px] font-semibold uppercase text-[var(--gc-text-secondary)]">Valid From</p><p className="text-sm">{tls.not_before}</p></div>
                      <div><p className="text-[10.5px] font-semibold uppercase text-[var(--gc-text-secondary)]">Valid Until</p><p className="text-sm">{tls.not_after}</p></div>
                    </div>
                    {tls.san.length > 0 && (
                      <div><p className="text-[10.5px] font-semibold uppercase text-[var(--gc-text-secondary)] mb-1">Subject Alternative Names</p>
                        <div className="flex flex-wrap gap-1.5">{tls.san.map(s => <Badge key={s} variant="info">{s}</Badge>)}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Tabs>
        </div>
      )}

      {!result && !error && (
        <EmptyState title="Mulai analisis domain" description="Masukkan domain untuk memeriksa DNS records dan sertifikat TLS. Domain yang resolve ke IP non-publik secara otomatis ditolak untuk mencegah SSRF." />
      )}
    </PageLayout>
  );
}
