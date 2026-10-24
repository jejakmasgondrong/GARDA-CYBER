import { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";
import { apiClient } from "../lib/apiClient";
import type { AuditLogEntry } from "../types";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<AuditLogEntry[]>("/audit-logs?limit=100")
      .then(setLogs)
      .catch(() => setError("Backend belum terhubung. Jalankan server FastAPI lalu refresh halaman ini."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="Audit Logs" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Audit Logs</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Riwayat tindakan nyata yang tercatat backend (create/update finding &amp; incident, dst). Token dan
          credential tidak pernah dicatat di sini.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3 text-[12.5px] text-[var(--sub)]">
            {error}
          </div>
        )}

        {!loading && !error && logs && logs.length === 0 && (
          <EmptyState title="Belum ada aktivitas tercatat" description="Log akan muncul begitu ada aksi tercatat di sistem (mis. membuat finding atau incident)." />
        )}

        {!loading && logs && logs.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[10.5px] uppercase text-[var(--sub)]">
                  <th className="px-2 py-2">Waktu</th>
                  <th className="px-2 py-2">Aktor</th>
                  <th className="px-2 py-2">Tindakan</th>
                  <th className="px-2 py-2">Target</th>
                  <th className="px-2 py-2">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-2 py-2 text-[var(--sub)]">{new Date(l.created_at).toLocaleString("id-ID")}</td>
                    <td className="px-2 py-2">{l.actor}</td>
                    <td className="px-2 py-2 font-mono">{l.action}</td>
                    <td className="px-2 py-2 text-[var(--sub)]">{l.target ?? "—"}</td>
                    <td className="px-2 py-2">{l.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
