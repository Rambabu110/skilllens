import { motion } from "framer-motion";
import { BrainCircuit, Sparkles, Award } from "lucide-react";

export default function PlatformSection() {
  const cards = [
    {
      icon: BrainCircuit,
      title: "Explainable ML Gap Engine",
      description:
        "Trained on 28,785 learners with game-theoretic SHAP attributions, diagnosing current vs required FRAC proficiency levels automatically.",
    },
    {
      icon: Sparkles,
      title: "Automated Diagnostic Quizzes",
      description:
        "Zero-shot competency auto-tagging and dynamic LLM quiz generation in English & Hindi from official MoSPI survey manuals.",
    },
    {
      icon: Award,
      title: "Verifiable Competency Passbook",
      description:
        "A dual-verification engine where supervisors and training institutes endorse officers, stored securely as tamper-proof credentials.",
    },
  ];

  return (
    <motion.section
      id="solution"
      initial={{ opacity: 0, y: 80, scale: 0.85 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: false, margin: "-100px" }}
      className="w-full bg-[#070319] border-y border-white/5 py-14 sm:py-24 md:py-36"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-10 sm:mb-16">
          Powered by Deep Tech
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            const IconComp = card.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-black/40 border border-white/10 hover:border-[#A068FF]/40 transition-colors group hover:-translate-y-2 duration-300 flex flex-col"
              >
                <IconComp className="w-10 h-10 text-[#A068FF] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-urbanist text-lg font-bold text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
