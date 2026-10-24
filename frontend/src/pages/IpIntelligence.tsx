import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { apiClient, ApiError } from "../lib/apiClient";
import type { IpLookupResult } from "../types";

const CLASSIFICATION_LABEL: Record<string, string> = {
  public: "Publik — layak diperiksa provider eksternal",
  private: "Privat — TIDAK dikirim ke provider eksternal",
  loopback: "Loopback (localhost)",
  link_local: "Link-local",
  multicast: "Multicast",
  reserved: "Reserved",
  unspecified: "Tidak dispesifikasikan (0.0.0.0)",
};

const PROVIDER_STATUS_LABEL: Record<string, string> = {
  ok: "Berhasil",
  not_configured: "Provider belum dikonfigurasi",
  timeout: "Provider timeout",
  rate_limited: "Provider rate-limited",
  provider_error: "Provider error",
};

export default function IpIntelligence() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IpLookupResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.post<IpLookupResult>("/ip-intelligence/lookup", { ip_address: ip });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Alamat IP tidak valid. Periksa kembali format IPv4/IPv6.");
      } else {
        setError("Backend belum terhubung, atau terjadi kesalahan. Jalankan server FastAPI lalu coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopBar title="IP Intelligence" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">IP Intelligence</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Validasi dan klasifikasi alamat IP. IP privat/reserved tidak pernah diteruskan ke provider eksternal —
          ditegakkan di backend, bukan hanya di tampilan ini.
        </p>

        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Contoh: 8.8.8.8 atau 2001:4860:4860::8888"
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#2b4ad1] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {loading ? "Memeriksa…" : "Periksa IP"}
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3 text-[12.5px] text-[var(--sub)]">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="mb-1 font-mono text-sm font-bold">{result.ip_address}</p>
            <p className="mb-3 text-[12.5px] text-[var(--sub)]">
              {CLASSIFICATION_LABEL[result.classification] ?? result.classification}
            </p>
            <div className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-3">
              <div>
                <p className="text-[var(--sub)]">Status Provider</p>
                <p className="font-semibold">{PROVIDER_STATUS_LABEL[result.provider_status]}</p>
              </div>
              <div>
                <p className="text-[var(--sub)]">Sumber</p>
                <p className="font-semibold">{result.provider_id ?? "—"}</p>
              </div>
              <div>
                <p className="text-[var(--sub)]">Waktu</p>
                <p className="font-semibold">{new Date(result.created_at).toLocaleString("id-ID")}</p>
              </div>
            </div>
            {result.result_summary && (
              <p className="mt-3 rounded bg-[var(--panel-2)] p-2 text-[12px]">{result.result_summary}</p>
            )}
            {!result.eligible_for_external_lookup && (
              <p className="mt-3 text-[11.5px] text-[var(--sub)]">
                IP ini tidak diteruskan ke provider eksternal karena bukan alamat publik.
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-[11px] text-[var(--sub)]">
          Catatan: pencarian ini tidak pernah memastikan identitas atau lokasi fisik pasti seseorang, dan tidak
          melakukan scan/exploit/block otomatis terhadap IP yang diperiksa.
        </p>
      </main>
    </div>
  );
}
