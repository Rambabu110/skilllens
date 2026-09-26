import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export default function ProblemSection() {
  return (
    <motion.section
      id="problem"
      initial={{ opacity: 0, y: 80, scale: 0.85 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: false, margin: "-100px" }}
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 md:py-36 border-t border-white/5 relative"
    >
      <div className="text-center mb-10 sm:mb-16">
        <h2 className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
          The Statistical Cadre Capacity Crisis
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg">
          Over 62% of field statistical officers report subjective skill mapping. Traditional bureaucratic training is uncalibrated.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Panel - The Old Way (Broken) */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/50 border border-red-500/10 hover:border-red-500/30 transition-colors">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            <h3 className="font-urbanist text-lg sm:text-xl font-bold text-slate-300">
              The Old Way (Broken)
            </h3>
          </div>
          <ul className="space-y-4 sm:space-y-5 text-sm sm:text-base">
            <li className="flex items-start gap-3 text-slate-400">
              <span className="text-red-400 mt-0.5 select-none">❌</span>
              <div>
                <strong className="text-slate-200">Subjective Paper Appraisals:</strong>{" "}
                Self-reported competencies without empirical, telemetry-backed measurement.
              </div>
            </li>
            <li className="flex items-start gap-3 text-slate-400">
              <span className="text-red-400 mt-0.5 select-none">❌</span>
              <div>
                <strong className="text-slate-200">Sluggish TNA Cycles:</strong>{" "}
                Manual Training Needs Analysis takes 6-12 months, delaying critical survey preparedness.
              </div>
            </li>
            <li className="flex items-start gap-3 text-slate-400">
              <span className="text-red-400 mt-0.5 select-none">❌</span>
              <div>
                <strong className="text-slate-200">Uncalibrated Deployment:</strong>{" "}
                Junior officers assigned to complex survey data pipelines without objective gap diagnostics.
              </div>
            </li>
          </ul>
        </div>

        {/* Right Panel - The SkillLens Way */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#A068FF]/10 to-transparent border border-[#A068FF]/20 relative overflow-hidden group hover:border-[#A068FF]/50 transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#A068FF]/10 blur-[100px] rounded-full group-hover:bg-[#A068FF]/20 transition-colors pointer-events-none" />
          <div className="flex items-center gap-3 mb-5 sm:mb-6 relative z-10">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#A068FF]" />
            <h3 className="font-urbanist text-lg sm:text-xl font-bold text-white">
              The SkillLens AI Way
            </h3>
          </div>
          <ul className="space-y-4 sm:space-y-5 text-sm sm:text-base relative z-10">
            <li className="flex items-start gap-3 text-slate-300">
              <span className="text-[#A068FF] mt-1 select-none">✅</span>
              <div>
                <strong className="text-white">FRAC Competency Architecture:</strong>{" "}
                Granular Role, Activity & Competency mapping mirroring Mission Karmayogi.
              </div>
            </li>
            <li className="flex items-start gap-3 text-slate-300">
              <span className="text-[#A068FF] mt-1 select-none">✅</span>
              <div>
                <strong className="text-white">Explainable AI Diagnostics:</strong>{" "}
                SHAP-backed ML models pinpoint exactly which behavioral factors drive competency gaps.
              </div>
            </li>
            <li className="flex items-start gap-3 text-slate-300">
              <span className="text-[#A068FF] mt-1 select-none">✅</span>
              <div>
                <strong className="text-white">Tamper-Proof Passbook:</strong>{" "}
                Cryptographic, verifiable competency credentials for cadre deployment and promotions.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
