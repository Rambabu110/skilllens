import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
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
  X,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

function getFriendlyErrorMessage(err) {
  if (!err) return "An unexpected error occurred.";
  const msg = err.message || "";
  const code = err.code || "";
  if (code === "auth/unverified-email") {
    return "Email not verified! Please check your Gmail Inbox and SPAM folder, click the verification link, and then sign in.";
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
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
  return err.response?.data?.detail || err.message || "Authentication failed. Please try again.";
}

export default function AuthModal() {
  const { isOpen, initialMode, closeAuthModal, onAuthSuccess } = useAuthModal();
  const { login, register, loginWithGoogle, resetPassword, resendVerification } = useAuth();

  const [mode, setMode] = useState(initialMode || "login");
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

  // Sync mode with initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || "login");
      setError("");
      setSuccessMsg("");
      setIsUnverified(false);
    }
  }, [isOpen, initialMode]);

  // Load positions for register form
  useEffect(() => {
    if (isOpen && positions.length === 0) {
      client
        .get("/positions")
        .then((res) => setPositions(res.data))
        .catch(() => {});
    }
  }, [isOpen, positions.length]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") closeAuthModal();
    }
    if (isOpen) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeAuthModal]);

  if (!isOpen) return null;

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
        await login(cleanEmail, cleanPassword);
        onAuthSuccess();
      } else {
        const payload = {
          ...form,
          email: cleanEmail,
          password: cleanPassword,
          experience_years: parseFloat(form.experience_years) || 0,
        };
        await register(payload);
        setSuccessMsg(
          `Account created! A verification link has been sent to ${cleanEmail}. Check your Gmail Inbox and SPAM folder, click the link, then Sign In.`
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
      setError("Please enter your email and password above first.");
      return;
    }
    setResendLoading(true);
    setError("");
    try {
      const res = await resendVerification(form.email, form.password);
      if (res?.alreadyVerified) {
        setSuccessMsg("Your email is already verified! Signing you in now...");
        await login(form.email, form.password);
        onAuthSuccess();
        return;
      }
      setSuccessMsg(
        `Verification email re-sent to ${form.email}! Check your Inbox and SPAM folder.`
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
      await loginWithGoogle();
      onAuthSuccess();
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
        `Password reset link sent to ${resetEmail}! Check your Gmail Inbox and SPAM folder.`
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans selection:bg-[#A068FF] selection:text-white"
      onClick={(e) => e.target === e.currentTarget && closeAuthModal()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#060218]/90 backdrop-blur-xl" />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md my-auto max-h-[92vh] overflow-y-auto space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={closeAuthModal}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#A068FF]/20 border border-[#A068FF]/40 text-[#A068FF] mb-1 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="font-urbanist font-bold text-2xl text-white tracking-tight">
            SkillLens AI
          </h2>
          <p className="text-xs text-slate-400 font-normal">
            National Statistical Cadre Authentication (MoSPI NSS)
          </p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4 relative overflow-hidden">
          {/* Subtle top glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A068FF] to-sky-500" />
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 w-full">
            <button
              type="button"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all font-urbanist cursor-pointer ${
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
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all font-urbanist cursor-pointer ${
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
              Officer Registration
            </button>
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 min-h-[40px] cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.54 0 2.93.56 4.02 1.48l3.01-3.01C17.21 1.77 14.77 1 12 1 7.42 1 3.55 3.6 1.72 7.37l3.66 2.84C6.26 7.35 8.9 5 12 5z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.66 2.84c2.14-1.98 3.76-4.91 3.76-8.66z" />
              <path fill="#FBBC05" d="M5.38 14.79c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.72 7.63C.62 9.8 0 12 0 14.37s.62 4.57 1.72 6.74l3.66-2.84z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.66-2.84c-1.07.72-2.45 1.16-4.27 1.16-3.1 0-5.74-2.35-6.62-5.21L1.72 16.03C3.55 19.8 7.42 23 12 23z" />
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

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  required
                  placeholder="Officer Full Name"
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all min-h-[40px]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                required
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Cadre Officer Email"
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all min-h-[40px]"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="Password"
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all min-h-[40px]"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-1 focus:outline-none transition-colors cursor-pointer"
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
                    className="text-[11px] text-[#A068FF] hover:underline transition-colors pt-0.5 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {mode === "register" && (
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    required
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all min-h-[40px]"
                    value={form.position_id}
                    onChange={(e) => setForm({ ...form, position_id: e.target.value })}
                  >
                    <option value="">Select Statistical Cadre Position</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.title} ({p.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-slate-400 block px-0.5">
                      Qualification
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        placeholder="e.g. M.Sc Statistics"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all min-h-[40px]"
                        value={form.qualification}
                        onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-slate-400 block px-0.5">
                      Experience (Years)
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        placeholder="e.g. 2"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all min-h-[40px]"
                        value={form.experience_years}
                        onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#A068FF]/10 border border-[#A068FF]/20 text-[11px] text-purple-300 flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#A068FF] mt-0.5 shrink-0" />
                  <span>
                    A verification link will be dispatched to your email. You must verify via your{" "}
                    <strong>Inbox or SPAM folder</strong> to activate cadre credentials.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2">
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
                        {loading ? "Verifying..." : "I've Verified — Sign In"}
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
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
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
        </div>

        <p className="text-[10px] font-urbanist text-slate-500 text-center">
          Ministry of Statistics and Programme Implementation • FRAC Methodology
        </p>
      </div>

      {/* Forgot Password Sub-Modal */}
      {showForgotModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 space-y-4 border border-white/10 shadow-2xl relative z-30">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="w-4 h-4 text-[#A068FF]" />
              <h3 className="font-urbanist font-bold text-sm">Reset Password</h3>
            </div>
            <p className="text-xs text-slate-400">
              Enter your official email to receive a secure password reset link.
            </p>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              ⚠️ <strong>Check SPAM folder:</strong> Reset emails often land in Gmail{" "}
              <strong>Spam</strong> or <strong>Promotions</strong>.
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="email"
                  placeholder="Official Email Address"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] min-h-[40px]"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
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
