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
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Competency Passbook", shortLabel: "Passbook", icon: Award },
  { to: "/gaps", label: "Cadre Gaps Diagnostics", shortLabel: "Gaps", icon: AlertTriangle },
  { to: "/learn", label: "Recommended Modules", shortLabel: "Learn", icon: BookOpen },
  { to: "/quiz", label: "AI Skills Assessment", shortLabel: "Quiz", icon: Sparkles },
  { to: "/viva", label: "Voice Viva AI Examiner", shortLabel: "Viva", icon: Mic },
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#070D1E] text-slate-100 selection:bg-teal-400 selection:text-slate-950 font-sans">
      {/* Desktop Institutional Sidebar */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 bg-[#070e1c] border-r border-white/[0.08] flex-col justify-between py-6 px-4 sticky top-0 h-screen z-20">
        <div>
          {/* Institutional Header & Cadre Authority */}
          <div className="mb-7 px-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0e1a30] border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
                <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">MoS</span>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm tracking-tight text-white">SkillLens</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-emerald-400 border border-white/10 font-semibold tracking-wider">
                    FRAC
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  National Statistical System
                </p>
              </div>
            </div>
            
            <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#0b1424] border border-white/[0.06] text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300 font-medium tracking-tight">Karmayogi Cadre</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-normal">v2.4</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1 font-mono">
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
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150 group relative ${
                      isActive
                        ? "bg-white/[0.08] text-white font-medium border border-white/[0.12] shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-300"}`} />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <div className="absolute right-2.5 w-1 h-3 rounded-full bg-emerald-400" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Desktop Bottom Section — Authenticated Profile / Guest */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2">
          {isAuthenticated ? (
            <>
              <div className="p-2.5 rounded-lg bg-[#0b1424] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-300 text-xs shrink-0">
                    {learner?.name ? learner.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="truncate leading-tight">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {learner?.name || "Cadre Officer"}
                      </p>
                      {learner?.is_admin && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold shrink-0">
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
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
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
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-normal text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-2.5 rounded-lg bg-[#0b1424] border border-white/[0.06]">
                <p className="text-[11px] text-slate-400 leading-snug">
                  Sign in with Karmayogi credentials to record verified assessments.
                </p>
              </div>
              <button
                onClick={() => openAuthModal()}
                className="btn-secondary w-full justify-center text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </>
          )}

          {/* Discreet link for system console */}
          <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 font-mono">
            <span>MoSPI NSS</span>
            <NavLink
              to="/admin"
              className="text-slate-400 hover:text-slate-300 transition-colors ml-1"
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
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#070e1c] border-r border-white/10 shadow-2xl z-50 flex flex-col justify-between py-6 px-4 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0e1a30] border border-emerald-500/30 flex items-center justify-center">
                    <span className="font-mono text-xs font-bold text-emerald-400">MoS</span>
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                      SkillLens <span className="text-emerald-400 text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] border border-white/10">FRAC</span>
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
              <div className="mb-5 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#0b1424] border border-white/[0.06] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-medium">Karmayogi Cadre</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">v2.4</span>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1 font-mono">
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
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-white/[0.08] text-white border border-white/[0.12]"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-1 h-3 rounded-full bg-emerald-400" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Auth Section */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <div className="p-2.5 rounded-lg bg-[#0b1424] border border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-300 text-xs shrink-0">
                        {learner?.name ? learner.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="truncate leading-tight">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {learner?.name || "Cadre Officer"}
                          </p>
                          {learner?.is_admin && (
                            <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold">
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
                      className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
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
                    className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-normal text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
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
                  className="btn-primary w-full justify-center text-xs py-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Discreet subtle link */}
              <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 font-mono">
                <span>MoSPI NSS</span>
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-300 text-[9px] transition-colors ml-1"
                >
                  · Console
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Executive Top Bar */}
        <header className="h-14 border-b border-white/[0.08] bg-[#070e1c]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
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
              <div className="w-6 h-6 rounded bg-[#0e1a30] border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span className="font-mono text-[10px] font-bold text-emerald-400">MoS</span>
              </div>
              <span className="font-display font-semibold text-xs text-white truncate">
                SkillLens <span className="text-emerald-400 text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] border border-white/10">FRAC</span>
              </span>
            </div>

            {/* Desktop Breadcrumbs */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-normal">MoSPI Cadre System</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-200 font-medium">{currentNav.label}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* iGOT Sync Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0b1424] border border-white/[0.06] text-[11px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400">iGOT Karmayogi:</span>
              <span className="text-slate-200 font-medium">Synced</span>
            </div>

            {/* Passbook PDF Action */}
            <button
              onClick={handleExportPdf}
              disabled={downloadingPdf}
              title="Export Passbook PDF"
              className="btn-secondary text-xs py-1.5 px-2.5 sm:px-3 gap-1.5"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingPdf ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">{downloadingPdf ? "Generating..." : "Export Passbook"}</span>
              <span className="sm:hidden text-[11px]">{downloadingPdf ? "..." : "PDF"}</span>
            </button>

            {/* Top-right Sign In / User Button */}
            {!isAuthenticated ? (
              <button
                onClick={() => openAuthModal()}
                id="topbar-signin-btn"
                className="btn-primary text-xs py-1.5 px-2.5 sm:px-3"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : (
              <div className="flex lg:hidden items-center gap-1.5">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono text-emerald-300 font-bold text-xs"
                  title={learner?.name || "Profile"}
                >
                  {learner?.name ? learner.name.charAt(0).toUpperCase() : "U"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl w-full mx-auto pb-28 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (< lg) */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#070e1c] border-t border-white/[0.08] px-1 py-1.5 flex items-center justify-around shadow-lg">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-colors relative ${
                  isActive ? "text-white font-medium" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span className="text-[10px] tracking-tight truncate max-w-[56px] text-center">
                  {item.shortLabel || item.label}
                </span>
                {isActive && (
                  <span className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </NavLink>
            );
          })}

          {/* More / Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-0.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Menu className="w-4 h-4 mb-0.5 text-slate-400" />
            <span className="text-[10px] tracking-tight">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
