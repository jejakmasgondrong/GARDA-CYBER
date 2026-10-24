import { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { apiClient } from "../lib/apiClient";
import type { IntegrationStatus } from "../types";

export default function Integrations() {
  const [tools, setTools] = useState<IntegrationStatus[] | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    apiClient
      .get<IntegrationStatus[]>("/integrations")
      .then((data) => { setTools(data); setConnected(true); })
      .catch(() => { setTools([]); setConnected(false); });
  }, []);

  const label = (t: IntegrationStatus) => {
    if (!t.implemented) return { text: "Belum Diimplementasikan", cls: "bg-[var(--panel-2)] text-[var(--sub)]" };
    if (t.configured) return { text: "Terkonfigurasi", cls: "bg-[#0f2a1c] text-[#4ade80]" };
    return { text: "Belum Dikonfigurasi", cls: "bg-[#3a2314] text-[#fb923c]" };
  };

  return (
    <div>
      <TopBar title="Integrations" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Integrations</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Status jujur dari registry backend: belum diimplementasikan vs sudah ada kode tapi belum dikonfigurasi.
          {!connected && " (backend belum terhubung — jalankan server FastAPI)"}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {tools?.map((t) => {
            const l = label(t);
            return (
              <div key={t.tool_id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3.5">
                <h4 className="mb-0.5 text-[13.5px] font-semibold">{t.display_name}</h4>
                <p className="mb-2 text-[11.5px] text-[var(--sub)]">{t.capability_summary}</p>
                {t.required_env_vars.length > 0 && (
                  <p className="mb-2.5 text-[10.5px] text-[var(--sub)]">
                    Env: {t.required_env_vars.join(", ")}
                  </p>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${l.cls}`}>
                  {l.text}
                </span>
              </div>
            );
          })}
          {tools && tools.length === 0 && (
            <p className="text-[12.5px] text-[var(--sub)] sm:col-span-3">Tidak bisa memuat daftar integrasi.</p>
          )}
        </div>
      </main>
    </div>
  );
}
