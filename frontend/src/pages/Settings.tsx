import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";

export default function Settings() {
  return (
    <div>
      <TopBar title="Settings" />
      <main className="mx-auto max-w-[1180px] p-5">
        <h2 className="mb-0.5 text-lg font-extrabold">Settings</h2>
        <p className="mb-4 text-xs text-[var(--sub)]">
          Preferensi aplikasi, konfigurasi API, dan manajemen akses (fase berikutnya).
        </p>
        <EmptyState
          title="Autentikasi belum diaktifkan"
          description="Halaman ini disiapkan untuk konfigurasi API dan manajemen peran/izin setelah backend autentikasi diimplementasikan pada Tahap 5."
        />
      </main>
    </div>
  );
}
