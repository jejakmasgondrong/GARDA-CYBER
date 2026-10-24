import { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";
import { apiClient } from "../lib/apiClient";
import type { Asset } from "../types";

export default function AssetInventory() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Asset[]>("/assets")
      .then(setAssets)
      .catch(() => setError("Backend belum terhubung. Jalankan server FastAPI untuk memuat data aset."));
  }, []);

  return (
    <div>
      <TopBar title="Asset Inventory" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Asset Inventory</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Daftar aset yang diotorisasi untuk dipantau dan dinilai.
        </p>

        <div className="mb-3.5 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[10.5px] uppercase text-[var(--sub)]">
                <th className="px-2 py-2">Nama Aset</th>
                <th className="px-2 py-2">Tipe</th>
                <th className="px-2 py-2">Pemilik</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr><td colSpan={4} className="px-2 py-5 text-center text-[var(--sub)]">{error}</td></tr>
              )}
              {!error && assets?.length === 0 && (
                <tr><td colSpan={4} className="px-2 py-5 text-center text-[var(--sub)]">Belum ada aset terdaftar</td></tr>
              )}
              {!error && assets?.map((a) => (
                <tr key={a.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-2 py-2.5">{a.name}</td>
                  <td className="px-2 py-2.5">{a.asset_type}</td>
                  <td className="px-2 py-2.5">{a.owner ?? "—"}</td>
                  <td className="px-2 py-2.5">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <EmptyState
          title="Tambahkan aset pertama"
          description="Inventaris aset menjadi dasar untuk Attack Surface dan Vulnerability Management. Form tambah/edit aset lengkap disiapkan di Tahap 3."
        />
      </main>
    </div>
  );
}
