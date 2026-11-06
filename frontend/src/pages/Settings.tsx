import { PageLayout } from '../components/layout/PageLayout';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon, Monitor, Shield, Database, Globe } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

  const themeOptions = [
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <PageLayout title="Settings" subtitle="Preferensi tampilan dan informasi koneksi">
      {/* Theme */}
      <div className="mb-6 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--gc-text)] mb-3">Tema</h3>
        <div className="flex gap-2">
          {themeOptions.map(opt => {
            const Icon = opt.icon;
            const active = theme === opt.id;
            return (
              <button key={opt.id} onClick={() => setTheme(opt.id)}
                className={`flex items-center gap-2 rounded-[var(--gc-radius)] px-4 py-2.5 text-sm font-medium transition-all border
                  ${active ? 'bg-[var(--gc-primary)]/15 border-[var(--gc-primary)]/40 text-[var(--gc-primary)]' : 'border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)]'}`}>
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--gc-text-secondary)]">Active: {effectiveTheme}</p>
      </div>

      {/* Connection Info */}
      <div className="mb-6 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--gc-text)] mb-3">Koneksi</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-[var(--gc-text-secondary)]" />
            <div>
              <p className="text-xs text-[var(--gc-text-secondary)]">API Base URL</p>
              <p className="text-sm font-mono text-[var(--gc-text)]">{baseUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-[var(--gc-text-secondary)]" />
            <div>
              <p className="text-xs text-[var(--gc-text-secondary)]">Backend</p>
              <p className="text-sm text-[var(--gc-text)]">FastAPI (Python)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-[var(--gc-text-secondary)]" />
            <div>
              <p className="text-xs text-[var(--gc-text-secondary)]">Auth</p>
              <p className="text-sm text-[var(--gc-text-secondary)]">Belum diaktifkan</p>
            </div>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--gc-text)] mb-3">Tentang</h3>
        <div className="space-y-2 text-sm text-[var(--gc-text-secondary)]">
          <p><strong className="text-[var(--gc-text)]">GARDA CYBER 2.0</strong> — Enterprise Cybersecurity Command Center</p>
          <p>Frontend: React + TypeScript + Vite + Tailwind CSS</p>
          <p>Backend: Python FastAPI</p>
          <p>Charts: Recharts</p>
          <p>Icons: Lucide</p>
        </div>
      </div>
    </PageLayout>
  );
}
