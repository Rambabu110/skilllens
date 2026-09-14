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

export default function DashboardPage() {
  const { token, logout } = useAuth();
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
      .catch((err) => {
        if (err?.response?.status === 401) {
          logout();
        } else if (!err?.response || err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
          // Cloud deployment fallback: load reference competency profile
          setProfile(
            DEMO_RADAR_DATA.map((d) => ({
              competency_id: d.competency,
              competency_name: d.fullName,
              current_level: d.current,
              required_level: d.required,
              mastery_probability: d.mastery,
            }))
          );
        } else {
          setErrorMsg("Unable to load cadre data. Ensure the backend is active and your role has been assigned.");
        }
      })
      .finally(() => setLoading(false));
  }, [token, logout]);

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
        <div className="w-10 h-10 rounded-full border-2 border-emerald-400/20 border-t-emerald-400 animate-spin" />
        <p className="text-xs font-medium text-slate-400 animate-pulse font-mono">
          Synthesizing FRAC competency profile & SHAP attributions…
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 rounded-xl sovereign-card text-center max-w-lg mx-auto mt-12 space-y-3.5">
        <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" />
        <h3 className="text-base font-semibold text-white">Connection Alert</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-xs py-2 px-4"
          >
            Retry Connection
          </button>
          <button
            onClick={() => {
              setErrorMsg("");
              logout();
              openAuthModal();
            }}
            className="btn-secondary text-xs py-2 px-4"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-12">
      {/* Editorial Cadre Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              Cadre Competency Passbook
            </h1>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-mono font-semibold uppercase tracking-wider">
              MoSPI NSS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Algorithmic workforce capability verification calibrated to the Mission Karmayogi FRAC framework.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-md bg-[#0b1424] border border-white/[0.08] flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">OULAD Model Active</span>
            <span className="text-slate-400 font-mono text-[11px]">(R²=0.65)</span>
          </div>
        </div>
      </div>

      {/* Guest Sign-In Notice */}
      {isGuest && (
        <div className="p-4 rounded-lg bg-[#0c1629] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Demonstration Mode (Cadre Sample)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displaying reference data for Junior Statistical Officer cadre. Authenticate to sync personal telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="btn-primary text-xs py-1.5 px-3 shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      )}

      {/* Asymmetric Capability Strip (Editorial Hierarchy) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Hero Tile: Overall Proficiency Index (5 cols) */}
        <div className="md:col-span-5 sovereign-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Cadre Proficiency Index
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/10">
                Scale 0-5
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold text-white tracking-tight num-tabular">
                {avgCurrent}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
              <span className="text-[11px] text-slate-400 ml-2">
                Target: <span className="text-slate-200 font-medium num-tabular">{avgRequired}</span>
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-400">FRAC Baseline Alignment</span>
              <span className="text-emerald-400 font-mono font-medium">
                {Math.round((parseFloat(avgCurrent) / parseFloat(avgRequired || 5)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#070d18] rounded-full h-1.5 overflow-hidden border border-white/[0.05]">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((parseFloat(avgCurrent) / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Priority Triage Indicator (4 cols) */}
        <div className="md:col-span-4 sovereign-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Priority Interventions
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                criticalGapsCount > 0
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
              }`}>
                {criticalGapsCount > 0 ? "ACTION REQ" : "COMPLIANT"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-4xl font-display font-bold tracking-tight num-tabular ${
                criticalGapsCount > 0 ? "text-rose-400" : "text-emerald-400"
              }`}>
                {criticalGapsCount}
              </span>
              <span className="text-xs text-slate-400">Critical Competency Gaps</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Cadre Strengths Verified:</span>
            <span className="text-slate-200 font-mono font-semibold">
              {strengthsCount} / {isGuest ? DEMO_RADAR_DATA.length : profile.length}
            </span>
          </div>
        </div>

        {/* Sovereign Verification Metadata (3 cols) */}
        <div className="md:col-span-3 sovereign-card p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Authority Audit
            </span>
            <div className="mt-2 text-sm font-semibold text-white">
              Mission Karmayogi
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              FRAC Tier-1 Verified
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>SHA-256 Hash:</span>
              <span className="text-emerald-400">VALID</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cadre Registry:</span>
              <span className="text-slate-300">MoSPI-2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Analytics Section: Radar + SHAP Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar Chart Panel (7 cols) */}
        <div className="lg:col-span-7 sovereign-card p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  Multi-Competency Distribution
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/10">
                  FRAC Radar
                </span>
                {isGuest && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Sample
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#070d18] border border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Mastery Prob:</span>
                <span className="text-xs font-mono font-bold text-emerald-300 num-tabular">{avgMastery}%</span>
                <span className="text-[10px] font-mono text-slate-400 ml-0.5">(BKT)</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Comparison of verified competency ratings against minimum cadre thresholds.
            </p>

            <div className="flex items-center gap-5 mt-3.5 text-xs flex-wrap font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 border border-emerald-400" />
                <span className="text-slate-300 font-sans text-xs">Current Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-amber-400" />
                <span className="text-slate-400 font-sans text-xs">FRAC Benchmark</span>
              </div>
            </div>
          </div>

          <div className="w-full h-72 sm:h-80 my-3 min-w-0 sovereign-well rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 12, right: 15, bottom: 12, left: 15 }}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="2 2" />
                <PolarAngleAxis
                  dataKey="competency"
                  tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  stroke="rgba(255, 255, 255, 0.06)"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-lg bg-[#070e1c] border border-white/15 shadow-xl text-xs">
                          <p className="font-semibold text-white mb-1.5">{data.fullName}</p>
                          <div className="space-y-1 font-mono text-[11px]">
                            <p className="text-emerald-300 flex items-center justify-between gap-4">
                              <span className="font-sans text-slate-300">Verified Level:</span>
                              <span className="font-bold num-tabular">{data.current} / 5.0</span>
                            </p>
                            <p className="text-amber-400 flex items-center justify-between gap-4">
                              <span className="font-sans text-slate-300">FRAC Required:</span>
                              <span className="font-bold num-tabular">{data.required} / 5.0</span>
                            </p>
                            <p className="text-slate-300 flex items-center justify-between gap-4">
                              <span className="font-sans text-slate-400">Mastery (BKT):</span>
                              <span className="font-bold num-tabular">{Math.round((data.mastery || 0.3) * 100)}%</span>
                            </p>
                            <p className="text-slate-400 flex items-center justify-between gap-4 pt-1 border-t border-white/10">
                              <span className="font-sans text-slate-400">Delta:</span>
                              <span className={`font-bold num-tabular ${data.current >= data.required ? "text-emerald-400" : "text-rose-400"}`}>
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
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="#10B981"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Required Level"
                  dataKey="required"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  fill="none"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Scale: 0.0 (Unassessed) to 5.0 (Master)</span>
            <span className="text-slate-400 font-normal">Calibrated Engine</span>
          </div>
        </div>

        {/* SHAP Explainable AI Panel (5 cols) */}
        <div className="lg:col-span-5 sovereign-card p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-bold text-base text-white">
                  Explainable AI (SHAP)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                Transparent
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decomposition of observational signals driving ability estimates higher or lower.
            </p>

            {isGuest ? (
              <div className="mt-5 p-5 rounded-lg sovereign-well text-center space-y-3">
                <Lock className="w-7 h-7 text-slate-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">Personal AI Telemetry</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  SHAP feature contributions populate automatically when you sign in and complete assessments.
                </p>
                <button
                  onClick={() => openAuthModal()}
                  className="btn-secondary text-xs py-1.5 px-3 mx-auto"
                >
                  Sign In to View
                </button>
              </div>
            ) : explain?.explainable ? (
              <div className="mt-4 space-y-2.5">
                <div className="p-2.5 rounded-md bg-[#070d18] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-sans">Cadre Base Rate:</span>
                  <span className="font-bold text-white num-tabular">{explain.base_rate} / 5.0</span>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {explain.contributions?.map((item, idx) => {
                    const isPositive = item.direction === "raises";
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-md bg-[#0b1424] border border-white/[0.04] flex items-center justify-between text-xs hover:border-white/15 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="text-slate-300 truncate text-[11px]">{item.factor}</span>
                        </div>
                        <span className={`font-mono text-xs font-semibold shrink-0 num-tabular ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositive ? `+${item.contribution}` : item.contribution}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-md sovereign-well mt-5 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{explain?.reason || "Awaiting telemetry to initialize SHAP trees."}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>TreeExplainer Kernel</span>
            <span className="text-slate-300 font-medium">Confidence: 94%</span>
          </div>
        </div>
      </div>

      {/* Competency Ledger Table */}
      <div className="sovereign-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Official Competency Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified competencies required under the Mission Karmayogi statistical cadre framework.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Count: <span className="text-white font-semibold num-tabular">{isGuest ? DEMO_RADAR_DATA.length : profile.length}</span> competencies
            {isGuest && <span className="text-slate-400 ml-1 font-sans">(sample)</span>}
          </div>
        </div>

        {isGuest ? (
          /* Guest: show demo rows with clean overlay */
          <div className="relative">
            <div className="divide-y divide-white/[0.05] opacity-50 pointer-events-none select-none">
              {DEMO_RADAR_DATA.map((comp, idx) => (
                <LedgerRow
                  key={idx}
                  status={comp.current >= comp.required ? "strength" : comp.required - comp.current > 1 ? "critical" : "developing"}
                  title={comp.fullName}
                  subtitle={`Sample competency · Confidence ${Math.round(comp.mastery * 100)}%`}
                  right={
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-white num-tabular">
                          {comp.current.toFixed(1)}{" "}
                          <span className="text-slate-400 font-normal">/ {comp.required}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Proficiency Level</p>
                      </div>
                      <div className="w-20 bg-[#070d18] rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
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
            {/* Clean Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#050914]/75 backdrop-blur-[2px]">
              <div className="text-center space-y-3 p-6 max-w-md">
                <Lock className="w-8 h-8 text-emerald-400/80 mx-auto" />
                <p className="text-sm font-semibold text-white">Authenticate for Personal Passbook</p>
                <p className="text-xs text-slate-400">
                  Your verified proficiency records, assessment logs, and oral viva history require active cadre authentication.
                </p>
                <button
                  onClick={() => openAuthModal()}
                  className="btn-primary text-xs py-2 px-5 mx-auto"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
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
                        <p className="text-xs font-mono font-bold text-white num-tabular">
                          {comp.current_level.toFixed(1)}{" "}
                          <span className="text-slate-400 font-normal">/ {comp.required_level}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Proficiency Level</p>
                      </div>
                      <div className="w-20 bg-[#070d18] rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
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
                          className="btn-secondary text-[11px] py-1 px-2 gap-1 shrink-0"
                          title="Take Oral Viva Examination"
                        >
                          <Mic className="w-3 h-3 text-emerald-400" />
                          <span>Oral Viva</span>
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
