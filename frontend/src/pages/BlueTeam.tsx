import { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";
import { apiClient } from "../lib/apiClient";
import type { IncidentListResponse, IncidentStatus } from "../types";

const STATUS_BADGE: Record<IncidentStatus, string> = {
  open: "bg-[#3a1420] text-[#fb7185]",
  in_progress: "bg-[#3a2314] text-[#fb923c]",
  contained: "bg-[#1d2a4a] text-[#60a5fa]",
  closed: "bg-[#0f2a1c] text-[#4ade80]",
};

export default function BlueTeam() {
  const [data, setData] = useState<IncidentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<IncidentListResponse>("/incidents?limit=50")
      .then(setData)
      .catch(() => setError("Backend belum terhubung. Jalankan server FastAPI lalu refresh halaman ini."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="Blue Team" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Blue Team</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">Manajemen insiden dari data yang benar-benar tercatat.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3 text-[12.5px] text-[var(--sub)]">
            {error}
          </div>
        )}

        {!loading && !error && data && data.total === 0 && (
          <EmptyState
            title="Belum ada insiden"
            description="Insiden dibuat manual via API /incidents, atau nantinya otomatis dari eskalasi alert (Wazuh/Suricata, Tahap berikutnya)."
          />
        )}

        {!loading && data && data.total > 0 && (
          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[10.5px] uppercase text-[var(--sub)]">
                  <th className="px-2 py-2">Judul</th>
                  <th className="px-2 py-2">Ditugaskan</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((inc) => (
                  <tr key={inc.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-2 py-2">{inc.title}</td>
                    <td className="px-2 py-2 text-[var(--sub)]">{inc.assigned_to ?? "—"}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_BADGE[inc.status]}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-[var(--sub)]">{new Date(inc.created_at).toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <EmptyState
            title="Belum terhubung ke sumber event otomatis"
            description="Disiapkan untuk evaluasi integrasi seperti Wazuh, Suricata, atau osquery pada tahap berikutnya."
          />
        </div>
      </main>
    </div>
  );
}
