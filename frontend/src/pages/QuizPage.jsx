import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuthGate } from "../hooks/useAuthGate";
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  Languages,
  BookOpen,
  Check,
  AlertCircle,
  LogIn,
} from "lucide-react";

const STEPS = { SOURCE: "source", TAKING: "taking", RESULT: "result" };

export default function QuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preselectedModule = location.state?.moduleId;
  const preselectedTitle = location.state?.moduleTitle;
  const { requireAuth } = useAuthGate();

  const [step, setStep] = useState(STEPS.SOURCE);
  const [file, setFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState("adaptive"); // "adaptive" | "fixed"
  const [quiz, setQuiz] = useState(null);
  const [adaptiveSession, setAdaptiveSession] = useState(null);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate() {
    // Gate: require authentication before generating the quiz
    const authed = await requireAuth();
    if (!authed) return;
    setError("");
    setLoading(true);
    setLoadingText(file ? "Uploading & Processing Document…" : "Generating Assessment Questions…");
    try {
      let documentId = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await client.post("/quiz/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        documentId = uploadRes.data.document_id;
        setLoadingText("Generating Adaptive Questions & Rubrics…");
      }

      const genRes = await client.post("/quiz/generate", {
        document_id: documentId,
        module_id: !file ? preselectedModule : null,
        num_questions: numQuestions,
        language,
        mode,
      });
      setQuiz(genRes.data);

      if (mode === "adaptive") {
        setLoadingText("Initializing Adaptive Testing Session…");
        // Start Computerized Adaptive Testing session
        const adaptRes = await client.post("/quiz/adaptive/start", {
          quiz_id: genRes.data.id,
        });
        setAdaptiveSession(adaptRes.data);
        setSelectedOption(-1);
      } else {
        setAnswers(new Array(genRes.data.questions.length).fill(-1));
        setCurrentIndex(0);
      }

      setStep(STEPS.TAKING);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to generate quiz. Please verify that the file is accessible and try again."
      );
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  async function handleAdaptiveAnswer() {
    if (selectedOption === -1 || !adaptiveSession) return;
    setLoading(true);
    setError("");
    try {
      const res = await client.post("/quiz/adaptive/answer", {
        session_id: adaptiveSession.session_id,
        question_index: adaptiveSession.question_index,
        selected_option: selectedOption,
      });

      if (res.data.status === "quiz_complete") {
        setResult(res.data);
        setStep(STEPS.RESULT);
      } else {
        setAdaptiveSession(res.data);
        setSelectedOption(-1);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error processing adaptive answer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await client.post("/quiz/submit", { quiz_id: quiz.id, answers });
      setResult(res.data);
      setStep(STEPS.RESULT);
    } catch (err) {
      setError(err.response?.data?.detail || "Error submitting answers.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(STEPS.SOURCE);
    setFile(null);
    setQuiz(null);
    setAdaptiveSession(null);
    setSelectedOption(-1);
    setAnswers([]);
    setResult(null);
    setCurrentIndex(0);
    setError("");
  }

  function handleSelectOption(qIdx, optionIdx) {
    if (mode === "adaptive") {
      setSelectedOption(optionIdx);
    } else {
      const next = [...answers];
      next[qIdx] = optionIdx;
      setAnswers(next);
    }
  }

  return (
    <div className="space-y-7 pb-12 max-w-4xl mx-auto">
      {/* Visual Stepper */}
      <div className="flex items-center justify-between px-5 py-3 rounded-lg sovereign-card text-xs text-slate-400 font-mono">
        <div className={`flex items-center gap-2 ${step === STEPS.SOURCE ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
          <span className="w-5 h-5 rounded border border-current flex items-center justify-center text-[10px] num-tabular">1</span>
          <span className="font-sans">Protocol Source</span>
        </div>
        <div className="w-8 sm:w-16 h-[1px] bg-white/10" />
        <div className={`flex items-center gap-2 ${step === STEPS.TAKING ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
          <span className="w-5 h-5 rounded border border-current flex items-center justify-center text-[10px] num-tabular">2</span>
          <span className="font-sans">Adaptive Exam</span>
        </div>
        <div className="w-8 sm:w-16 h-[1px] bg-white/10" />
        <div className={`flex items-center gap-2 ${step === STEPS.RESULT ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
          <span className="w-5 h-5 rounded border border-current flex items-center justify-center text-[10px] num-tabular">3</span>
          <span className="font-sans">Cadre Scoring</span>
        </div>
      </div>

      {/* Step 1: Configuration & Source Selection */}
      {step === STEPS.SOURCE && (
        <div className="p-5 sm:p-7 rounded-lg sovereign-card space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="font-display font-bold text-lg text-white">
                Computerized Adaptive Testing Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dynamic item selection calibrated to the FRAC framework or zero-shot parsed training circulars.
            </p>
          </div>

          {/* Preselected Module Notification */}
          {preselectedTitle && !file && (
            <div className="p-3.5 rounded-md bg-[#0c1629] border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Active Curriculum Reference</p>
                  <p className="text-[11px] text-slate-300 font-sans">{preselectedTitle}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                LOCKED
              </span>
            </div>
          )}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 font-mono">
              DOCUMENT CONTEXT (OPTIONAL PDF CIRCULAR)
            </label>
            <div
              className={`border border-dashed rounded-lg p-6 text-center transition-colors ${
                file
                  ? "border-emerald-500/50 bg-[#070d18]"
                  : "border-white/15 hover:border-white/25 bg-[#070d18]"
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                id="doc-upload"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className={`w-7 h-7 mb-2 ${file ? "text-emerald-400" : "text-slate-500"}`} />
                {file ? (
                  <div>
                    <p className="text-xs font-semibold text-emerald-300 font-mono">{file.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {(file.size / 1024).toFixed(1)} KB · Click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-slate-300">
                      Drop official circular or manual PDF, or <span className="text-emerald-400 underline underline-offset-2">Select file</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      System will map content across statistical competencies
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Assessment Mode Toggle */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center justify-between font-mono">
                <span>EVALUATION PROTOCOL</span>
                <span className="text-[11px] text-slate-400 font-normal">CAT dynamically branches difficulty</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("adaptive")}
                  className={`p-3.5 rounded-lg text-left transition-colors border ${
                    mode === "adaptive"
                      ? "bg-[#0c1629] border-emerald-400 text-white"
                      : "bg-[#070d18] border-white/10 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">Computerized Adaptive Testing</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-mono font-bold uppercase">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Bayesian ability (&theta;) scoring; dynamically serves easier/harder items until convergence.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("fixed")}
                  className={`p-3.5 rounded-lg text-left transition-colors border ${
                    mode === "fixed"
                      ? "bg-[#0c1629] border-emerald-400 text-white"
                      : "bg-[#070d18] border-white/10 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">Fixed-Length Battery</span>
                    <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 text-[9px] font-mono">Static</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Standard linear item sequence with predetermined question set.
                  </p>
                </button>
              </div>
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 font-mono">
                {mode === "adaptive" ? "QUESTION POOL CAPACITY" : "ITEM COUNT"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNumQuestions(count)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                      numQuestions === count
                        ? "bg-emerald-400 text-slate-950 font-bold"
                        : "bg-[#070d18] text-slate-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5 font-mono">
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                <span>OFFICIAL LANGUAGE</span>
              </label>
              <div className="flex gap-2">
                {[
                  { id: "en", label: "English" },
                  { id: "hi", label: "हिन्दी (Hindi)" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLanguage(lang.id)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      language === lang.id
                        ? "bg-emerald-400 text-slate-950 font-bold"
                        : "bg-[#070d18] text-slate-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary w-full justify-center py-2.5 text-xs gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>{loadingText || "Processing Assessment…"}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Initialize Adaptive Assessment</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Taking Quiz */}
      {step === STEPS.TAKING && (quiz || adaptiveSession) && (
        <div className="space-y-5">
          {mode === "adaptive" && adaptiveSession ? (
            /* Adaptive Testing Header: Live Difficulty Meter & Ability Theta */
            <div className="p-5 sm:p-6 rounded-lg sovereign-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-white">Computerized Adaptive Testing</span>
                  <span className="text-slate-400 font-mono">·</span>
                  <span className="text-emerald-300 font-mono font-medium">
                    Item #{adaptiveSession.questions_answered + 1}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {adaptiveSession.difficulty_trend && adaptiveSession.difficulty_trend !== "same" && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                        adaptiveSession.difficulty_trend === "harder"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {adaptiveSession.difficulty_trend === "harder"
                        ? "↑ Item Difficulty Scaled Up"
                        : "↓ Difficulty Calibrated Down"}
                    </span>
                  )}

                  <div className="px-2.5 py-1 rounded-md bg-[#070d18] border border-white/10 flex items-center gap-1.5 font-mono">
                    <span className="text-[10px] uppercase text-slate-400">Ability (&theta;):</span>
                    <span className="font-bold text-white text-xs num-tabular">
                      {adaptiveSession.theta?.toFixed(2)} / 5.00
                    </span>
                  </div>
                </div>
              </div>

              {/* Live 5-Level Difficulty Meter */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">CURRENT DIFFICULTY ROUTING:</span>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400">Level {adaptiveSession.current_difficulty}</span>
                    <span className="text-slate-400 font-normal">
                      (
                      {adaptiveSession.current_difficulty === 1
                        ? "Recall"
                        : adaptiveSession.current_difficulty === 2
                        ? "Elementary"
                        : adaptiveSession.current_difficulty === 3
                        ? "Standard FRAC"
                        : adaptiveSession.current_difficulty === 4
                        ? "Complex Logic"
                        : "Principal Mastery"}
                      )
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const isActive = lvl === adaptiveSession.current_difficulty;
                    const isPassed = lvl < adaptiveSession.current_difficulty;
                    return (
                      <div
                        key={lvl}
                        className={`py-1.5 px-1 rounded-md text-center border font-mono transition-colors ${
                          isActive
                            ? "bg-emerald-500/15 border-emerald-400 text-white"
                            : isPassed
                            ? "bg-[#070d18] border-emerald-500/30 text-emerald-400/80"
                            : "bg-[#070d18] border-white/[0.06] text-slate-400"
                        }`}
                      >
                        <p className={`text-xs font-semibold ${isActive ? "text-emerald-300" : ""}`}>
                          L{lvl}
                        </p>
                        <p className="text-[9px] truncate">
                          {lvl === 1 ? "Recall" : lvl === 2 ? "Basic" : lvl === 3 ? "Standard" : lvl === 4 ? "Complex" : "Expert"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Classic Fixed Header */
            <div className="p-4 rounded-lg sovereign-card flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white font-mono">
                    Question {currentIndex + 1} / {quiz?.questions.length}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300 font-medium">
                    {quiz?.title || "Statistical Assessment Battery"}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {answers.filter((a) => a !== -1).length} completed
                </span>
              </div>
              <div className="w-full bg-[#070d18] rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / (quiz?.questions.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Current Question Card */}
          {(() => {
            const isAdapt = mode === "adaptive" && adaptiveSession;
            const q = isAdapt ? adaptiveSession.question : quiz.questions[currentIndex];
            const currentSelected = isAdapt ? selectedOption : answers[currentIndex];
            const qDiff = isAdapt ? adaptiveSession.current_difficulty : q.difficulty;

            return (
              <div className="p-5 sm:p-7 rounded-lg sovereign-card space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-[10px] font-mono font-semibold uppercase tracking-wider">
                    Level {qDiff} FRAC Item
                  </span>
                  {isAdapt && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Theta target: <span className="text-slate-200">{adaptiveSession.theta?.toFixed(2)}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-base sm:text-lg text-white leading-relaxed">
                  {q.question}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = currentSelected === oIdx;

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentIndex, oIdx)}
                        className={`w-full p-3.5 rounded-lg text-left text-xs font-medium transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#0c1629] text-white border border-emerald-400"
                            : "bg-[#070d18] text-slate-300 border border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                              isSelected
                                ? "bg-emerald-400 text-slate-950"
                                : "bg-white/[0.06] text-slate-300"
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="leading-relaxed font-sans">{opt}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Action Navigation */}
                <div className="flex items-center justify-between pt-5 border-t border-white/[0.08]">
                  {isAdapt ? (
                    <>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Item response triggers Bayesian theta update.
                      </div>
                      <button
                        onClick={handleAdaptiveAnswer}
                        disabled={loading || selectedOption === -1}
                        className="btn-primary text-xs py-2 px-4 gap-1.5"
                      >
                        {loading ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                            <span>Updating Theta…</span>
                          </>
                        ) : (
                          <>
                            <span>Submit & Continue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="btn-secondary text-xs py-1.5 px-3 gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      {currentIndex < quiz.questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                          className="btn-primary text-xs py-1.5 px-3 gap-1"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={loading || answers.includes(-1)}
                          className="btn-primary text-xs py-1.5 px-3.5 gap-1.5"
                        >
                          {loading ? (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                              <span>Scoring…</span>
                            </>
                          ) : (
                            <>
                              <Award className="w-3.5 h-3.5" />
                              <span>Submit Assessment</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Step 3: Quiz Results & Verification */}
      {step === STEPS.RESULT && result && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-lg sovereign-card text-center">
            <div className="w-12 h-12 rounded-lg bg-[#0e1a30] border border-emerald-500/40 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>

            <h2 className="font-display font-bold text-xl text-white">
              Assessment Verified & Logged
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
              Evaluation results and Bayesian item response parameters recorded to your sovereign competency passbook.
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {/* Score */}
              <div className="p-3 rounded-md bg-[#070d18] border border-white/[0.06]">
                <p className="text-[10px] uppercase font-mono text-slate-400">Score</p>
                <p className="text-2xl font-display font-bold text-white mt-0.5 num-tabular">
                  {result.score_percent || result.score}%
                </p>
              </div>

              {/* Theta Ability */}
              <div className="p-3 rounded-md bg-[#070d18] border border-white/[0.06]">
                <p className="text-[10px] uppercase font-mono text-slate-400">Ability (&theta;)</p>
                <p className="text-2xl font-display font-bold text-emerald-400 mt-0.5 font-mono num-tabular">
                  {result.final_theta !== undefined ? result.final_theta.toFixed(2) : ((result.score || 70) / 20).toFixed(2)}
                </p>
              </div>

              {/* Estimation Confidence */}
              <div className="p-3 rounded-md bg-[#070d18] border border-white/[0.06]">
                <p className="text-[10px] uppercase font-mono text-slate-400">Confidence</p>
                <p className="text-xs font-semibold text-slate-200 mt-2">
                  {result.confidence_of_estimate || (result.converged ? "Converged" : "Standard")}
                </p>
              </div>

              {/* Status */}
              <div className="p-3 rounded-md bg-[#070d18] border border-white/[0.06]">
                <p className="text-[10px] uppercase font-mono text-slate-400">Cadre Standard</p>
                <p
                  className={`text-xs font-mono font-bold uppercase mt-2 px-2 py-0.5 rounded border inline-block ${
                    (result.score_percent || result.score) >= 60
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/25"
                  }`}
                >
                  {(result.score_percent || result.score) >= 60 ? "Met" : "Deficit"}
                </p>
              </div>
            </div>

            {/* Questions by Difficulty Breakdown */}
            {result.difficulty_distribution && (
              <div className="mt-5 p-3.5 rounded-md sovereign-well max-w-xl mx-auto">
                <p className="text-xs font-medium text-slate-300 mb-2.5 text-left font-mono">
                  ITEM ROUTING DISTRIBUTION:
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const count = result.difficulty_distribution[lvl] || 0;
                    return (
                      <div key={lvl} className="p-2 rounded bg-[#0b1424] border border-white/[0.06] text-center font-mono">
                        <p className="text-[10px] text-slate-400">Lvl {lvl}</p>
                        <p className="text-sm font-bold text-white mt-0.5 num-tabular">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="btn-primary text-xs py-2 px-4"
              >
                View Passbook
              </button>
              <button
                onClick={reset}
                className="btn-secondary text-xs py-2 px-3 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake / New Test</span>
              </button>
            </div>
          </div>

          {/* Breakdown per question */}
          <div className="p-5 sm:p-6 rounded-lg sovereign-card space-y-3.5">
            <h3 className="font-display font-semibold text-sm text-white mb-2">
              Performance Review & Item Rationales
            </h3>

            {result.breakdown?.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-md bg-[#070d18] border border-white/[0.06] text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-1.5 py-0.2 rounded bg-white/[0.05] text-[10px] font-mono text-emerald-400 border border-white/10 mb-1 inline-block">
                      Level {item.difficulty || 3}
                    </span>
                    <p className="font-medium text-slate-200 mt-0.5">
                      {idx + 1}. {item.question}
                    </p>
                  </div>
                  {item.is_correct ? (
                    <span className="flex items-center gap-1 text-emerald-400 shrink-0 font-mono text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 shrink-0 font-mono text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>

                {item.explanation && (
                  <p className="text-slate-400 text-[11px] leading-relaxed pl-2.5 border-l border-emerald-500/40 mt-2">
                    {item.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
