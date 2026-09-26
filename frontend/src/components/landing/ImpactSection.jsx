import { motion } from "framer-motion";

export default function ImpactSection() {
  const cards = [
    {
      title: "For Statistical Officers",
      tag: "Junior & Subordinate Officers (JSO/SSO)",
      gradient: "from-blue-400 to-blue-600",
      hoverBorder: "hover:border-blue-500/50",
      bullets: [
        { lead: "Clear Career Pathways:", text: "Transparent view of competency requirements for next-level cadre postings." },
        { lead: "Targeted Remediation:", text: "AI micro-learning recommendations tailored to exact diagnostic gap scores." },
        { lead: "Verifiable Credentials:", text: "Portable digital passbook showcasing validated field and analytical skills." },
      ],
    },
    {
      title: "For Training Institutes",
      tag: "NSSTA & Capacity Cells",
      gradient: "from-emerald-400 to-emerald-600",
      hoverBorder: "hover:border-emerald-500/50",
      bullets: [
        { lead: "Real-Time Cohort Heatmaps:", text: "Instant department and role-wide visibility into aggregate skill deficits." },
        { lead: "Automated TNA:", text: "Eliminate manual survey gap assessments with continuous telemetry." },
        { lead: "Aligned with CBC Mandates:", text: "Directly fulfills Capacity Building Commission and Karmayogi targets." },
      ],
    },
    {
      title: "For National Governance",
      tag: "MoSPI & National Statistical Commission",
      gradient: "from-orange-400 to-red-600",
      hoverBorder: "hover:border-orange-500/50",
      bullets: [
        { lead: "Flawless Field Surveys:", text: "Deploy certified enumerators to complex national statistical rounds." },
        { lead: "Objective Cadre Placement:", text: "Match officers to statistical wings based on proven competency scores." },
        { lead: "Evidence-Based Governance:", text: "High-integrity official statistics driven by continuously upskilled talent." },
      ],
    },
  ];

  return (
    <motion.section
      id="impact"
      initial={{ opacity: 0, y: 80, scale: 0.85 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: false, margin: "-100px" }}
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 md:py-36"
    >
      <h2 className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-3 sm:mb-4">
        Value for the Ecosystem
      </h2>
      <p className="text-slate-400 text-center max-w-2xl mx-auto mb-10 sm:mb-16 text-sm sm:text-base md:text-lg">
        Empowering officers, administration, and national policy through objective competency benchmarks.
      </p>

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900 border border-white/5 relative overflow-hidden group ${card.hoverBorder} transition-colors duration-300 flex flex-col`}
          >
            {/* Top accent gradient bar */}
            <div
              className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.gradient}`}
            />
            <h3 className="font-urbanist text-xl font-bold text-white mb-2">
              {card.title}
            </h3>
            <p className="text-slate-400 mb-6 text-sm font-medium">{card.tag}</p>

            <ul className="space-y-4 text-sm text-slate-300 mt-auto">
              {card.bullets.map((b, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-400 select-none">•</span>
                  <div>
                    <strong className="text-white">{b.lead}</strong> {b.text}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
