import { useEffect, useState, useCallback, useRef } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import {
  Users,
  AlertTriangle,
  Building2,
  RefreshCw,
  Search,
  LogIn,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Shield,
  ShieldCheck,
  Eye,
  X,
  Award,
  Mail,
} from "lucide-react";

function formatRelativeTime(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 10) return "Just now";
  if (diffInSec < 60) return `${diffInSec}s ago`;
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function parseUserAgent(ua) {
  if (!ua) return "Web Browser";
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Google Chrome";
  if (ua.includes("Firefox/")) return "Mozilla Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Apple Safari";
  if (ua.includes("Postman") || ua.includes("python")) return "API Client";
  return "Web Browser";
}

export default function AdminPage() {
  const { token, learner } = useAuth();
  const { openAuthModal } = useAuthModal();
  const isGuest = !token;

  const [activeTab, setActiveTab] = useState("learners"); // "learners" | "logins" | "cohort"
  const [stats, setStats] = useState(null);
  const [learners, setLearners] = useState([]);
  const [loginAudits, setLoginAudits] = useState([]);
  const [cohortData, setCohortData] = useState(null);
  const [positions, setPositions] = useState([]);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [selectedCadre, setSelectedCadre] = useState("");
  const [sortOrder, setSortOrder] = useState("name_asc");

  // Sync & Status
  const [loading, setLoading] = useState(!isGuest);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [error, setError] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);

  // Student Dossier Drawer/Modal
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);

  const isFirstLoad = useRef(true);

  // Fetch Positions (public - fine without auth)
  useEffect(() => {
    client
      .get("/positions")
      .then((res) => setPositions(res.data))
      .catch(() => {});
  }, []);

  // Centralized Fetch function — only runs when authenticated
  const fetchAllData = useCallback(
    async (isManual = false) => {
      if (!token) return; // Don't fetch admin data without auth
      if (isManual) setRefreshing(true);

      try {
        const [statsRes, learnersRes, auditsRes, cohortRes] = await Promise.all([
          client.get("/admin/stats"),
          client.get("/admin/learners", {
            params: {
              search: search || undefined,
              sort: sortOrder,
              position_id: selectedCadre || undefined,
            },
          }),
          client.get("/admin/login-audits", { params: { limit: 50 } }),
          client.get("/admin/cohort-overview"),
        ]);

        setStats(statsRes.data);
        setLearners(learnersRes.data);
        setLoginAudits(auditsRes.data);
        setCohortData(cohortRes.data);
        setLastSyncTime(new Date());
        setError("");
      } catch (err) {
        if (err.response?.status === 403) {
          setError(
            "Access Restricted: This account does not have Administrator privileges. Please verify with an authorized Admin or bootstrap below."
          );
        } else {
          setError("Unable to synchronize with Supabase database.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, search, sortOrder, selectedCadre]
  );

  // Initial load
  useEffect(() => {
    if (!token) return;
    fetchAllData();
    isFirstLoad.current = false;
  }, [fetchAllData, token]);

  // Real-time Parallel Sync (Auto-refresh every 10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAllData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  // Fetch individual student dossier
  const handleOpenDossier = async (learnerId) => {
    setSelectedLearnerId(learnerId);
    setDossierLoading(true);
    try {
      const res = await client.get(`/admin/learners/${learnerId}`);
      setDossier(res.data);
    } catch {
      // fallback
    } finally {
      setDossierLoading(false);
    }
  };

  // Toggle Admin Role
  const handleToggleRole = async (learnerId, currentRole) => {
    setRoleUpdating(true);
    try {
      const res = await client.patch(`/admin/learners/${learnerId}/role`, {
        is_admin: !currentRole,
      });
      // Update local state in learners list
      setLearners((prev) =>
        prev.map((l) => (l.id === learnerId ? { ...l, is_admin: res.data.is_admin } : l))
      );
      // Update dossier if open
      if (dossier?.profile?.id === learnerId) {
        setDossier((prev) => ({
          ...prev,
          profile: { ...prev.profile, is_admin: res.data.is_admin },
        }));
      }
    } catch (err) {
      alert("Failed to update role: " + (err.response?.data?.detail || err.message));
    } finally {
      setRoleUpdating(false);
    }
  };

  // Bootstrap Admin for current session
  const handleBootstrapAdmin = async () => {
    setClaimLoading(true);
    try {
      await client.post("/admin/bootstrap-admin");
      setError("");
      fetchAllData(true);
    } catch (err) {
      alert(err.response?.data?.detail || "Not authorized to claim admin role automatically.");
    } finally {
      setClaimLoading(false);
    }
  };

  if (isGuest) {
    return (
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight">
                Admin Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                Restricted
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Centralized cadre intelligence, user management, and system analytics for authorized administrators.
            </p>
          </div>
        </div>

        {/* Auth Required Banner */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900/40 border border-amber-500/20 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Admin Authentication Required</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The Admin Command Center is restricted to authorized administrators only. Sign in with your admin account to access cadre analytics, user management, and system data.
          </p>
          <button
            onClick={() => openAuthModal()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 hover:brightness-110 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In as Admin</span>
          </button>
        </div>

        {/* Preview tabs (non-functional) */}
        <div className="rounded-2xl glass-panel p-6 opacity-40 pointer-events-none select-none">
          <div className="flex items-center gap-3 mb-6">
            {["Cadre Learners", "Login Audit Log", "Cohort Overview"].map((tab) => (
              <div key={tab} className="px-4 py-2 rounded-xl bg-slate-800/60 border border-white/10 text-xs font-medium text-slate-400">
                {tab}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-900/50 border border-white/[0.05] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-teal-400/20 border-t-teal-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Connecting to Supabase PostgreSQL & synchronizing cadre intelligence…
        </p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="p-8 rounded-2xl glass-panel border border-amber-500/20 text-center max-w-lg mx-auto mt-12 space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Administrator Privileges Required</h3>
        <p className="text-xs text-amber-200/80 leading-relaxed">{error}</p>
        <div className="pt-2">
          <button
            type="button"
            disabled={claimLoading}
            onClick={handleBootstrapAdmin}
            className="px-5 py-2.5 rounded-xl bg-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {claimLoading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Authorizing…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Claim Administrator Role</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-16">
      {/* Top Header & Supabase Live Status Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
              Executive Cadre Administration
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-teal-400/10 text-teal-300 border border-teal-400/20 text-[10px] font-bold uppercase tracking-wider">
              Control Panel
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time synchronization with Supabase PostgreSQL · Session activity audits, A-to-Z student dossiers & cadre governance.
          </p>
        </div>

        {/* Live Status & Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Supabase Connection Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Supabase DB · Live</span>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              autoRefresh
                ? "bg-teal-500/15 border-teal-400/30 text-teal-300"
                : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Auto-Sync: {autoRefresh ? "ON (10s)" : "OFF"}
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            disabled={refreshing}
            onClick={() => fetchAllData(true)}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh now from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-400" : ""}`} />
          </button>

          {lastSyncTime && (
            <span className="text-[11px] text-slate-500 hidden xl:inline">
              Updated {formatRelativeTime(lastSyncTime)}
            </span>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Enrolled Students
            </p>
            <div className="w-8 h-8 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center text-teal-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-display font-extrabold text-white tracking-tight">
            {stats?.total_learners ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">A-to-Z cadre directory</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Login Sessions Tracked
            </p>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-display font-extrabold text-indigo-300 tracking-tight">
            {stats?.total_logins ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Audited in Supabase DB</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Officers Today
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-display font-extrabold text-emerald-400 tracking-tight">
            {stats?.active_today ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Signed in past 24 hours</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Critical Deficits
            </p>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-display font-extrabold text-rose-400 tracking-tight">
            {stats?.total_critical_gaps ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Capacity gaps &ge; 2.0</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex rounded-2xl bg-slate-900/80 p-1.5 border border-white/[0.08] w-full max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab("learners")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === "learners"
              ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Students Directory (A-Z)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/20 font-mono">
            {learners.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logins")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === "logins"
              ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Who Logged In</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/20 font-mono">
            {loginAudits.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cohort")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === "cohort"
              ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Cadre Deficit Heatmap</span>
        </button>
      </div>

      {/* TAB 1: LEARNERS & STUDENTS DIRECTORY (A TO Z) */}
      {activeTab === "learners" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search student by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Cadre Filter */}
              <select
                value={selectedCadre}
                onChange={(e) => setSelectedCadre(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-400"
              >
                <option value="">All Statistical Cadres</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-400"
              >
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="recent_login">Recently Signed In</option>
                <option value="logins">Most Active (Logins)</option>
                <option value="newest">Newest Enrolled</option>
              </select>
            </div>
          </div>

          {/* Learners Table */}
          <div className="rounded-2xl glass-panel border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Student Officer</th>
                    <th className="py-3 px-4">Cadre & Department</th>
                    <th className="py-3 px-4">Academic & Exp</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4">Competency State</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {learners.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    learners.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Student Officer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                              {l.name ? l.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-white group-hover:text-teal-300 transition-colors">
                                {l.name}
                              </p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {l.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Cadre & Department */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-200">{l.position_title}</p>
                          <p className="text-[11px] text-slate-500">{l.department}</p>
                        </td>

                        {/* Academic & Exp */}
                        <td className="py-3.5 px-4">
                          <p className="text-slate-300 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                            {l.qualification}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {l.experience_years} yr{l.experience_years !== 1 ? "s" : ""} exp
                          </p>
                        </td>

                        {/* Last Login */}
                        <td className="py-3.5 px-4">
                          <p className="text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-teal-400" />
                            {formatRelativeTime(l.last_login_at)}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {l.login_count} session{l.login_count !== 1 ? "s" : ""}
                          </span>
                        </td>

                        {/* Competency State */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-[11px]">
                                {l.avg_competency_score.toFixed(1)} / 5.0
                              </span>
                              {l.critical_gaps_count > 0 ? (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                  {l.critical_gaps_count} Gaps
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                  Aligned
                                </span>
                              )}
                            </div>
                            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full"
                                style={{ width: `${Math.min((l.avg_competency_score / 5) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {l.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                              <Shield className="w-3 h-3 text-amber-400" />
                              ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-white/10 text-slate-400 text-[10px] font-medium">
                              OFFICER
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(l.id)}
                              className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Dossier</span>
                            </button>
                            <button
                              type="button"
                              disabled={roleUpdating}
                              onClick={() => handleToggleRole(l.id, l.is_admin)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                                l.is_admin
                                  ? "bg-slate-800 border-white/10 text-slate-400 hover:text-rose-300"
                                  : "bg-slate-800 border-white/10 text-slate-400 hover:text-amber-300"
                              }`}
                              title={l.is_admin ? "Demote to Officer" : "Promote to Admin"}
                            >
                              {l.is_admin ? "Demote" : "Make Admin"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REAL-TIME LOGIN AUDIT LOG ("WHO LOGGED IN") */}
      {activeTab === "logins" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing live real-time authentication events recorded in Supabase PostgreSQL (most recent 50).
            </p>
            <span className="text-[11px] text-slate-500">
              Total Logins in Supabase: <strong className="text-teal-400">{stats?.total_logins ?? 0}</strong>
            </span>
          </div>

          <div className="rounded-2xl glass-panel border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Time & Date</th>
                    <th className="py-3 px-4">Officer / Email</th>
                    <th className="py-3 px-4">Auth Provider</th>
                    <th className="py-3 px-4">Device & Client</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {loginAudits.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        No login audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginAudits.map((a) => (
                      <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-200">
                            {formatRelativeTime(a.created_at)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {a.created_at
                              ? new Date(a.created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : "N/A"}
                          </p>
                        </td>

                        {/* Officer Email */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-white">{a.name || "Authenticated Officer"}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{a.email}</p>
                        </td>

                        {/* Provider */}
                        <td className="py-3.5 px-4">
                          {a.login_method === "google_oauth" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-white/10 text-[11px] text-slate-200 font-medium">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                <path
                                  fill="#EA4335"
                                  d="M12 5c1.54 0 2.93.56 4.02 1.48l3.01-3.01C17.21 1.77 14.77 1 12 1 7.42 1 3.55 3.6 1.72 7.37l3.66 2.84C6.26 7.35 8.9 5 12 5z"
                                />
                                <path
                                  fill="#4285F4"
                                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.66 2.84c2.14-1.98 3.76-4.91 3.76-8.66z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.38 14.79c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.72 7.63C.62 9.8 0 12 0 14.37s.62 4.57 1.72 6.74l3.66-2.84z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.66-2.84c-1.07.72-2.45 1.16-4.27 1.16-3.1 0-5.74-2.35-6.62-5.21L1.72 16.03C3.55 19.8 7.42 23 12 23z"
                                />
                              </svg>
                              <span>Google OAuth</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-white/10 text-[11px] text-slate-300 font-medium">
                              <Mail className="w-3.5 h-3.5 text-teal-400" />
                              <span>Email / Password</span>
                            </span>
                          )}
                        </td>

                        {/* Device */}
                        <td className="py-3.5 px-4">
                          <p className="text-slate-300">{parseUserAgent(a.user_agent)}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]" title={a.user_agent}>
                            {a.user_agent || "Direct connection"}
                          </p>
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {a.ip_address || "127.0.0.1"}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-right">
                          {a.status === "SUCCESS" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              SUCCESS
                            </span>
                          )}
                          {a.status === "BLOCKED_UNVERIFIED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              UNVERIFIED
                            </span>
                          )}
                          {a.status === "FAILED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              REJECTED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CADRE DEFICIT HEATMAP (COHORT OVERVIEW) */}
      {activeTab === "cohort" && cohortData && (
        <div className="space-y-6">
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Institutional Cadres & Deficit Intensity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mission Karmayogi FRAC-aligned competence analysis across statistical positions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {cohortData.positions.map((pos) => (
              <div key={pos.position_id} className="rounded-2xl glass-panel overflow-hidden border border-white/[0.08]">
                <div className="p-5 border-b border-white/[0.07] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {pos.position_title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{pos.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-medium">
                      {pos.learner_count} Enrolled Officer{pos.learner_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-white/[0.05]">
                  {pos.top_gaps.map((g) => (
                    <div
                      key={g.competency_id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{g.name}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {g.type} competency ·{" "}
                          <span className="text-rose-400 font-medium">
                            {g.critical_count} officer{g.critical_count !== 1 ? "s" : ""} in critical range
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono font-bold text-white">
                            Avg Gap: {g.avg_gap.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-36 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-rose-500 h-full rounded-full"
                            style={{ width: `${Math.min((g.avg_gap / 5) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STUDENT DOSSIER MODAL / SLIDE-OVER */}
      {selectedLearnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl glass-panel border border-white/15 p-6 space-y-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                  {dossier?.profile?.name ? dossier.profile.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">{dossier?.profile?.name || "Student"}</h3>
                    {dossier?.profile?.is_admin ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        ADMIN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                        OFFICER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{dossier?.profile?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedLearnerId(null);
                  setDossier(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dossierLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-teal-400/20 border-t-teal-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading student dossier from Supabase…</p>
              </div>
            ) : dossier ? (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {/* Profile Key Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Cadre</span>
                    <span className="text-xs font-semibold text-slate-200">{dossier.profile.position_title}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Department</span>
                    <span className="text-xs font-semibold text-slate-200">{dossier.profile.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Qualification</span>
                    <span className="text-xs font-semibold text-slate-200">{dossier.profile.qualification}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Experience</span>
                    <span className="text-xs font-semibold text-slate-200">{dossier.profile.experience_years} Years</span>
                  </div>
                </div>

                {/* Role Switcher Action */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-white/10">
                  <div>
                    <p className="text-xs font-bold text-white">Administrative Access</p>
                    <p className="text-[11px] text-slate-400">
                      {dossier.profile.is_admin
                        ? "This student currently has full administrator privileges."
                        : "Standard officer access. Click promote to grant admin rights."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={roleUpdating}
                    onClick={() => handleToggleRole(dossier.profile.id, dossier.profile.is_admin)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dossier.profile.is_admin
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                        : "bg-teal-400 text-slate-950 hover:brightness-110"
                    }`}
                  >
                    {dossier.profile.is_admin ? "Demote from Admin" : "Promote to Admin"}
                  </button>
                </div>

                {/* Competencies Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-400" />
                    <span>FRAC Competencies Breakdown ({dossier.competencies.length})</span>
                  </h4>

                  <div className="space-y-2.5">
                    {dossier.competencies.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.06] flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{c.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {c.type}
                            </span>
                            {c.is_critical && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                                Deficit
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-slate-400">
                              Current: <strong>{c.current_level}</strong> / Req: <strong>{c.required_level}</strong>
                            </span>
                            <div className="w-32 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  c.is_critical
                                    ? "bg-gradient-to-r from-amber-400 to-rose-500"
                                    : "bg-gradient-to-r from-teal-400 to-emerald-400"
                                }`}
                                style={{ width: `${Math.min((c.current_level / c.required_level) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono font-bold ${c.gap > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {c.gap > 0 ? `Gap: -${c.gap}` : "Proficient"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quiz History */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <span>Evaluation Quizzes Completed ({dossier.quizzes.length})</span>
                  </h4>
                  {dossier.quizzes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No quiz attempts recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-white/[0.06] rounded-xl bg-slate-900/70 border border-white/[0.06]">
                      {dossier.quizzes.map((q) => (
                        <div key={q.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">{q.quiz_title}</p>
                            <p className="text-[10px] text-slate-500">{formatRelativeTime(q.submitted_at)}</p>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                              q.score >= 70 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            Score: {q.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Personal Login Audits */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Recent Sign-In History ({dossier.login_history.length})</span>
                  </h4>
                  {dossier.login_history.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No login records found for this email.</p>
                  ) : (
                    <div className="divide-y divide-white/[0.06] rounded-xl bg-slate-900/70 border border-white/[0.06]">
                      {dossier.login_history.map((h) => (
                        <div key={h.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="text-slate-300 font-medium">{h.login_method === "google_oauth" ? "Google Sign-In" : "Email & Password"}</p>
                            <p className="text-[10px] text-slate-500">{parseUserAgent(h.user_agent)} · IP: {h.ip_address || "127.0.0.1"}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-emerald-400 text-[10px] block">{h.status}</span>
                            <span className="text-[10px] text-slate-500">{formatRelativeTime(h.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
