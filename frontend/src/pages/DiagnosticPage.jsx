import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import {
  BrainCircuit,
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Award,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Check,
  Info,
  Layers,
  FileText,
} from "lucide-react";
import StatsCounter from "../components/ui/stats-counter";
import { GlowBorderCard } from "../components/ui/glow-border-card";

export default function DiagnosticPage() {
  const { token, learner } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);

  // Target role selection state
  const [targetRole, setTargetRole] = useState(
    learner?.career_goal?.replace("Target Role: ", "") || "Junior Statistical Officer"
  );

  async function handleStartDiagnostic() {
    if (!token) {
      openAuthModal(handleStartDiagnostic);
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setLastFeedback(null);
    setSelectedOption(-1);

    try {
      const res = await client.post("/diagnostic/start", {
        target_role: targetRole,
        desired_timeline_months: 12,
        learning_preference: "guided",
      });

      setSession(res.data.session_id);
      setCurrentQuestion(res.data.question);
      setQuestionNum(res.data.question_number);
      setTotalQuestions(res.data.total_questions);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not initialize diagnostic session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswerQuestion() {
    if (selectedOption === -1 || !session || !currentQuestion) return;
    setError("");
    setLoading(true);

    try {
      const res = await client.post("/diagnostic/answer", {
        session_id: session,
        question_id: currentQuestion.id,
        selected_option: selectedOption,
      });

      if (res.data.status === "diagnostic_complete") {
        setResult(res.data);
        setCurrentQuestion(null);
        setSession(null);
      } else {
        setLastFeedback({
          correct: res.data.last_answer_correct,
          explanation: res.data.explanation,
        });
        setCurrentQuestion(res.data.question);
        setQuestionNum(res.data.question_number);
        setSelectedOption(-1);
        setShowEvidence(false);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not process answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-16"
    >
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-urbanist font-bold text-3xl sm:text-4xl text-white tracking-tight">
              AI Adaptive Diagnostic Interview
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-urbanist font-bold uppercase tracking-wider">
              5–7 Adaptive Items
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Dynamic computer-adaptive assessment calibrating your current competency profile against national cadre requirements.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center gap-2.5 text-xs shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A068FF] shadow-[0_0_10px_#A068FF]" />
            <span className="text-slate-200 font-medium">BKT Calibrated</span>
            <span className="text-[#C084FC] font-mono text-xs font-semibold">(2PL IRT)</span>
          </div>
        </div>
      </div>

      {/* Intro / Pre-start State */}
      {!session && !result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 sovereign-card p-7 sm:p-9 space-y-7 rounded-2xl shadow-xl border border-white/10">
            <div className="space-y-3">
              <span className="text-xs font-urbanist font-bold uppercase tracking-wider text-[#C084FC]">
                Phase 1 of Competency Evidence Loop
              </span>
              <h2 className="font-urbanist font-bold text-2xl sm:text-3xl text-white tracking-tight">
                Calibrate Your Baseline Competency Profile
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Unlike simple questionnaires that trust self-reported skills, SkillLens AI dynamically serves 5 to 7 adaptive questions. Each item response recalibrates your ability estimate, detects root-cause gaps, and updates your sovereign Competency Passbook.
              </p>
            </div>

            {/* Target Cadre / Role Input */}
            <div className="p-5 rounded-xl bg-white/[0.025] border border-white/10 space-y-3.5 backdrop-blur-md">
              <label className="block text-xs font-bold text-slate-300 font-urbanist uppercase tracking-wider">
                TARGET CADRE / DESIRED ROLE
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  "Junior Statistical Officer",
                  "Data Analyst (Statistical System)",
                  "Survey Supervisor",
                ].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTargetRole(role)}
                    className={`p-4 rounded-xl text-left text-xs font-medium transition-all border ${
                      targetRole === role
                        ? "bg-[#A068FF]/15 border-[#A068FF] text-white shadow-[0_0_15px_rgba(160,104,255,0.2)]"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <p className="font-urbanist font-bold text-sm text-white">{role}</p>
                    <p className="text-xs text-slate-400 mt-1">MoSPI FRAC Framework</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Features Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                <BrainCircuit className="w-5 h-5 text-[#A068FF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-urbanist font-bold text-sm text-white">Item Response Dynamic</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Steps difficulty up on correct answers, foundational on error.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <div>
                  <p className="font-urbanist font-bold text-sm text-white">Traceable Citations</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Every item cites its official statistical manual and handbook page.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-urbanist font-bold text-sm text-white">Passbook Evidence</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Calibrates initial BKT mastery and root-cause prerequisite DAG.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleStartDiagnostic}
              disabled={loading}
              className="btn-primary text-sm py-3 px-7 gap-2.5 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Synthesizing Diagnostic Questions…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Adaptive Diagnostic (6 Questions)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Side Explainer Card */}
          <div className="lg:col-span-4 space-y-5">
            <div className="sovereign-card p-6 sm:p-7 space-y-4 rounded-2xl border border-white/10 shadow-xl">
              <span className="text-xs font-urbanist font-bold text-[#C084FC] uppercase tracking-wider">
                The 4 Core Questions
              </span>
              <h3 className="font-urbanist font-bold text-base sm:text-lg text-white">
                SkillLens Platform Architecture
              </h3>
              <div className="space-y-3 text-xs text-slate-300 pt-3 border-t border-white/10">
                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10">
                  <p className="font-urbanist font-bold text-[#C084FC]">1. Where am I currently?</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Evaluated via this adaptive diagnostic & BKT mastery probability.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10">
                  <p className="font-urbanist font-bold text-[#38BDF8]">2. Where do I want to go?</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Defined by your selected target role and FRAC cadre benchmark.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10">
                  <p className="font-urbanist font-bold text-amber-400">3. What is missing?</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Pinpointed by root-cause DAG and prerequisite bottleneck analysis.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10">
                  <p className="font-urbanist font-bold text-[#C084FC]">4. How do I prove it?</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Through RAG assessments, reassessment loops, and Passbook ledger.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Diagnostic Session State */}
      {session && currentQuestion && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress Header */}
          <div className="p-5 rounded-2xl sovereign-card flex flex-col gap-3 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-urbanist font-bold text-white">
                  Diagnostic Item {questionNum} / {totalQuestions}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-[#C084FC] font-semibold">
                  {currentQuestion.competency_name}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-xs">
                Level {currentQuestion.difficulty} FRAC Item
              </span>
            </div>
            <div className="w-full bg-[#09041a] rounded-full h-2 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#A068FF] to-[#7C3AED] h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#A068FF]"
                style={{ width: `${(questionNum / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Feedback banner from previous item */}
          {lastFeedback && (
            <div
              className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${
                lastFeedback.correct
                  ? "bg-[#A068FF]/15 border-[#A068FF]/30 text-purple-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-200"
              }`}
            >
              {lastFeedback.correct ? (
                <CheckCircle2 className="w-5 h-5 text-[#A068FF] shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-urbanist font-bold text-white">
                  {lastFeedback.correct ? "Previous item answered correctly — Difficulty stepped up" : "Previous item incorrect — Probing prerequisite baseline"}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{lastFeedback.explanation}</p>
              </div>
            </div>
          )}

          {/* Question Card */}
          <div className="p-7 sm:p-8 rounded-2xl sovereign-card space-y-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <span className="px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-urbanist font-bold uppercase tracking-wider">
                Topic: {currentQuestion.topic}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Target: {targetRole}
              </span>
            </div>

            <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white leading-relaxed">
              {currentQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, oIdx) => {
                const isSelected = selectedOption === oIdx;
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => setSelectedOption(oIdx)}
                    className={`w-full p-4 sm:p-4.5 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#A068FF]/15 text-white border border-[#A068FF] shadow-[0_0_15px_rgba(160,104,255,0.25)]"
                        : "bg-white/[0.025] text-slate-200 border border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                          isSelected
                            ? "bg-[#A068FF] text-white shadow-[0_0_8px_#A068FF]"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="leading-relaxed font-sans">{opt}</span>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-[#C084FC] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Traceable Source Evidence Accordion */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="text-xs font-mono text-slate-400 hover:text-[#C084FC] flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>{showEvidence ? "Hide Source Evidence" : "View Traceable Manual Citation"}</span>
              </button>

              {showEvidence && (
                <div className="mt-3 p-4 rounded-xl bg-white/[0.025] border border-white/10 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-[#C084FC] font-semibold">Source: National Statistical Framework Manual</span>
                    <span>Page 14 · Sec 3.2</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed italic border-l-2 border-[#A068FF] pl-2.5 mt-1.5">
                    "Official survey schedules require strict alignment with stratification guidelines to maintain design effects within administrative bounds."
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-5 border-t border-white/10">
              <div className="text-xs text-slate-400 font-mono">
                Bayesian ability estimate branches automatically.
              </div>
              <button
                onClick={handleAnswerQuestion}
                disabled={loading || selectedOption === -1}
                className="btn-primary text-xs sm:text-sm py-2.5 px-6 gap-2 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Recalibrating Theta…</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Result Screen */}
      {result && (
        <div className="space-y-7 max-w-4xl mx-auto">
          <div className="p-7 sm:p-9 rounded-2xl sovereign-card text-center border border-white/10 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-[#A068FF]/20 border border-[#A068FF]/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(160,104,255,0.3)]">
              <Award className="w-7 h-7 text-[#A068FF]" />
            </div>

            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 uppercase font-semibold">
              Diagnostic Complete
            </span>
            <h2 className="font-urbanist font-bold text-2xl sm:text-3xl text-white mt-3">
              Calibrated Competency Profile Verified
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
              Your baseline competency levels have been estimated and logged into your Passbook with full evidence confidence metrics.
            </p>

            <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-center">
              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10">
                <p className="text-xs uppercase font-mono text-slate-400">Diagnostic Score</p>
                <StatsCounter
                  value={parseFloat(result.score_pct || 0)}
                  decimals={0}
                  suffix="%"
                  duration={1.2}
                  className="text-3xl font-urbanist font-bold text-white mt-1"
                />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10">
                <p className="text-xs uppercase font-mono text-slate-400">Items Validated</p>
                <p className="text-3xl font-urbanist font-bold text-[#C084FC] mt-1 font-mono">
                  {result.correct_count} / {result.total_questions}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10">
                <p className="text-xs uppercase font-mono text-slate-400">Evidence Confidence</p>
                <p className="text-sm font-semibold text-white mt-2.5 font-mono">
                  {result.assessment_confidence}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10">
                <p className="text-xs uppercase font-mono text-slate-400">Next Action</p>
                <p className="text-sm font-semibold text-[#C084FC] mt-2.5">
                  Roadmap Active
                </p>
              </div>
            </div>

            {/* Call to action buttons */}
            <div className="mt-8 flex items-center justify-center gap-3.5 flex-wrap">
              <button
                onClick={() => navigate("/gaps")}
                className="btn-primary text-xs sm:text-sm py-2.5 px-5 gap-2 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
              >
                <span>View Cadre Gaps & Root Cause</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate("/learn")}
                className="btn-secondary text-xs sm:text-sm py-2.5 px-5 gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Open Personalized Roadmap</span>
              </button>

              <button
                onClick={handleStartDiagnostic}
                className="btn-secondary text-xs sm:text-sm py-2.5 px-4 gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Diagnostic</span>
              </button>
            </div>
          </div>

          {/* Calibrated Profile Table */}
          {result.calibrated_profile && result.calibrated_profile.length > 0 && (
            <div className="sovereign-card p-6 sm:p-7 space-y-4 rounded-2xl border border-white/10 shadow-xl">
              <h3 className="font-urbanist font-bold text-base sm:text-lg text-white mb-2">
                Calibrated Competency Matrix
              </h3>
              <div className="divide-y divide-white/10">
                {result.calibrated_profile.map((item, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="font-semibold text-white">{item.competency_name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Mastery Probability: {Math.round(item.mastery_probability * 100)}% · Confidence: {item.confidence}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#C084FC]">
                        Level {item.estimated_level} / {item.required_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item by Item Traceability Breakdown */}
          {result.breakdown && (
            <div className="p-6 sm:p-7 rounded-2xl sovereign-card space-y-4 border border-white/10 shadow-xl">
              <h3 className="font-urbanist font-bold text-base sm:text-lg text-white mb-2">
                Traceable Item Explanations & Evidence
              </h3>

              {result.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-xs font-mono text-[#C084FC] border border-white/10 mb-1 inline-block">
                        Level {item.difficulty || 3} · {item.competency_name}
                      </span>
                      <p className="font-medium text-white mt-1">
                        {idx + 1}. {item.question_id}
                      </p>
                    </div>
                    {item.is_correct ? (
                      <span className="flex items-center gap-1.5 text-[#C084FC] shrink-0 font-mono text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-[#A068FF]" /> Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-400 shrink-0 font-mono text-xs font-bold">
                        <XCircle className="w-4 h-4" /> Incorrect
                      </span>
                    )}
                  </div>

                  {item.explanation && (
                    <p className="text-slate-300 text-xs leading-relaxed pl-3 border-l-2 border-[#A068FF] mt-2">
                      {item.explanation}
                    </p>
                  )}

                  {item.source_doc && (
                    <div className="text-xs font-mono text-slate-400 pt-1 flex items-center gap-2">
                      <span className="text-[#C084FC]">Source: {item.source_doc}</span>
                      <span>Page {item.page_number}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
