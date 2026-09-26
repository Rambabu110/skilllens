import React, { useEffect, useRef, useState } from "react";

export interface CinematicHeroProps {
  mode?: "aethera" | "skilllens";
  onCtaClick?: () => void;
  onNavigate?: (route: string) => void;
  allowToggle?: boolean;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  mode: initialMode = "aethera",
  onCtaClick,
  onNavigate,
  allowToggle = true,
}) => {
  const [currentMode, setCurrentMode] = useState<"aethera" | "skilllens">(initialMode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState<number>(0);

  // Video looping and fade-in/fade-out logic using requestAnimationFrame & useRef
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const updateFade = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        const current = video.currentTime;
        const duration = video.duration;

        // Fade in over 0.5s at the start (opacity 0 to 1)
        if (current <= 0.5) {
          setVideoOpacity(Math.min(1, Math.max(0, current / 0.5)));
        }
        // Fade out over 0.5s before the end (opacity 1 to 0)
        else if (duration - current <= 0.5) {
          setVideoOpacity(Math.min(1, Math.max(0, (duration - current) / 0.5)));
        }
        // Full opacity in between
        else {
          setVideoOpacity(1);
        }
      }

      animationFrameId = requestAnimationFrame(updateFade);
    };

    animationFrameId = requestAnimationFrame(updateFade);

    // On ended event: set opacity to 0, wait 100ms, reset currentTime = 0, then play() again
    const handleEnded = () => {
      setVideoOpacity(0);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {
            // Autoplay permissions fallback
          });
        }
      }, 100);
    };

    video.addEventListener("ended", handleEnded);

    // Initial play attempt
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const isAethera = currentMode === "aethera";

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
    } else if (onNavigate) {
      onNavigate(isAethera ? "/hub" : "/hub");
    }
  };

  const navMenuItems = isAethera
    ? [
        { label: "Home", active: true, href: "#home" },
        { label: "Studio", active: false, href: "#studio" },
        { label: "About", active: false, href: "#about" },
        { label: "Journal", active: false, href: "#journal" },
        { label: "Reach Us", active: false, href: "#contact" },
      ]
    : [
        { label: "Home", active: true, href: "/" },
        { label: "Passbook", active: false, href: "/" },
        { label: "Diagnostic", active: false, href: "/diagnostic" },
        { label: "Gaps & DAG", active: false, href: "/gaps" },
        { label: "RAG & Viva", active: false, href: "/viva" },
        { label: "Mission Karmayogi", active: false, href: "/hub" },
      ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#FFFFFF] text-[#000000] font-inter antialiased selection:bg-black selection:text-white">
      {/* Background Video Layer (z-0) */}
      <div
        className="absolute z-0 w-full overflow-hidden pointer-events-none"
        style={{
          top: "300px",
          inset: "auto 0 0 0",
          height: "calc(100% - 300px)",
        }}
      >
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          playsInline
          muted
          autoPlay
          preload="auto"
          className="w-full h-full object-cover object-center transition-opacity duration-150"
          style={{
            opacity: videoOpacity,
          }}
        />

        {/* Gradient overlays: absolute inset-0 bg-gradient-to-b from-background via-transparent to-background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, #FFFFFF 0%, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0) 65%, #FFFFFF 100%)",
          }}
        />
      </div>

      {/* Floating Mode Toggle Pill for Review */}
      {allowToggle && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-black/90 backdrop-blur-md shadow-2xl border border-white/20 text-xs">
          <button
            type="button"
            onClick={() => setCurrentMode("aethera")}
            className={`px-3 py-1.5 rounded-full font-medium transition-all ${
              isAethera
                ? "bg-white text-black shadow-sm font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            Aethera® (Reference Spec)
          </button>
          <button
            type="button"
            onClick={() => setCurrentMode("skilllens")}
            className={`px-3 py-1.5 rounded-full font-medium transition-all ${
              !isAethera
                ? "bg-white text-black shadow-sm font-semibold"
                : "text-white/70 hover:text-white"
            }`}
          >
            SkillLens AI (Project Info)
          </button>
        </div>
      )}

      {/* Navigation Bar (z-10) */}
      <header className="relative z-10 w-full">
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <a
              href="/"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate("/");
                }
              }}
              className="text-3xl font-normal tracking-tight font-instrument text-[#000000] flex items-baseline select-none"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {isAethera ? (
                <>
                  Aethera<sup className="text-sm -top-2 ml-0.5 font-sans">®</sup>
                </>
              ) : (
                <>
                  SkillLens<sup className="text-sm -top-2 ml-0.5 font-sans">®</sup>
                  <span className="text-sm font-sans tracking-widest uppercase ml-2 text-[#6F6F6F] font-semibold">
                    AI
                  </span>
                </>
              )}
            </a>
          </div>

          {/* Menu Items */}
          <div className="hidden md:flex items-center space-x-9">
            {navMenuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  if (onNavigate && item.href.startsWith("/")) {
                    e.preventDefault();
                    onNavigate(item.href);
                  }
                }}
                className={`text-sm transition-colors duration-200 ${
                  item.active
                    ? "text-[#000000] font-medium"
                    : "text-[#6F6F6F] hover:text-[#000000]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Nav CTA Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCta}
              className="rounded-full px-6 py-2.5 text-sm font-medium bg-[#000000] text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-sm"
            >
              {isAethera ? "Begin Journey" : "Launch Passbook"}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section (z-10) */}
      <main
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{
          paddingTop: "calc(8rem - 75px)",
          paddingBottom: "10rem", // pb-40
        }}
      >
        {/* Headline */}
        <h1
          className="text-5xl sm:text-7xl md:text-8xl max-w-7xl font-normal text-[#000000] animate-fade-rise select-none"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            lineHeight: "0.95",
            letterSpacing: "-2.46px",
          }}
        >
          {isAethera ? (
            <>
              Beyond{" "}
              <span className="italic text-[#6F6F6F]">silence,</span> we build{" "}
              <span className="italic text-[#6F6F6F]">the eternal.</span>
            </>
          ) : (
            <>
              Beyond{" "}
              <span className="italic text-[#6F6F6F]">silence,</span> we shape{" "}
              <span className="italic text-[#6F6F6F]">the sovereign.</span>
            </>
          )}
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed text-[#6F6F6F] font-inter animate-fade-rise-delay">
          {isAethera
            ? "Building platforms for brilliant minds, fearless makers, and thoughtful souls. Through the noise, we craft digital havens for deep work and pure flows."
            : "Architecting verifiable competency diagnostics for India's National Statistical Cadre, Mission Karmayogi, and civil service leaders. Through verified evidence, we craft digital havens for deep mastery and sovereign governance."}
        </p>

        {/* Hero CTA Button */}
        <div className="animate-fade-rise-delay-2 mt-12">
          <button
            type="button"
            onClick={handleCta}
            className="rounded-full px-14 py-5 text-base font-medium bg-[#000000] text-[#FFFFFF] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-xl"
          >
            {isAethera ? "Begin Journey" : "Begin Journey — Explore Diagnostics"}
          </button>
        </div>

        {/* Secondary project badges if in SkillLens mode */}
        {!isAethera && (
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6F6F6F] animate-fade-rise-delay-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Mission Karmayogi FRAC Aligned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              MoSPI National Statistical Cadre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              BKT & Bayesian Knowledge Tracing
            </span>
          </div>
        )}
      </main>
    </div>
  );
};

export default CinematicHero;
