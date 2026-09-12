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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Voice Viva AI Examiner
            </span>
            <span className="text-xs text-muted-foreground font-mono">Mission Karmayogi FRAC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Oral Viva Examination
          </h1>
          <p className="text-sm text-muted-foreground">
            Verbal competency assessment with speech recognition and objective rubric evaluation.
          </p>
        </div>

        {session && !finalReport && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Progress</div>
              <div className="text-sm font-bold text-emerald-400">
                Question {currentIndex + 1} of {totalQuestions}
              </div>
            </div>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* STEP 1: Select Competency & Start */}
      {!session && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Select Competency for Viva</h2>
            <p className="text-sm text-muted-foreground">
              The AI examiner will evaluate your conceptual clarity, situational judgment, and administrative execution.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Target Competency
            </label>
            <select
              value={competencyId}
              onChange={(e) => setCompetencyId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">-- Choose a Competency --</option>
              {competencies.map((c) => (
                <option key={c.competency_id} value={c.competency_id}>
                  {c.competency_name} (Level: {c.current_level?.toFixed(1)} / Req: {c.required_level?.toFixed(1)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold mb-1">Speech & Text Input</div>
              <div className="text-xs text-muted-foreground">
                Speak naturally in Hindi or English using your microphone, or type your answer.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold mb-1">Strict Rubric Scoring</div>
              <div className="text-xs text-muted-foreground">
                Questions are scored out of 10 points based on specific criteria points covered.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/40">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold mb-1">BKT & Profile Update</div>
              <div className="text-xs text-muted-foreground">
                Viva results directly update your official Karmayogi competency score and BKT mastery.
              </div>
            </div>
          </div>

          <button
            onClick={handleStartViva}
            disabled={loading || !competencyId}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Examiner Preparing Questions...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 animate-pulse" />
                Start Oral Viva Examination
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: Active Viva Question Screen */}
      {session && !finalReport && currentQ && (
        <div className="space-y-6">
          {/* Question Card */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">
                Oral Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="px-2 py-0.5 rounded bg-secondary font-mono">Max Score: 10 pts</span>
            </div>

            {/* English Question */}
            <div className="text-lg font-medium text-foreground leading-relaxed">
              {currentQ.question_en}
            </div>

            {/* Hindi Translation Card */}
            {currentQ.question_hi && (
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 text-sm text-foreground/80 leading-relaxed font-sans">
                <span className="text-xs font-semibold text-emerald-400 block mb-1">हिंदी अनुवाद:</span>
                {currentQ.question_hi}
              </div>
            )}
          </div>

          {/* Answer Mode Tabs */}
          {!currentEvaluation && (
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="text-sm font-semibold text-foreground">Your Oral Response</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInputMode("voice")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputMode === "voice"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Speech / Mic
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputMode === "text"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Typed Fallback
                  </button>
                </div>
              </div>

              {/* VOICE RECORDING MODE */}
              {inputMode === "voice" && (
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  {/* Pulsing Mic Button */}
                  <div className="relative">
                    {isRecording && (
                      <div className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping" />
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={evaluating}
                      className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-xl ${
                        isRecording
                          ? "bg-rose-600 text-white shadow-rose-500/30"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status indicator */}
                  <div className="text-center space-y-1">
                    {isRecording ? (
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-sm font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        Recording ({recordingSeconds}s) — Speak your answer clearly...
                      </div>
                    ) : audioBlob ? (
                      <div className="text-sm text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Audio response captured. Ready for evaluation.
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Click the microphone button to start recording your response in Hindi or English.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TYPED TEXT FALLBACK MODE */}
              {inputMode === "text" && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Type your detailed oral response below. You may write in English, Hindi, or Hinglish:
                  </div>
                  <textarea
                    rows={5}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Enter your response addressing the key administrative aspects..."
                    className="w-full p-4 rounded-xl bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                  />
                </div>
              )}

              {/* Submit Evaluation Button */}
              <button
                onClick={handleSubmitAnswer}
                disabled={evaluating || (inputMode === "voice" && !audioBlob && !isRecording) || (inputMode === "text" && !textAnswer.trim())}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {evaluating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Examiner Evaluating Response...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit to Examiner
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2.5: Evaluation Result for Current Question */}
          {currentEvaluation && (
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              {/* Score Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Examiner Evaluation</div>
                  <div className="text-lg font-bold text-foreground">Question {currentIndex + 1} Assessment</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-emerald-400">
                    {currentEvaluation.score?.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground font-semibold">/ 10</span>
                </div>
              </div>

              {/* Verbatim Transcript */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Candidate Transcript
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 text-sm text-foreground italic">
                  "{currentEvaluation.transcript}"
                </div>
              </div>

              {/* Rubric Points Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rubric Criteria Breakdown
                </div>
                <div className="space-y-2">
                  {currentEvaluation.points_covered?.map((pt, idx) => (
                    <div
                      key={`cov-${idx}`}
                      className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-emerald-400 mb-0.5">Covered:</span>
                        {pt}
                      </div>
                    </div>
                  ))}

                  {currentEvaluation.points_missed?.map((pt, idx) => (
                    <div
                      key={`mis-${idx}`}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5"
                    >
                      <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-amber-400 mb-0.5">Missed / Partial:</span>
                        {pt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bilingual Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                  <div className="text-xs font-semibold text-emerald-400">Examiner Feedback (English)</div>
                  <div className="text-xs text-foreground/90 leading-relaxed">
                    {currentEvaluation.feedback_en}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                  <div className="text-xs font-semibold text-teal-400">मूल्यांकन समीक्षा (हिंदी)</div>
                  <div className="text-xs text-foreground/90 leading-relaxed">
                    {currentEvaluation.feedback_hi}
                  </div>
                </div>
              </div>

              {/* Navigation to next question or completion */}
              <button
                onClick={handleNextQuestion}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {currentIndex < totalQuestions - 1 ? (
                  <>
                    Proceed to Question {currentIndex + 2} <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Finalize Oral Viva Examination <Award className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Final Certified Examination Report */}
      {finalReport && (
        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Oral Viva Examination Complete</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Official oral assessment report for{" "}
              <span className="text-foreground font-semibold">{finalReport.competency_name}</span>.
              Score evidence has been calibrated into your continuous competency profile.
            </p>
          </div>

          {/* Score highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-secondary/30 border border-border/40 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
                Average Oral Viva Score
              </span>
              <div className="text-5xl font-black text-emerald-400 mb-1">
                {finalReport.average_score?.toFixed(1)}
                <span className="text-xl text-muted-foreground font-normal"> / 10</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Score: {finalReport.score_percent}%
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-secondary/30 border border-border/40 flex flex-col justify-center space-y-3">
              <div>
                <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wider mb-1">
                  Overall Synthesis (EN)
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {finalReport.overall_feedback_en}
                </p>
              </div>
              <div className="border-t border-border/30 pt-2">
                <span className="text-xs text-teal-400 font-semibold block uppercase tracking-wider mb-1">
                  समग्र समीक्षा (HI)
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed font-sans">
                  {finalReport.overall_feedback_hi}
                </p>
              </div>
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Question-by-Question Rubric Audit
            </h3>
            <div className="space-y-4">
              {finalReport.breakdown?.map((item, idx) => (
                <div
                  key={`item-${idx}`}
                  className="p-5 rounded-xl bg-secondary/20 border border-border/40 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Question {idx + 1}</span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      Score: {item.score?.toFixed(1)} / 10
                    </span>
                  </div>

                  <div className="text-sm font-medium text-foreground/90">
                    {item.question_en}
                  </div>

                  <div className="text-xs text-muted-foreground italic bg-secondary/40 p-3 rounded-lg border border-border/20">
                    "{item.transcript}"
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.points_covered?.map((pt, pIdx) => (
                      <span
                        key={`c-${pIdx}`}
                        className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      >
                        ✓ {pt}
                      </span>
                    ))}
                    {item.points_missed?.map((pt, pIdx) => (
                      <span
                        key={`m-${pIdx}`}
                        className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
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
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
            <button
              onClick={() => {
                setSession(null);
                setFinalReport(null);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Take Another Viva
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate("/gaps")}
              className="flex-1 py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Review Gaps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
