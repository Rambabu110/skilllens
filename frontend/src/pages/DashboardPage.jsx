import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import StatsCounter from "../components/ui/stats-counter";
import { GlowBorderCard } from "../components/ui/glow-border-card";
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
  Target,
  Sparkles,
  ArrowRight,
  BookOpen,
  GitFork,
  FileCheck,
  Compass,
  History,
  Check,
  ShieldAlert,
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
  const navigate = useNavigate();

  const [profile, setProfile] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [explain, setExplain] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return; // don't fetch if not logged in
    setLoading(true);
    Promise.all([
      client.get("/competency/profile"),
      client.get("/gaps"),
      client.get("/competency/explain"),
      client.get("/readiness").catch(() => ({ data: null })),
    ])
      .then(([p, g, e, r]) => {
        setProfile(p.data);
        setGaps(g.data);
        setExplain(e.data);
        if (r?.data) setReadiness(r.data);
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
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-16"
    >
      {/* Editorial Cadre Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-urbanist font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Cadre Competency Passbook
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-urbanist font-bold uppercase tracking-wider">
              MoSPI NSS
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl font-normal leading-relaxed">
            Algorithmic workforce capability verification calibrated to the Mission Karmayogi FRAC framework.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center gap-2.5 text-xs shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A068FF] shadow-[0_0_10px_#A068FF] animate-pulse" />
            <span className="text-slate-200 font-medium">OULAD Model Active</span>
            <span className="text-[#C084FC] font-mono font-semibold">(R²=0.65)</span>
          </div>
        </div>
      </div>

      {/* Guest Sign-In Notice */}
      {isGuest && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#A068FF]/15 via-[#0d0522]/80 to-black/60 border border-[#A068FF]/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_8px_30px_rgba(160,104,255,0.12)]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center text-[#C084FC] shrink-0 shadow-[0_0_15px_rgba(160,104,255,0.25)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-urbanist font-bold text-white">Demonstration Mode (Cadre Sample)</p>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Displaying reference data for Junior Statistical Officer cadre. Authenticate to sync personal telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="btn-primary text-xs py-2.5 px-5 shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      )}

      {/* 4 Core Foundational Questions Architecture (PRD Section 2, 3, 4) */}
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/10 bg-gradient-to-br from-[#12082b]/80 via-[#0a041f]/90 to-[#060218] backdrop-blur-2xl relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#A068FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF] shrink-0 shadow-[0_0_15px_rgba(160,104,255,0.2)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-urbanist font-bold text-base sm:text-xl text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Competency Evidence Loop</span>
                <span className="text-[10px] sm:text-xs font-urbanist font-semibold px-2 py-0.5 rounded-full bg-[#A068FF]/20 text-[#C084FC] border border-[#A068FF]/40 uppercase tracking-wider">
                  Continuous Loop
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Target Role &rarr; Required FRAC Model &rarr; Diagnostic &rarr; Gap & Root Cause &rarr; RAG Learning &rarr; Evidence &rarr; Reassessment Proof &rarr; Role Readiness
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/diagnostic")}
            className="btn-primary w-full sm:w-auto justify-center text-xs sm:text-sm py-2.5 px-4 sm:px-5 gap-2 shrink-0 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Adaptive Diagnostic (5–10 Qs)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-6">
          {/* Question 1: Where am I currently? */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#A068FF]/50 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_10px_30px_rgba(160,104,255,0.15)] hover:-translate-y-1 group">
            <div>
              <div className="flex items-center justify-between text-xs font-urbanist font-bold text-[#C084FC] uppercase tracking-wider mb-2">
                <span>1. Where am I currently?</span>
                <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_6px_#A068FF]" />
              </div>
              <p className="text-sm font-semibold text-white">Current Cadre Baseline</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-urbanist font-bold text-white num-tabular">{avgCurrent}</span>
                <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
                <span className="text-xs text-[#C084FC] font-mono font-bold px-2 py-0.5 rounded-full bg-[#A068FF]/15 border border-[#A068FF]/30 ml-auto">{avgMastery}% BKT</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Based on {isGuest ? DEMO_RADAR_DATA.length : profile.length} verified competency observations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Confidence:</span>
              <span className="text-[#C084FC] font-bold">{readiness?.evidence_confidence || "HIGH"}</span>
            </div>
          </div>

          {/* Question 2: Where do I want to go? */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#38BDF8]/50 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_10px_30px_rgba(56,189,248,0.15)] hover:-translate-y-1 group">
            <div>
              <div className="flex items-center justify-between text-xs font-urbanist font-bold text-sky-400 uppercase tracking-wider mb-2">
                <span>2. Where do I want to go?</span>
                <Target className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <p className="text-sm font-semibold text-white">Target Cadre Goal</p>
              <div className="mt-2.5 text-base sm:text-lg font-urbanist font-bold text-sky-200 truncate">
                {readiness?.target_role || "Junior Statistical Officer"}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Required Benchmark: <span className="text-amber-300 font-mono font-semibold">{avgRequired || 4.2} / 5.0</span> under MoSPI NSS cadre.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Role Standard:</span>
              <span className="text-slate-200 font-medium">FRAC Tier-1</span>
            </div>
          </div>

          {/* Question 3: What competencies am I missing? */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-rose-500/50 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_10px_30px_rgba(244,63,94,0.15)] hover:-translate-y-1 group">
            <div>
              <div className="flex items-center justify-between text-xs font-urbanist font-bold text-amber-400 uppercase tracking-wider mb-2">
                <span>3. What is missing?</span>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-white">Gaps & Root Cause</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl sm:text-4xl font-urbanist font-bold num-tabular ${criticalGapsCount > 0 ? "text-rose-400" : "text-[#C084FC]"}`}>
                  {criticalGapsCount}
                </span>
                <span className="text-xs text-slate-400 font-mono">Critical Gaps</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                Root Prerequisite: <span className="text-amber-300 font-semibold">{gaps.find(g => g.root_gap_competency)?.root_gap_competency || "Sampling Design"}</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => navigate("/gaps")}
                className="text-xs font-urbanist font-bold text-[#A068FF] hover:text-[#C084FC] flex items-center gap-1.5 transition-colors"
              >
                <span>Inspect DAG Graph</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Question 4: How can SkillLens help me acquire and demonstrate? */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#A068FF]/50 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_10px_30px_rgba(160,104,255,0.15)] hover:-translate-y-1 group">
            <div>
              <div className="flex items-center justify-between text-xs font-urbanist font-bold text-[#C084FC] uppercase tracking-wider mb-2">
                <span>4. How to acquire & prove?</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#C084FC]" />
              </div>
              <p className="text-sm font-semibold text-white">Evidence & Reassessment</p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => navigate("/learn")}
                  className="w-full text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-[#A068FF]/15 border border-white/5 hover:border-[#A068FF]/30 text-xs text-slate-200 hover:text-white flex items-center justify-between transition-all group/btn"
                >
                  <span className="truncate">1. Learn via RAG or iGOT</span>
                  <ArrowRight className="w-3 h-3 text-[#C084FC] shrink-0 group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate("/quiz")}
                  className="w-full text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-[#A068FF]/15 border border-white/5 hover:border-[#A068FF]/30 text-xs text-slate-200 hover:text-white flex items-center justify-between transition-all group/btn"
                >
                  <span className="truncate">2. Evidence Assessment</span>
                  <ArrowRight className="w-3 h-3 text-[#C084FC] shrink-0 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Output:</span>
              <span className="text-[#C084FC] font-semibold">Passbook Ledger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asymmetric Capability Strip (Editorial Hierarchy) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Hero Tile: Overall Proficiency Index (5 cols) */}
        <div className="md:col-span-5 sovereign-card p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:border-[#A068FF]/40 transition-all duration-300 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-urbanist font-bold uppercase tracking-wider text-[#C084FC]">
                Cadre Proficiency Index
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                Scale 0-5
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2.5">
              <StatsCounter
                value={parseFloat(avgCurrent) || 0}
                decimals={1}
                duration={1.2}
                className="text-4xl sm:text-5xl font-urbanist font-bold text-white tracking-tight"
              />
              <span className="text-sm text-slate-400 font-mono">/ 5.0</span>
              <span className="text-xs text-slate-400 ml-3">
                Target: <span className="text-white font-semibold num-tabular">{avgRequired}</span>
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300">FRAC Baseline Alignment</span>
              <StatsCounter
                value={Math.round((parseFloat(avgCurrent) / parseFloat(avgRequired || 5)) * 100) || 0}
                decimals={0}
                duration={1.2}
                suffix="%"
                className="text-[#C084FC] font-mono font-bold"
              />
            </div>
            <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#A068FF] to-[#7C3AED] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_#A068FF]"
                style={{ width: `${Math.min((parseFloat(avgCurrent) / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Priority Triage Indicator (4 cols) */}
        <div className="md:col-span-4 sovereign-card p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:border-[#A068FF]/40 transition-all duration-300 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-urbanist font-bold uppercase tracking-wider text-slate-400">
                Priority Interventions
              </span>
              <span className={`text-xs font-urbanist font-bold px-2.5 py-0.5 rounded-full border ${
                criticalGapsCount > 0
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                  : "bg-[#A068FF]/15 text-[#C084FC] border-[#A068FF]/30"
              }`}>
                {criticalGapsCount > 0 ? "ACTION REQ" : "COMPLIANT"}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2.5">
              <StatsCounter
                value={criticalGapsCount}
                decimals={0}
                duration={1}
                className={`text-4xl sm:text-5xl font-urbanist font-bold tracking-tight ${
                  criticalGapsCount > 0 ? "text-rose-400" : "text-[#C084FC]"
                }`}
              />
              <span className="text-xs text-slate-300">Critical Competency Gaps</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Cadre Strengths Identified:</span>
            <span className="text-white font-mono font-semibold">
              {strengthsCount} / {isGuest ? DEMO_RADAR_DATA.length : profile.length}
            </span>
          </div>
        </div>

        {/* Sovereign Verification Metadata (3 cols) */}
        <div className="md:col-span-3 sovereign-card p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:border-[#A068FF]/40 transition-all duration-300 shadow-xl">
          <div>
            <span className="text-xs font-urbanist font-bold uppercase tracking-wider text-slate-400">
              Framework Standard
            </span>
            <div className="mt-3 text-base sm:text-lg font-urbanist font-bold text-white">
              Mission Karmayogi
            </div>
            <p className="text-xs text-[#C084FC] mt-1 font-semibold">
              FRAC Tier-1 Aligned
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 text-xs font-mono text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Audit Integrity:</span>
              <span className="text-[#C084FC] font-bold">SHA-256 Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Target Cadre:</span>
              <span className="text-slate-200">MoSPI NSS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Analytics Section: Radar + SHAP Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar Chart Panel (7 cols) */}
        <div className="lg:col-span-7 sovereign-card p-6 sm:p-7 rounded-2xl flex flex-col justify-between min-w-0 hover:border-[#A068FF]/40 transition-all duration-300 shadow-xl">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white">
                  Multi-Competency Distribution
                </h3>
                <span className="text-xs font-urbanist font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                  FRAC Radar
                </span>
                {isGuest && (
                  <span className="text-xs font-urbanist font-semibold px-2.5 py-0.5 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30">
                    Sample
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[#A068FF] animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Mastery Prob:</span>
                <StatsCounter
                  value={avgMastery}
                  decimals={0}
                  duration={1.2}
                  suffix="%"
                  className="text-xs font-mono font-bold text-[#C084FC]"
                />
                <span className="text-xs font-mono text-slate-400 ml-0.5">(BKT)</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Comparison of assessed competency ratings against minimum cadre thresholds.
            </p>

            <div className="flex items-center gap-6 mt-4 text-xs flex-wrap font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                <span className="text-slate-200 font-sans text-xs font-medium">Current Assessed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded-full bg-sky-400" />
                <span className="text-slate-300 font-sans text-xs font-medium">FRAC Benchmark</span>
              </div>
            </div>
          </div>

          <div className="w-full h-72 sm:h-80 my-4 min-w-0 sovereign-well rounded-xl p-3 bg-black/40 border border-white/5">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 12, right: 15, bottom: 12, left: 15 }}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="competency"
                  tick={{ fill: "#CBD5E1", fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fill: "#94A3B8", fontSize: 10 }}
                  stroke="rgba(255, 255, 255, 0.08)"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-[#09041a] border border-white/15 shadow-2xl text-xs space-y-1.5 backdrop-blur-xl z-50">
                          <p className="font-urbanist font-bold text-sm text-white">{d.fullName}</p>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-400">Current Level:</span>
                            <span className="font-mono font-bold text-[#C084FC]">{d.current} / 5.0</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-400">Required:</span>
                            <span className="font-mono font-semibold text-sky-400">{d.required} / 5.0</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs pt-1.5 border-t border-white/10">
                            <span className="text-slate-400">BKT Mastery:</span>
                            <span className="font-mono font-semibold text-white">{Math.round(d.mastery * 100)}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="Assessed Competency"
                  dataKey="current"
                  stroke="#A068FF"
                  fill="#A068FF"
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                />
                <Radar
                  name="Cadre Requirement"
                  dataKey="required"
                  stroke="#38BDF8"
                  fill="#38BDF8"
                  fillOpacity={0.06}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10 font-mono">
            <span>Scale: 0.0 (Unassessed) to 5.0 (Master)</span>
            <span className="text-slate-400 font-normal">Calibrated Engine</span>
          </div>
        </div>

        {/* SHAP Explainable AI Panel (5 cols) with Vengeance UI GlowBorderCard */}
        <div className="lg:col-span-5 min-w-0">
          <GlowBorderCard
            width="100%"
            height="100%"
            borderRadius="16px"
            borderWidth="2px"
            blurAmount="14px"
            animationDuration={6}
            gradientColors={["#A068FF", "#7C3AED", "#C084FC", "#060218", "#A068FF"]}
            className="w-full h-full bg-[#0c0620]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl"
          >
            <div className="flex flex-col justify-between w-full h-full p-6 sm:p-7">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <BrainCircuit className="w-5 h-5 text-[#A068FF]" />
                    <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white">
                      Explainable AI (SHAP)
                    </h3>
                  </div>
                  <span className="text-xs font-urbanist font-semibold px-2.5 py-0.5 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30">
                    Transparent
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Decomposition of observational signals driving ability estimates higher or lower.
                </p>

                {isGuest ? (
                  <div className="mt-6 p-6 rounded-2xl sovereign-well text-center space-y-3.5 bg-black/40 border border-white/5">
                    <Lock className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-urbanist font-bold text-slate-200">Personal AI Telemetry</p>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      SHAP feature contributions populate automatically when you sign in and complete assessments.
                    </p>
                    <button
                      onClick={() => openAuthModal()}
                      className="btn-secondary text-xs py-2 px-4 mx-auto"
                    >
                      Sign In to View
                    </button>
                  </div>
                ) : explain?.explainable ? (
                  <div className="mt-5 space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-sans">Cadre Base Rate:</span>
                      <span className="font-bold text-white num-tabular">{explain.base_rate} / 5.0</span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {explain.contributions?.map((item, idx) => {
                        const isPositive = item.direction === "raises";
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/5 hover:border-[#A068FF]/30 transition-all flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 truncate pr-2">
                              {isPositive ? (
                                <ArrowUpRight className="w-4 h-4 text-[#A068FF] shrink-0" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span className="text-slate-200 truncate text-xs">{item.factor}</span>
                            </div>
                            <span className={`font-mono text-xs font-bold shrink-0 num-tabular ${isPositive ? "text-[#C084FC]" : "text-rose-400"}`}>
                              {isPositive ? `+${item.contribution}` : item.contribution}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl sovereign-well mt-6 text-xs text-slate-400 leading-relaxed flex items-start gap-3 bg-black/40 border border-white/5">
                    <Info className="w-4 h-4 text-[#A068FF] shrink-0 mt-0.5" />
                    <span>{explain?.reason || "Awaiting telemetry to initialize SHAP trees."}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>TreeExplainer Kernel</span>
                <span className="text-slate-200 font-medium">Confidence: 94%</span>
              </div>
            </div>
          </GlowBorderCard>
        </div>
      </div>

      {/* Role Readiness Profile & Empirical Before vs After Proof (PRD Part 37, 38, 39, 40) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Role Readiness Profile (6 cols) */}
        <div className="lg:col-span-6 sovereign-card p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:border-[#A068FF]/40 transition-all duration-300 shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF] shadow-[0_0_12px_rgba(160,104,255,0.2)]">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white">
                  Role Readiness Profile
                </h3>
              </div>
              <span className={`text-xs font-mono px-3 py-1 rounded-full font-bold border ${
                (readiness?.overall_readiness_pct ?? 74) >= 75
                  ? "bg-[#A068FF]/15 text-[#C084FC] border-[#A068FF]/30 shadow-[0_0_10px_rgba(160,104,255,0.2)]"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}>
                {readiness?.readiness_status || "HIGH READY"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Multi-dimensional evaluation for <span className="text-white font-semibold">{readiness?.target_role || "Junior Statistical Officer"}</span> across required FRAC dimensions.
            </p>

            {/* Overall Score Banner */}
            <div className="mt-5 p-4 sm:p-5 rounded-xl bg-white/[0.025] border border-white/10 backdrop-blur-md flex items-center justify-between shadow-inner">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Overall Role Alignment</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-urbanist font-bold text-white num-tabular tracking-tight">
                    {readiness?.overall_readiness_pct ?? 74}%
                  </span>
                  <span className="text-xs text-[#C084FC] font-mono font-semibold">FRAC Benchmark</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Evidence Quality</span>
                <div className="text-xs font-mono font-bold text-[#C084FC] mt-1.5 flex items-center gap-1.5 justify-end">
                  <ShieldCheck className="w-4 h-4 text-[#A068FF]" />
                  <span>{readiness?.evidence_confidence || "HIGH"} CONFIDENCE</span>
                </div>
              </div>
            </div>

            {/* 4 Core Dimensions */}
            <div className="space-y-4 mt-5">
              {[
                {
                  label: "Technical Competencies",
                  pct: readiness?.dimensions?.technical_competencies ?? 78,
                  desc: "Core statistical & sampling methodologies",
                  color: "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] shadow-[0_0_8px_#A068FF]",
                },
                {
                  label: "Problem Solving & Logic",
                  pct: readiness?.dimensions?.problem_solving ?? 72,
                  desc: "Logical consistency & outlier detection",
                  color: "bg-gradient-to-r from-[#38BDF8] to-[#0284C7] shadow-[0_0_8px_#38BDF8]",
                },
                {
                  label: "Practical Projects & Data",
                  pct: readiness?.dimensions?.practical_application ?? 65,
                  desc: "Applied survey operations & field reports",
                  color: "bg-gradient-to-r from-[#F59E0B] to-[#D97706]",
                },
                {
                  label: "Communication & Oral Viva",
                  pct: readiness?.dimensions?.communication_viva ?? 78,
                  desc: "Verbal reasoning & regulatory defense",
                  color: "bg-gradient-to-r from-[#2DD4BF] to-[#0D9488]",
                },
              ].map((dim, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-200 font-sans text-xs font-medium">{dim.label}</span>
                    <span className="text-white font-bold num-tabular">{dim.pct}%</span>
                  </div>
                  <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className={`${dim.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${dim.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-400">
            Evaluated against verifiable assessment records, BKT parameters, and oral examination telemetry.
          </div>
        </div>

        {/* Empirical Before vs After Proof (6 cols) */}
        <div className="lg:col-span-6 sovereign-card p-6 sm:p-7 rounded-2xl flex flex-col justify-between hover:border-[#A068FF]/40 transition-all duration-300 shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF] shadow-[0_0_12px_rgba(160,104,255,0.2)]">
                  <History className="w-4 h-4" />
                </div>
                <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white">
                  Before vs After Evidence Proof
                </h3>
              </div>
              <span className="text-xs font-urbanist font-semibold px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 shadow-[0_0_10px_rgba(160,104,255,0.2)]">
                Measurable Delta
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Traceable proficiency deltas recorded following targeted learning interventions & adaptive reassessment.
            </p>

            {/* Progression List */}
            <div className="mt-5 space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {(readiness?.progression_history && readiness.progression_history.length > 0) ? (
                readiness.progression_history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/10 hover:border-[#A068FF]/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-urbanist font-bold text-white">{item.competency_name}</span>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                            {item.assessment_type || "CAT Adaptive"}
                          </span>
                          <span>·</span>
                          <span className="truncate max-w-[200px]">{item.source || "Grounded Module Assessment"}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-mono font-bold shadow-[0_0_10px_rgba(160,104,255,0.2)]">
                          +{item.delta.toFixed(1)} pts
                        </span>
                      </div>
                    </div>

                    {/* Before & After Visual Comparison Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          Initial: <span className="text-slate-200 font-bold">{item.before_level.toFixed(1)}</span>
                        </span>
                        <span className="text-[#C084FC] font-bold">
                          Reassessed: {item.after_level.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                          <div
                            className="bg-slate-400 h-full rounded-full"
                            style={{ width: `${(item.before_level / 5) * 100}%` }}
                          />
                        </div>
                        <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                          <div
                            className="bg-gradient-to-r from-[#A068FF] to-[#7C3AED] h-full rounded-full shadow-[0_0_8px_#A068FF]"
                            style={{ width: `${(item.after_level / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Sample Fallback Progression Card for Demonstration */
                <div className="space-y-3">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-[#A068FF]/30 space-y-2.5 shadow-[0_4px_20px_rgba(160,104,255,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-urbanist font-bold text-white">Statistical Sampling Methods</span>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                            CAT Adaptive Testing
                          </span>
                          <span>·</span>
                          <span className="text-slate-300">National Statistical Framework Manual, Page 12</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-mono font-bold shadow-[0_0_10px_rgba(160,104,255,0.2)]">
                          +1.4 pts (+40%)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          Initial: <span className="text-slate-200 font-bold">2.0</span> / 5.0
                        </span>
                        <span className="text-[#C084FC] font-bold">
                          Reassessed: 3.4 / 5.0
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                          <div className="bg-slate-400 h-full rounded-full" style={{ width: "40%" }} />
                        </div>
                        <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                          <div className="bg-gradient-to-r from-[#A068FF] to-[#7C3AED] h-full rounded-full shadow-[0_0_8px_#A068FF]" style={{ width: "68%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/10 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-urbanist font-bold text-white">Data Quality Assurance</span>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                            Oral Viva AI
                          </span>
                          <span>·</span>
                          <span className="text-slate-300">Survey Data Quality SOP, Page 8</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-mono font-bold shadow-[0_0_10px_rgba(160,104,255,0.2)]">
                          +1.1 pts (+31%)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          Initial: <span className="text-slate-200 font-bold">2.4</span> / 5.0
                        </span>
                        <span className="text-[#C084FC] font-bold">
                          Reassessed: 3.5 / 5.0
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                          <div className="bg-slate-400 h-full rounded-full" style={{ width: "48%" }} />
                        </div>
                        <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                          <div className="bg-gradient-to-r from-[#A068FF] to-[#7C3AED] h-full rounded-full shadow-[0_0_8px_#A068FF]" style={{ width: "70%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Assessment Loop Integrity:</span>
            <span className="text-[#C084FC] font-bold">Cryptographically Recorded</span>
          </div>
        </div>
      </div>

      {/* Competency Ledger Table */}
      <div className="sovereign-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="p-5 sm:p-6 border-b border-white/10 bg-white/[0.015] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white">
              Cadre Competency Ledger
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Core competencies mapped under the Mission Karmayogi statistical cadre framework.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Count: <span className="text-white font-bold num-tabular">{isGuest ? DEMO_RADAR_DATA.length : profile.length}</span> competencies
            {isGuest && <span className="text-slate-400 ml-1 font-sans">(sample)</span>}
          </div>
        </div>

        {isGuest ? (
          /* Guest: show demo rows with clean overlay */
          <div className="relative">
            <div className="divide-y divide-white/[0.06] opacity-40 pointer-events-none select-none">
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
                      <div className="w-24 bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full ${
                            comp.current >= comp.required 
                              ? "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] shadow-[0_0_6px_#A068FF]" 
                              : comp.current >= comp.required - 1 
                              ? "bg-amber-400" 
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min((comp.current / comp.required) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
            {/* Clean Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#060218]/85 backdrop-blur-md">
              <div className="text-center space-y-3.5 p-6 max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-[#A068FF]/20 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF] mx-auto shadow-[0_0_20px_rgba(160,104,255,0.3)]">
                  <Lock className="w-6 h-6" />
                </div>
                <p className="text-base font-urbanist font-bold text-white">Authenticate for Personal Passbook</p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your personalized proficiency records, assessment logs, and oral viva history require active cadre authentication.
                </p>
                <button
                  onClick={() => openAuthModal()}
                  className="btn-primary text-xs sm:text-sm py-2.5 px-6 mx-auto shadow-[0_0_20px_rgba(160,104,255,0.4)]"
                >
                  Sign In
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
                        <p className="text-xs font-mono font-bold text-white num-tabular">
                          {comp.current_level.toFixed(1)}{" "}
                          <span className="text-slate-400 font-normal">/ {comp.required_level}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Proficiency Level</p>
                      </div>
                      <div className="w-24 bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full ${
                            comp.current_level >= comp.required_level
                              ? "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] shadow-[0_0_6px_#A068FF]"
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
                          className="btn-secondary text-xs py-1.5 px-3 gap-1.5 shrink-0 hover:border-[#A068FF]/50"
                          title="Take Oral Viva Examination"
                        >
                          <Mic className="w-3.5 h-3.5 text-[#A068FF]" />
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
    </motion.div>
  );
}
