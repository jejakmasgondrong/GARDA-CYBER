import { NavLink } from "react-router-dom";
import {
  LayoutGrid, Database, Radar, Swords, ShieldCheck, Globe,
  AlertTriangle, FileText, History, Plug, Settings as SettingsIcon,
} from "lucide-react";

const NAV_GROUPS = [
  { label: "Ringkasan", items: [{ to: "/", label: "Overview", icon: LayoutGrid }] },
  {
    label: "Permukaan",
    items: [
      { to: "/assets", label: "Asset Inventory", icon: Database },
      { to: "/attack-surface", label: "Attack Surface", icon: Radar },
      { to: "/ip-intelligence", label: "IP Intelligence", icon: Globe },
    ],
  },
  {
    label: "Operasi",
    items: [
      { to: "/red-team", label: "Red Team", icon: Swords },
      { to: "/blue-team", label: "Blue Team", icon: ShieldCheck },
      { to: "/vulnerabilities", label: "Vulnerability Mgmt", icon: AlertTriangle },
    ],
  },
  {
    label: "Tata Kelola",
    items: [
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/audit-logs", label: "Audit Logs", icon: History },
    ],
  },
  {
    label: "Sistem",
    items: [
      { to: "/integrations", label: "Integrations", icon: Plug },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col overflow-y-auto border-r border-[#1c2740] bg-[#0a0f1a] text-[#dfe4ee]">
      <div className="flex items-center gap-2.5 border-b border-[#1c2740] px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2b4ad1] text-[11px] font-extrabold">
          GC
        </div>
        <div>
          <b className="block text-sm">GARDA CYBER</b>
          <span className="text-[10.5px] text-[#7b84a0]">Security Operations Platform</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <h6 className="mb-1.5 mt-3 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#5f6886]">
              {group.label}
            </h6>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium ${
                    isActive ? "bg-[#121a2b] text-white shadow-[inset_2px_0_0_#2b4ad1]" : "text-[#aeb6c9] hover:bg-[#141c30] hover:text-white"
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-[#243156] bg-[#19233a] p-2.5 text-[10.5px] leading-relaxed text-[#9aa5c0]">
        <b className="block text-[10.5px] text-[#e2a23b]">LOCAL DEV — BACKEND BELUM TERHUBUNG</b>
        Jalankan backend FastAPI lalu isi VITE_API_BASE_URL untuk menyambungkan data nyata.
      </div>
    </aside>
  );
}
