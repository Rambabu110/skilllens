import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  UploadCloud,
  FileText,
  Layers,
  Compass,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Target,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { GlowBorderCard } from "../components/ui/glow-border-card";

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

// Preloaded Reference Manuals available for instant RAG demonstration
const PRELOADED_RAG_DOCS = [
  {
    id: "doc_stat_framework",
    name: "National Statistical Framework Manual.pdf",
    pages: 48,
    chunks: 14,
    competencies: ["Statistical Sampling Methods", "Data Quality Assurance"],
    description: "Official MoSPI reference guidelines for stratified sampling, cluster design, and data validation standards.",
  },
  {
    id: "doc_data_sop",
    name: "Survey Data Quality SOP & Verification Protocols.pdf",
    pages: 32,
    chunks: 10,
    competencies: ["Data Quality Assurance", "Report Writing & Communication"],
    description: "Standard operating procedures for field survey consistency, logical ranges, and outlier mitigation.",
  },
];

export default function LearnPage() {
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOption, setActiveOption] = useState("external"); // "external" | "rag"

  // Document RAG upload state
  const [ragFile, setRagFile] = useState(null);
  const [ragUploading, setRagUploading] = useState(false);
  const [ragStatus, setRagStatus] = useState("");
  const [ragError, setRagError] = useState("");
  const [indexedDocs, setIndexedDocs] = useState(PRELOADED_RAG_DOCS);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    client
      .get("/recommendations?with_rationale=true")
      .then((res) => setRecs(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleUploadRagFile(e) {
    e.preventDefault();
    if (!token) {
      openAuthModal();
      return;
    }
    if (!ragFile) return;

    setRagError("");
    setRagUploading(true);
    setRagStatus("Extracting document text & metadata…");

    try {
      const formData = new FormData();
      formData.append("file", ragFile);

      setRagStatus("Chunking into 800-1200 token windows & generating vector embeddings…");
      const res = await client.post("/quiz/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newDoc = {
        id: res.data.document_id,
        name: res.data.filename,
        pages: res.data.page_count || 1,
        chunks: res.data.chunk_count || 8,
        competencies: ["Assessed Document Topics"],
        description: `User-uploaded document indexed in FAISS vector store. Ready for grounded question generation.`,
      };

      setIndexedDocs([newDoc, ...indexedDocs]);
      setRagStatus("Vector Index successfully built! Ready for RAG assessment.");
      setRagFile(null);
    } catch (err) {
      setRagError(err?.response?.data?.detail || "Document upload failed. Please verify file format.");
      setRagStatus("");
    } finally {
      setRagUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#A068FF]/20 border-t-[#A068FF] animate-spin" />
        <p className="text-sm font-medium text-slate-300">
          Generating personalized learning pathways and AI rationales…
        </p>
      </div>
    );
  }

  const isGuest = !token;
  const displayedRecs = isGuest ? DEMO_MODULES : recs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-16"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-urbanist font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Personalized Learning & RAG Studio
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-urbanist font-bold uppercase tracking-wider">
              PRD Dual Learning Engine
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Choose between verified external iGOT curriculum or SkillLens Internal Learning with uploaded PDF RAG document indexing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-mono shadow-md self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
          <span>{isGuest ? "Reference" : displayedRecs.length} Modules Available</span>
        </div>
      </div>

      {/* Guest Banner */}
      {isGuest && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#A068FF]/15 via-[#0d0522]/80 to-black/60 border border-[#A068FF]/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_8px_30px_rgba(160,104,255,0.12)]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center text-[#C084FC] shrink-0 shadow-[0_0_15px_rgba(160,104,255,0.25)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-urbanist font-bold text-white">Reference Coursework Catalog</p>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Displaying sample units for Junior Statistical Officer cadre. Authenticate to unlock personalized deficit-targeted pathways.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="btn-primary text-xs sm:text-sm py-2.5 px-5 shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        </div>
      )}

      {/* Personalized Phased Roadmap (PRD Part 15, 16, 60) */}
      <div className="sovereign-card p-6 sm:p-7 border border-white/10 rounded-2xl shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF]">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="font-urbanist font-bold text-base sm:text-lg text-white">
              Personalized Competency Roadmap (Phased Progression)
            </h2>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.06] text-slate-200 border border-white/10">
            Cadre: Junior Statistical Officer
          </span>
        </div>

        {/* 5 Phases Stepper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 pt-2">
          {[
            {
              phase: "Phase 1: Foundation",
              topic: "Sampling Fundamentals",
              status: "COMPLETED",
              statusColor: "text-[#C084FC] border-[#A068FF]/30 bg-[#A068FF]/15",
              score: "Score: 4.2 / 5.0",
              icon: CheckCircle2,
            },
            {
              phase: "Phase 2: Core Skills",
              topic: "Data Quality & Checking",
              status: "IN PROGRESS",
              statusColor: "text-amber-300 border-amber-500/30 bg-amber-500/10",
              score: "Deficit Remediation",
              icon: RefreshCw,
            },
            {
              phase: "Phase 3: Application",
              topic: "Report Writing & Analysis",
              status: "NEXT PRIORITY",
              statusColor: "text-sky-300 border-sky-500/30 bg-sky-500/10",
              score: "Requires Phase 2",
              icon: Clock,
            },
            {
              phase: "Phase 4: Projects",
              topic: "NSS Survey Capstone",
              status: "PENDING PREREQ",
              statusColor: "text-slate-400 border-white/10 bg-white/[0.03]",
              score: "Practical Portfolio",
              icon: Target,
            },
            {
              phase: "Phase 5: Readiness",
              topic: "Oral Viva & Passbook",
              status: "FINAL GATE",
              statusColor: "text-slate-400 border-white/10 bg-white/[0.03]",
              score: "Verification Lock",
              icon: ShieldCheck,
            },
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/10 hover:border-[#A068FF]/40 transition-all flex flex-col justify-between space-y-2.5 relative shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-slate-400 uppercase">{item.phase}</span>
                    <IconComponent className="w-3.5 h-3.5 text-[#A068FF]" />
                  </div>
                  <p className="text-sm font-urbanist font-bold text-white truncate">{item.topic}</p>
                </div>
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded-full border font-semibold ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <span className="text-slate-400 text-[11px]">{item.score}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Learning Options Selector (PRD Part 22) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 w-full sm:w-fit backdrop-blur-md">
        <button
          onClick={() => setActiveOption("external")}
          className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-urbanist font-bold flex items-center justify-center sm:justify-start gap-2 transition-all ${
            activeOption === "external"
              ? "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] text-white shadow-[0_0_15px_rgba(160,104,255,0.4)]"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Option A: Curated External &amp; iGOT Modules</span>
        </button>

        <button
          onClick={() => setActiveOption("rag")}
          className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-urbanist font-bold flex items-center justify-center sm:justify-start gap-2 transition-all ${
            activeOption === "rag"
              ? "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] text-white shadow-[0_0_15px_rgba(160,104,255,0.4)]"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <UploadCloud className="w-4 h-4 shrink-0" />
          <span>Option B: Learn on SkillLens (Document RAG)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#A068FF]/30 text-white border border-[#A068FF]/50 shrink-0">
            TRUE RAG
          </span>
        </button>
      </div>

      {/* OPTION A: External Coursework & iGOT Modules */}
      {activeOption === "external" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-urbanist font-bold text-white flex items-center gap-2">
              <span>Cadre Remediation Modules</span>
              <span className="text-xs font-mono text-slate-400">({displayedRecs.length} curated)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Verified Official Learning Repositories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedRecs.map((r) => {
              const isDirect = r.match_type === "rule";

              return (
                <div
                  key={r.id || r.module.id}
                  className="p-6 sm:p-7 sovereign-card rounded-2xl border border-white/10 hover:border-[#A068FF]/40 shadow-xl flex flex-col justify-between group transition-all duration-200 relative"
                >
                  {/* Demo badge */}
                  {r.isDemo && (
                    <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-mono text-slate-300">
                      Sample
                    </div>
                  )}

                  <div>
                    {/* Top Meta Tags */}
                    <div className="flex items-center justify-between gap-2 mb-3 pr-16">
                      <span
                        className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded-full border font-semibold ${
                          isDirect
                            ? "bg-[#A068FF]/15 text-[#C084FC] border-[#A068FF]/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {isDirect ? "Direct FRAC Rule" : `Semantic (${(r.score * 100).toFixed(0)}%)`}
                      </span>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {r.module.duration_minutes}m
                        </span>
                        <span>·</span>
                        <span className="text-slate-200 font-semibold">
                          L{r.module.level}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-urbanist font-bold text-white group-hover:text-[#C084FC] transition-colors leading-snug">
                      {r.module.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed line-clamp-3">
                      {r.module.description}
                    </p>

                    {/* AI Rationale Callout */}
                    {r.rationale && (
                      <div className="mt-4 p-3 rounded-xl bg-white/[0.025] border-l-2 border-[#A068FF] border border-white/10">
                        <p className="text-xs text-slate-300 italic leading-relaxed">
                          "{r.rationale}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-[#A068FF]" />
                      <span>iGOT Accredited Resource</span>
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
                      className="btn-primary text-xs sm:text-sm py-2 px-4 gap-2 shadow-[0_0_15px_rgba(160,104,255,0.3)]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isGuest ? "Sign In & Test" : "Reassess Competency"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OPTION B: Learn on SkillLens (Document RAG Studio) */}
      {activeOption === "rag" && (
        <div className="space-y-6">
          {/* Upload Dropzone Card */}
          <div className="sovereign-card p-6 sm:p-8 border border-white/10 rounded-2xl shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF]">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <span>Upload Learning Material for RAG Processing</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Upload official manuals, SOPs, or study PDFs. SkillLens extracts text, chunks into 800–1200 tokens, builds vector embeddings, and generates source-grounded questions.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 shrink-0 self-start sm:self-auto font-semibold">
                FAISS Vector Engine Active
              </span>
            </div>

            {/* File Selector Form */}
            <form onSubmit={handleUploadRagFile} className="space-y-4">
              <div className="border-2 border-dashed border-white/20 hover:border-[#A068FF]/60 rounded-2xl p-8 text-center transition-all bg-white/[0.015] hover:bg-white/[0.03]">
                <input
                  type="file"
                  id="ragFileInput"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setRagFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="ragFileInput" className="cursor-pointer space-y-2.5 block">
                  <FolderOpen className="w-10 h-10 text-[#A068FF] mx-auto" />
                  <p className="text-sm font-urbanist font-bold text-white">
                    {ragFile ? ragFile.name : "Click to select or drag and drop document"}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    Supported: PDF, TXT, MD (Max 15MB) · Auto-chunked & indexed in FAISS
                  </p>
                </label>
              </div>

              {ragStatus && (
                <div className="p-3.5 rounded-xl bg-[#A068FF]/15 border border-[#A068FF]/30 text-xs sm:text-sm text-purple-200 flex items-center gap-2.5 font-mono">
                  <div className="w-4 h-4 rounded-full border-2 border-[#A068FF] border-t-transparent animate-spin shrink-0" />
                  <span>{ragStatus}</span>
                </div>
              )}

              {ragError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm text-rose-300 flex items-center gap-2.5 font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{ragError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                {ragFile && (
                  <button
                    type="button"
                    onClick={() => setRagFile(null)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Clear Selection
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!ragFile || ragUploading}
                  className="btn-primary text-xs sm:text-sm py-2.5 px-5 gap-2 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{ragUploading ? "Processing Vector Index…" : "Upload & Build Vector Index"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Indexed Documents Catalog */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-urbanist font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#A068FF]" />
                <span>Indexed Learning Documents & Manuals ({indexedDocs.length})</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Ready for Grounded Assessment
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {indexedDocs.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-6 sovereign-card rounded-2xl border border-white/10 hover:border-[#A068FF]/40 flex flex-col justify-between space-y-4 transition-all shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-[#A068FF] shrink-0" />
                        <span className="text-sm font-urbanist font-bold text-white truncate max-w-[260px]">
                          {doc.name}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-mono font-semibold shrink-0">
                        {doc.chunks} Chunks
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {doc.description}
                    </p>

                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {doc.competencies.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-mono text-slate-200"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      ~{doc.pages} Pages Indexed
                    </span>
                    <button
                      onClick={() => {
                        navigate("/quiz", {
                          state: { documentId: doc.id, documentName: doc.name },
                        });
                      }}
                      className="btn-primary text-xs sm:text-sm py-2 px-4 gap-2 shadow-[0_0_15px_rgba(160,104,255,0.3)]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Take RAG Assessment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
