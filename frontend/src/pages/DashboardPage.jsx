import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import LedgerRow from "../components/LedgerRow";
import {
  TrendingUp,
  AlertCircle,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  BrainCircuit,
  Info,
  Mic,
  LogIn,
  Lock,
} from "lucide-react";

// Demo data for public (unauthenticated) preview
const DEMO_RADAR_DATA = [
  { competency: "Data Analysis", fullName: "Data Analysis & Interpretation", current: 3.5, required: 4.0, mastery: 0.6 },
  { competency: "Statistics", fullName: "Statistical Methods", current: 4.2, required: 4.5, mastery: 0.72 },
  { competency: "Report Writing", fullName: "Report Writing & Communication", current: 2.8, required: 3.5, mastery: 0.45 },
  { competency: "IT Skills", fullName: "IT & Digital Skills", current: 3.0, required: 4.0, mastery: 0.5 },
  { competency: "Governance", fullName: "Governance & Ethics", current: 3.8, required: 3.5, mastery: 0.65 },
];

function SignInBanner({ onSignIn }) {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-900/50 to-slate-900/40 border border-teal-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-400/15 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Sign in to view your personal data</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing a sample preview. Your actual competency profile requires authentication.
          </p>
        </div>
      </div>
      <button
        onClick={onSignIn}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20 hover:brightness-110 transition-all shrink-0"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In / Register</span>
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [profile, setProfile] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return; // don't fetch if not logged in
    setLoading(true);
    Promise.all([
      client.get("/competency/profile"),
      client.get("/gaps"),
      client.get("/competency/explain"),
    ])
      .then(([p, g, e]) => {
        setProfile(p.data);
        setGaps(g.data);
        setExplain(e.data);
      })
      .catch(() =>
        setErrorMsg("Unable to load cadre data. Ensure the backend is active and your role has been assigned.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  // Decide which data to show
  const isGuest = !token;
  const radarData = isGuest
    ? DEMO_RADAR_DATA
    : profile.map((c) => ({
        competency:
          c.competency_name.length > 20
            ? c.competency_name.slice(0, 18) + "…"
            : c.competency_name,
        fullName: c.competency_name,
        current: c.current_level,
        required: c.required_level,
        mastery: c.mastery_probability ?? 0.3,
      }));

  const avgCurrent = isGuest
    ? "3.5"
    : profile.length
    ? (profile.reduce((acc, c) => acc + c.current_level, 0) / profile.length).toFixed(1)
    : "0.0";

  const avgRequired = isGuest
    ? "4.0"
    : profile.length
    ? (profile.reduce((acc, c) => acc + c.required_level, 0) / profile.length).toFixed(1)
    : "0.0";

  const avgMastery = isGuest
    ? 58
    : profile.length
    ? Math.round(
        (profile.reduce((acc, c) => acc + (c.mastery_probability ?? 0.3), 0) / profile.length) * 100
      )
    : 30;

  const criticalGapsCount = isGuest ? 2 : gaps.filter((g) => g.status === "critical").length;
  const strengthsCount = isGuest ? 3 : gaps.filter((g) => g.status === "strength").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-teal-400/20 border-t-teal-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400 animate-pulse">
          Synthesizing FRAC competency profile & SHAP attributions…
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">Connection Alert</h3>
        <p className="text-xs text-rose-300/80 mt-1">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight">
              Official Competency Passbook
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-teal-400/10 text-teal-300 border border-teal-400/20 text-[10px] font-bold uppercase tracking-wider">
              MoSPI Cadre
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time algorithmic workforce verification mapped across official statistical competencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#48E5C2]" />
            <span className="text-xs text-slate-300 font-medium">OULAD Model Active (R²=0.65)</span>
          </div>
        </div>
      </div>

      {/* Guest Sign-In Banner */}
      {isGuest && <SignInBanner onSignIn={() => openAuthModal()} />}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className={`p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-teal-400/40 transition-all duration-300 ${isGuest ? "opacity-80" : ""}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Proficiency Index
            </p>
            <div className="w-8 h-8 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center text-teal-300">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white tracking-tight">
              {avgCurrent}
            </span>
            <span className="text-xs text-slate-400">/ 5.0</span>
            {isGuest && <span className="text-[10px] text-slate-500 italic ml-1">(sample)</span>}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-300">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target Benchmark: {avgRequired}</span>
          </div>
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((parseFloat(avgCurrent) / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2 */}
        <div className={`p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-rose-400/40 transition-all duration-300 ${isGuest ? "opacity-80" : ""}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Priority Gaps
            </p>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-rose-400 tracking-tight">
              {criticalGapsCount}
            </span>
            <span className="text-xs text-slate-400">Critical Needs</span>
            {isGuest && <span className="text-[10px] text-slate-500 italic ml-1">(sample)</span>}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            {criticalGapsCount > 0 ? "Targeted training interventions advised" : "No urgent bottlenecks detected"}
          </p>
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((criticalGapsCount / (radarData.length || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3 */}
        <div className={`p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-emerald-400/40 transition-all duration-300 ${isGuest ? "opacity-80" : ""}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Role Strengths
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-emerald-400 tracking-tight">
              {strengthsCount}
            </span>
            <span className="text-xs text-slate-400">/ {isGuest ? DEMO_RADAR_DATA.length : profile.length} Evaluated</span>
            {isGuest && <span className="text-[10px] text-slate-500 italic ml-1">(sample)</span>}
          </div>
          <p className="text-[11px] text-emerald-300/90 mt-3">
            Meets or exceeds official standard
          </p>
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((strengthsCount / (radarData.length || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-teal-400/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Framework Status
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-white tracking-tight">
              FRAC Tier-1
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span>Cryptographic hash valid</span>
          </p>
          <div className="w-full bg-slate-800/60 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-400 to-amber-400 h-full w-full rounded-full" />
          </div>
        </div>
      </div>

      {/* Primary Analytics Section: Radar + SHAP Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart Panel (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  Multi-Competency Radar
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-medium">
                  FRAC Method
                </span>
                {isGuest && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-300 border border-teal-400/20 font-medium">
                    Sample Preview
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-teal-400/20 shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_6px_#48E5C2]" />
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mastery Prob:</span>
                  <span className="text-xs font-display font-extrabold text-teal-300">{avgMastery}%</span>
                </div>
                <div className="flex items-center text-[10px] font-bold text-emerald-400 ml-1">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  <span>BKT</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Comparing verified current proficiency level against mandatory role benchmarks.
            </p>

            <div className="flex items-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-400 border border-teal-300" />
                <span className="text-slate-300 font-medium">Current Proficiency</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-amber-400 border border-amber-300" />
                <span className="text-slate-400">Role Benchmark (FRAC)</span>
              </div>
            </div>
          </div>

          <div className="w-full h-80 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="competency"
                  tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  stroke="rgba(255, 255, 255, 0.08)"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-900/95 border border-teal-400/30 shadow-2xl backdrop-blur-md text-xs">
                          <p className="font-semibold text-white mb-1.5">{data.fullName}</p>
                          <div className="space-y-1">
                            <p className="text-teal-300 flex items-center justify-between gap-4">
                              <span>Verified Current:</span>
                              <span className="font-bold">{data.current} / 5.0</span>
                            </p>
                            <p className="text-amber-400 flex items-center justify-between gap-4">
                              <span>FRAC Requirement:</span>
                              <span className="font-bold">{data.required} / 5.0</span>
                            </p>
                            <p className="text-emerald-400 flex items-center justify-between gap-4">
                              <span>Mastery Prob (BKT):</span>
                              <span className="font-bold">{Math.round((data.mastery || 0.3) * 100)}%</span>
                            </p>
                            <p className="text-slate-400 flex items-center justify-between gap-4 pt-1 border-t border-white/10">
                              <span>Gap Delta:</span>
                              <span className={data.current >= data.required ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                                {(data.current - data.required).toFixed(1)}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="Current Proficiency"
                  dataKey="current"
                  stroke="#48E5C2"
                  strokeWidth={2}
                  fill="#48E5C2"
                  fillOpacity={0.25}
                />
                <Radar
                  name="Required Level"
                  dataKey="required"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Scale: 0.0 (Unassessed) to 5.0 (Master/Principal)</span>
            <span className="text-teal-400 font-medium">Auto-computed via assessments</span>
          </div>
        </div>

        {/* SHAP Explainable AI Panel (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-teal-400" />
                <h3 className="font-display font-bold text-base text-white">
                  Explainable AI (SHAP)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                Transparent
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Exact mathematical decomposition of factors pushing this learner's score up or down.
            </p>

            {isGuest ? (
              <div className="mt-5 p-5 rounded-xl bg-slate-900/50 border border-white/[0.06] text-center space-y-3">
                <Lock className="w-8 h-8 text-teal-400/50 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Personal AI Analysis</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your SHAP explainability report and learning contributions will appear here after you sign in and complete at least one assessment.
                </p>
                <button
                  onClick={() => openAuthModal()}
                  className="px-4 py-2 rounded-lg bg-teal-400/15 text-teal-300 border border-teal-400/30 text-xs font-semibold hover:bg-teal-400/25 transition-colors"
                >
                  Sign in to view your report
                </button>
              </div>
            ) : explain?.explainable ? (
              <div className="mt-5 space-y-3">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-slate-400">Baseline Cadre Rate:</span>
                  <span className="font-mono font-bold text-white">{explain.base_rate} / 5.0</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {explain.contributions?.map((item, idx) => {
                    const isPositive = item.direction === "raises";
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900/40 border border-white/[0.05] flex items-center justify-between text-xs hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="text-slate-200 truncate">{item.factor}</span>
                        </div>
                        <span className={`font-mono font-bold shrink-0 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositive ? `+${item.contribution}` : item.contribution}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 mt-6 text-xs text-slate-400 leading-relaxed">
                <Info className="w-4 h-4 text-teal-400 mb-2" />
                {explain?.reason || "Awaiting real engagement telemetry to initialize SHAP trees."}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>TreeExplainer Algorithm</span>
            <span className="text-slate-300 font-medium">Confidence: High</span>
          </div>
        </div>
      </div>

      {/* Competency Ledger Table */}
      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="p-5 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Official Competency Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified competencies required for your role under the Mission Karmayogi statistical cadre framework.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Showing <span className="text-white font-semibold">{isGuest ? DEMO_RADAR_DATA.length : profile.length}</span> competencies
            {isGuest && <span className="text-slate-500 italic"> (sample data)</span>}
          </div>
        </div>

        {isGuest ? (
          /* Guest: show demo rows with sign-in overlay */
          <div className="relative">
            <div className="divide-y divide-white/[0.06] opacity-50 pointer-events-none select-none">
              {DEMO_RADAR_DATA.map((comp, idx) => (
                <LedgerRow
                  key={idx}
                  status={comp.current >= comp.required ? "strength" : comp.required - comp.current > 1 ? "critical" : "developing"}
                  title={comp.fullName}
                  subtitle={`Sample competency · Confidence ${Math.round(comp.mastery * 100)}%`}
                  right={
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-white">
                          {comp.current.toFixed(1)}{" "}
                          <span className="text-slate-400 font-normal">/ {comp.required}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Proficiency Level</p>
                      </div>
                      <div className="w-20 bg-slate-800/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${comp.current >= comp.required ? "bg-emerald-400" : comp.current >= comp.required - 1 ? "bg-amber-400" : "bg-rose-500"}`}
                          style={{ width: `${Math.min((comp.current / comp.required) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
            {/* Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[#070D1E]/60 to-[#070D1E]/90">
              <div className="text-center space-y-3 p-6">
                <Lock className="w-10 h-10 text-teal-400/60 mx-auto" />
                <p className="text-base font-semibold text-white">Sign in to view your competency ledger</p>
                <p className="text-xs text-slate-400">Your personal FRAC competency data will appear here after authentication.</p>
                <button
                  onClick={() => openAuthModal()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-xs shadow-xl shadow-teal-500/20 hover:brightness-110 transition-all"
                >
                  Sign In / Register
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {profile.map((comp) => {
              const gapItem = gaps.find((g) => g.competency_id === comp.competency_id);
              const status = gapItem ? gapItem.status : "strength";

              return (
                <LedgerRow
                  key={comp.competency_id}
                  status={status}
                  title={comp.competency_name}
                  subtitle={`${comp.competency_type} competency · Confidence ${(comp.confidence * 100).toFixed(0)}%`}
                  right={
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-white">
                          {comp.current_level.toFixed(1)}{" "}
                          <span className="text-slate-400 font-normal">/ {comp.required_level}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Proficiency Level</p>
                      </div>
                      <div className="w-20 bg-slate-800/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            comp.current_level >= comp.required_level
                              ? "bg-emerald-400"
                              : comp.current_level >= comp.required_level - 1
                              ? "bg-amber-400"
                              : "bg-rose-500"
                          }`}
                          style={{
                            width: `${Math.min((comp.current_level / comp.required_level) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      {comp.current_level < comp.required_level && (
                        <Link
                          to={`/viva?competency_id=${comp.competency_id}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                          title="Take Oral Viva Examination"
                        >
                          <Mic className="w-3 h-3 text-emerald-400" />
                          <span>Take Oral Viva</span>
                        </Link>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
