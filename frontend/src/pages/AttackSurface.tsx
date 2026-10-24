import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { apiClient, ApiError } from "../lib/apiClient";
import type { OsintLookupResult } from "../types";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  ok: { text: "Berhasil (DNS + TLS)", cls: "bg-[#0f2a1c] text-[#4ade80]" },
  partial: { text: "DNS berhasil, TLS gagal", cls: "bg-[#3a2314] text-[#fb923c]" },
  blocked: { text: "Diblokir — resolve ke IP non-publik (anti-SSRF)", cls: "bg-[#3a1420] text-[#fb7185]" },
  dns_error: { text: "DNS tidak bisa di-resolve", cls: "bg-[#262b36] text-[var(--sub)]" },
  invalid_input: { text: "Format domain tidak valid", cls: "bg-[#262b36] text-[var(--sub)]" },
};

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export default function AttackSurface() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OsintLookupResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.post<OsintLookupResult>("/osint/lookup", { domain });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError("Terjadi kesalahan saat memproses permintaan.");
      } else {
        setError("Backend belum terhubung. Jalankan server FastAPI lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  const dns = result ? parseJson<{ addresses: { ip: string; type: string }[]; mx: string[]; ns: string[]; txt: string[] }>(result.dns_records_json) : null;
  const tls = result ? parseJson<{ subject: string; issuer: string; not_before: string; not_after: string; san: string[] }>(result.tls_info_json) : null;

  return (
    <div>
      <TopBar title="Attack Surface" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Attack Surface — OSINT Domain Intelligence</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Lookup DNS (A/AAAA/MX/NS/TXT) dan sertifikat TLS publik untuk domain yang diotorisasi untuk diperiksa.
          Domain yang resolve ke alamat IP non-publik (private/loopback/link-local, termasuk metadata cloud) secara
          otomatis ditolak di backend untuk mencegah SSRF.
        </p>

        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Contoh: example.com"
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#2b4ad1] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {loading ? "Memeriksa…" : "Periksa Domain"}
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3 text-[12.5px] text-[var(--sub)]">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-sm font-bold">{result.domain}</p>
              <span className={`rounded px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_LABEL[result.status]?.cls}`}>
                {STATUS_LABEL[result.status]?.text ?? result.status}
              </span>
            </div>

            {result.error_message && (
              <p className="mb-3 rounded bg-[var(--panel-2)] p-2 text-[12px] text-[var(--sub)]">{result.error_message}</p>
            )}

            {dns && (
              <div className="mb-3 grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[var(--sub)]">A/AAAA</p>
                  {dns.addresses.map((a) => (
                    <p key={a.ip} className="font-mono">{a.type} {a.ip}</p>
                  ))}
                </div>
                <div>
                  <p className="mb-1 text-[var(--sub)]">MX</p>
                  {dns.mx.length === 0 ? <p className="text-[var(--sub)]">—</p> : dns.mx.map((m) => <p key={m}>{m}</p>)}
                </div>
                <div>
                  <p className="mb-1 text-[var(--sub)]">NS</p>
                  {dns.ns.length === 0 ? <p className="text-[var(--sub)]">—</p> : dns.ns.map((n) => <p key={n}>{n}</p>)}
                </div>
                <div>
                  <p className="mb-1 text-[var(--sub)]">TXT</p>
                  {dns.txt.length === 0 ? <p className="text-[var(--sub)]">—</p> : dns.txt.map((t, i) => <p key={i} className="break-all">{t}</p>)}
                </div>
              </div>
            )}

            {tls && (
              <div className="mt-2 border-t border-[var(--line)] pt-3 text-[12.5px]">
                <p className="mb-1 text-[var(--sub)]">Sertifikat TLS</p>
                <p><span className="text-[var(--sub)]">Subject:</span> {tls.subject || "—"}</p>
                <p><span className="text-[var(--sub)]">Issuer:</span> {tls.issuer || "—"}</p>
                <p><span className="text-[var(--sub)]">Berlaku:</span> {tls.not_before} s/d {tls.not_after}</p>
                {tls.san.length > 0 && <p><span className="text-[var(--sub)]">SAN:</span> {tls.san.join(", ")}</p>}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-[11px] text-[var(--sub)]">
          Catatan: hanya pengumpulan informasi publik (DNS, sertifikat TLS) yang dilakukan di sini. Tidak ada
          koneksi ke port lain, tidak ada exploit, dan tidak ada perintah shell arbitrer.
        </p>
      </main>
    </div>
  );
}
