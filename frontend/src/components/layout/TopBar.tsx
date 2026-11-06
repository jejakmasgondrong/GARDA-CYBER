import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Command, Bell, Wifi, WifiOff, Sun, Moon, User,
  LayoutDashboard, Server, Radar, Globe, Bug, ShieldCheck,
  Swords, ListTodo, Plug, FileBarChart, ClipboardList, Settings,
  SearchIcon, FileWarning, AlertOctagon,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { StatusIndicator } from '../ui/StatusIndicator';

interface TopBarProps {
  title: string;
}

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  group: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'Navigation' },
  { id: 'assets', label: 'Asset Inventory', path: '/assets', icon: Server, group: 'Navigation' },
  { id: 'attack-surface', label: 'Attack Surface', path: '/attack-surface', icon: Radar, group: 'Navigation' },
  { id: 'ip-intel', label: 'IP Intelligence', path: '/ip-intelligence', icon: Globe, group: 'Navigation' },
  { id: 'osint', label: 'OSINT Intelligence', path: '/osint', icon: SearchIcon, group: 'Navigation' },
  { id: 'vuln', label: 'Vulnerability Management', path: '/vulnerabilities', icon: Bug, group: 'Operations' },
  { id: 'findings', label: 'Findings', path: '/findings', icon: FileWarning, group: 'Operations' },
  { id: 'incidents', label: 'Incident Management', path: '/incidents', icon: AlertOctagon, group: 'Operations' },
  { id: 'red-team', label: 'Red Team', path: '/red-team', icon: Swords, group: 'Operations' },
  { id: 'blue-team', label: 'Blue Team', path: '/blue-team', icon: ShieldCheck, group: 'Operations' },
  { id: 'jobs', label: 'Job Manager', path: '/jobs', icon: ListTodo, group: 'System' },
  { id: 'integrations', label: 'Integrations', path: '/integrations', icon: Plug, group: 'System' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: FileBarChart, group: 'System' },
  { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList, group: 'System' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, group: 'System' },
];

export function TopBar({ title }: TopBarProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { effectiveTheme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'idle'>('idle');

  // Check backend health
  useEffect(() => {
    const checkBackend = () => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
      fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok ? setBackendStatus('online') : setBackendStatus('offline'))
        .catch(() => setBackendStatus('offline'));
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (cmdOpen) { inputRef.current?.focus(); setCmdQuery(''); }
  }, [cmdOpen]);

  const filteredItems = cmdQuery
    ? COMMAND_ITEMS.filter(i => i.label.toLowerCase().includes(cmdQuery.toLowerCase()))
    : COMMAND_ITEMS;

  const groupedItems = filteredItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setCmdOpen(false);
  }, [navigate]);

  const toggleTheme = () => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--gc-border)] bg-[var(--gc-bg)]/80 backdrop-blur-sm px-4 py-2.5 lg:px-6">
        {/* Left: title & breadcrumb */}
        <div className="min-w-0 pl-12 lg:pl-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--gc-text-secondary)]">
            <span>GARDA CYBER</span>
            <span>/</span>
            <span className="text-[var(--gc-text)] font-medium truncate">{title}</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Search / Command palette trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-[var(--gc-radius)] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-1.5 text-xs text-[var(--gc-text-secondary)] hover:border-[var(--gc-primary)]/40 transition-colors"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-4 rounded border border-[var(--gc-border)] bg-[var(--gc-bg)] px-1.5 py-0.5 text-[10px] font-mono">
              <Command className="inline h-2.5 w-2.5" />K
            </kbd>
          </button>
          <button
            onClick={() => setCmdOpen(true)}
            className="flex sm:hidden items-center justify-center h-9 w-9 rounded-[var(--gc-radius)] text-[var(--gc-text-secondary)] hover:bg-[var(--gc-surface)]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Connection status */}
          <div className="hidden md:flex items-center gap-2 px-2">
            {isOnline ? (
              <StatusIndicator status={backendStatus === 'online' ? 'online' : backendStatus === 'offline' ? 'error' : 'idle'}
                label={backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Backend offline' : 'Checking...'} pulse={backendStatus === 'online'} />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gc-critical)]">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </span>
            )}
          </div>

          {/* Notifications placeholder (disabled - no backend support) */}
          <button
            disabled
            className="flex items-center justify-center h-9 w-9 rounded-[var(--gc-radius)] text-[var(--gc-text-secondary)] opacity-40 cursor-not-allowed"
            aria-label="Notifications (coming soon)"
            title="Notifikasi belum tersedia dari backend"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-9 w-9 rounded-[var(--gc-radius)] text-[var(--gc-text-secondary)] hover:bg-[var(--gc-surface)] hover:text-[var(--gc-text)] transition-colors"
            aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {effectiveTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User avatar placeholder */}
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--gc-primary)]/15 text-[var(--gc-primary)]">
            <User className="h-4 w-4" />
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-[var(--gc-warning)]/10 border-b border-[var(--gc-warning)]/30 px-4 py-2 text-center text-xs text-[var(--gc-warning)] flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          Koneksi internet terputus. Beberapa fitur mungkin tidak tersedia.
        </div>
      )}

      {/* Backend offline banner */}
      {isOnline && backendStatus === 'offline' && (
        <div className="bg-[var(--gc-critical)]/10 border-b border-[var(--gc-critical)]/30 px-4 py-2 text-center text-xs text-[var(--gc-critical)] flex items-center justify-center gap-2">
          <Wifi className="h-3.5 w-3.5" />
          Backend tidak terjangkau. Jalankan server FastAPI untuk menampilkan data.
        </div>
      )}

      {/* Command Palette Modal */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCmdOpen(false)} />
          <div className="relative w-full max-w-lg mx-4 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center gap-2 border-b border-[var(--gc-border)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--gc-text-secondary)]" />
              <input
                ref={inputRef}
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                placeholder="Cari halaman atau aksi..."
                className="flex-1 bg-transparent text-sm text-[var(--gc-text)] placeholder:text-[var(--gc-text-secondary)]/60 outline-none"
              />
              <kbd className="rounded border border-[var(--gc-border)] bg-[var(--gc-bg)] px-1.5 py-0.5 text-[10px] text-[var(--gc-text-secondary)]">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {Object.entries(groupedItems).map(([group, items]) => (
                <div key={group}>
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gc-text-secondary)]/60">{group}</p>
                  {items.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.path)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--gc-text)] hover:bg-[var(--gc-surface)] transition-colors"
                      >
                        <Icon className="h-4 w-4 text-[var(--gc-text-secondary)]" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-[var(--gc-text-secondary)]">Tidak ditemukan</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
