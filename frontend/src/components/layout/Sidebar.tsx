import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Server, Radar, Globe, Search as SearchIcon,
  Bug, FileWarning, AlertOctagon, Swords, ShieldCheck,
  ListTodo, Plug, FileBarChart, ClipboardList, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Menu, X, Shield,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'ASSET & INTELLIGENCE',
    items: [
      { to: '/assets', label: 'Asset Inventory', icon: Server },
      { to: '/attack-surface', label: 'Attack Surface', icon: Radar },
      { to: '/ip-intelligence', label: 'IP Intelligence', icon: Globe },
      { to: '/osint', label: 'OSINT Intelligence', icon: SearchIcon },
    ],
  },
  {
    label: 'SECURITY OPERATIONS',
    items: [
      { to: '/vulnerabilities', label: 'Vulnerability Mgmt', icon: Bug },
      { to: '/findings', label: 'Findings', icon: FileWarning },
      { to: '/incidents', label: 'Incident Mgmt', icon: AlertOctagon },
      { to: '/red-team', label: 'Red Team', icon: Swords },
      { to: '/blue-team', label: 'Blue Team', icon: ShieldCheck },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/jobs', label: 'Job Manager', icon: ListTodo },
      { to: '/integrations', label: 'Integrations', icon: Plug },
      { to: '/reports', label: 'Reports', icon: FileBarChart },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close mobile nav on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);

  const sidebarWidth = collapsed ? 'w-[60px]' : 'w-[240px]';

  const navContent = (
    <>
      {/* Brand */}
      <div className={`flex items-center gap-2.5 border-b border-[var(--gc-border)] px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--gc-radius)] bg-[var(--gc-primary)] text-white">
          <Shield className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-sm font-bold text-[var(--gc-text)] truncate">GARDA CYBER</span>
            <span className="block text-[10px] text-[var(--gc-text-secondary)] truncate">Security Operations Platform</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <h6 className="mb-1 mt-3 px-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--gc-text-secondary)]/60">
                {group.label}
              </h6>
            )}
            {collapsed && <div className="my-2 mx-2 h-px bg-[var(--gc-border)]" />}
            {group.items.map(({ to, label, icon: Icon }) => {
              const link = (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-2.5 rounded-[var(--gc-radius)] px-2.5 py-2 text-[13px] font-medium transition-all duration-150
                    ${collapsed ? 'justify-center px-0' : ''}
                    ${isActive
                      ? 'bg-[var(--gc-primary)]/10 text-[var(--gc-primary)] shadow-[inset_3px_0_0_var(--gc-primary)]'
                      : 'text-[var(--gc-text-secondary)] hover:bg-[var(--gc-surface)] hover:text-[var(--gc-text)]'
                    }`
                  }
                  aria-label={label}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              );

              if (collapsed) {
                return <Tooltip key={to} content={label} side="right">{link}</Tooltip>;
              }
              return link;
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:flex border-t border-[var(--gc-border)] p-2">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-[var(--gc-radius)] p-2 text-[var(--gc-text-secondary)] hover:bg-[var(--gc-surface)] hover:text-[var(--gc-text)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex lg:hidden items-center justify-center h-10 w-10 rounded-[var(--gc-radius)] bg-[var(--gc-card)] border border-[var(--gc-border)] text-[var(--gc-text-secondary)]"
        aria-label="Open menu"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex h-full w-[260px] flex-col bg-[var(--gc-sidebar)] shadow-2xl animate-slide-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 p-2 text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex h-screen flex-shrink-0 flex-col bg-[var(--gc-sidebar)] border-r border-[var(--gc-border)] transition-all duration-200 ${sidebarWidth}`}
      >
        {navContent}
      </aside>
    </>
  );
}
