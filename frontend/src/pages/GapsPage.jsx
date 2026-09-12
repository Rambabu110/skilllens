import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import LedgerRow from "../components/LedgerRow";
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  GitFork,
  Network,
  Info,
  Lock,
  LogIn,
} from "lucide-react";

export default function GapsPage() {
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const [gaps, setGaps] = useState([]);
  const [trajectories, setTrajectories] = useState({});
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      client.get("/gaps"),
      client.get("/gaps/trajectory"),
      client.get("/gaps/graph").catch(() => ({ data: { nodes: [], edges: [] } })),
    ])
      .then(([g, t, gr]) => {
        setGaps(g.data);
        const map = {};
        t.data.forEach((item) => {
          map[item.competency_id] = item.forecast;
        });
        setTrajectories(map);
        setGraphData(gr.data || { nodes: [], edges: [] });
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-teal-400/20 border-t-teal-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Calculating competency gaps & forecasting closure trajectories…
        </p>
      </div>
    );
  }

  const critical = gaps.filter((g) => g.status === "critical");
  const developing = gaps.filter((g) => g.status === "developing");
  const strength = gaps.filter((g) => g.status === "strength");

  const displayedGaps =
    activeTab === "critical"
      ? critical
      : activeTab === "developing"
      ? developing
      : activeTab === "strength"
      ? strength
      : gaps;

  // Layout calculation for Prerequisite Knowledge Graph DAG SVG
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];

  const depthGroups = {};
  nodes.forEach((n) => {
    const d = n.depth || 0;
    if (!depthGroups[d]) depthGroups[d] = [];
    depthGroups[d].push(n);
  });

  const sortedDepths = Object.keys(depthGroups)
    .map(Number)
    .sort((a, b) => a - b);

  const svgWidth = 840;
  const rowHeight = 130;
  const svgHeight = Math.max(280, (sortedDepths.length || 1) * rowHeight + 80);

  const nodePositions = {};
  sortedDepths.forEach((d, rowIndex) => {
    const rowNodes = depthGroups[d];
    const y = 60 + rowIndex * rowHeight;
    const colWidth = svgWidth / (rowNodes.length + 1);
    rowNodes.forEach((n, colIndex) => {
      const x = (colIndex + 1) * colWidth;
      nodePositions[n.id] = { x, y, node: n };
    });
  });

  const isGuest = !token;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight">
              Cadre Gap Diagnostics
            </h1>
            {!isGuest && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">
                {critical.length} Critical
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            FRAC-mandated requirements ranked by gap magnitude, paired with intelligent closure forecasts and root-cause analysis.
          </p>
        </div>

        <button
          onClick={() => navigate("/learn")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20 hover:brightness-110 transition-all self-start md:self-auto"
        >
          <BookOpen className="w-4 h-4" />
          <span>View Recommended Modules</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Guest Lock State */}
      {isGuest ? (
        <div className="space-y-6">
          {/* Sign-In Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-900/60 to-slate-900/40 border border-teal-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-400/15 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Personal Gap Analysis — Authentication Required</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in to view your real FRAC competency gaps, root-cause diagnostics, and closure forecasts.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20 hover:brightness-110 transition-all shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>

          {/* Preview placeholders */}
          <div className="rounded-2xl glass-panel p-6 space-y-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-teal-400" />
              <h3 className="font-display font-bold text-base text-white">Prerequisite Knowledge Graph & Root-Cause DAG</h3>
            </div>
            <div className="w-full h-48 rounded-xl bg-slate-900/50 border border-white/[0.05] flex items-center justify-center">
              <div className="text-center space-y-2">
                <Network className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500">Root-cause dependency graph loads after sign-in</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-8 text-center space-y-4 border border-white/[0.06]">
            <AlertTriangle className="w-10 h-10 text-amber-400/50 mx-auto" />
            <h3 className="font-semibold text-white">Your gap diagnostics will appear here</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              After signing in, this section will show your critical gaps, developing areas, and strengths with AI-powered closure trajectory forecasts and root-cause competency mapping.
            </p>
            <button
              onClick={() => openAuthModal()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-xs shadow-xl shadow-teal-500/20 hover:brightness-110 transition-all"
            >
              Sign In to View Your Diagnostics
            </button>
          </div>
        </div>
      ) : (
        /* Authenticated: full content */
        <>
          {/* Prerequisite Knowledge Graph & Root-Cause DAG Section */}
          {nodes.length > 0 && edges.length > 0 && (
            <div className="rounded-2xl glass-panel p-6 space-y-4 border border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-teal-400" />
                    <h3 className="font-display font-bold text-base text-white">
                      Prerequisite Knowledge Graph & Root-Cause DAG
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Directed graph tracing root deficiencies: mastering root prerequisite skills resolves dependent downstream deficits.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                    <span>Root Gap Node</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
                    <span>Downstream Gap</span>
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-xl bg-[#050A18]/70 border border-white/[0.05] p-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[700px] h-auto select-none"
                >
                  <defs>
                    <marker id="dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2dd4bf" />
                    </marker>
                    <filter id="root-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f43f5e" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {edges.map((e, idx) => {
                    const fromPos = nodePositions[e.from];
                    const toPos = nodePositions[e.to];
                    if (!fromPos || !toPos) return null;

                    const startX = fromPos.x;
                    const startY = fromPos.y + 24;
                    const endX = toPos.x;
                    const endY = toPos.y - 24;
                    const midY = (startY + endY) / 2;
                    const pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

                    return (
                      <g key={`edge-${idx}`}>
                        <path d={pathData} fill="none" stroke="#2dd4bf" strokeWidth="2" strokeOpacity="0.45" markerEnd="url(#dag-arrow)" />
                      </g>
                    );
                  })}

                  {Object.entries(nodePositions).map(([id, pos]) => {
                    const n = pos.node;
                    const isRoot = n.is_root || n.depth === 0;
                    const isSelected = selectedNodeId === id;

                    return (
                      <g key={`node-${id}`} transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer" onClick={() => setSelectedNodeId(isSelected ? null : id)}>
                        {isRoot && (
                          <circle r="32" className="animate-ping text-rose-500 fill-none stroke-rose-500/40" strokeWidth="2" />
                        )}
                        <rect
                          x="-95" y="-22" width="190" height="44" rx="12"
                          className={`transition-all duration-300 ${isRoot ? "fill-rose-950/80 stroke-rose-500 stroke-2" : "fill-slate-900/90 stroke-teal-500/40 stroke-1"} ${isSelected ? "stroke-teal-300 stroke-2" : ""}`}
                          filter={isRoot ? "url(#root-glow)" : undefined}
                        />
                        <text x="0" y="-4" textAnchor="middle" className="fill-white text-[11px] font-semibold tracking-tight pointer-events-none">
                          {n.name.length > 24 ? n.name.slice(0, 22) + "…" : n.name}
                        </text>
                        <text x="0" y="12" textAnchor="middle" className={`text-[9.5px] font-mono pointer-events-none ${isRoot ? "fill-rose-300 font-bold" : "fill-teal-300"}`}>
                          {isRoot ? "★ ROOT DEFICIT" : `Depth ${n.depth} · Gap -${n.gap_size.toFixed(1)}`}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
            {[
              { id: "all", label: "All Competencies", count: gaps.length },
              { id: "critical", label: "Critical Gaps", count: critical.length, color: "text-rose-400" },
              { id: "developing", label: "Developing", count: developing.length, color: "text-amber-400" },
              { id: "strength", label: "Strengths", count: strength.length, color: "text-emerald-400" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/[0.08] text-white border border-white/10 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                }`}
              >
                <span className={tab.color || "text-slate-300"}>{tab.label}</span>
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-400">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Trajectory Spotlight Banner */}
          {critical.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-slate-900/50 to-slate-900/40 border border-rose-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Immediate Remediation Recommended</p>
                  <p className="text-xs text-rose-200/80 mt-0.5 max-w-xl">
                    {critical[0].competency_name} presents a gap of {critical[0].gap_size.toFixed(1)} levels against your official position requirement.
                    {critical[0].root_gap_competency && (
                      <span className="block mt-1 text-amber-300 font-medium">
                        Root Cause: Address {critical[0].root_gap_competency} first.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/learn")}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors shrink-0"
              >
                Start Remediation
              </button>
            </div>
          )}

          {/* Gaps List */}
          <div className="rounded-2xl glass-panel overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {displayedGaps.map((g) => {
                const forecast = trajectories[g.competency_id];
                return (
                  <LedgerRow
                    key={g.competency_id}
                    status={g.status}
                    title={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <span>{g.competency_name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${g.gap_type === "Deep Gap" ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]" : "bg-sky-500/15 text-sky-300 border-sky-500/30"}`}>
                          {g.gap_type || "Shallow Gap"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300 border border-white/10 font-mono">
                          BKT: {Math.round((g.mastery_probability ?? 0.3) * 100)}%
                        </span>
                        {g.root_gap_competency && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                            <GitFork className="w-3 h-3 text-amber-400" />
                            Root Cause: {g.root_gap_competency} (Depth {g.depth})
                          </span>
                        )}
                      </span>
                    }
                    subtitle={`${g.competency_type} competency · Role Gap: ${g.gap_size.toFixed(1)} level deficit`}
                    right={
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-white">
                            {g.current_level.toFixed(1)}{" "}
                            <span className="text-slate-400 font-normal">/ {g.required_level}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">Current / Target</p>
                        </div>
                        <button
                          onClick={() => navigate("/learn")}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-teal-400/15 hover:border-teal-400/40 text-slate-300 hover:text-teal-300 border border-white/10 text-xs font-medium transition-all"
                        >
                          Remediate
                        </button>
                      </div>
                    }
                  >
                    {forecast && forecast.estimable && forecast.trend === "improving" && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium mt-1">
                        <Clock className="w-3 h-3" />
                        <span>~{forecast.estimated_weeks_to_close_gap} week{forecast.estimated_weeks_to_close_gap > 1 ? "s" : ""} to close at current assessment pace</span>
                      </div>
                    )}
                    {forecast && !forecast.estimable && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        <span>{forecast.reason}</span>
                      </p>
                    )}
                  </LedgerRow>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
