import { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";
import { apiClient, ApiError } from "../lib/apiClient";
import type { Asset, IntegrationStatusV2, JobResult } from "../types";

const RED_TEAM_TOOLS = ["nmap", "nuclei", "amass", "owasp_zap", "greenbone"];

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: "Antre", running: "Berjalan", completed: "Selesai", failed: "Gagal", cancelled: "Dibatalkan",
};
const JOB_STATUS_COLOR: Record<string, string> = {
  queued: "text-[var(--sub)]", running: "text-amber-500", completed: "text-green-600",
  failed: "text-red-600", cancelled: "text-[var(--sub)]",
};

export default function RedTeam() {
  const [tools, setTools] = useState<IntegrationStatusV2[]>(
    RED_TEAM_TOOLS.map((id) => ({ tool_id: id, display_name: id, configured: false, required_env_vars: [], official_repo: "" }))
  );
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [selectedTool, setSelectedTool] = useState("nmap");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function refreshJobs() {
    apiClient.get<{ items: JobResult[] }>("/jobs?limit=20").then((r) => setJobs(r.items)).catch(() => {});
  }

  useEffect(() => {
    apiClient
      .get<IntegrationStatusV2[]>("/integrations")
      .then((all) => setTools(all.filter((t) => RED_TEAM_TOOLS.includes(t.tool_id))))
      .catch(() => {});
    apiClient.get<Asset[]>("/assets").then(setAssets).catch(() => {});
    refreshJobs();
  }, []);

  async function handleRunJob(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!selectedAsset) {
      setFormError("Pilih aset target dulu (hanya aset berstatus 'active' yang akan diterima backend).");
      return;
    }
    setRunning(true);
    try {
      await apiClient.post("/jobs", { tool_id: selectedTool, asset_id: selectedAsset, parameters: { flags: ["-sV"] } });
      refreshJobs();
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError("Backend belum terhubung.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <TopBar title="Red Team" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Red Team</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Ruang kerja pengujian keamanan yang diotorisasi. Job hanya bisa menargetkan aset yang sudah berstatus aktif.
        </p>

        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {tools.map((t) => (
            <div key={t.tool_id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3.5">
              <h4 className="mb-0.5 text-[13.5px] font-semibold">{t.display_name}</h4>
              <p className="mb-2.5 text-[11.5px] text-[var(--sub)]">
                {t.official_repo || "Lihat katalog Integrations untuk detail."}
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--sub)]">
                  {t.installed ? "Terpasang" : "Belum Terpasang"}
                </span>
                <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--sub)]">
                  {t.configured ? "Terkonfigurasi" : "Belum Dikonfigurasi"}
                </span>
                {t.executable && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10.5px] font-bold text-green-700">
                    Siap Eksekusi
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="mb-2.5 text-[13.5px] font-semibold">Jalankan Job Baru</p>
          <form onSubmit={handleRunJob} className="flex flex-wrap items-end gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--sub)]">Tool</label>
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-[13px]"
              >
                {RED_TEAM_TOOLS.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--sub)]">Target Aset</label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="min-w-[200px] rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-[13px]"
              >
                <option value="">-- pilih aset --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={running}
              className="rounded-lg bg-[#2b4ad1] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {running ? "Menjalankan…" : "Jalankan"}
            </button>
          </form>
          {formError && <p className="mt-2 text-[11.5px] text-red-600">{formError}</p>}
          {assets.length === 0 && (
            <p className="mt-2 text-[11px] text-[var(--sub)]">
              Belum ada aset terdaftar. Tambahkan dulu di halaman Asset Inventory.
            </p>
          )}
        </div>

        <p className="panel-title mb-2 text-[13.5px] font-semibold">Riwayat Job</p>
        {jobs.length === 0 ? (
          <EmptyState
            title="Belum ada job berjalan"
            description="Job yang dijalankan akan muncul di sini lengkap dengan status, waktu, dan alasan jika gagal."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[10.5px] uppercase text-[var(--sub)]">
                  <th className="px-2 py-2">Tool</th><th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Dibuat</th><th className="px-2 py-2">Ringkasan / Alasan Gagal</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-2 py-2.5 font-mono">{j.tool_id}</td>
                    <td className={`px-2 py-2.5 font-semibold ${JOB_STATUS_COLOR[j.status]}`}>
                      {JOB_STATUS_LABEL[j.status]}
                    </td>
                    <td className="px-2 py-2.5">{new Date(j.created_at).toLocaleString("id-ID")}</td>
                    <td className="max-w-[320px] truncate px-2 py-2.5 text-[var(--sub)]">
                      {j.failure_reason || j.output_summary || "—"}
                    </td>
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
