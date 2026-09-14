import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import {
  Clock,
  Sparkles,
  Zap,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  LogIn,
  BookOpen,
} from "lucide-react";

// Demo modules for public preview
const DEMO_MODULES = [
  {
    id: "demo-1",
    module: {
      id: "demo-1",
      title: "Fundamentals of Official Statistics",
      description: "Introduction to the principles of statistical data collection, validation, and dissemination as per national standards.",
      duration_minutes: 90,
      level: 2,
    },
    match_type: "rule",
    score: 0.92,
    rationale: "Directly addresses your foundational statistical methods gap in the FRAC competency framework.",
    isDemo: true,
  },
  {
    id: "demo-2",
    module: {
      id: "demo-2",
      title: "Data Analysis & Visualization with Python",
      description: "Hands-on module for analyzing statistical datasets and creating professional visualizations for government reports.",
      duration_minutes: 120,
      level: 3,
    },
    match_type: "semantic",
    score: 0.85,
    rationale: "Semantically matched to strengthen your IT & Digital Skills competency for report generation.",
    isDemo: true,
  },
  {
    id: "demo-3",
    module: {
      id: "demo-3",
      title: "Governance & Public Administration Ethics",
      description: "Core module covering governance frameworks, accountability, and ethical decision-making in public sector data management.",
      duration_minutes: 60,
      level: 2,
    },
    match_type: "rule",
    score: 0.88,
    rationale: "Aligned to Governance & Ethics competency required for your cadre position.",
    isDemo: true,
  },
  {
    id: "demo-4",
    module: {
      id: "demo-4",
      title: "Advanced Report Writing for Statistical Officers",
      description: "Mastering technical writing, data interpretation, and presenting statistical findings to policymakers.",
      duration_minutes: 75,
      level: 3,
    },
    match_type: "semantic",
    score: 0.79,
    rationale: "Addresses identified gap in Report Writing & Communication competency.",
    isDemo: true,
  },
];

export default function LearnPage() {
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    client
      .get("/recommendations?with_rationale=true")
      .then((res) => setRecs(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-teal-400/20 border-t-teal-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Generating personalized learning pathways and AI rationales…
        </p>
      </div>
    );
  }

  const isGuest = !token;
  const displayedRecs = isGuest ? DEMO_MODULES : recs;

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              Curated Learning Pathways
            </h1>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-mono font-semibold uppercase tracking-wider">
              iGOT National Catalog
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Targeted training units mapped directly to verified FRAC competency deficits with mathematical matching rationales.
          </p>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0b1424] border border-white/[0.08] text-xs text-slate-300 font-mono self-start md:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{isGuest ? "Reference" : displayedRecs.length} Units Available</span>
        </div>
      </div>

      {/* Guest Banner */}
      {isGuest && (
        <div className="p-4 rounded-lg bg-[#0c1629] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Reference Coursework Catalog</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displaying sample units for Junior Statistical Officer cadre. Authenticate to unlock personalized deficit-targeted pathways.
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

      {!isGuest && displayedRecs.length === 0 ? (
        <div className="p-10 rounded-lg sovereign-card text-center max-w-lg mx-auto">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-white">Cadre Standards Met</h3>
          <p className="text-xs text-slate-400 mt-1">
            No critical competency deficits detected. Continue with self-directed assessments or technical viva verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedRecs.map((r) => {
            const isDirect = r.match_type === "rule";

            return (
              <div
                key={r.id || r.module.id}
                className="p-5 sovereign-card flex flex-col justify-between group transition-colors duration-150 relative"
              >
                {/* Demo badge */}
                {r.isDemo && (
                  <div className="absolute top-3 right-3 px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/10 text-[9px] font-mono font-medium text-slate-400">
                    Sample
                  </div>
                )}

                <div>
                  {/* Top Meta Tags */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 pr-14">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                        isDirect
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                      }`}
                    >
                      {isDirect ? "Direct FRAC Rule" : `Semantic (${(r.score * 100).toFixed(0)}%)`}
                    </span>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {r.module.duration_minutes}m
                      </span>
                      <span>·</span>
                      <span className="text-slate-300">
                        L{r.module.level}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {r.module.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                    {r.module.description}
                  </p>

                  {/* AI Rationale Callout */}
                  {r.rationale && (
                    <div className="mt-3.5 p-2.5 rounded-md sovereign-well border-l-2 border-emerald-400">
                      <p className="text-[11px] text-slate-300 italic leading-snug">
                        "{r.rationale}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>iGOT Accredited</span>
                  </span>

                  <button
                    onClick={() => {
                      if (isGuest) {
                        openAuthModal(() =>
                          navigate("/quiz", {
                            state: { moduleId: r.module.id, moduleTitle: r.module.title },
                          })
                        );
                      } else {
                        navigate("/quiz", {
                          state: { moduleId: r.module.id, moduleTitle: r.module.title },
                        });
                      }
                    }}
                    className="btn-primary text-xs py-1.5 px-3 gap-1.5"
                  >
                    <Zap className="w-3 h-3" />
                    <span>{isGuest ? "Sign In & Test" : "Skill Assessment"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
