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
  const [error, setError] = useState("");

  async function handleGenerate() {
    // Gate: require authentication before generating the quiz
    const authed = await requireAuth();
    if (!authed) return;
    setError("");
    setLoading(true);
    try {
      let documentId = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await client.post("/quiz/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        documentId = uploadRes.data.document_id;
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
          "Unable to generate quiz. If this is your first run, check that GEMINI_API_KEY or GROQ_API_KEY is configured in backend/.env."
      );
    } finally {
      setLoading(false);
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
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Visual Stepper */}
      <div className="flex items-center justify-between px-6 py-3 rounded-2xl glass-panel text-xs text-slate-400">
        <div className={`flex items-center gap-2 ${step === STEPS.SOURCE ? "text-teal-400 font-bold" : "text-slate-400"}`}>
          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
          <span>Source & Configuration</span>
        </div>
        <div className="w-12 h-[1px] bg-white/10" />
        <div className={`flex items-center gap-2 ${step === STEPS.TAKING ? "text-teal-400 font-bold" : "text-slate-400"}`}>
          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
          <span>Interactive Assessment</span>
        </div>
        <div className="w-12 h-[1px] bg-white/10" />
        <div className={`flex items-center gap-2 ${step === STEPS.RESULT ? "text-teal-400 font-bold" : "text-slate-400"}`}>
          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
          <span>Sovereign Certification</span>
        </div>
      </div>

      {/* Step 1: Configuration & Source Selection */}
      {step === STEPS.SOURCE && (
        <div className="p-8 rounded-2xl glass-panel space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="font-display font-bold text-xl text-white">
                AI Competency Assessment Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Generate an adaptive evaluation using Mission Karmayogi module content or any custom training document.
            </p>
          </div>

          {/* Preselected Module Notification */}
          {preselectedTitle && !file && (
            <div className="p-4 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Selected iGOT Module</p>
                  <p className="text-[11px] text-teal-200/90">{preselectedTitle}</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-medium">
                Active Source
              </span>
            </div>
          )}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Or Upload Official Material (PDF)
            </label>
            <div
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                file
                  ? "border-teal-400/50 bg-teal-400/5"
                  : "border-white/10 hover:border-white/20 bg-slate-900/40"
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
                <UploadCloud className={`w-8 h-8 mb-2 ${file ? "text-teal-400" : "text-slate-400"}`} />
                {file ? (
                  <div>
                    <p className="text-xs font-semibold text-teal-300">{file.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB · Click to choose different file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      Drop circular or curriculum PDF here, or <span className="text-teal-400 font-semibold">Browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Zero-shot auto-tagging will map content to official FRAC competencies
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Assessment Mode Toggle */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Assessment Mode</span>
                <span className="text-[10px] text-teal-400 font-normal">Adaptive CAT adjusts difficulty dynamically</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("adaptive")}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    mode === "adaptive"
                      ? "bg-teal-400/15 border-teal-400 text-white shadow-lg shadow-teal-500/10"
                      : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-teal-300">Computerized Adaptive Testing (CAT)</span>
                    <span className="px-1.5 py-0.5 rounded bg-teal-400/20 text-teal-300 text-[9px] font-bold uppercase">Default</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time ability (&theta;) tracing; dynamically serves easier/harder questions until score converges.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("fixed")}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    mode === "fixed"
                      ? "bg-teal-400/15 border-teal-400 text-white shadow-lg shadow-teal-500/10"
                      : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">Fixed-Length Assessment</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">Classic</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fixed question count without adaptive theta branching.
                  </p>
                </button>
              </div>
            </div>

            {/* Question Count (for fixed mode or pool size) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {mode === "adaptive" ? "Adaptive Question Pool" : "Questions"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNumQuestions(count)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      numQuestions === count
                        ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
                        : "bg-slate-900/60 text-slate-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-teal-400" />
                <span>Evaluation Language</span>
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
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      language === lang.id
                        ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
                        : "bg-slate-900/60 text-slate-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/20 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Invoking Gemini Model…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Adaptive Assessment</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Taking Quiz */}
      {step === STEPS.TAKING && (quiz || adaptiveSession) && (
        <div className="space-y-6">
          {mode === "adaptive" && adaptiveSession ? (
            /* Adaptive Testing Header: Live Difficulty Meter & Ability Theta */
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_#48E5C2]" />
                  <span className="font-bold text-white text-sm">Computerized Adaptive Testing</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-teal-300 font-semibold">
                    Question #{adaptiveSession.questions_answered + 1}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {adaptiveSession.difficulty_trend && adaptiveSession.difficulty_trend !== "same" && (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-500 animate-bounce ${
                        adaptiveSession.difficulty_trend === "harder"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {adaptiveSession.difficulty_trend === "harder"
                        ? "↑ Adaptive Level Scaled Up"
                        : "↓ Adaptive Level Adjusted Down"}
                    </span>
                  )}

                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Ability (&theta;):</span>
                    <span className="font-mono font-extrabold text-teal-300 text-xs">
                      {adaptiveSession.theta?.toFixed(2)} / 5.00
                    </span>
                  </div>
                </div>
              </div>

              {/* Live 5-Level Difficulty Meter */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Live Item Difficulty Meter:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-teal-400">Level {adaptiveSession.current_difficulty}</span>
                    <span className="text-slate-400 font-normal">
                      (
                      {adaptiveSession.current_difficulty === 1
                        ? "Basic Recall"
                        : adaptiveSession.current_difficulty === 2
                        ? "Elementary"
                        : adaptiveSession.current_difficulty === 3
                        ? "FRAC Standard"
                        : adaptiveSession.current_difficulty === 4
                        ? "Complex Logic"
                        : "Advanced Synthesis"}
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
                        className={`py-2 px-1 rounded-xl text-center transition-all duration-300 border ${
                          isActive
                            ? "bg-gradient-to-b from-teal-400/30 to-emerald-500/20 border-teal-400 text-white shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/50 scale-102"
                            : isPassed
                            ? "bg-teal-400/10 border-teal-400/20 text-teal-300/70"
                            : "bg-slate-900/40 border-white/[0.06] text-slate-400"
                        }`}
                      >
                        <p className={`text-xs font-bold ${isActive ? "text-teal-300" : ""}`}>
                          Lvl {lvl}
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
            <div className="p-5 rounded-2xl glass-panel flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    Question {currentIndex + 1} of {quiz?.questions.length}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-teal-300 font-medium">
                    {quiz?.title || "Official Statistical Protocol"}
                  </span>
                </div>
                <span className="text-slate-400">
                  {answers.filter((a) => a !== -1).length} answered
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300"
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
              <div className="p-8 rounded-2xl glass-panel space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-teal-400/10 text-teal-300 border border-teal-400/20 text-[10px] font-bold uppercase tracking-wider">
                    Level {qDiff} Item
                  </span>
                  {isAdapt && (
                    <span className="text-[11px] text-slate-400">
                      Theta target: {adaptiveSession.theta?.toFixed(2)}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-lg text-white leading-relaxed">
                  {q.question}
                </h3>

                {/* Options List */}
                <div className="space-y-3">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = currentSelected === oIdx;

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentIndex, oIdx)}
                        className={`w-full p-4 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-teal-400/15 text-teal-200 border-2 border-teal-400 shadow-lg shadow-teal-500/10"
                            : "bg-slate-900/50 text-slate-300 border border-white/[0.08] hover:border-white/20 hover:bg-slate-900/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? "bg-teal-400 text-slate-950"
                                : "bg-white/[0.05] text-slate-400"
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="leading-relaxed">{opt}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Action Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-white/[0.08]">
                  {isAdapt ? (
                    <>
                      <div className="text-[11px] text-slate-400">
                        Select your answer and continue to trigger dynamic difficulty recalculation.
                      </div>
                      <button
                        onClick={handleAdaptiveAnswer}
                        disabled={loading || selectedOption === -1}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 text-xs font-extrabold hover:brightness-110 shadow-lg shadow-teal-500/20 disabled:opacity-40 transition-all"
                      >
                        {loading ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                            <span>Updating Theta & Estimating Next Item…</span>
                          </>
                        ) : (
                          <>
                            <span>Submit & Adapt Item</span>
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
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold disabled:opacity-30 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      {currentIndex < quiz.questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 shadow-md shadow-teal-500/20 transition-all"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={loading || answers.includes(-1)}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-extrabold hover:brightness-110 shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all"
                        >
                          {loading ? (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                              <span>Scoring…</span>
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4" />
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
          <div className="p-8 rounded-2xl glass-panel text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-teal-500/20 ring-1 ring-white/20">
              <Award className="w-8 h-8 text-slate-950" />
            </div>

            <h2 className="font-display font-extrabold text-2xl text-white">
              Assessment Completed & Certified
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Your verified scores and Bayesian/CAT estimates have been logged and synced into your Competency Passbook.
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {/* Score */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08]">
                <p className="text-[10px] uppercase font-bold text-slate-400">Score</p>
                <p className="text-2xl font-display font-extrabold text-white mt-0.5">
                  {result.score_percent || result.score}%
                </p>
              </div>

              {/* Theta Ability */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08]">
                <p className="text-[10px] uppercase font-bold text-slate-400">Final Ability (&theta;)</p>
                <p className="text-2xl font-display font-extrabold text-teal-300 mt-0.5 font-mono">
                  {result.final_theta !== undefined ? result.final_theta.toFixed(2) : ((result.score || 70) / 20).toFixed(2)}
                </p>
              </div>

              {/* Confidence of Estimate */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08]">
                <p className="text-[10px] uppercase font-bold text-slate-400">Estimation Confidence</p>
                <p className="text-xs font-bold text-emerald-400 mt-2">
                  {result.confidence_of_estimate || (result.converged ? "High (Converged)" : "Moderate (Pool Exhausted)")}
                </p>
              </div>

              {/* Status */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08]">
                <p className="text-[10px] uppercase font-bold text-slate-400">Cadre Standard</p>
                <p
                  className={`text-xs font-bold uppercase tracking-wider mt-2 px-2 py-0.5 rounded-full border inline-block ${
                    (result.score_percent || result.score) >= 60
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {(result.score_percent || result.score) >= 60 ? "Standard Met" : "Needs Review"}
                </p>
              </div>
            </div>

            {/* Questions by Difficulty Level Breakdown */}
            {result.difficulty_distribution && (
              <div className="mt-6 p-4 rounded-xl bg-slate-900/50 border border-white/[0.08] max-w-xl mx-auto">
                <p className="text-xs font-semibold text-slate-300 mb-3 text-left">
                  Items Answered Across Difficulty Spectrum (CAT Routing):
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const count = result.difficulty_distribution[lvl] || 0;
                    return (
                      <div key={lvl} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                        <p className="text-[10px] text-slate-400">Lvl {lvl}</p>
                        <p className="text-base font-display font-extrabold text-white mt-0.5 font-mono">{count}</p>
                        <p className="text-[9px] text-slate-400">item{count !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-teal-500/20 transition-all"
              >
                View Updated Passbook
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Take Another Assessment</span>
              </button>
            </div>
          </div>

          {/* Breakdown per question */}
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="font-display font-bold text-sm text-white mb-2">
              Performance Review & Rationales
            </h3>

            {result.breakdown?.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/50 border border-white/[0.06] text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-teal-300 border border-white/10">
                        Difficulty Level {item.difficulty || 3}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200">
                      {idx + 1}. {item.question}
                    </p>
                  </div>
                  {item.is_correct ? (
                    <span className="flex items-center gap-1 text-emerald-400 shrink-0 font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 shrink-0 font-medium text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>

                {item.explanation && (
                  <p className="text-slate-400 text-[11px] leading-relaxed pl-2 border-l border-teal-400/30">
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
