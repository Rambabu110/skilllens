import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const STATUS_CONFIG = {
  critical: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    accent: "bg-rose-500",
    label: "Critical Gap",
    icon: AlertCircle,
  },
  developing: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    accent: "bg-amber-500",
    label: "Developing",
    icon: Clock,
  },
  strength: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
    label: "Certified Strength",
    icon: CheckCircle2,
  },
};

export default function LedgerRow({ status, title, subtitle, right, children }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.developing;
  const StatusIcon = config.icon;

  return (
    <div className="group relative p-3.5 sm:p-4 bg-[#081020]/40 hover:bg-[#0d172e]/70 border-b border-white/[0.06] last:border-b-0 transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left indicator accent strip */}
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${config.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="pl-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
            {title}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${config.bg} ${config.text} ${config.border}`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-1">{children}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 pl-2.5 sm:pl-0 sm:shrink-0">
        {right}
      </div>
    </div>
  );
}
