import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const STATUS_CONFIG = {
  critical: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    accent: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    label: "Critical Gap",
    icon: AlertCircle,
  },
  developing: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    accent: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    label: "Developing",
    icon: Clock,
  },
  strength: {
    bg: "bg-[#A068FF]/15",
    text: "text-[#C084FC]",
    border: "border-[#A068FF]/30",
    accent: "bg-[#A068FF] shadow-[0_0_8px_rgba(160,104,255,0.7)]",
    label: "Certified Strength",
    icon: CheckCircle2,
  },
};

export default function LedgerRow({ status, title, subtitle, right, children }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.developing;
  const StatusIcon = config.icon;

  return (
    <div className="group relative p-4 sm:p-5 bg-white/[0.015] hover:bg-white/[0.04] border-b border-white/[0.06] last:border-b-0 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left indicator accent strip */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${config.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="pl-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <p className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-white transition-colors">
            {title}
          </p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${config.bg} ${config.text} ${config.border}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {config.label}
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-1.5">{children}</div>}
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-3 sm:pl-0 w-full sm:w-auto sm:shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
        {right}
      </div>
    </div>
  );
}
