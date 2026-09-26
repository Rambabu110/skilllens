import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";

import LandingNavbar from "../components/landing/LandingNavbar";
import TypewriterHeadline from "../components/landing/TypewriterHeadline";
import VeriButton from "../components/landing/VeriButton";
import OrbitCluster from "../components/landing/OrbitCluster";
import LogoMarquee from "../components/landing/LogoMarquee";
import ProblemSection from "../components/landing/ProblemSection";
import PlatformSection from "../components/landing/PlatformSection";
import ImpactSection from "../components/landing/ImpactSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function CinematicLandingPage() {
  const navigate = useNavigate();
  const { token, learner } = useAuth();
  const { openAuthModal } = useAuthModal();

  const handleSignIn = () => {
    if (token) {
      if (learner && !learner.onboarding_completed) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    } else {
      openAuthModal(null, "login");
    }
  };

  const handleGetStarted = () => {
    if (token) {
      if (learner && !learner.onboarding_completed) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    } else {
      openAuthModal(null, "register");
    }
  };

  return (
    <div className="min-h-screen bg-[#060218] text-white font-sans overflow-x-hidden selection:bg-[#A068FF] selection:text-white">
      {/* Hero Section Container */}
      <div
        className="w-full min-h-[100svh] flex flex-col relative overflow-hidden pb-8 lg:pb-0"
        style={{
          background:
            "radial-gradient(circle at 85% 25%, rgba(160, 104, 255, 0.18), transparent 45%), radial-gradient(circle at 15% 75%, rgba(13, 7, 38, 0.9), transparent 50%), #060218",
        }}
      >
        {/* Subtle Side Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060218] via-[#060218]/90 to-[#060218]/20 pointer-events-none z-0" />

        {/* Top Navbar */}
        <LandingNavbar
          onSignIn={handleSignIn}
          onGetStarted={handleGetStarted}
        />

        {/* Main Hero Content Area */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-between max-w-[1920px] mx-auto w-full px-4 sm:px-6 md:px-[64px] relative z-10 hero-layout">
          {/* Left Column Content */}
          <div className="flex-[0_1_600px] flex flex-col items-start hero-left relative z-20">
            {/* Pill Badge */}
            <div className="fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#A068FF]/10 border border-[#A068FF]/30 text-[#A068FF] text-xs sm:text-sm font-medium mb-6 sm:mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A068FF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A068FF]" />
                </span>
                SIH 2026 Innovation (SIH26101) • MoSPI Cadre
              </div>
            </div>

            {/* Headline with Live Typewriter */}
            <div className="fade-up w-full" style={{ animationDelay: "0.4s" }}>
              <TypewriterHeadline
                text="Know the Learner, Build the Competency."
                splitIndex={17}
                delay={400}
                speed={45}
              />
            </div>

            {/* Supporting Lead Text */}
            <p
              className="text-sm sm:text-base md:text-lg text-slate-300 max-w-xl mb-8 sm:mb-10 leading-relaxed fade-up"
              style={{ animationDelay: "2.2s" }}
            >
              Eliminate subjective appraisals and uncalibrated training. SkillLens AI replaces paper reports with a live, explainable ML competency diagnostics engine backed by FRAC mapping and tamper-proof digital passbooks.
            </p>

            {/* CTA Button Wrapper with Floating Cursor Tag */}
            <div className="fade-up relative" style={{ animationDelay: "2.8s" }}>
              <VeriButton
                onClick={handleGetStarted}
                slideFrom="right"
                className="px-[24px] sm:px-[28px] py-[12px] sm:py-[14px] text-[15px] sm:text-[16px] font-medium"
              >
                <span>Explore Passbook</span>
                <ChevronRight className="w-5 h-5 ml-1" />
              </VeriButton>

              {/* Floating Cursor Chip (Replaces Recruiter ✅ with MoSPI Supervisor ✅) */}
              <div
                className="hidden sm:block absolute top-[40px] left-[260px] md:left-[290px] cursor-element animate-[float-cursor_3s_ease-in-out_infinite] z-20 pointer-events-none"
                style={{ animationDelay: "3.2s" }}
              >
                <div
                  className="opacity-0 animate-[fadeUp_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards]"
                  style={{ animationDelay: "3.2s" }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="#A068FF"
                    className="drop-shadow-lg -rotate-12"
                  >
                    <path
                      d="M5.5 2.5L21.5 9.5L13.5 13.5L9.5 21.5L5.5 2.5Z"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-1 ml-4 bg-[#A068FF] text-white text-sm font-medium px-4 py-2 rounded-[20px] shadow-xl whitespace-nowrap">
                    MoSPI Supervisor ✅
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 4 Concentric Counter-Rotating Orbits + Stat Counter */}
          <OrbitCluster />
        </main>

        {/* Seamless 20-Logo Infinite Marquee */}
        <LogoMarquee />
      </div>

      {/* Main Feature & Content Sections */}
      <div className="relative z-10 bg-[#060218]">
        <ProblemSection />
        <PlatformSection />
        <ImpactSection />
        <LandingFooter />
      </div>
    </div>
  );
}
