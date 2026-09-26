import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import client from "../api/client";
import { useAuthGate } from "../hooks/useAuthGate";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  AlertCircle,
  FileText,
  Radio,
  BookOpen,
} from "lucide-react";
import StatsCounter from "../components/ui/stats-counter";

export default function VivaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCompId = searchParams.get("competency_id");
  const { requireAuth } = useAuthGate();

  const [competencyId, setCompetencyId] = useState(initialCompId || "");
  const [competencies, setCompetencies] = useState([]);
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Input & MediaRecorder state
  const [inputMode, setInputMode] = useState("voice"); // "voice" | "text"
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Status & evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [allEvaluations, setAllEvaluations] = useState({});
  const [finalReport, setFinalReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch weak or available competencies if none selected
  useEffect(() => {
    async function loadCompetencies() {
      try {
        const res = await client.get("/competency/profile");
        const list = res.data?.competencies || [];
        setCompetencies(list);
        if (!competencyId && list.length > 0) {
          // Default to highest gap or first competency
          const weak = [...list].sort((a, b) => (b.gap || 0) - (a.gap || 0))[0];
          if (weak) setCompetencyId(weak.competency_id);
        }
      } catch (err) {
        console.error("Failed to load competencies", err);
      }
    }
    loadCompetencies();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleStartViva() {
    if (!competencyId) {
      setError("Please select a competency for the oral viva examination.");
      return;
    }
    // Gate: require authentication before starting a viva session
    const authed = await requireAuth();
    if (!authed) return;
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/viva/start", { competency_id: competencyId });
      setSession(res.data);
      setCurrentIndex(0);
      setCurrentEvaluation(null);
      setAllEvaluations({});
      setFinalReport(null);
      setAudioBlob(null);
      setTextAnswer("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start viva session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // MediaRecorder Voice Controls
  async function startRecording() {
    setError("");
    audioChunksRef.current = [];
    setAudioBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        // Stop all audio tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access failed", err);
      setError("Microphone access was denied or is unavailable. Please use typed text input instead.");
      setInputMode("text");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  async function handleSubmitAnswer() {
    if (inputMode === "voice" && !audioBlob && !isRecording) {
      setError("Please record your audio answer before submitting, or switch to typed text.");
      return;
    }
    if (inputMode === "text" && !textAnswer.trim()) {
      setError("Please type your response before submitting.");
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    setError("");
    setEvaluating(true);

    try {
      const formData = new FormData();
      if (inputMode === "voice" && audioBlob) {
        formData.append("audio_file", audioBlob, "viva_answer.webm");
      } else if (textAnswer.trim()) {
        formData.append("text_answer", textAnswer.trim());
      }

      const res = await client.post(
        `/viva/${session.session_id}/answer/${currentIndex}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setCurrentEvaluation(res.data);
      setAllEvaluations((prev) => ({
        ...prev,
        [currentIndex]: res.data,
      }));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Evaluation failed. If audio upload failed, please switch to typed text input."
      );
    } finally {
      setEvaluating(false);
    }
  }

  function handleNextQuestion() {
    if (currentIndex < (session?.questions?.length || 3) - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentEvaluation(allEvaluations[currentIndex + 1] || null);
      setAudioBlob(null);
      setTextAnswer("");
      setError("");
    } else {
      handleFinishViva();
    }
  }

  async function handleFinishViva() {
    setError("");
    setEvaluating(true);
    try {
      const res = await client.post(`/viva/${session.session_id}/finish`);
      setFinalReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to finalize viva session.");
    } finally {
      setEvaluating(false);
    }
  }

  const currentQ = session?.questions?.[currentIndex];
  const totalQuestions = session?.questions?.length || 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-8 pb-16"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Voice Viva AI Examiner
            </span>
            <span className="text-xs text-slate-400 font-mono">Mission Karmayogi FRAC</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-urbanist font-extrabold tracking-tight text-white">
            Oral Viva Examination
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Verbal competency verification with speech recognition, administrative situational judgment, and objective rubric scoring.
          </p>
        </div>

        {session && !finalReport && (
          <div className="flex items-center gap-3 shrink-0 font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Assessment Progress</div>
              <div className="text-xs sm:text-sm font-bold text-white num-tabular">
                Item {currentIndex + 1} / {totalQuestions}
              </div>
            </div>
            <div className="w-28 h-2 bg-white/[0.05] rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#A068FF] to-[#7C3AED] transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 flex items-start gap-3 text-xs sm:text-sm font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>{error}</div>
        </div>
      )}

      {/* STEP 1: Select Competency & Start */}
      {!session && (
        <div className="sovereign-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-7 shadow-2xl">
          <div className="border-b border-white/10 pb-5">
            <h2 className="text-lg sm:text-xl font-urbanist font-bold text-white mb-1.5">Select Competency for Oral Examination</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              The AI examiner will evaluate your conceptual clarity, regulatory awareness, and executive situational judgment.
            </p>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-urbanist">
              TARGET COMPETENCY TO EXAMINE
            </label>
            <select
              value={competencyId}
              onChange={(e) => setCompetencyId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#A068FF] font-sans transition-all"
            >
              <option value="" className="bg-[#0c0722]">-- Choose a Cadre Competency --</option>
              {competencies.map((c) => (
                <option key={c.competency_id} value={c.competency_id} className="bg-[#0c0722]">
                  {c.competency_name} (Current Level: {c.current_level?.toFixed(1)} / Benchmark: {c.required_level?.toFixed(1)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            <div className="p-5 rounded-xl bg-white/[0.025] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 text-[#A068FF] border border-[#A068FF]/30 flex items-center justify-center mb-2">
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-sm font-urbanist font-bold text-white">Verbal Response Capture</div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Speak directly using your microphone in Hindi or English, or type in the fallback field.
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white/[0.025] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 text-[#A068FF] border border-[#A068FF]/30 flex items-center justify-center mb-2">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-sm font-urbanist font-bold text-white">Objective Rubric Audit</div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Responses are graded out of 10 points based on covered statutory principles and execution criteria.
              </div>
            </div>
            <div className="p-5 rounded-xl bg-white/[0.025] border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 text-[#A068FF] border border-[#A068FF]/30 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-sm font-urbanist font-bold text-white">Passbook Calibration</div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Viva results calibrate directly into your cadre FRAC passbook and BKT mastery telemetry.
              </div>
            </div>
          </div>

          <button
            onClick={handleStartViva}
            disabled={loading || !competencyId}
            className="btn-primary w-full justify-center py-3 text-sm font-bold gap-2.5 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Examiner Preparing Oral Rubric…</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Start Oral Viva Examination</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: Active Viva Question Screen */}
      {session && !finalReport && currentQ && (
        <div className="space-y-6">
          {/* Question Card */}
          <div className="sovereign-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider font-semibold">
                Oral Item #{currentIndex + 1} / {totalQuestions}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/[0.04] text-[#C084FC] border border-white/10 font-bold">
                Max Score: 10 pts
              </span>
            </div>

            {/* English Question */}
            <div className="text-lg sm:text-xl font-urbanist font-bold text-white leading-relaxed tracking-tight">
              {currentQ.question_en}
            </div>

            {/* Hindi Translation Card */}
            {currentQ.question_hi && (
              <div className="p-4 rounded-xl bg-[#A068FF]/5 border border-[#A068FF]/20 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                <span className="text-xs font-mono font-bold text-[#C084FC] block mb-1">हिंदी अनुवाद:</span>
                {currentQ.question_hi}
              </div>
            )}
          </div>

          {/* Answer Mode Tabs */}
          {!currentEvaluation && (
            <div className="sovereign-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="text-xs sm:text-sm font-urbanist font-bold text-white uppercase tracking-wider">Candidate Verbal Response</div>
                <div className="flex gap-2 font-mono">
                  <button
                    onClick={() => setInputMode("voice")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      inputMode === "voice"
                        ? "bg-[#A068FF]/20 text-[#C084FC] border border-[#A068FF]/40 shadow-[0_0_10px_rgba(160,104,255,0.2)]"
                        : "text-slate-400 hover:text-white bg-white/[0.02]"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Speech / Mic
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      inputMode === "text"
                        ? "bg-[#A068FF]/20 text-[#C084FC] border border-[#A068FF]/40 shadow-[0_0_10px_rgba(160,104,255,0.2)]"
                        : "text-slate-400 hover:text-white bg-white/[0.02]"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Typed Input
                  </button>
                </div>
              </div>

              {/* VOICE RECORDING MODE */}
              {inputMode === "voice" && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  {/* Mic Button */}
                  <div className="relative">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={evaluating}
                      className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-xl active:scale-95 ${
                        isRecording
                          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-pulse"
                          : "bg-gradient-to-r from-[#A068FF] to-[#7C3AED] hover:from-[#B17FFF] hover:to-[#A068FF] text-white shadow-[0_0_25px_rgba(160,104,255,0.4)]"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-mono font-bold uppercase">Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8 mb-1 text-white" />
                          <span className="text-[10px] font-mono font-bold uppercase text-white">Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status indicator */}
                  <div className="text-center space-y-1.5">
                    {isRecording ? (
                      <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                        <span>Recording: {recordingSeconds}s — Speak response clearly…</span>
                      </div>
                    ) : audioBlob ? (
                      <div className="text-xs text-[#C084FC] flex items-center gap-2 font-mono font-bold bg-[#A068FF]/15 px-3.5 py-1.5 rounded-full border border-[#A068FF]/30">
                        <CheckCircle2 className="w-4 h-4 text-[#A068FF]" /> Audio response captured. Ready for evaluation.
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        Click the microphone button to start recording your response in Hindi or English.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TYPED TEXT FALLBACK MODE */}
              {inputMode === "text" && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Type your detailed verbal response below (English, Hindi, or Hinglish accepted):
                  </div>
                  <textarea
                    rows={4}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Enter your administrative analysis addressing the key regulatory aspects..."
                    className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#A068FF] text-xs sm:text-sm leading-relaxed"
                  />
                </div>
              )}

              {/* Submit Evaluation Button */}
              <button
                onClick={handleSubmitAnswer}
                disabled={evaluating || (inputMode === "voice" && !audioBlob && !isRecording) || (inputMode === "text" && !textAnswer.trim())}
                className="btn-primary w-full justify-center py-3 text-sm font-bold gap-2.5 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
              >
                {evaluating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Examiner Evaluating Response…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit to AI Examiner</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2.5: Evaluation Result for Current Question */}
          {currentEvaluation && (
            <div className="sovereign-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 shadow-2xl">
              {/* Score Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Examiner Evaluation Audit</div>
                  <div className="text-base font-urbanist font-bold text-white">Question {currentIndex + 1} Assessment Rubric</div>
                </div>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-3xl sm:text-4xl font-urbanist font-extrabold text-[#C084FC] num-tabular">
                    {currentEvaluation.score?.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ 10.0</span>
                </div>
              </div>

              {/* Verbatim Transcript */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-[#A068FF]" /> Recorded Verbal Transcript
                </div>
                <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  "{currentEvaluation.transcript}"
                </div>
              </div>

              {/* Rubric Points Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Rubric Assessment Criterion Breakdown
                </div>
                <div className="space-y-2.5">
                  {currentEvaluation.points_covered?.map((pt, idx) => (
                    <div
                      key={`cov-${idx}`}
                      className="p-3.5 rounded-xl bg-[#A068FF]/10 border border-[#A068FF]/25 text-xs sm:text-sm text-[#C084FC] flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#A068FF] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#C084FC] mr-1.5">Covered:</span>
                        <span className="text-slate-200">{pt}</span>
                      </div>
                    </div>
                  ))}

                  {currentEvaluation.points_missed?.map((pt, idx) => (
                    <div
                      key={`mis-${idx}`}
                      className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-amber-300 flex items-start gap-3"
                    >
                      <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-400 mr-1.5">Deficit / Missing:</span>
                        <span className="text-slate-200">{pt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bilingual Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#C084FC]">Examiner Feedback (English)</div>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {currentEvaluation.feedback_en}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-sky-400">मूल्यांकन समीक्षा (हिंदी)</div>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    {currentEvaluation.feedback_hi}
                  </div>
                </div>
              </div>

              {/* Navigation to next question or completion */}
              <button
                onClick={handleNextQuestion}
                className="btn-primary w-full justify-center py-3 text-sm font-bold gap-2"
              >
                {currentIndex < totalQuestions - 1 ? (
                  <>
                    <span>Proceed to Assessment Question {currentIndex + 2}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Certify & Finalize Oral Viva Examination</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Final Certified Examination Report */}
      {finalReport && (
        <div className="sovereign-card p-7 sm:p-10 rounded-2xl border border-white/10 space-y-8 shadow-2xl">
          <div className="text-center space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center mx-auto text-[#A068FF] shadow-[0_0_20px_rgba(160,104,255,0.3)]">
              <Award className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-urbanist font-extrabold text-white tracking-tight">Oral Viva Examination Complete</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Continuous oral assessment dossier for{" "}
              <span className="text-white font-bold">{finalReport.competency_name}</span>.
              Score evidence has been calibrated into your continuous competency profile.
            </p>
          </div>

          {/* Score highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                Average Oral Viva Score
              </span>
              <div className="text-4xl sm:text-5xl font-urbanist font-extrabold text-[#C084FC] mb-2 flex items-baseline justify-center gap-1 font-mono">
                <StatsCounter
                  value={parseFloat(finalReport.average_score || 0)}
                  decimals={1}
                  duration={1.2}
                  className="text-4xl sm:text-5xl font-urbanist font-extrabold text-[#C084FC]"
                />
                <span className="text-base text-slate-400 font-normal"> / 10.0</span>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 font-bold">
                Proficiency:{" "}
                <StatsCounter
                  value={parseFloat(finalReport.score_percent || 0)}
                  decimals={0}
                  suffix="%"
                  duration={1.2}
                  className="font-bold"
                />
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/10 flex flex-col justify-center space-y-3.5">
              <div>
                <span className="text-xs font-mono uppercase text-[#C084FC] font-bold tracking-wider block mb-1">
                  Overall Synthesis (EN)
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {finalReport.overall_feedback_en}
                </p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold tracking-wider block mb-1">
                  समग्र समीक्षा (HI)
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {finalReport.overall_feedback_hi}
                </p>
              </div>
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Question-by-Question Rubric Audit
            </h3>
            <div className="space-y-3.5">
              {finalReport.breakdown?.map((item, idx) => (
                <div
                  key={`item-${idx}`}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-urbanist font-bold text-sm text-white">Question {idx + 1}</span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[#C084FC] bg-[#A068FF]/15 border border-[#A068FF]/30 text-xs font-bold num-tabular">
                      Score: {item.score?.toFixed(1)} / 10.0
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-medium text-slate-100">
                    {item.question_en}
                  </div>

                  <div className="text-xs text-slate-300 italic bg-white/[0.02] p-3.5 rounded-xl border border-white/10 leading-relaxed">
                    "{item.transcript}"
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.points_covered?.map((pt, pIdx) => (
                      <span
                        key={`c-${pIdx}`}
                        className="px-2.5 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 text-xs font-medium"
                      >
                        ✓ {pt}
                      </span>
                    ))}
                    {item.points_missed?.map((pt, pIdx) => (
                      <span
                        key={`m-${pIdx}`}
                        className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-medium"
                      >
                        ✗ {pt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Actions */}
          <div className="flex flex-col sm:flex-row gap-3.5 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setSession(null);
                setFinalReport(null);
              }}
              className="btn-secondary flex-1 justify-center py-3 text-xs sm:text-sm gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Examination</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="btn-primary flex-1 justify-center py-3 text-xs sm:text-sm gap-2"
            >
              <span>Return to Passbook</span>
            </button>
            <button
              onClick={() => navigate("/gaps")}
              className="btn-secondary flex-1 justify-center py-3 text-xs sm:text-sm gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Review Competency Gaps</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

