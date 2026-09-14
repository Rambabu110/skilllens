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
    <div className="space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              Cadre Gap Diagnostics
            </h1>
            {!isGuest && (
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25 text-[10px] font-mono font-semibold uppercase tracking-wider num-tabular">
                {critical.length} Critical
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Competency differentials ranked by cadre criticality, paired with root-cause DAG traversal and Bayesian closure forecasts.
          </p>
        </div>

        <button
          onClick={() => navigate("/learn")}
          className="btn-primary text-xs py-1.5 px-3 self-start md:self-auto gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Recommended Modules</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Guest Lock State */}
      {isGuest ? (
        <div className="space-y-5">
          {/* Sign-In Notice */}
          <div className="p-4 rounded-lg bg-[#0c1629] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Cadre Authentication Required</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sign in with Karmayogi credentials to trace your root-cause skill deficits and forecasted closure timelines.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal()}
              className="btn-primary text-xs py-1.5 px-3 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>

          {/* Preview Placeholder */}
          <div className="sovereign-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Network className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-semibold text-sm text-white">Prerequisite Knowledge Graph (DAG)</h3>
            </div>
            <div className="w-full h-44 rounded-lg sovereign-well flex items-center justify-center">
              <div className="text-center space-y-1.5">
                <Network className="w-7 h-7 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Root-cause dependency network compiles upon cadre authentication</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated: full content */
        <>
          {/* Prerequisite Knowledge Graph & Root-Cause DAG Section */}
          {nodes.length > 0 && edges.length > 0 && (
            <div className="sovereign-card p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-display font-bold text-sm text-white">
                      Prerequisite Knowledge Graph & Root-Cause DAG
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Directed acyclic graph resolving root bottlenecks: closing prerequisite skills remediates downstream deficits.
                  </p>
                </div>
                <div className="flex items-center gap-3.5 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Root Deficit</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Downstream</span>
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto touch-pan-x rounded-lg sovereign-well p-3">
                <div className="flex sm:hidden items-center justify-between px-2 py-1 mb-2 text-[10px] text-slate-300 bg-white/[0.04] rounded border border-white/10 font-mono">
                  <span>← Swipe horizontally to inspect DAG nodes →</span>
                </div>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[700px] h-auto select-none"
                >
                  <defs>
                    <marker id="dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                    </marker>
                  </defs>

                  {edges.map((e, idx) => {
                    const fromPos = nodePositions[e.from];
                    const toPos = nodePositions[e.to];
                    if (!fromPos || !toPos) return null;

                    const startX = fromPos.x;
                    const startY = fromPos.y + 22;
                    const endX = toPos.x;
                    const endY = toPos.y - 22;
                    const midY = (startY + endY) / 2;
                    const pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

                    return (
                      <g key={`edge-${idx}`}>
                        <path d={pathData} fill="none" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.5" markerEnd="url(#dag-arrow)" />
                      </g>
                    );
                  })}

                  {Object.entries(nodePositions).map(([id, pos]) => {
                    const n = pos.node;
                    const isRoot = n.is_root || n.depth === 0;
                    const isSelected = selectedNodeId === id;

                    return (
                      <g key={`node-${id}`} transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer" onClick={() => setSelectedNodeId(isSelected ? null : id)}>
                        <rect
                          x="-95" y="-20" width="190" height="40" rx="6"
                          className={`transition-colors duration-150 ${
                            isRoot
                              ? "fill-[#240b15] stroke-rose-500 stroke-1"
                              : "fill-[#0c1629] stroke-white/[0.12] stroke-1"
                          } ${isSelected ? "stroke-emerald-400 stroke-2" : ""}`}
                        />
                        <text x="0" y="-3" textAnchor="middle" className="fill-white text-[11px] font-medium tracking-tight pointer-events-none font-sans">
                          {n.name.length > 24 ? n.name.slice(0, 22) + "…" : n.name}
                        </text>
                        <text x="0" y="12" textAnchor="middle" className={`text-[9.5px] font-mono pointer-events-none num-tabular ${isRoot ? "fill-rose-300 font-bold" : "fill-slate-400"}`}>
                          {isRoot ? "★ ROOT PREREQUISITE" : `Depth ${n.depth} · Gap -${n.gap_size.toFixed(1)}`}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
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
                <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/10 text-slate-300 num-tabular">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Trajectory Spotlight Banner */}
          {critical.length > 0 && (
            <div className="p-4 rounded-lg bg-[#1f0b14] border border-rose-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Targeted Remediation Required</p>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-xl leading-relaxed">
                    <span className="font-semibold text-white">{critical[0].competency_name}</span> exhibits a deficiency of {critical[0].gap_size.toFixed(1)} levels against the FRAC baseline.
                    {critical[0].root_gap_competency && (
                      <span className="block mt-1 text-amber-300 font-medium text-[11px]">
                        Root Prerequisite: Resolve <span className="underline underline-offset-2">{critical[0].root_gap_competency}</span> first.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/learn")}
                className="btn-primary text-xs py-1.5 px-3 shrink-0"
              >
                Launch Coursework
              </button>
            </div>
          )}

          {/* Gaps List */}
          <div className="sovereign-card overflow-hidden">
            <div className="divide-y divide-white/[0.05]">
              {displayedGaps.map((g) => {
                const forecast = trajectories[g.competency_id];
                return (
                  <LedgerRow
                    key={g.competency_id}
                    status={g.status}
                    title={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <span className="text-slate-200 font-medium">{g.competency_name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${g.gap_type === "Deep Gap" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-sky-500/10 text-sky-300 border-sky-500/20"}`}>
                          {g.gap_type || "Shallow Gap"}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#070d18] text-[10px] text-slate-300 border border-white/10 font-mono num-tabular">
                          BKT: {Math.round((g.mastery_probability ?? 0.3) * 100)}%
                        </span>
                        {g.root_gap_competency && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[10px] font-medium flex items-center gap-1 font-mono">
                            <GitFork className="w-3 h-3 text-amber-400" />
                            Root: {g.root_gap_competency} (d={g.depth})
                          </span>
                        )}
                      </span>
                    }
                    subtitle={`${g.competency_type} competency · Gap: ${g.gap_size.toFixed(1)} level deficit`}
                    right={
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-white num-tabular">
                            {g.current_level.toFixed(1)}{" "}
                            <span className="text-slate-400 font-normal">/ {g.required_level}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">Current / Target</p>
                        </div>
                        <button
                          onClick={() => navigate("/learn")}
                          className="btn-secondary text-[11px] py-1 px-2.5"
                        >
                          Remediate
                        </button>
                      </div>
                    }
                  >
                    {forecast && forecast.estimable && forecast.trend === "improving" && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono mt-1">
                        <Clock className="w-3 h-3" />
                        <span>~{forecast.estimated_weeks_to_close_gap} week{forecast.estimated_weeks_to_close_gap > 1 ? "s" : ""} to target at current assessment rate</span>
                      </div>
                    )}
                    {forecast && !forecast.estimable && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
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
