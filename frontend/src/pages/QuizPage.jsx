import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import StatsCounter from "../components/ui/stats-counter";

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

    try {
      let generatedQuiz = null;

      // Case 1: Direct File Upload on QuizPage (e.g. English Grammar Book)
      if (file) {
        setLoadingText("Uploading and indexing document into RAG vector memory…");
        const uploadData = new FormData();
        uploadData.append("file", file);
        const uploadRes = await client.post("/quiz/upload", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const docId = uploadRes.data.document_id;

        setLoadingText("Synthesizing RAG-grounded questions from document…");
        const genRes = await client.post("/quiz/generate", {
          document_id: docId,
          num_questions: numQuestions,
          language,
          mode,
        });
        generatedQuiz = genRes.data;
      }
      // Case 2: Indexed Document ID from LearnPage
      else if (location.state?.documentId) {
        setLoadingText("Generating questions from indexed document…");
        const genRes = await client.post("/quiz/generate", {
          document_id: location.state.documentId,
          num_questions: numQuestions,
          language,
          mode,
        });
        generatedQuiz = genRes.data;
      }
      // Case 3: Learning Module preselected
      else if (preselectedModule) {
        setLoadingText("Extracting curriculum from module…");
        const genRes = await client.post("/quiz/generate", {
          module_id: preselectedModule,
          num_questions: numQuestions,
          language,
          mode,
        });
        generatedQuiz = genRes.data;
      }
      // Case 4: Competency or Cadre Topic
      else {
        setLoadingText("Generating official statistical cadre questions…");
        const genRes = await client.post("/quiz/generate", {
          raw_text: location.state?.competencyName || preselectedTitle || "Official Statistics & Data Quality",
          num_questions: numQuestions,
          language,
          mode,
        });
        generatedQuiz = genRes.data;
      }

      // Route based on selected mode: Adaptive (CAT) vs Static Battery
      if (mode === "adaptive" && generatedQuiz?.id) {
        setLoadingText("Initializing Computerized Adaptive Testing (CAT) session…");
        const adaptRes = await client.post("/quiz/adaptive/start", {
          quiz_id: generatedQuiz.id,
          language,
        });
        setAdaptiveSession(adaptRes.data);
        setSelectedOption(-1);
        setStep(STEPS.TAKING);
      } else if (generatedQuiz) {
        setQuiz(generatedQuiz);
        setAnswers(new Array(generatedQuiz.questions.length).fill(-1));
        setCurrentIndex(0);
        setStep(STEPS.TAKING);
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      setError(err.response?.data?.detail || "Error generating assessment. Please verify backend status.");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  async function handleAdaptiveAnswer() {
    if (selectedOption === -1 || !adaptiveSession) return;
    setError("");
    setLoading(true);

    try {
      const res = await client.post("/quiz/adaptive/answer", {
        session_id: adaptiveSession.session_id,
        question_index: adaptiveSession.question_index ?? 0,
        question_id: adaptiveSession.question?.id,
        selected_option: selectedOption,
      });

      if (
        res.data.status === "quiz_complete" ||
        res.data.status === "converged" ||
        res.data.score_percent !== undefined
      ) {
        setResult(res.data);
        setStep(STEPS.RESULT);
      } else {
        setAdaptiveSession(res.data);
        setSelectedOption(-1);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error processing adaptive response.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const payload = {
        quiz_id: quiz.id,
        answers,
        document_id: quiz.document_id,
      };
      const res = await client.post("/quiz/submit", payload);
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-16 max-w-4xl mx-auto"
    >
      {/* Visual Stepper */}
      <div className="flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 rounded-2xl sovereign-card text-xs sm:text-sm font-urbanist font-bold border border-white/10 shadow-lg">
        <div className={`flex items-center gap-1.5 sm:gap-2.5 ${step === STEPS.SOURCE ? "text-[#C084FC]" : "text-slate-400"}`}>
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-mono num-tabular border ${step === STEPS.SOURCE ? "border-[#A068FF] bg-[#A068FF]/20 text-[#A068FF]" : "border-white/10"}`}>1</span>
          <span><span className="hidden sm:inline">Protocol </span>Source</span>
        </div>
        <div className="w-4 sm:w-16 h-[1px] bg-white/10 shrink-0" />
        <div className={`flex items-center gap-1.5 sm:gap-2.5 ${step === STEPS.TAKING ? "text-[#C084FC]" : "text-slate-400"}`}>
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-mono num-tabular border ${step === STEPS.TAKING ? "border-[#A068FF] bg-[#A068FF]/20 text-[#A068FF]" : "border-white/10"}`}>2</span>
          <span><span className="hidden sm:inline">Adaptive </span>Exam</span>
        </div>
        <div className="w-4 sm:w-16 h-[1px] bg-white/10 shrink-0" />
        <div className={`flex items-center gap-1.5 sm:gap-2.5 ${step === STEPS.RESULT ? "text-[#C084FC]" : "text-slate-400"}`}>
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-mono num-tabular border ${step === STEPS.RESULT ? "border-[#A068FF] bg-[#A068FF]/20 text-[#A068FF]" : "border-white/10"}`}>3</span>
          <span><span className="hidden sm:inline">Cadre </span>Scoring</span>
        </div>
      </div>

      {/* Step 1: Configuration & Source Selection */}
      {step === STEPS.SOURCE && (
        <div className="p-6 sm:p-8 rounded-2xl sovereign-card border border-white/10 shadow-2xl space-y-6">
          <div className="border-b border-white/10 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF]">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-urbanist font-bold text-xl sm:text-2xl text-white">
                Computerized Adaptive Testing Engine
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              Dynamic item selection calibrated to the FRAC framework or zero-shot parsed training circulars.
            </p>
          </div>

          {/* Preselected Module Notification */}
          {preselectedTitle && !file && (
            <div className="p-4 rounded-xl bg-white/[0.025] border border-[#A068FF]/30 flex items-center justify-between shadow-[0_0_15px_rgba(160,104,255,0.08)]">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#A068FF] shrink-0" />
                <div>
                  <p className="text-xs font-urbanist font-bold text-white">Active Curriculum Reference</p>
                  <p className="text-xs text-slate-300 font-sans mt-0.5">{preselectedTitle}</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 font-semibold">
                LOCKED
              </span>
            </div>
          )}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 font-urbanist uppercase tracking-wider">
              DOCUMENT CONTEXT (OPTIONAL PDF CIRCULAR)
            </label>
            <div
              className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all bg-white/[0.015] hover:bg-white/[0.03] ${
                file
                  ? "border-[#A068FF]/60 bg-[#A068FF]/5"
                  : "border-white/15 hover:border-white/30"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.txt,.md"
                id="doc-upload"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setError("");
                }}
              />
              <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className={`w-8 h-8 mb-2.5 ${file ? "text-[#A068FF]" : "text-slate-400"}`} />
                {file ? (
                  <div>
                    <p className="text-sm font-urbanist font-bold text-[#C084FC]">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {(file.size / 1024).toFixed(1)} KB · Click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Drop official circular or manual PDF, or <span className="text-[#A068FF] font-semibold underline underline-offset-2">Select file</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      System will map content across statistical competencies
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* Assessment Mode Toggle */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-2.5 flex items-center justify-between font-urbanist uppercase tracking-wider">
                <span>EVALUATION PROTOCOL</span>
                <span className="text-xs text-slate-400 font-normal font-sans">CAT dynamically branches difficulty</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode("adaptive")}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    mode === "adaptive"
                      ? "bg-[#A068FF]/15 border-[#A068FF] text-white shadow-[0_0_15px_rgba(160,104,255,0.2)]"
                      : "bg-white/[0.025] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-urbanist font-bold text-white">Computerized Adaptive Testing</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#A068FF]/20 text-[#C084FC] text-xs font-mono font-bold uppercase">Active</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Bayesian ability (&theta;) scoring; dynamically serves easier/harder items until convergence.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("fixed")}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    mode === "fixed"
                      ? "bg-[#A068FF]/15 border-[#A068FF] text-white shadow-[0_0_15px_rgba(160,104,255,0.2)]"
                      : "bg-white/[0.025] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-urbanist font-bold text-slate-200">Fixed-Length Battery</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 text-xs font-mono">Static</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Standard linear item sequence with predetermined question set.
                  </p>
                </button>
              </div>
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 font-urbanist uppercase tracking-wider">
                {mode === "adaptive" ? "QUESTION POOL CAPACITY" : "ITEM COUNT"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNumQuestions(count)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                      numQuestions === count
                        ? "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] text-white font-bold shadow-[0_0_10px_rgba(160,104,255,0.4)]"
                        : "bg-white/[0.025] text-slate-300 hover:text-white border border-white/10"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5 font-urbanist uppercase tracking-wider">
                <Languages className="w-4 h-4 text-[#A068FF]" />
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
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      language === lang.id
                        ? "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] text-white font-bold shadow-[0_0_10px_rgba(160,104,255,0.4)]"
                        : "bg-white/[0.025] text-slate-300 hover:text-white border border-white/10"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm gap-2.5 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>{loadingText || "Processing Assessment…"}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Initialize Adaptive Assessment</span>
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
            <div className="p-6 sm:p-7 rounded-2xl sovereign-card border border-white/10 space-y-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF] animate-pulse" />
                  <span className="font-urbanist font-bold text-white tracking-wide">Computerized Adaptive Testing</span>
                  <span className="text-slate-500 font-mono">·</span>
                  <span className="text-[#C084FC] font-mono font-semibold">
                    Item #{(adaptiveSession.questions_answered || 0) + 1}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {adaptiveSession.difficulty_trend && adaptiveSession.difficulty_trend !== "same" && (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                        adaptiveSession.difficulty_trend === "harder"
                          ? "bg-[#A068FF]/15 text-[#C084FC] border-[#A068FF]/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {adaptiveSession.difficulty_trend === "harder"
                        ? "↑ Item Difficulty Scaled Up"
                        : "↓ Difficulty Calibrated Down"}
                    </span>
                  )}

                  <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 font-mono">
                    <span className="text-xs uppercase text-slate-400">Ability (&theta;):</span>
                    <span className="font-bold text-white text-xs sm:text-sm num-tabular">
                      {adaptiveSession.theta?.toFixed(2)} / 5.00
                    </span>
                  </div>
                </div>
              </div>

              {/* Live 5-Level Difficulty Meter */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-medium">CURRENT DIFFICULTY ROUTING:</span>
                  <span className="font-semibold text-white flex items-center gap-2">
                    <span className="text-[#C084FC] font-bold">Level {adaptiveSession.current_difficulty}</span>
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

                <div className="grid grid-cols-5 gap-2.5">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const isActive = lvl === adaptiveSession.current_difficulty;
                    const isPassed = lvl < adaptiveSession.current_difficulty;
                    return (
                      <div
                        key={lvl}
                        className={`py-2 px-1.5 rounded-xl text-center border font-mono transition-all ${
                          isActive
                            ? "bg-[#A068FF]/20 border-[#A068FF] text-white shadow-[0_0_12px_rgba(160,104,255,0.3)]"
                            : isPassed
                            ? "bg-white/[0.04] border-[#A068FF]/30 text-[#C084FC]"
                            : "bg-white/[0.015] border-white/10 text-slate-500"
                        }`}
                      >
                        <p className={`text-xs sm:text-sm font-bold ${isActive ? "text-[#C084FC]" : ""}`}>
                          L{lvl}
                        </p>
                        <p className="text-[10px] truncate mt-0.5 opacity-80">
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
            <div className="p-5 sm:p-6 rounded-2xl sovereign-card border border-white/10 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white font-urbanist text-sm sm:text-base">
                    Question {currentIndex + 1} / {quiz?.questions.length}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300 font-medium">
                    {quiz?.title || "Statistical Assessment Battery"}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-xs">
                  {answers.filter((a) => a !== -1).length} completed
                </span>
              </div>
              <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-[#A068FF] to-[#7C3AED] h-full rounded-full transition-all duration-300"
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
              <div className="p-6 sm:p-8 rounded-2xl sovereign-card border border-white/10 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-mono font-bold uppercase tracking-wider">
                    Level {qDiff} FRAC Item
                  </span>
                  {isAdapt && (
                    <span className="text-xs font-mono text-slate-400">
                      Theta target: <span className="text-slate-200 font-bold">{adaptiveSession.theta?.toFixed(2)}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-urbanist font-bold text-lg sm:text-xl text-white leading-relaxed tracking-tight">
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
                        className={`w-full p-4 sm:p-5 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-[#A068FF]/15 text-white border-2 border-[#A068FF] shadow-[0_0_15px_rgba(160,104,255,0.25)]"
                            : "bg-white/[0.02] text-slate-300 border border-white/10 hover:border-white/25 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#A068FF] text-white shadow-[0_0_10px_rgba(160,104,255,0.5)]"
                                : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="leading-relaxed font-sans">{opt}</span>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#A068FF] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Question-Level Source Evidence Traceability */}
                {(q.source_excerpt || q.document_name) && (
                  <div className="p-4 rounded-xl bg-[#A068FF]/5 border border-[#A068FF]/20 text-xs sm:text-sm space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="text-[#C084FC] font-semibold">
                        Grounded Source: {q.document_name || "Official Curriculum Reference"}
                      </span>
                      <span>Page {q.page_number || 1}</span>
                    </div>
                    {q.source_excerpt && (
                      <p className="text-slate-300 text-xs leading-relaxed italic border-l-2 border-[#A068FF] pl-3 mt-1.5">
                        "{q.source_excerpt}"
                      </p>
                    )}
                  </div>
                )}

                {/* Action Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  {isAdapt ? (
                    <>
                      <div className="text-xs text-slate-400 font-mono">
                        Item response triggers Bayesian theta update.
                      </div>
                      <button
                        onClick={handleAdaptiveAnswer}
                        disabled={loading || selectedOption === -1}
                        className="btn-primary text-xs sm:text-sm py-2.5 px-5 gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            <span>Updating Theta…</span>
                          </>
                        ) : (
                          <>
                            <span>Submit & Continue</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="btn-secondary text-xs sm:text-sm py-2 px-4 gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      {currentIndex < quiz.questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                          className="btn-primary text-xs sm:text-sm py-2 px-4 gap-1.5"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={loading || answers.includes(-1)}
                          className="btn-primary text-xs sm:text-sm py-2.5 px-5 gap-2"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
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
        <div className="space-y-8">
          <div className="p-7 sm:p-10 rounded-2xl sovereign-card border border-white/10 text-center shadow-2xl space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center mx-auto text-[#A068FF] shadow-[0_0_20px_rgba(160,104,255,0.3)]">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <h2 className="font-urbanist font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                Assessment Verified & Logged
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl mx-auto leading-relaxed">
                Evaluation results and Bayesian item response parameters recorded to your sovereign competency passbook.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-2xl mx-auto">
              {/* Score */}
              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-center">
                <p className="text-xs uppercase font-mono text-slate-400">Score</p>
                <StatsCounter
                  value={parseFloat(result.score_percent || result.score || 0)}
                  decimals={0}
                  suffix="%"
                  duration={1.2}
                  className="text-2xl sm:text-3xl font-urbanist font-extrabold text-white mt-1"
                />
              </div>

              {/* Theta Ability */}
              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-center">
                <p className="text-xs uppercase font-mono text-slate-400">Ability (&theta;)</p>
                <StatsCounter
                  value={parseFloat(result.final_theta !== undefined ? result.final_theta : ((result.score || 70) / 20))}
                  decimals={2}
                  duration={1.2}
                  className="text-2xl sm:text-3xl font-urbanist font-extrabold text-[#C084FC] mt-1 font-mono"
                />
              </div>

              {/* Estimation Confidence */}
              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-center">
                <p className="text-xs uppercase font-mono text-slate-400">Confidence</p>
                <p className="text-xs sm:text-sm font-bold text-slate-200 mt-2 font-urbanist">
                  {result.confidence_of_estimate || (result.converged ? "Converged" : "Standard")}
                </p>
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-center">
                <p className="text-xs uppercase font-mono text-slate-400">Cadre Standard</p>
                <div className="mt-2">
                  <span
                    className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border inline-block ${
                      (result.score_percent || result.score) >= 60
                        ? "bg-[#A068FF]/15 text-[#C084FC] border-[#A068FF]/30"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {(result.score_percent || result.score) >= 60 ? "Met" : "Deficit"}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions by Difficulty Breakdown */}
            {result.difficulty_distribution && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 max-w-xl mx-auto space-y-3">
                <p className="text-xs font-bold text-slate-300 text-left font-mono">
                  ITEM ROUTING DISTRIBUTION:
                </p>
                <div className="grid grid-cols-5 gap-2.5">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const count = result.difficulty_distribution[lvl] || 0;
                    return (
                      <div key={lvl} className="p-2.5 rounded-xl bg-white/[0.025] border border-white/10 text-center font-mono">
                        <p className="text-xs text-slate-400 font-semibold">Lvl {lvl}</p>
                        <p className="text-sm font-bold text-white mt-0.5 num-tabular">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="btn-primary text-xs sm:text-sm py-2.5 px-6"
              >
                View Passbook
              </button>
              <button
                onClick={reset}
                className="btn-secondary text-xs sm:text-sm py-2.5 px-5 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake / New Test</span>
              </button>
            </div>
          </div>

          {/* Breakdown per question */}
          <div className="p-6 sm:p-8 rounded-2xl sovereign-card border border-white/10 space-y-4 shadow-xl">
            <h3 className="font-urbanist font-bold text-base sm:text-lg text-white mb-3">
              Performance Review & Item Rationales
            </h3>

            {result.breakdown?.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 text-xs sm:text-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-[#A068FF]/15 text-[10px] font-mono font-bold text-[#C084FC] border border-[#A068FF]/30 mb-1.5 inline-block">
                      Level {item.difficulty || 3}
                    </span>
                    <p className="font-medium text-slate-100 text-sm sm:text-base leading-snug">
                      {idx + 1}. {item.question}
                    </p>
                  </div>
                  {item.is_correct ? (
                    <span className="flex items-center gap-1.5 text-[#C084FC] shrink-0 font-mono text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-[#A068FF]" /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-400 shrink-0 font-mono text-xs font-bold">
                      <XCircle className="w-4 h-4 text-rose-400" /> Incorrect
                    </span>
                  )}
                </div>

                {item.explanation && (
                  <p className="text-slate-300 text-xs leading-relaxed pl-3 border-l-2 border-[#A068FF] mt-2">
                    {item.explanation}
                  </p>
                )}

                {/* Question-Level Source Evidence Citation */}
                {(item.source_excerpt || item.document_name) && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#A068FF]/5 border border-[#A068FF]/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-slate-400">
                      <span className="text-[#C084FC] font-semibold">
                        Grounded Source: {item.document_name || "Official Cadre Manual"}
                      </span>
                      <span>Page {item.page_number || 1}</span>
                    </div>
                    {item.source_excerpt && (
                      <p className="text-slate-300 text-xs leading-relaxed italic border-l-2 border-[#A068FF] pl-2.5 mt-1">
                        "{item.source_excerpt}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
