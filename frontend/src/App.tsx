import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";

import Overview from "./pages/Overview";
import AssetInventory from "./pages/AssetInventory";
import AttackSurface from "./pages/AttackSurface";
import IpIntelligence from "./pages/IpIntelligence";
import RedTeam from "./pages/RedTeam";
import BlueTeam from "./pages/BlueTeam";
import VulnerabilityManagement from "./pages/VulnerabilityManagement";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/assets" element={<AssetInventory />} />
            <Route path="/attack-surface" element={<AttackSurface />} />
            <Route path="/ip-intelligence" element={<IpIntelligence />} />
            <Route path="/red-team" element={<RedTeam />} />
            <Route path="/blue-team" element={<BlueTeam />} />
            <Route path="/vulnerabilities" element={<VulnerabilityManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
