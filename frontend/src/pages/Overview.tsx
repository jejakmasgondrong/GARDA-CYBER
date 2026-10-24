import { TopBar } from "../components/TopBar";
import { StatCard } from "../components/StatCard";
import { EmptyState } from "../components/EmptyState";

export default function Overview() {
  return (
    <div>
      <TopBar title="Overview" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Overview</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Ringkasan postur keamanan satuan. Belum ada sumber data nyata yang terhubung.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard label="Status Sistem" value="Belum Dikonfigurasi" sub="Tidak ada integrasi aktif" />
          <StatCard label="Aset Terdaftar" value="0" sub="Tambahkan di Asset Inventory" />
          <StatCard label="Insiden Terbuka" value="0" sub="Dari Blue Team" />
          <StatCard label="Integrasi Aktif" value="0 / 7" sub="Lihat halaman Integrations" />
        </div>
        <EmptyState
          title="Belum ada data operasional"
          description="Panel ini akan menampilkan postur keamanan, ringkasan aset, alert terbaru, dan aktivitas audit setelah integrasi dan sumber data dihubungkan pada fase berikutnya."
        />
      </main>
    </div>
  );
}
