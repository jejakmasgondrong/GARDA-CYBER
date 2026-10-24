import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";

export default function Reports() {
  return (
    <div>
      <TopBar title="Reports" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Reports</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Ringkasan assessment dan laporan insiden yang dapat diekspor.
        </p>
        <EmptyState
          title="Belum ada laporan"
          description="Laporan dibuat dari data Red Team, Blue Team, dan Vulnerability Management yang sudah terisi."
        />
      </main>
    </div>
  );
}
