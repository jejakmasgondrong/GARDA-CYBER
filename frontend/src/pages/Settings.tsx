import { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useTheme } from '../hooks/useTheme';
import { getApiKey, setApiKey } from '../lib/apiClient';
import { Sun, Moon, Monitor, Shield, Database, Globe, KeyRound } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [saved, setSaved] = useState(false);

  const simpanApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(apiKey);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

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
              <p className="text-sm text-[var(--gc-text-secondary)]">
                {getApiKey() ? 'API key terpasang (X-API-Key)' : 'Belum diaktifkan'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="mb-6 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[var(--gc-text-secondary)]" />
          <h3 className="text-sm font-semibold text-[var(--gc-text)]">API Key</h3>
        </div>
        <form onSubmit={simpanApiKey} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKeyState(e.target.value)}
            placeholder="Kosongkan kalau backend tidak memakai API_KEY"
            className="flex-1 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 text-sm text-[var(--gc-text)] placeholder:text-[var(--gc-text-secondary)]/60 focus:border-[var(--gc-primary)] focus:ring-1 focus:ring-[var(--gc-primary)] outline-none"
          />
          <button type="submit"
            className="rounded-[var(--gc-radius)] bg-[var(--gc-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all">
            Simpan
          </button>
          {apiKey && (
            <button type="button"
              onClick={() => { setApiKeyState(''); setApiKey(''); }}
              className="rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-4 py-2.5 text-sm text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)] transition-all">
              Hapus
            </button>
          )}
        </form>
        <p className="mt-2 text-xs leading-relaxed text-[var(--gc-text-secondary)]">
          Hanya perlu diisi kalau backend menyalakan <code className="font-mono">API_KEY</code> di
          <code className="font-mono"> backend/.env</code>. Nilainya dikirim sebagai header
          <code className="font-mono"> X-API-Key</code> dan disimpan di localStorage browser ini
          (bukan di server). {saved && <span className="text-[var(--gc-success)]">Tersimpan.</span>}
        </p>
      </div>

      {/* App Info */}
      <div className="rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--gc-text)] mb-3">Tentang</h3>
        <div className="space-y-2 text-sm text-[var(--gc-text-secondary)]">
          <p><strong className="text-[var(--gc-text)]">GARDA CYBER 2.0</strong> — Enterprise Cybersecurity Command Center</p>
          <p>Versi aplikasi: <strong className="text-[var(--gc-text)]">v{__APP_VERSION__}</strong></p>
          <p>Frontend: React + TypeScript + Vite + Tailwind CSS</p>
          <p>Backend: Python FastAPI</p>
          <p>Charts: Recharts</p>
          <p>Icons: Lucide</p>
        </div>
      </div>
    </PageLayout>
  );
}
