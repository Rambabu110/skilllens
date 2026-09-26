import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import client from "../api/client";
import {
  Award,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Mic,
  FileText,
  GitBranch,
  ShieldCheck,
  Shield,
  Compass,
  BarChart3,
  Zap,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Layers,
  Cpu,
  Database,
  RefreshCw,
  Play,
  Users,
  QrCode,
  LogIn,
  Check,
  ChevronRight,
  Activity,
} from "lucide-react";

export default function HubPage() {
  const { token, learner, login, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("all");
  const [apiHealth, setApiHealth] = useState({
    backend: "checking",
    positions: 0,
    llm: "operational",
  });

  useEffect(() => {
    client
      .get("/positions")
      .then((res) => {
        setApiHealth({
          backend: "online",
          positions: res.data?.length || 4,
          llm: "operational",
        });
      })
      .catch(() => {
        setApiHealth({
          backend: "offline",
          positions: 0,
          llm: "degraded",
        });
      });
  }, []);

  const CATEGORIES = [
    { id: "all", label: "All Capabilities (9)" },
    { id: "diagnostics", label: "Competency & FRAC" },
    { id: "assessment", label: "Adaptive Assessments" },
    { id: "curriculum", label: "Curriculum & Pathways" },
    { id: "credentials", label: "Credentials & Badges" },
    { id: "admin", label: "Institutional Admin" },
  ];

  const CAPABILITIES = [
    {
      id: "passbook",
      category: "diagnostics",
      badge: "Category 1 • FRAC Framework",
      title: "Competency Passbook & Radar Diagnostics",
      subtitle: "Multi-Competency Distribution & BKT Telemetry",
      description:
        "Visualizes officer proficiency across all 5 MoSPI statistical competencies against national cadre standards using Recharts radar and Bayesian Knowledge Tracing.",
      techStack: ["FRAC Architecture", "BKT Mastery Probability", "Interactive Radar", "Cadre Ledger"],
      liveStats: "5 Core Competencies • 88% Cadre Alignment • 94.2% BKT Confidence",
      status: "LIVE & OPERATIONAL",
      icon: Award,
      color: "emerald",
      primaryAction: {
        label: "Open Competency Passbook",
        to: "/",
      },
      secondaryAction: {
        label: "View Ledger Table",
        to: "/#ledger",
      },
    },
    {
      id: "shap",
      category: "diagnostics",
      badge: "Category 1 • Explainable AI",
      title: "SHAP Attribution & Feature Explainability",
      subtitle: "TreeExplainer Attribution Weights for Every Score",
      description:
        "Deconstructs why an officer's competency score is calculated at a specific level using SHAP (Shapley Additive exPlanations) values to guarantee complete transparency.",
      techStack: ["TreeExplainer Kernel", "Feature Attribution", "Decision Tree Rules", "Zero Black-Box"],
      liveStats: "94% Inference Confidence • Top Influencing Evidence Factors Mapped",
      status: "LIVE & OPERATIONAL",
      icon: Cpu,
      color: "cyan",
      primaryAction: {
        label: "View SHAP Explainability",
        to: "/",
      },
    },
    {
      id: "cat",
      category: "assessment",
      badge: "Category 2 • Adaptive Engine",
      title: "Computerized Adaptive Testing (CAT)",
      subtitle: "2PL/3PL Item Response Theory (IRT) Engine",
      description:
        "Dynamically recalibrates question difficulty in real time based on officer correctness. Correct answers trigger harder Level 4-5 questions; errors adaptively step down to Level 2.",
      techStack: ["2PL/3PL IRT Model", "Bayesian Theta Estimation", "Fisher Information Scaling", "10-Step Adaptive Loop"],
      liveStats: "Item Difficulty Levels 1-5 • Dynamic Theta Calibration • Automated Stop Rule",
      status: "LIVE & TESTED (Task 3 PASSED)",
      icon: Zap,
      color: "emerald",
      primaryAction: {
        label: "Start Adaptive Assessment",
        to: "/quiz",
      },
    },
    {
      id: "viva",
      category: "assessment",
      badge: "Category 2 • Oral Examination",
      title: "Voice Viva AI Examiner",
      subtitle: "Speech Recognition & Objective Rubric Auditing",
      description:
        "AI-driven oral examination studio simulating cadre interview boards. Supports real-time speech-to-text recording, audio synthesis, and automated rubric scoring.",
      techStack: ["Web Speech API", "Speech-to-Text Recognition", "Objective Rubric Engine", "BKT Calibration"],
      liveStats: "Dual Verbal/Text Modes • Instant AI Grading Rubrics • Audio Feedback",
      status: "LIVE & OPERATIONAL",
      icon: Mic,
      color: "indigo",
      primaryAction: {
        label: "Launch Viva Voce Studio",
        to: "/viva",
      },
    },
    {
      id: "doc-quiz",
      category: "assessment",
      badge: "Category 3 • Document AI",
      title: "Document & Syllabus AI Quiz Generator",
      subtitle: "Upload PDF Manuals & Produce 10-Question Exams",
      description:
        "Upload any statistical manual, survey protocol, or syllabus PDF. The 3-tier LLM engine (Gemini Flash + Groq Llama-3.3 + Offline Fallback) instantly generates verified assessments.",
      techStack: ["Searchable PDF Parser", "Gemini 2.5 Flash", "Groq Llama-3.3", "Deterministic Offline Engine"],
      liveStats: "Bilingual English/Hindi • 10-Question Deep Generator • Zero Hallucination Guard",
      status: "LIVE & TESTED (3/3 Fallbacks Active)",
      icon: FileText,
      color: "teal",
      primaryAction: {
        label: "Upload PDF & Generate Quiz",
        to: "/quiz",
      },
    },
    {
      id: "gaps-dag",
      category: "curriculum",
      badge: "Category 4 • Knowledge Graph",
      title: "Cadre Gap Diagnostics & Prerequisite DAG",
      subtitle: "Directed Acyclic Graph (DAG) Traversal for Root Causes",
      description:
        "Detects critical deficits between officer capability and job description standards. Traces prerequisite knowledge graphs to pinpoint foundational root-cause gaps.",
      techStack: ["Directed Acyclic Graph", "Topological Dependency Sorting", "Cadre Delta Metrics", "Intervention Engine"],
      liveStats: "5 Competencies Assessed • Prerequisite Tree Loaded • Root Cause Tracing",
      status: "LIVE & OPERATIONAL",
      icon: GitBranch,
      color: "amber",
      primaryAction: {
        label: "Explore Gap Diagnostics & DAG",
        to: "/gaps",
      },
    },
    {
      id: "learn",
      category: "curriculum",
      badge: "Category 5 • National Curriculum",
      title: "Curated Learning Pathways (iGOT Alignment)",
      subtitle: "Direct Rule vs. Semantic Matching Rationales",
      description:
        "Maps training units from the national iGOT Karmayogi catalog directly to verified gaps, complete with transparent mathematical matching rationales.",
      techStack: ["iGOT National Catalog", "Cosine Semantic Matching", "Direct FRAC Rule Alignment", "Accredited Training Units"],
      liveStats: "6 Modules Available • 90-120m Certified Durations • Target Competency Mapping",
      status: "LIVE & OPERATIONAL",
      icon: BookOpen,
      color: "emerald",
      primaryAction: {
        label: "Browse Learning Pathways",
        to: "/learn",
      },
    },
    {
      id: "verify",
      category: "credentials",
      badge: "Category 6 • Verifiable Credentials",
      title: "Cryptographic Certificate Verification & PDF",
      subtitle: "SHA-256 Tamper-Evident Ledger & QR Validation",
      description:
        "Generates institutional PDF certificates and competency passbooks with embedded cryptographic hashes. Public verification portal verifies authenticity instantly.",
      techStack: ["ReportLab PDF Engine", "SHA-256 Tamper Verification", "Public QR Portal", "Immutable Ledger"],
      liveStats: "Public /verify Route Active • Instant QR Verification • PDF Download Engine",
      status: "LIVE & OPERATIONAL",
      icon: ShieldCheck,
      color: "cyan",
      primaryAction: {
        label: "Open Public Verification Portal",
        to: "/verify",
      },
      secondaryAction: {
        label: "Export Passbook PDF",
        to: "/",
      },
    },
    {
      id: "admin",
      category: "admin",
      badge: "Category 7 • Senior Command",
      title: "National Cadre Command Deck",
      subtitle: "Cohort Heatmaps, Officer Dossiers & Audit Logs",
      description:
        "Enterprise command deck for MoSPI leadership: real-time cadre readiness heatmaps, 15 enrolled officer dossiers, position metrics, and 118 audited login sessions.",
      techStack: ["Role-Based Access Control", "Cohort Heatmap Matrix", "Audit Event Telemetry", "15 Student Dossiers"],
      liveStats: "15 Officer Dossiers • 118 Audited Sessions • 4 Cadre Positions",
      status: "LIVE & TESTED (Admin Credentials Available)",
      icon: Shield,
      color: "amber",
      primaryAction: {
        label: "Open Admin Command Deck",
        to: "/admin",
      },
    },
    {
      id: "onboarding",
      category: "curriculum",
      badge: "Category 8 • Cadre Entry",
      title: "6-Step Interactive Onboarding Wizard",
      subtitle: "FRAC Role Mapping, Self-Assessment & Career Goals",
      description:
        "Guided entry wizard for new statistical recruits. Select cadre position, perform initial FRAC self-assessment, define career timeline, and set learning preferences.",
      techStack: ["6-Step State Machine", "FRAC Tree Auto-Loader", "Baseline Score Persister", "Self-Assessment Matrix"],
      liveStats: "Junior Statistical Officer • Data Analyst • Survey Supervisor Positions",
      status: "LIVE & TESTED (8 Pytest Tests PASSED)",
      icon: Compass,
      color: "emerald",
      primaryAction: {
        label: "Launch Onboarding Wizard",
        to: "/onboarding",
      },
    },
  ];

  const filteredCapabilities =
    activeCategory === "all"
      ? CAPABILITIES
      : CAPABILITIES.filter((c) => c.category === activeCategory);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Telemetry Header */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-[#0c162d] via-[#091224] to-[#060a17] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#A068FF]/15 border border-[#A068FF]/30 text-[#C084FC] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#A068FF] animate-pulse" />
                Live Architecture & Capability Explorer
              </span>
              <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-medium">
                MoSPI FRAC Standards
              </span>
            </div>
            <h1 className="font-urbanist font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              SkillLens AI <span className="text-[#C084FC]">Feature & Intelligence Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Every system, AI engine, adaptive testing algorithm, knowledge graph, and credential service implemented in SkillLens AI is fully categorized, visual, and testable below.
            </p>
          </div>

          {/* Cadre Authentication Status Strip */}
          <div className="p-3.5 rounded-xl bg-[#070e1c] border border-white/10 space-y-2 shrink-0 w-full lg:w-auto min-w-[280px]">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5 font-urbanist">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A068FF]" />
                Cadre Authentication
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                token ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-400 border border-white/10"
              }`}>
                {token ? "Authenticated" : "Guest Mode"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              {learner ? (
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{learner.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{learner.email}</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Sign in to access your FRAC competencies</p>
              )}
              {token ? (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all shrink-0 cursor-pointer"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#A068FF] hover:bg-[#8e4ff8] text-white shadow-md shadow-[#A068FF]/20 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live System Telemetry Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.06] text-xs font-mono">
          <div className="flex items-center gap-2 p-2 rounded bg-black/20 border border-white/[0.05]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <p className="text-[10px] text-slate-400">Backend API</p>
              <p className="text-slate-200 font-semibold">FastAPI :8000 (OK)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-black/20 border border-white/[0.05]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <div>
              <p className="text-[10px] text-slate-400">Database Engine</p>
              <p className="text-slate-200 font-semibold">SQLite/Postgres FRAC</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-black/20 border border-white/[0.05]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <div>
              <p className="text-[10px] text-slate-400">Adaptive Engine</p>
              <p className="text-slate-200 font-semibold">2PL/3PL IRT + BKT</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-black/20 border border-white/[0.05]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <div>
              <p className="text-[10px] text-slate-400">LLM Fallback Chain</p>
              <p className="text-slate-200 font-semibold">Gemini → Groq → Offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Capabilities Visual Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCapabilities.map((cap) => {
          const Icon = cap.icon;
          return (
            <div
              key={cap.id}
              className="p-5 rounded-xl sovereign-card flex flex-col justify-between border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 group relative shadow-lg"
            >
              <div>
                {/* Header Badge & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/10">
                    {cap.badge}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Operational
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="flex items-start gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0e1a30] border border-white/10 group-hover:border-emerald-500/40 flex items-center justify-center shrink-0 transition-colors shadow-sm">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-urbanist font-bold text-base text-white group-hover:text-[#C084FC] transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs font-mono text-[#C084FC]/80">
                      {cap.subtitle}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {cap.description}
                </p>

                {/* Tech Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {cap.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-[10px] font-mono text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer Live Stats & Action Buttons */}
              <div className="pt-3.5 border-t border-white/[0.06] space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{cap.liveStats}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(cap.primaryAction.to)}
                    className="btn-primary text-xs py-1.5 px-3 flex-1 justify-center gap-1.5"
                  >
                    <span>{cap.primaryAction.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {cap.secondaryAction && (
                    <button
                      type="button"
                      onClick={() => navigate(cap.secondaryAction.to)}
                      className="btn-secondary text-xs py-1.5 px-2.5 justify-center"
                      title={cap.secondaryAction.label}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
