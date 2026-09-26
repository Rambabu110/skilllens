import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Menu, X } from "lucide-react";
import VeriNavLink from "./VeriNavLink";
import VeriButton from "./VeriButton";

export default function LandingNavbar({ onSignIn, onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <header className="flex justify-between items-center px-4 sm:px-6 md:px-[64px] py-4 sm:py-[24px] max-w-[1920px] mx-auto w-full fade-down relative z-30">
        {/* Brand */}
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-2 text-white group">
            <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-[#A068FF] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col leading-none">
              <span className="font-bold tracking-wide text-lg sm:text-xl font-urbanist text-white">
                SkillLens AI
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider">
                MoSPI NSS
              </span>
            </div>
          </Link>

          {/* Desktop Anchor Links */}
          <nav className="hidden md:flex gap-8 mobile-hide">
            <VeriNavLink href="#problem" onClick={(e) => scrollTo(e, "problem")}>
              The Problem
            </VeriNavLink>
            <VeriNavLink href="#solution" onClick={(e) => scrollTo(e, "solution")}>
              Platform
            </VeriNavLink>
            <VeriNavLink href="#impact" onClick={(e) => scrollTo(e, "impact")}>
              Impact
            </VeriNavLink>
            <Link to="/verify" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
              Verify Credential
            </Link>
          </nav>
        </div>

        {/* Right Desktop Actions */}
        <div className="hidden md:flex gap-6 items-center">
          <button
            type="button"
            onClick={onSignIn}
            className="relative group text-white text-[15px] font-medium transition-colors"
          >
            Sign In
            <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-white scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out" />
          </button>
          <VeriButton
            onClick={onGetStarted}
            slideFrom="left"
            className="px-[26px] py-[12px] text-[15px] font-medium"
          >
            Start Assessment
          </VeriButton>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:text-[#A068FF] transition-colors focus:outline-none rounded-xl bg-white/[0.04] border border-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[64px] bg-[#060218]/98 backdrop-blur-2xl z-50 p-6 flex flex-col gap-5 border-t border-white/10 overflow-y-auto animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-2 text-base font-urbanist">
            <a
              href="#problem"
              onClick={(e) => scrollTo(e, "problem")}
              className="text-white hover:text-[#A068FF] font-semibold py-3 border-b border-white/5 flex items-center justify-between"
            >
              <span>The Problem</span>
              <span className="text-xs text-slate-400 font-mono">Statistical Crisis</span>
            </a>
            <a
              href="#solution"
              onClick={(e) => scrollTo(e, "solution")}
              className="text-white hover:text-[#A068FF] font-semibold py-3 border-b border-white/5 flex items-center justify-between"
            >
              <span>Platform</span>
              <span className="text-xs text-[#C084FC] font-mono">Deep Tech Engine</span>
            </a>
            <a
              href="#impact"
              onClick={(e) => scrollTo(e, "impact")}
              className="text-white hover:text-[#A068FF] font-semibold py-3 border-b border-white/5 flex items-center justify-between"
            >
              <span>Impact</span>
              <span className="text-xs text-slate-400 font-mono">Ecosystem</span>
            </a>
            <Link
              to="/verify"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#A068FF] font-semibold py-3 border-b border-white/5 flex items-center justify-between"
            >
              <span>Verify Credential</span>
              <span className="text-xs text-emerald-400 font-mono">Public Ledger</span>
            </Link>
          </nav>
          <div className="flex flex-col gap-3 mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onSignIn?.();
              }}
              className="w-full py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-center transition-colors border border-white/10"
            >
              Sign In
            </button>
            <VeriButton
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStarted?.();
              }}
              slideFrom="left"
              className="w-full py-3 text-center text-sm font-semibold"
            >
              Start Assessment
            </VeriButton>
          </div>
        </div>
      )}
    </>
  );
}
