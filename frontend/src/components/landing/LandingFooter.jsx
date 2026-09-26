import { ShieldCheck, Network, CodeXml, Sparkles } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060218] py-12 px-6 relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center shadow-[0_0_15px_rgba(160,104,255,0.2)]">
            <ShieldCheck className="w-4 h-4 text-[#A068FF]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-urbanist font-bold text-base text-white tracking-tight">
              SkillLens <span className="text-[#C084FC]">AI</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 font-semibold">
              FRAC Engine
            </span>
          </div>
        </div>

        {/* Attractive Hackathon & Team Credit Line */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
            <span>Built by <strong className="text-white font-bold tracking-wide">Team Zero Day Nextron</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A068FF]/15 border border-[#A068FF]/35 text-xs text-[#C084FC] font-semibold shadow-[0_0_15px_rgba(160,104,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-[#A068FF]" />
            <span>Smart India Hackathon 2026 Prototype</span>
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-slate-300 border border-white/10">
              SIH26101
            </span>
          </div>
        </div>

        {/* Institutional Affiliation & Fast Links */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden lg:inline font-mono">
            MoSPI NSS Cadre
          </span>
          <div className="flex gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Statistical Data Graph (Zero Day Nextron)"
              className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:border-[#A068FF]/40 transition-colors"
            >
              <Network className="w-4 h-4" />
            </a>
            <a
              href="/docs"
              title="SkillLens FRAC Architecture Documentation"
              className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:border-[#A068FF]/40 transition-colors"
            >
              <CodeXml className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
