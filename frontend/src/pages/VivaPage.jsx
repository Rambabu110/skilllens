import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  ArrowLeft
} from "lucide-react";

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
    <div className="max-w-4xl mx-auto space-y-7 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Voice Viva AI Examiner
            </span>
            <span className="text-xs text-slate-400 font-mono">Mission Karmayogi FRAC</span>
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-white">
            Oral Viva Examination
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Verbal competency verification with speech recognition, administrative situational judgment, and objective rubric scoring.
          </p>
        </div>

        {session && !finalReport && (
          <div className="flex items-center gap-3 shrink-0 font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase">Assessment Progress</div>
              <div className="text-xs font-bold text-white num-tabular">
                Item {currentIndex + 1} / {totalQuestions}
              </div>
            </div>
            <div className="w-24 h-1.5 bg-[#070d18] rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-300 flex items-start gap-2.5 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>{error}</div>
        </div>
      )}

      {/* STEP 1: Select Competency & Start */}
      {!session && (
        <div className="sovereign-card p-6 sm:p-7 space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-base font-display font-bold text-white mb-1">Select Competency for Oral Examination</h2>
            <p className="text-xs text-slate-400">
              The AI examiner will evaluate your conceptual clarity, regulatory awareness, and executive situational judgment.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider font-mono">
              TARGET COMPETENCY TO EXAMINE
            </label>
            <select
              value={competencyId}
              onChange={(e) => setCompetencyId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070d18] border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-400 font-sans"
            >
              <option value="">-- Choose an Official Competency --</option>
              {competencies.map((c) => (
                <option key={c.competency_id} value={c.competency_id}>
                  {c.competency_name} (Current Level: {c.current_level?.toFixed(1)} / Benchmark: {c.required_level?.toFixed(1)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-md sovereign-well">
              <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-semibold text-white mb-1">Verbal Response Capture</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                Speak directly using your microphone in Hindi or English, or type in the fallback field.
              </div>
            </div>
            <div className="p-3.5 rounded-md sovereign-well">
              <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-semibold text-white mb-1">Objective Rubric Audit</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                Responses are graded out of 10 points based on covered statutory principles and execution criteria.
              </div>
            </div>
            <div className="p-3.5 rounded-md sovereign-well">
              <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-semibold text-white mb-1">Passbook Calibration</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                Viva results calibrate directly into your official FRAC passbook and BKT mastery telemetry.
              </div>
            </div>
          </div>

          <button
            onClick={handleStartViva}
            disabled={loading || !competencyId}
            className="btn-primary w-full justify-center py-2.5 text-xs gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Examiner Preparing Oral Rubric…</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Start Oral Viva Examination</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: Active Viva Question Screen */}
      {session && !finalReport && currentQ && (
        <div className="space-y-5">
          {/* Question Card */}
          <div className="sovereign-card p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider">
                Oral Item #{currentIndex + 1} / {totalQuestions}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/10">
                Max Score: 10 pts
              </span>
            </div>

            {/* English Question */}
            <div className="text-base font-semibold text-white leading-relaxed">
              {currentQ.question_en}
            </div>

            {/* Hindi Translation Card */}
            {currentQ.question_hi && (
              <div className="p-3 rounded-md sovereign-well text-xs text-slate-300 leading-relaxed font-sans">
                <span className="text-[11px] font-mono font-semibold text-emerald-400 block mb-1">हिंदी अनुवाद:</span>
                {currentQ.question_hi}
              </div>
            )}
          </div>

          {/* Answer Mode Tabs */}
          {!currentEvaluation && (
            <div className="sovereign-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="text-xs font-semibold text-white uppercase font-mono">Candidate Verbal Response</div>
                <div className="flex gap-2 font-mono">
                  <button
                    onClick={() => setInputMode("voice")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      inputMode === "voice"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Speech / Mic
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      inputMode === "text"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200"
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
                      className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all shadow-md active:scale-[0.98] ${
                        isRecording
                          ? "bg-rose-600 text-white"
                          : "bg-emerald-600 hover:bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-7 h-7 mb-0.5" />
                          <span className="text-[10px] font-mono font-bold uppercase">Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-7 h-7 mb-0.5 text-slate-950" />
                          <span className="text-[10px] font-mono font-bold uppercase text-slate-950">Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status indicator */}
                  <div className="text-center space-y-1">
                    {isRecording ? (
                      <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span>Recording: {recordingSeconds}s — Speak response clearly…</span>
                      </div>
                    ) : audioBlob ? (
                      <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Audio response captured. Ready for evaluation.
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        Click the microphone button to start recording your response in Hindi or English.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TYPED TEXT FALLBACK MODE */}
              {inputMode === "text" && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">
                    Type your detailed verbal response below (English, Hindi, or Hinglish accepted):
                  </div>
                  <textarea
                    rows={4}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Enter your administrative analysis addressing the key regulatory aspects..."
                    className="w-full p-3.5 rounded-md bg-[#070d18] border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 text-xs leading-relaxed"
                  />
                </div>
              )}

              {/* Submit Evaluation Button */}
              <button
                onClick={handleSubmitAnswer}
                disabled={evaluating || (inputMode === "voice" && !audioBlob && !isRecording) || (inputMode === "text" && !textAnswer.trim())}
                className="btn-primary w-full justify-center py-2.5 text-xs gap-2"
              >
                {evaluating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Examiner Evaluating Response…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit to AI Examiner</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2.5: Evaluation Result for Current Question */}
          {currentEvaluation && (
            <div className="sovereign-card p-5 sm:p-6 space-y-5 animate-fade-in">
              {/* Score Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Examiner Evaluation Audit</div>
                  <div className="text-sm font-semibold text-white">Question {currentIndex + 1} Assessment Rubric</div>
                </div>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-3xl font-bold text-emerald-400 num-tabular">
                    {currentEvaluation.score?.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ 10.0</span>
                </div>
              </div>

              {/* Verbatim Transcript */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-emerald-400" /> Recorded Verbal Transcript
                </div>
                <div className="p-3.5 rounded-md bg-[#070d18] border border-white/10 text-xs text-slate-300 italic leading-relaxed">
                  "{currentEvaluation.transcript}"
                </div>
              </div>

              {/* Rubric Points Breakdown */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Rubric Assessment Criterion Breakdown
                </div>
                <div className="space-y-2">
                  {currentEvaluation.points_covered?.map((pt, idx) => (
                    <div
                      key={`cov-${idx}`}
                      className="p-3 rounded-md bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-emerald-400 mr-1.5">Covered:</span>
                        <span className="text-slate-200">{pt}</span>
                      </div>
                    </div>
                  ))}

                  {currentEvaluation.points_missed?.map((pt, idx) => (
                    <div
                      key={`mis-${idx}`}
                      className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5"
                    >
                      <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-400 mr-1.5">Deficit / Missing:</span>
                        <span className="text-slate-200">{pt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bilingual Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-md bg-[#070d18] border border-white/10 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Examiner Feedback (English)</div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {currentEvaluation.feedback_en}
                  </div>
                </div>
                <div className="p-3.5 rounded-md bg-[#070d18] border border-white/10 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400">मूल्यांकन समीक्षा (हिंदी)</div>
                  <div className="text-xs text-slate-300 leading-relaxed font-sans">
                    {currentEvaluation.feedback_hi}
                  </div>
                </div>
              </div>

              {/* Navigation to next question or completion */}
              <button
                onClick={handleNextQuestion}
                className="btn-primary w-full justify-center py-2.5 text-xs gap-2"
              >
                {currentIndex < totalQuestions - 1 ? (
                  <>
                    <span>Proceed to Assessment Question {currentIndex + 2}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5" />
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
        <div className="sovereign-card p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1 border border-emerald-500/25">
              <Award className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Oral Viva Examination Complete</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Official oral assessment dossier for{" "}
              <span className="text-white font-medium">{finalReport.competency_name}</span>.
              Score evidence has been calibrated into your continuous competency profile.
            </p>
          </div>

          {/* Score highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg bg-[#070d18] border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">
                Average Oral Viva Score
              </span>
              <div className="text-4xl font-bold font-mono text-emerald-400 mb-1 num-tabular">
                {finalReport.average_score?.toFixed(1)}
                <span className="text-sm text-slate-400 font-normal"> / 10.0</span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 num-tabular">
                Proficiency: {finalReport.score_percent}%
              </span>
            </div>

            <div className="p-5 rounded-lg bg-[#070d18] border border-white/10 flex flex-col justify-center space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider block mb-1">
                  Overall Synthesis (EN)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {finalReport.overall_feedback_en}
                </p>
              </div>
              <div className="border-t border-white/10 pt-2">
                <span className="text-[10px] font-mono uppercase text-teal-400 tracking-wider block mb-1">
                  समग्र समीक्षा (HI)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {finalReport.overall_feedback_hi}
                </p>
              </div>
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Question-by-Question Rubric Audit
            </h3>
            <div className="space-y-3">
              {finalReport.breakdown?.map((item, idx) => (
                <div
                  key={`item-${idx}`}
                  className="p-4 rounded-lg bg-[#070d18] border border-white/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Question {idx + 1}</span>
                    <span className="px-2 py-0.5 rounded font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[11px] num-tabular">
                      Score: {item.score?.toFixed(1)} / 10.0
                    </span>
                  </div>

                  <div className="text-xs font-medium text-slate-200">
                    {item.question_en}
                  </div>

                  <div className="text-[11px] text-slate-400 italic bg-[#0b1220] p-3 rounded border border-white/10">
                    "{item.transcript}"
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.points_covered?.map((pt, pIdx) => (
                      <span
                        key={`c-${pIdx}`}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]"
                      >
                        ✓ {pt}
                      </span>
                    ))}
                    {item.points_missed?.map((pt, pIdx) => (
                      <span
                        key={`m-${pIdx}`}
                        className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]"
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
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setSession(null);
                setFinalReport(null);
              }}
              className="btn-secondary flex-1 justify-center py-2.5 text-xs gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Examination</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="btn-primary flex-1 justify-center py-2.5 text-xs gap-2"
            >
              <span>Return to Passbook</span>
            </button>
            <button
              onClick={() => navigate("/gaps")}
              className="btn-secondary flex-1 justify-center py-2.5 text-xs gap-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Review Competency Gaps</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

