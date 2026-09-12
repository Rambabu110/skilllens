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
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight">
              Recommended Learning Pathways
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-teal-400/10 text-teal-300 border border-teal-400/20 text-[10px] font-bold uppercase tracking-wider">
              iGOT Simulated Catalog
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Curated training modules mapped to your exact FRAC competency deficits with AI-generated selection rationales.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-xs text-slate-300 self-start md:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>{isGuest ? "Sample" : displayedRecs.length} Pathways Available</span>
        </div>
      </div>

      {/* Guest Banner */}
      {isGuest && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-900/50 to-slate-900/40 border border-teal-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-400/15 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Showing sample modules — Sign in for personalized pathways</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Your pathways are tailored to your exact FRAC competency gaps after authentication.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20 hover:brightness-110 transition-all shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        </div>
      )}

      {!isGuest && displayedRecs.length === 0 ? (
        <div className="p-12 rounded-2xl glass-panel text-center max-w-lg mx-auto">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">All Competencies Met</h3>
          <p className="text-xs text-slate-400 mt-1">
            No critical gaps detected for your current position. You can still take custom document quizzes via the Assess tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedRecs.map((r) => {
            const isDirect = r.match_type === "rule";

            return (
              <div
                key={r.id || r.module.id}
                className="p-6 rounded-2xl glass-panel flex flex-col justify-between group hover:border-teal-400/40 transition-all duration-300 relative overflow-hidden"
              >
                {/* Subtle top accent gradient */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400/30 to-transparent group-hover:via-teal-400 transition-all" />

                {/* Demo badge */}
                {r.isDemo && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Sample
                  </div>
                )}

                <div>
                  {/* Top Meta Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        isDirect
                          ? "bg-teal-400/10 text-teal-300 border-teal-400/30"
                          : "bg-amber-400/10 text-amber-300 border-amber-400/30"
                      }`}
                    >
                      {isDirect ? "Direct FRAC Match" : `Semantic Match (${(r.score * 100).toFixed(0)}%)`}
                    </span>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {r.module.duration_minutes}m
                      </span>
                      <span>·</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-medium text-slate-300">
                        Level {r.module.level}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                    {r.module.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">
                    {r.module.description}
                  </p>

                  {/* AI Rationale Callout */}
                  {r.rationale && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-900/70 border border-teal-400/15 relative">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-teal-200/90 italic leading-relaxed">
                          "{r.rationale}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-400/15 hover:bg-teal-400 text-teal-300 hover:text-slate-950 border border-teal-400/30 text-xs font-semibold transition-all shadow-sm group-hover:shadow-teal-500/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isGuest ? "Sign in & Generate Quiz" : "Generate AI Quiz"}</span>
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
