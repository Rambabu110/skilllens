import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import client from "../api/client";
import {
  Award,
  AlertTriangle,
  BookOpen,
  Users,
  LogOut,
  Download,
  ShieldCheck,
  Sparkles,
  Layers,
  ChevronRight,
  Mic,
  LogIn,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Competency Passbook", icon: Award },
  { to: "/gaps", label: "Cadre Gaps Diagnostics", icon: AlertTriangle },
  { to: "/learn", label: "Recommended Modules", icon: BookOpen },
  { to: "/quiz", label: "AI Skills Assessment", icon: Sparkles },
  { to: "/viva", label: "Voice Viva AI Examiner", icon: Mic },
  { to: "/admin", label: "Admin Command Center", icon: Users },
];

export default function Layout({ children }) {
  const { logout, learner, token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Listen for the global auth-required event (fired by 401 interceptor)
  useEffect(() => {
    function handleAuthRequired() {
      openAuthModal();
    }
    window.addEventListener("skilllens:auth-required", handleAuthRequired);
    return () => window.removeEventListener("skilllens:auth-required", handleAuthRequired);
  }, [openAuthModal]);

  async function handleExportPdf() {
    if (!token) {
      openAuthModal(handleExportPdf);
      return;
    }
    setDownloadingPdf(true);
    try {
      const res = await client.get("/export/passbook-pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `SkillLens_Passbook_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const currentNav =
    NAV_ITEMS.find((item) =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    ) || NAV_ITEMS[0];

  const isAuthenticated = !!token;

  return (
    <div className="min-h-screen flex bg-[#070D1E] text-slate-100 selection:bg-teal-400 selection:text-slate-950 font-sans">
      {/* Sleek Glassmorphic Sidebar */}
      <aside className="w-64 shrink-0 bg-[#0B132B]/80 backdrop-blur-2xl border-r border-white/[0.07] flex flex-col justify-between py-6 px-4 sticky top-0 h-screen z-20">
        <div>
          {/* Logo & Seal Header */}
          <div className="mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-1 ring-white/30">
                <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  SkillLens <span className="text-teal-400 text-xs px-1.5 py-0.5 rounded-full bg-teal-400/10 border border-teal-400/30">AI</span>
                </h1>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                  Official Statistical System
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-300 font-medium tracking-tight">FRAC Framework · Online</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
              Cadre Capabilities
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group relative ${
                      isActive
                        ? "bg-gradient-to-r from-teal-400/15 to-emerald-500/10 text-teal-300 border border-teal-400/30 shadow-lg shadow-teal-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_#48E5C2]" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section — user card or guest prompt */}
        <div className="pt-4 border-t border-white/[0.07] flex flex-col gap-2">
          {isAuthenticated ? (
            <>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-substrate-light to-substrate flex items-center justify-center border border-white/10 font-bold text-teal-400 text-xs">
                    {learner?.name ? learner.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {learner?.name || "Cadre Member"}
                      </p>
                      {learner?.is_admin && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold shrink-0">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {learner?.email || "Authenticated"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Sign in to view your personal competency profile and analytics.
                </p>
              </div>
              <button
                onClick={() => openAuthModal()}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold bg-teal-400/10 text-teal-300 border border-teal-400/20 hover:bg-teal-400/20 hover:border-teal-400/40 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Executive Top Bar */}
        <header className="h-16 border-b border-white/[0.07] bg-[#070D1E]/70 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">National Statistical System</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-teal-300 font-semibold">{currentNav.label}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* iGOT Sync Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-[11px] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>iGOT Karmayogi Connector:</span>
              <span className="text-teal-300 font-semibold">Active</span>
            </div>

            {/* Passbook PDF Action */}
            <button
              onClick={handleExportPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 stroke-[2.5] ${downloadingPdf ? "animate-bounce" : ""}`} />
              <span>{downloadingPdf ? "Compiling..." : "Export Passbook PDF"}</span>
            </button>

            {/* Top-right Sign In button — only show when NOT authenticated */}
            {!isAuthenticated && (
              <button
                onClick={() => openAuthModal()}
                id="topbar-signin-btn"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-teal-400/40 bg-teal-400/10 text-teal-300 text-xs font-semibold hover:bg-teal-400 hover:text-slate-950 transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
