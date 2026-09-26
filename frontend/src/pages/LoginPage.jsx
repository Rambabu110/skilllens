import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import {
  ArrowRight,
  AlertCircle,
  Briefcase,
  Lock,
  Mail,
  User,
  GraduationCap,
  Clock,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Brain,
  Activity,
  Mic,
  Zap,
  ChevronLeft,
} from "lucide-react";

function getFriendlyErrorMessage(err) {
  if (!err) return "An unexpected error occurred.";
  const msg = err.message || "";
  const code = err.code || "";
  if (code === "auth/unverified-email") {
    return "Email not verified! We have sent a verification link to your email. Please check your Gmail Inbox and SPAM / Junk folder, click the link to activate your account, and then sign in.";
  }
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "Invalid email or password. Please verify your credentials.";
  }
  if (code === "auth/email-already-in-use") {
    return "This email address is already registered. Please sign in instead.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in popup was closed before completing.";
  }
  if (code === "auth/popup-blocked") {
    return "Pop-up blocked by browser. Please allow popups for this site.";
  }
  if (code === "auth/operation-not-allowed") {
    return "This sign-in provider is not enabled in Firebase Console. Please verify Firebase Authentication settings.";
  }
  return err.response?.data?.detail || msg || "Authentication failed. Please try again.";
}

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    position_id: "",
    qualification: "",
    experience_years: "",
  });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, loginWithGoogle, resetPassword, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/register") setMode("register");
  }, [location]);

  useEffect(() => {
    client
      .get("/positions")
      .then((res) => setPositions(res.data))
      .catch(() => {});
  }, []);

  function handleQuickDemo(email, password) {
    setForm((prev) => ({ ...prev, email, password }));
    setMode("login");
    setError("");
    setSuccessMsg(`Loaded demo credentials for ${email}. Click "Sign In" to proceed.`);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsUnverified(false);
    setLoading(true);
    try {
      const cleanEmail = (form.email || "").trim();
      const cleanPassword = (form.password || "").trim();
      if (mode === "login") {
        const user = await login(cleanEmail, cleanPassword);
        if (
          user?.is_admin ||
          cleanEmail.toLowerCase().includes("admin") ||
          cleanEmail.toLowerCase() === "geneewoan@gmail.com"
        ) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        const payload = {
          ...form,
          email: cleanEmail,
          password: cleanPassword,
          experience_years: parseFloat(form.experience_years) || 0,
        };
        await register(payload);
        setSuccessMsg(
          `Account created! A verification link has been sent to ${cleanEmail}. IMPORTANT: Check your Gmail Inbox and SPAM / Junk folder, click the link to activate your account, and then Sign In below.`
        );
        setMode("login");
      }
    } catch (err) {
      if (err.code === "auth/unverified-email" || err.message?.includes("not verified")) {
        setIsUnverified(true);
      }
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!form.email || !form.password) {
      setError("Please enter your email and password above to check verification or resend the link.");
      return;
    }
    setResendLoading(true);
    setError("");
    try {
      const res = await resendVerification(form.email, form.password);
      if (res?.alreadyVerified) {
        setSuccessMsg("Your email is already verified! Signing you in now...");
        const user = await login(form.email, form.password);
        if (
          user?.is_admin ||
          form.email.toLowerCase().includes("admin") ||
          form.email.toLowerCase() === "geneewoan@gmail.com"
        ) {
          navigate("/admin");
        } else {
          navigate("/");
        }
        return;
      }
      setSuccessMsg(
        `Verification email re-sent to ${form.email}! IMPORTANT: Check your Inbox and SPAM / Junk folder.`
      );
      setIsUnverified(false);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSuccessMsg("");
    setIsUnverified(false);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (
        user?.is_admin ||
        user?.email?.toLowerCase().includes("admin") ||
        user?.email?.toLowerCase() === "geneewoan@gmail.com"
      ) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setError("");
    try {
      await resetPassword(resetEmail);
      setSuccessMsg(
        `Password reset link sent to ${resetEmail}! IMPORTANT: If you don't see it in your primary inbox, please check your Gmail SPAM / Junk folder.`
      );
      setShowForgotModal(false);
      setResetEmail("");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060218] text-white relative overflow-hidden flex flex-col justify-center font-sans selection:bg-[#A068FF] selection:text-white">
      {/* Background Radial Glow Mesh */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, rgba(160, 104, 255, 0.16), transparent 50%), radial-gradient(circle at 20% 80%, rgba(13, 7, 38, 0.9), transparent 55%), #060218",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060218] via-[#060218]/90 to-[#060218]/30 pointer-events-none z-0" />

      {/* Top Navbar / Back Anchor */}
      <header className="absolute top-0 left-0 right-0 p-6 md:px-12 flex justify-between items-center z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#A068FF]" />
          <span className="font-urbanist font-bold text-lg text-white">SkillLens AI</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">

          {/* Left Column: Showcase & FRAC Alignment (secondary on mobile, first on desktop) */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-6 sm:space-y-8">
            {/* National Cadre Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#A068FF]/10 border border-[#A068FF]/30 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A068FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A068FF]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A068FF] font-urbanist">
                Ministry of Statistics &amp; Programme Implementation
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                MoSPI NSS
              </span>
            </div>

            {/* Display Headline */}
            <div className="space-y-4">
              <h1 className="font-urbanist font-bold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1]">
                National Statistical <br />
                <span className="text-[#A068FF]">
                  Competency Engine
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
                SkillLens AI powers statistical workforce capability development with zero black-box competency telemetry, Mission Karmayogi FRAC alignment, and live diagnostic passbooks.
              </p>
            </div>

            {/* Capability Cards Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md space-y-2 hover:border-[#A068FF]/40 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 flex items-center justify-center text-[#A068FF] group-hover:scale-105 transition-transform">
                  <Brain className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white font-urbanist tracking-wide">
                  Explainable ML Engine
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Trained on 28,785 learners with real-time ability calibration (&theta;).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md space-y-2 hover:border-[#A068FF]/40 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white font-urbanist tracking-wide">
                  SHAP Explainability
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Mathematical feature attribution explaining exact root causes of skill gaps.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md space-y-2 hover:border-[#A068FF]/40 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Mic className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white font-urbanist tracking-wide">
                  Voice Viva Examiner
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Conversational oral examination measuring articulation and field methodology.
                </p>
              </div>
            </div>

            {/* Live Telemetry Bar */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10 text-xs text-slate-400 font-urbanist">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#A068FF]" />
                <span>FRAC Baseline v2.4 Aligned</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>OULAD Behavioral Twin Engine</span>
              </div>
            </div>
          </div>

          {/* Right Column: Veri-ME Styled Auth Card (Primary on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-5 sm:space-y-6 relative overflow-hidden">
              {/* Subtle top glow bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A068FF] to-sky-500" />

              {/* Header with emblem */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#A068FF]" />
                  </div>
                  <div>
                    <h2 className="font-urbanist font-bold text-base text-white">SkillLens Portal</h2>
                    <p className="text-[11px] text-slate-400">Cadre Verification Console</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#A068FF]/10 text-[#A068FF] border border-[#A068FF]/30 text-[10px] font-urbanist font-bold uppercase tracking-wider">
                  MoSPI Secure
                </span>
              </div>

              {/* 1-Click Instant Demo Personas Strip */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-[#A068FF] flex items-center gap-1.5 font-bold font-urbanist">
                    <Zap className="w-3.5 h-3.5 fill-[#A068FF] text-[#A068FF]" />
                    1-Click Instant Demo Personas
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Pre-seeded</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("aditi.demo@skilllens.in", "demo1234")}
                    className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-[#A068FF]/15 border border-white/10 hover:border-[#A068FF]/30 text-[11px] text-slate-300 hover:text-white font-medium text-left truncate transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A068FF] shrink-0" />
                    <span className="truncate">Aditi (Officer)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("admin.demo@skilllens.in", "admin1234")}
                    className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-sky-500/15 border border-white/10 hover:border-sky-500/30 text-[11px] text-slate-300 hover:text-white font-medium text-left truncate transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="truncate">Admin (MoSPI)</span>
                  </button>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 w-full">
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer font-urbanist ${
                    mode === "login"
                      ? "bg-[#A068FF] text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  Officer Sign In
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer font-urbanist ${
                    mode === "register"
                      ? "bg-[#A068FF] text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  Cadre Registration
                </button>
              </div>

              {/* Social Sign-In (Firebase Google) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-98 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.54 0 2.93.56 4.02 1.48l3.01-3.01C17.21 1.77 14.77 1 12 1 7.42 1 3.55 3.6 1.72 7.37l3.66 2.84C6.26 7.35 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.66 2.84c2.14-1.98 3.76-4.91 3.76-8.66z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.38 14.79c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.72 7.63C.62 9.8 0 12 0 14.37s.62 4.57 1.72 6.74l3.66-2.84z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.66-2.84c-1.07.72-2.45 1.16-4.27 1.16-3.1 0-5.74-2.35-6.62-5.21L1.72 16.03C3.55 19.8 7.42 23 12 23z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#060218] px-3 text-[10px] uppercase font-mono tracking-widest text-slate-400">
                  Or cadre credentials
                </span>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === "register" && (
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      required
                      placeholder="Officer Full Name"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    required
                    type="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Cadre Officer Email"
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder="Password"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-white p-1 focus:outline-none transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-400 hover:text-[#A068FF] transition-colors" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400 hover:text-[#A068FF] transition-colors" />
                      )}
                    </button>
                  </div>
                  {mode === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(form.email);
                          setShowForgotModal(true);
                        }}
                        className="text-[11px] text-[#A068FF] hover:underline font-medium transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                {mode === "register" && (
                  <div className="space-y-3.5 pt-1">
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <select
                        required
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
                        value={form.position_id}
                        onChange={(e) => setForm({ ...form, position_id: e.target.value })}
                      >
                        <option value="">Select your Statistical Position</option>
                        {positions.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                            {p.title} ({p.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block px-0.5">
                          Qualification
                        </label>
                        <div className="relative">
                          <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            placeholder="e.g. M.Sc Statistics"
                            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
                            value={form.qualification}
                            onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block px-0.5">
                          Experience (Years)
                        </label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            placeholder="e.g. 2"
                            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
                            value={form.experience_years}
                            onChange={(e) =>
                              setForm({ ...form, experience_years: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#A068FF]/10 border border-[#A068FF]/20 text-[11px] text-purple-300 flex items-start gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#A068FF] mt-0.5 shrink-0" />
                      <span>
                        A verification link will be sent to your email. Click it in your <strong>Gmail Inbox or SPAM folder</strong> to activate cadre access.
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                    {isUnverified && (
                      <div className="pt-2 border-t border-rose-500/20 space-y-2">
                        <p className="text-[11px] text-slate-300">
                          Already clicked the verification link in your email?
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleSubmit()}
                            className="px-3 py-1.5 rounded-lg bg-[#A068FF] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-[#A068FF]/25 cursor-pointer"
                          >
                            {loading ? "Verifying..." : "I've Verified My Email — Sign In"}
                          </button>
                          <button
                            type="button"
                            disabled={resendLoading}
                            onClick={handleResendVerification}
                            className="text-xs font-medium text-slate-400 hover:text-[#A068FF] underline disabled:opacity-50 ml-auto cursor-pointer"
                          >
                            {resendLoading ? "Resending..." : "Resend Link"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#A068FF] hover:bg-[#8e4ff8] text-white font-bold text-xs shadow-xl shadow-[#A068FF]/25 hover:shadow-[#A068FF]/40 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer font-urbanist tracking-wide"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Authenticating Cadre Credentials…</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === "login" ? "Verify & Sign In" : "Register Officer Profile"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Micro note */}
              <p className="text-[10px] text-slate-500 text-center font-urbanist">
                MoSPI NSS Cadre Prototype • Mission Karmayogi FRAC Standards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060218]/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="w-5 h-5 text-[#A068FF]" />
              <h3 className="font-bold text-sm font-urbanist">Reset Password</h3>
            </div>
            <p className="text-xs text-slate-400">
              Enter your official email address to receive a secure password reset link.
            </p>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              ⚠️ <strong>Check SPAM folder:</strong> Reset emails sent by Firebase often land in your Gmail <strong>Spam</strong> or <strong>Promotions</strong> folder.
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  required
                  type="email"
                  placeholder="Official Email Address"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF]"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 rounded-xl bg-[#A068FF] text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer font-urbanist"
                >
                  {resetLoading ? "Sending…" : "Send Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
