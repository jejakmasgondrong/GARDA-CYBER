import { PageLayout } from '../components/layout/PageLayout';
import { Tabs, EmptyState } from '../components/ui';

/** OSINT Intelligence page - serves as a unified OSINT hub.
 *  Reuses AttackSurface for domain lookup since that is the existing OSINT endpoint. */
export default function OsintIntelligence() {
  return (
    <PageLayout title="OSINT Intelligence" subtitle="Open Source Intelligence — Pengumpulan informasi publik untuk domain dan aset">
      <Tabs tabs={[
        { id: 'domain', label: 'Domain Intelligence' },
        { id: 'history', label: 'Lookup History' },
      ]}>
        {(tab) => (
          <>
            {tab === 'domain' && (
              <div>
                <p className="mb-4 text-xs text-[var(--gc-text-secondary)]">
                  Lookup DNS (A/AAAA/MX/NS/TXT) dan sertifikat TLS publik untuk domain yang diotorisasi. Menggunakan endpoint <code className="rounded bg-[var(--gc-surface)] px-1 py-0.5 text-[10.5px]">POST /api/v1/osint/lookup</code>.
                </p>
                <EmptyState
                  title="Gunakan halaman Attack Surface"
                  description="Domain lookup tersedia di halaman Attack Surface. Hasil lookup akan ditampilkan di sini setelah history endpoint tersedia dari backend."
                />
              </div>
            )}
            {tab === 'history' && (
              <EmptyState
                title="Data belum tersedia dari backend"
                description="History lookup OSINT akan ditampilkan ketika endpoint yang sesuai tersedia."
              />
            )}
          </>
        )}
      </Tabs>
    </PageLayout>
  );
}
