// 5 Institutional Ecosystem Partner Badges
function MoSPILogo() {
  return (
    <div className="flex items-center gap-2 h-[40px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50 hover:opacity-100 transition-opacity select-none">
      <svg className="w-6 h-6 text-[#A068FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l9 8H3l9-8z" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-urbanist font-bold text-xs tracking-wider text-white">MoSPI</span>
        <span className="text-[9px] text-slate-400 font-medium">Govt. of India</span>
      </div>
    </div>
  );
}

function IGOTLogo() {
  return (
    <div className="flex items-center gap-2 h-[40px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50 hover:opacity-100 transition-opacity select-none">
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-urbanist font-bold text-xs tracking-wider text-white">iGOT Karmayogi</span>
        <span className="text-[9px] text-slate-400 font-medium">FRAC Framework</span>
      </div>
    </div>
  );
}

function NSCLogo() {
  return (
    <div className="flex items-center gap-2 h-[40px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50 hover:opacity-100 transition-opacity select-none">
      <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-urbanist font-bold text-xs tracking-wider text-white">National Statistical</span>
        <span className="text-[9px] text-slate-400 font-medium">Commission (NSC)</span>
      </div>
    </div>
  );
}

function SIHLogo() {
  return (
    <div className="flex items-center gap-2 h-[40px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50 hover:opacity-100 transition-opacity select-none">
      <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-urbanist font-bold text-xs tracking-wider text-white">SIH 2026</span>
        <span className="text-[9px] text-slate-400 font-medium">Problem SIH26101</span>
      </div>
    </div>
  );
}

function CBCLogo() {
  return (
    <div className="flex items-center gap-2 h-[40px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50 hover:opacity-100 transition-opacity select-none">
      <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-urbanist font-bold text-xs tracking-wider text-white">Capacity Building</span>
        <span className="text-[9px] text-slate-400 font-medium">Commission (CBC)</span>
      </div>
    </div>
  );
}

export default function LogoMarquee() {
  // 5 unique partners repeated 4 times = 20 items for seamless infinite scroll
  const partners = [
    { key: "mospi", component: MoSPILogo },
    { key: "igot", component: IGOTLogo },
    { key: "nsc", component: NSCLogo },
    { key: "sih", component: SIHLogo },
    { key: "cbc", component: CBCLogo },
  ];

  const repeatedList = [
    ...partners,
    ...partners,
    ...partners,
    ...partners,
  ];

  return (
    <div
      className="w-full overflow-hidden py-10 mt-auto fade-up relative z-10"
      style={{
        animationDelay: "0.6s",
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div className="flex gap-[64px] w-max animate-[scroll-ticker_20s_linear_infinite] hover:[animation-play-state:paused]">
        {repeatedList.map((item, idx) => {
          const Comp = item.component;
          return <Comp key={`${item.key}-${idx}`} />;
        })}
      </div>
    </div>
  );
}
