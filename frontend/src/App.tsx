import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Skeleton } from './components/ui/Skeleton';

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AssetInventory = lazy(() => import('./pages/AssetInventory'));
const AttackSurface = lazy(() => import('./pages/AttackSurface'));
const IpIntelligence = lazy(() => import('./pages/IpIntelligence'));
const OsintIntelligence = lazy(() => import('./pages/OsintIntelligence'));
const VulnerabilityManagement = lazy(() => import('./pages/VulnerabilityManagement'));
const Findings = lazy(() => import('./pages/Findings'));
const IncidentManagement = lazy(() => import('./pages/IncidentManagement'));
const RedTeam = lazy(() => import('./pages/RedTeam'));
const BlueTeam = lazy(() => import('./pages/BlueTeam'));
const JobManager = lazy(() => import('./pages/JobManager'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Reports = lazy(() => import('./pages/Reports'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div className="flex-1 p-6">
      <Skeleton className="mb-4 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-96" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[var(--gc-bg)]">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<AssetInventory />} />
              <Route path="/attack-surface" element={<AttackSurface />} />
              <Route path="/ip-intelligence" element={<IpIntelligence />} />
              <Route path="/osint" element={<OsintIntelligence />} />
              <Route path="/vulnerabilities" element={<VulnerabilityManagement />} />
              <Route path="/findings" element={<Findings />} />
              <Route path="/incidents" element={<IncidentManagement />} />
              <Route path="/red-team" element={<RedTeam />} />
              <Route path="/blue-team" element={<BlueTeam />} />
              <Route path="/jobs" element={<JobManager />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  );
}
