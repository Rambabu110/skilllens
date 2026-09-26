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
  Menu,
  X,
  Shield,
  Target,
  FileCheck,
  Compass,
} from "lucide-react";
import { SpotlightNavbar } from "./ui/spotlight-navbar";
import NotificationBell from "./NotificationBell";

const NAV_ITEMS = [
  { to: "/", label: "Competency Passbook", shortLabel: "Passbook", icon: Award },
  { to: "/diagnostic", label: "AI Adaptive Diagnostic", shortLabel: "Diagnostic", icon: Target },
  { to: "/gaps", label: "Cadre Gaps & Root Cause", shortLabel: "Gaps & DAG", icon: AlertTriangle },
  { to: "/learn", label: "Curated Learning & RAG", shortLabel: "Learn & RAG", icon: BookOpen },
  { to: "/quiz", label: "Evidence Assessment", shortLabel: "Assessment", icon: Sparkles },
  { to: "/viva", label: "Voice Viva AI Examiner", shortLabel: "Oral Viva", icon: Mic },
];

const MOBILE_BOTTOM_NAV = [
  { to: "/", label: "Passbook", icon: Award },
  { to: "/diagnostic", label: "Diagnostic", icon: Target },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/quiz", label: "Assess", icon: Sparkles },
];

export default function Layout({ children }) {
  const { logout, learner, token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);


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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#060218] text-slate-100 selection:bg-[#A068FF] selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Cosmic Mesh Glows */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 85% 15%, rgba(160, 104, 255, 0.08), transparent 45%), radial-gradient(circle at 10% 85%, rgba(124, 58, 237, 0.06), transparent 50%)",
        }}
      />

      {/* Desktop Institutional Sidebar */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 bg-[#09041a]/90 backdrop-blur-xl border-r border-white/10 flex-col justify-between py-6 px-4 sticky top-0 h-screen z-20">
        <div>
          {/* Institutional Header & Cadre Authority */}
          <div className="mb-7 px-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(160,104,255,0.2)]">
                <span className="font-urbanist text-xs font-bold text-[#A068FF] tracking-wider">MoS</span>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-urbanist font-bold text-sm tracking-tight text-white">SkillLens</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 font-semibold tracking-wider">
                    FRAC
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  National Statistical System
                </p>
              </div>
            </div>
            
            <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                <span className="text-slate-300 font-medium tracking-tight">Karmayogi Cadre</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-normal">v2.4</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A068FF]/80 px-3 mb-1 font-urbanist">
              Competency Directory
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-200 group relative ${
                      isActive
                        ? "bg-[#A068FF]/15 text-white font-semibold border border-[#A068FF]/40 shadow-[0_0_20px_rgba(160,104,255,0.2)]"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-[#C084FC]" : "text-slate-400 group-hover:text-slate-200"}`} />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <div className="absolute right-2.5 w-1.5 h-3.5 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Desktop Bottom Section — Authenticated Profile / Guest */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
          {isAuthenticated ? (
            <>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center font-urbanist font-bold text-[#C084FC] text-xs shrink-0">
                    {learner?.name ? learner.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="truncate leading-tight">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-xs font-semibold text-white truncate">
                        {learner?.name || "Cadre Officer"}
                      </p>
                      {learner?.is_admin && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold shrink-0">
                          ADM
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {learner?.email || "Cadre Member"}
                    </p>
                  </div>
                </div>
              </div>
              {learner?.is_admin && (
                <NavLink
                  to="/admin"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cadre Administrator</span>
                </NavLink>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-normal text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[11px] text-slate-400 leading-snug">
                  Sign in with Karmayogi credentials to record verified assessments.
                </p>
              </div>
              <button
                onClick={() => openAuthModal()}
                className="btn-secondary w-full justify-center text-xs py-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </>
          )}

          {/* Discreet link for system console */}
          <div className="pt-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-mono">
            <span>MoSPI NSS</span>
            <NavLink
              to="/admin"
              className="text-slate-500 hover:text-slate-400 transition-colors ml-1"
              title="System Console"
            >
              · Console
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#09041a] border-r border-white/10 shadow-2xl z-50 flex flex-col justify-between py-6 px-4 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center">
                    <span className="font-urbanist text-xs font-bold text-[#A068FF]">MoS</span>
                  </div>
                  <div>
                    <h2 className="font-urbanist font-bold text-sm text-white flex items-center gap-1.5">
                      SkillLens <span className="text-[#C084FC] text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#A068FF]/15 border border-[#A068FF]/30">FRAC</span>
                    </h2>
                    <p className="text-[10px] text-slate-400">National Statistical System</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Framework Status */}
              <div className="mb-5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                  <span className="text-slate-300 font-medium">Karmayogi Cadre</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">v2.4</span>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A068FF]/80 px-3 mb-1 font-urbanist">
                  Competency Directory
                </p>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-[#A068FF]/15 text-white border border-[#A068FF]/40 shadow-[0_0_15px_rgba(160,104,255,0.2)]"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 ${isActive ? "text-[#C084FC]" : "text-slate-400"}`} />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-3.5 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}

                <div className="pt-2 mt-1 border-t border-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1 font-urbanist">
                    Tools &amp; Portals
                  </p>
                  <NavLink
                    to="/verify"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#A068FF]/15 text-white border border-[#A068FF]/40"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`
                    }
                  >
                    <FileCheck className="w-4 h-4 text-[#A068FF]" />
                    <span>Verify Credential</span>
                  </NavLink>
                  <NavLink
                    to="/hub"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#A068FF]/15 text-white border border-[#A068FF]/40"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`
                    }
                  >
                    <Compass className="w-4 h-4 text-sky-400" />
                    <span>Architecture Hub</span>
                  </NavLink>
                </div>
              </nav>
            </div>

            {/* Drawer Bottom Auth Section */}
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center font-urbanist font-bold text-[#C084FC] text-xs shrink-0">
                        {learner?.name ? learner.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="truncate leading-tight">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs font-semibold text-white truncate">
                            {learner?.name || "Cadre Officer"}
                          </p>
                          {learner?.is_admin && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold">
                              ADM
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {learner?.email || "Cadre Member"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {learner?.is_admin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cadre Administrator</span>
                    </NavLink>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                      navigate("/");
                    }}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-normal text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal();
                  }}
                  className="btn-primary w-full justify-center text-xs py-2.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Discreet subtle link */}
              <div className="pt-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-mono">
                <span>MoSPI NSS</span>
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-500 hover:text-slate-400 text-[9px] transition-colors ml-1"
                >
                  · Console
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Executive Top Bar */}
        <header className="h-16 border-b border-white/10 bg-[#060218]/85 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Left: Mobile Hamburger & Page Title / Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white active:scale-[0.98] transition-all shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-slate-300" />
            </button>

            {/* Mobile Brand Logo */}
            <div className="flex lg:hidden items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center shrink-0">
                <span className="font-urbanist text-[11px] font-bold text-[#A068FF]">MoS</span>
              </div>
              <span className="font-urbanist font-bold text-xs text-white truncate">
                SkillLens <span className="text-[#C084FC] text-[9px] font-mono px-1 py-0.2 rounded bg-[#A068FF]/15 border border-[#A068FF]/30">FRAC</span>
              </span>
            </div>

            {/* Desktop Breadcrumbs */}
            <div className="hidden 2xl:flex items-center gap-2 text-xs shrink-0 mr-2 font-urbanist">
              <span className="text-slate-400 font-medium">MoSPI NSS</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-white font-semibold">{currentNav.label}</span>
            </div>

            {/* Desktop Spotlight Navbar with min-w-0 containment */}
            <div className="hidden lg:flex items-center min-w-0">
              <SpotlightNavbar
                items={NAV_ITEMS.map((item) => ({ label: item.shortLabel, href: item.to }))}
                defaultActiveIndex={Math.max(0, NAV_ITEMS.findIndex((item) => item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)))}
                onItemClick={(item) => navigate(item.href)}
                className="py-0 pt-0"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Full iGOT Sync Indicator on ultra-wide screens */}
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#A068FF]/10 border border-[#A068FF]/25 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#A068FF] animate-pulse" />
              <span className="text-slate-400">iGOT Karmayogi:</span>
              <span className="text-[#C084FC] font-semibold">Schema Aligned</span>
            </div>

            {/* Compact iGOT indicator on standard laptops (1280px-1535px) */}
            <div
              className="hidden xl:flex 2xl:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A068FF]/10 border border-[#A068FF]/25 text-xs text-slate-300"
              title="iGOT Karmayogi: Schema Aligned"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A068FF] animate-pulse" />
              <span className="text-[#C084FC] font-semibold">iGOT Aligned</span>
            </div>

            {/* Cinematic Hero Showcase Link - large screens only */}
            <button
              onClick={() => navigate("/landing")}
              title="Cinematic Hero Section"
              className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#A068FF]/15 border border-white/10 hover:border-[#A068FF]/40 text-xs text-slate-300 hover:text-white transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A068FF]" />
              <span>Cinematic Hero</span>
            </button>

            {/* Real In-App Notification Center */}
            <NotificationBell />

            {/* Passbook PDF Action with tactile glow */}
            <button
              onClick={handleExportPdf}
              disabled={downloadingPdf}
              title="Export Passbook PDF"
              className="btn-secondary text-xs py-1.5 px-3 sm:px-3.5 gap-2 relative overflow-hidden group hover:border-[#A068FF]/50 hover:shadow-[0_0_20px_rgba(160,104,255,0.25)] transition-all"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingPdf ? "animate-pulse text-[#C084FC]" : "text-[#C084FC]"}`} />
              <span className="hidden sm:inline">{downloadingPdf ? "Generating..." : "Export Passbook"}</span>
              <span className="sm:hidden text-[11px]">{downloadingPdf ? "..." : "PDF"}</span>
            </button>

            {/* Top-right Sign In / User Button */}
            {!isAuthenticated ? (
              <button
                onClick={() => openAuthModal()}
                className="btn-primary text-xs py-1.5 px-3 sm:px-4"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-white/10">
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] p-[1.5px] cursor-pointer shadow-[0_0_12px_rgba(160,104,255,0.3)] hover:scale-105 transition-transform"
                  onClick={() => navigate("/")}
                  title={`${learner?.name || "Cadre Officer"}`}
                >
                  <div className="w-full h-full rounded-full bg-[#060218] flex items-center justify-center">
                    <span className="font-urbanist font-bold text-xs text-[#C084FC]">
                      {learner?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8 max-w-7xl w-full mx-auto pb-28 lg:pb-8">
          {children}
        </main>

        {/* Institutional & Hackathon Branding Footer — Shown only prior to login */}
        {!isAuthenticated && (
          <footer className="border-t border-white/10 bg-[#060218]/90 backdrop-blur-xl px-4 py-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 z-10">
            <div className="flex items-center gap-2">
              <span className="font-urbanist font-bold text-white tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                SkillLens AI
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 font-semibold">
                MoSPI FRAC
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center text-center">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 font-medium">
                Team <strong className="text-white font-bold">Zero Day Nextron</strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="px-2.5 py-1 rounded-full bg-[#A068FF]/15 border border-[#A068FF]/30 text-[#C084FC] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#A068FF]" />
                Smart India Hackathon 2026 Prototype (SIH26101)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono text-center sm:text-right">
              Ministry of Statistics &amp; Programme Implementation
            </div>
          </footer>
        )}

        {/* Mobile Bottom Navigation Bar (< lg) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#09041a]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 mobile-safe-bottom flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/"
                ? location.pathname === "/" || location.pathname === "/dashboard"
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all rounded-xl active:scale-95 relative ${
                  isActive ? "text-[#C084FC] font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className={`relative p-1 rounded-xl transition-all ${isActive ? "bg-[#A068FF]/20 text-[#C084FC]" : ""}`}>
                  <Icon className="w-4 h-4" />
                  {isActive && (
                    <span className="absolute -top-0.5 right-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                  )}
                </div>
                <span className="text-[10px] font-urbanist tracking-tight text-center mt-0.5 font-semibold">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* More / Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all rounded-xl active:scale-95 text-slate-400 hover:text-slate-200 relative ${
              mobileMenuOpen ? "text-[#C084FC]" : ""
            }`}
            aria-label="Open navigation menu"
          >
            <div className={`p-1 rounded-xl transition-all ${mobileMenuOpen ? "bg-[#A068FF]/20 text-[#C084FC]" : ""}`}>
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-urbanist tracking-tight text-center mt-0.5 font-semibold">
              Menu
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
