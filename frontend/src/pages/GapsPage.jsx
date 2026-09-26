import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Lock,
  LogIn,
  Zap,
  Mic,
  CheckCircle2,
  TrendingUp,
  Layers,
  HelpCircle,
} from "lucide-react";
import { GlowBorderCard } from "../components/ui/glow-border-card";

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
        const graph = gr.data || { nodes: [], edges: [] };
        setGraphData(graph);
        if (graph.nodes && graph.nodes.length > 0) {
          const rootOrCrit =
            graph.nodes.find((n) => n.is_root || n.depth === 0 || n.status === "critical") ||
            graph.nodes[0];
          setSelectedNodeId((prev) => prev || rootOrCrit.id);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#A068FF]/20 border-t-[#A068FF] animate-spin" />
        <p className="text-sm font-medium text-slate-300">
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

  // In-degree & Out-degree metrics for dependency analysis
  const inDegree = {};
  const outDegree = {};
  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
  });
  edges.forEach((e) => {
    if (outDegree[e.from] !== undefined) outDegree[e.from]++;
    if (inDegree[e.to] !== undefined) inDegree[e.to]++;
  });

  // Calculate topological tier/layer
  const layerMap = {};
  nodes.forEach((n) => {
    let layer = 0;
    if (typeof n.depth === "number" && n.depth > 0) {
      layer = n.depth;
    } else if (inDegree[n.id] === 0 && outDegree[n.id] > 0) {
      layer = 0; // Root prerequisite
    } else if (inDegree[n.id] > 0 && outDegree[n.id] > 0) {
      layer = 1; // Core functional intermediate
    } else if (inDegree[n.id] > 0 && outDegree[n.id] === 0) {
      layer = 2; // Downstream leaf
    } else {
      // Standalone node: place in layer 0 if critical/root, else layer 1
      layer = n.is_root || n.status === "critical" ? 0 : 1;
    }
    if (!layerMap[layer]) layerMap[layer] = [];
    layerMap[layer].push(n);
  });

  // Balance into visual rows (maximum 3 nodes per row to ensure cards NEVER crowd or touch)
  const visualRows = [];
  const sortedLayerKeys = Object.keys(layerMap).map(Number).sort((a, b) => a - b);
  sortedLayerKeys.forEach((key) => {
    const rowNodes = layerMap[key];
    if (rowNodes.length > 3) {
      for (let i = 0; i < rowNodes.length; i += 3) {
        visualRows.push(rowNodes.slice(i, i + 3));
      }
    } else {
      visualRows.push(rowNodes);
    }
  });

  // SVG grid sizing & node coordinates
  const cardW = 250;
  const cardH = 72;
  const colSpacing = 310; // 60px guaranteed clean horizontal gutter between cards
  const rowSpacing = 145; // 73px vertical clearance for smooth bezier flow
  const maxCols = Math.max(1, ...visualRows.map((r) => r.length));
  const svgWidth = Math.max(1040, maxCols * colSpacing + 120);
  const svgHeight = Math.max(340, visualRows.length * rowSpacing + 90);

  const nodePositions = {};
  visualRows.forEach((row, rowIndex) => {
    const y = 65 + rowIndex * rowSpacing;
    const rowWidth = (row.length - 1) * colSpacing;
    const startX = (svgWidth - rowWidth) / 2;
    row.forEach((n, colIndex) => {
      const x = startX + colIndex * colSpacing;
      nodePositions[n.id] = { x, y, node: n };
    });
  });

  // Selected node inspection dossier data
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const rootCount = nodes.filter((n) => n.is_root || n.depth === 0 || inDegree[n.id] === 0).length;
  const downstreamCount = Math.max(0, nodes.length - rootCount);

  const isGuest = !token;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-16"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-urbanist font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Cadre Gap Diagnostics
            </h1>
            {!isGuest && (
              <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-urbanist font-bold uppercase tracking-wider num-tabular">
                {critical.length} Critical
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Competency differentials ranked by cadre criticality, paired with root-cause DAG traversal and Bayesian closure forecasts.
          </p>
        </div>

        <button
          onClick={() => navigate("/learn")}
          className="btn-primary text-xs sm:text-sm py-2.5 px-5 self-start md:self-auto gap-2 shadow-[0_0_20px_rgba(160,104,255,0.4)]"
        >
          <BookOpen className="w-4 h-4" />
          <span>Recommended Modules</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Guest Lock State */}
      {isGuest ? (
        <div className="space-y-6">
          {/* Sign-In Notice */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#A068FF]/15 via-[#0d0522]/80 to-black/60 border border-[#A068FF]/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_8px_30px_rgba(160,104,255,0.12)]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#A068FF]/20 border border-[#A068FF]/40 flex items-center justify-center text-[#C084FC] shrink-0 shadow-[0_0_15px_rgba(160,104,255,0.25)]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-urbanist font-bold text-white">Cadre Authentication Required</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Sign in with Karmayogi credentials to trace your root-cause skill deficits and forecasted closure timelines.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal()}
              className="btn-primary text-xs sm:text-sm py-2.5 px-5 shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>

          {/* Preview Placeholder */}
          <div className="sovereign-card p-7 space-y-4 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center gap-2.5 mb-1">
              <Network className="w-5 h-5 text-[#A068FF]" />
              <h3 className="font-urbanist font-bold text-base text-white">Prerequisite Knowledge Graph (DAG)</h3>
            </div>
            <div className="w-full h-48 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Network className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs sm:text-sm text-slate-400">Root-cause dependency network compiles upon cadre authentication</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated: full content */
        <>
          {/* Prerequisite Knowledge Graph & Root-Cause DAG Section */}
          {nodes.length > 0 && (
            <div className="sovereign-card p-6 sm:p-7 space-y-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
              {/* Top Section Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF] shadow-[0_0_12px_rgba(160,104,255,0.2)]">
                      <Network className="w-4 h-4" />
                    </div>
                    <h3 className="font-urbanist font-bold text-base sm:text-lg text-white">
                      Prerequisite Knowledge Graph & Root-Cause DAG
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Directed acyclic graph resolving root bottlenecks: closing prerequisite skills remediates downstream deficits.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#F43F5E]" />
                    <span className="font-semibold">Root Bottleneck</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[#C084FC]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                    <span className="font-semibold">Downstream</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                    <span className="font-semibold">Benchmark Met</span>
                  </span>
                </div>
              </div>

              {/* DAG Intelligence Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-rose-500/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Root Bottlenecks
                    </span>
                    <span className="font-urbanist font-bold text-sm text-white num-tabular">
                      {rootCount} Primary Deficits
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-[#A068FF]/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#C084FC] shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Downstream Deficits
                    </span>
                    <span className="font-urbanist font-bold text-sm text-white num-tabular">
                      {downstreamCount} Blocked Skills
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-amber-500/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Remediation Speedup
                    </span>
                    <span className="font-urbanist font-bold text-sm text-amber-300 num-tabular">
                      2.8x Faster Closure
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Graph Engine
                    </span>
                    <span className="font-urbanist font-bold text-sm text-emerald-300 truncate block max-w-[130px]">
                      MoSPI FRAC DAG
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Guidance Hint */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#A068FF]" />
                  <span>Click any competency node to inspect root causes, mastery estimates &amp; direct actions</span>
                </span>
                <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
                  ← Horizontal pan supported →
                </span>
              </div>

              {/* Main SVG Container with guaranteed non-overlapping dimensions */}
              <div className="w-full overflow-x-auto touch-pan-x rounded-xl bg-black/40 border border-white/10 p-5 shadow-inner">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[960px] h-auto select-none"
                >
                  <defs>
                    <linearGradient id="dag-root-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#250917" />
                      <stop offset="100%" stopColor="#12040c" />
                    </linearGradient>
                    <linearGradient id="dag-downstream-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#180b33" />
                      <stop offset="100%" stopColor="#0a0418" />
                    </linearGradient>
                    <linearGradient id="dag-strength-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#08241b" />
                      <stop offset="100%" stopColor="#03120d" />
                    </linearGradient>
                    <linearGradient id="dag-edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F43F5E" />
                      <stop offset="100%" stopColor="#A068FF" />
                    </linearGradient>
                    <marker
                      id="dag-arrow"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#A068FF" />
                    </marker>
                  </defs>

                  {/* Connecting Bézier Edges */}
                  {edges.map((e, idx) => {
                    const fromPos = nodePositions[e.from];
                    const toPos = nodePositions[e.to];
                    if (!fromPos || !toPos) return null;

                    const startX = fromPos.x;
                    const startY = fromPos.y + 36;
                    const endX = toPos.x;
                    const endY = toPos.y - 36;
                    const midY = (startY + endY) / 2;
                    const pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

                    return (
                      <g key={`edge-${idx}`}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke="url(#dag-edge-grad)"
                          strokeWidth="2"
                          strokeOpacity="0.75"
                          strokeDasharray="5 3"
                          markerEnd="url(#dag-arrow)"
                        />
                      </g>
                    );
                  })}

                  {/* Structured Attractive Node Cards */}
                  {Object.entries(nodePositions).map(([id, pos]) => {
                    const n = pos.node;
                    const isRoot = n.is_root || n.depth === 0 || inDegree[id] === 0;
                    const isStrength = n.status === "strength" || n.gap_size < 0.5;
                    const isSelected = selectedNodeId === id;

                    const cardFill = isStrength
                      ? "url(#dag-strength-bg)"
                      : isRoot
                      ? "url(#dag-root-bg)"
                      : "url(#dag-downstream-bg)";

                    const strokeColor = isSelected
                      ? "#C084FC"
                      : isStrength
                      ? "#10B981"
                      : isRoot
                      ? "#F43F5E"
                      : "#A068FF";

                    const strokeWidth = isSelected ? 2.5 : 1.2;
                    const reqLevel = n.required_level || 3;
                    const curLevel = n.current_level || 1;
                    const progressRatio = Math.min(1, Math.max(0.05, curLevel / reqLevel));
                    const barWidth = 216 * progressRatio;

                    return (
                      <g
                        key={`node-${id}`}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer group"
                        onClick={() => setSelectedNodeId(id)}
                      >
                        {/* Outer Selection Glow Halo */}
                        {isSelected && (
                          <rect
                            x="-128"
                            y="-40"
                            width="256"
                            height="80"
                            rx="18"
                            fill="none"
                            stroke="#A068FF"
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                            opacity="0.7"
                          />
                        )}

                        {/* Main Card */}
                        <rect
                          x="-125"
                          y="-36"
                          width="250"
                          height="72"
                          rx="14"
                          fill={cardFill}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          className="transition-all duration-300 filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] group-hover:brightness-125"
                        />

                        {/* Badge Pill Left */}
                        <rect
                          x="-113"
                          y="-28"
                          width={isRoot ? 112 : 98}
                          height="18"
                          rx="5"
                          fill={
                            isRoot
                              ? "rgba(244,63,94,0.18)"
                              : isStrength
                              ? "rgba(16,185,129,0.18)"
                              : "rgba(160,104,255,0.18)"
                          }
                          stroke={
                            isRoot
                              ? "rgba(244,63,94,0.4)"
                              : isStrength
                              ? "rgba(16,185,129,0.4)"
                              : "rgba(160,104,255,0.4)"
                          }
                          strokeWidth="0.75"
                        />
                        <text
                          x={isRoot ? -57 : -64}
                          y="-15"
                          textAnchor="middle"
                          className={`text-[9.5px] font-mono font-bold tracking-wider pointer-events-none ${
                            isRoot ? "fill-rose-300" : isStrength ? "fill-emerald-300" : "fill-[#C084FC]"
                          }`}
                        >
                          {isRoot ? "★ ROOT BOTTLENECK" : isStrength ? "✓ BENCHMARK MET" : "↓ DOWNSTREAM"}
                        </text>

                        {/* Gap Pill Right */}
                        <rect
                          x="45"
                          y="-28"
                          width="68"
                          height="18"
                          rx="5"
                          fill="rgba(255,255,255,0.05)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="0.75"
                        />
                        <text
                          x="79"
                          y="-15"
                          textAnchor="middle"
                          className="fill-slate-200 text-[9.5px] font-mono font-semibold pointer-events-none"
                        >
                          {isStrength ? "+0.0 Met" : `-${(n.gap_size || 1).toFixed(1)} Gap`}
                        </text>

                        {/* Node Competency Title */}
                        <text
                          x="-113"
                          y="8"
                          className="fill-white text-[12.5px] font-urbanist font-bold tracking-tight pointer-events-none"
                        >
                          {n.name.length > 25 ? n.name.slice(0, 24) + "…" : n.name}
                        </text>

                        {/* Progress Track */}
                        <rect
                          x="-113"
                          y="18"
                          width="226"
                          height="4"
                          rx="2"
                          fill="rgba(255,255,255,0.08)"
                        />
                        {/* Progress Fill */}
                        <rect
                          x="-113"
                          y="18"
                          width={barWidth}
                          height="4"
                          rx="2"
                          fill={isStrength ? "#10B981" : isRoot ? "#F43F5E" : "#A068FF"}
                        />

                        {/* Micro Level Indicators */}
                        <text
                          x="-113"
                          y="30"
                          className="fill-slate-400 text-[9px] font-mono pointer-events-none"
                        >
                          Current: Lvl {curLevel.toFixed(1)}
                        </text>
                        <text
                          x="113"
                          y="30"
                          textAnchor="end"
                          className="fill-slate-400 text-[9px] font-mono pointer-events-none"
                        >
                          Req: Lvl {reqLevel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Interactive Node Dossier & Remediation Panel */}
              {selectedNode && (
                <motion.div
                  key={selectedNode.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] via-[#100524]/90 to-[#060218] border border-[#A068FF]/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/10 pb-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF]" />
                        <h4 className="font-urbanist font-bold text-lg sm:text-xl text-white">
                          {selectedNode.name}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30">
                          {selectedNode.competency_type || "Cadre Competency"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                            selectedNode.is_root || selectedNode.depth === 0 || inDegree[selectedNode.id] === 0
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                          }`}
                        >
                          {selectedNode.is_root || selectedNode.depth === 0 || inDegree[selectedNode.id] === 0
                            ? "Root Bottleneck"
                            : "Downstream Dependent"}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                        {selectedNode.is_root || selectedNode.depth === 0 || inDegree[selectedNode.id] === 0
                          ? `Topological analysis flags this skill as a root bottleneck with a -${(selectedNode.gap_size || 1).toFixed(1)} level deficit. Remediating this prerequisite propagates forward, automatically accelerating closure of dependent competencies.`
                          : `This downstream competency currently exhibits a -${(selectedNode.gap_size || 1).toFixed(1)} level deficit against the FRAC cadre requirement. Closing root prerequisites first yields faster BKT mastery.`}
                      </p>
                    </div>

                    {/* Direct Action Remediations */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <button
                        onClick={() => navigate("/learn")}
                        className="btn-primary text-xs py-2 px-4 gap-1.5 shadow-[0_0_15px_rgba(160,104,255,0.3)]"
                        title="Open interactive RAG coursework for this competency"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Study Modules</span>
                      </button>
                      <button
                        onClick={() => navigate("/viva")}
                        className="btn-secondary text-xs py-2 px-3.5 gap-1.5 hover:border-[#A068FF]/40"
                        title="Verify mastery with AI oral viva examiner"
                      >
                        <Mic className="w-3.5 h-3.5 text-[#C084FC]" />
                        <span>Oral Viva</span>
                      </button>
                      <button
                        onClick={() =>
                          navigate("/quiz", {
                            state: {
                              competencyId: selectedNode.id,
                              competencyName: selectedNode.name,
                            },
                          })
                        }
                        className="btn-secondary text-xs py-2 px-3.5 gap-1.5 hover:border-[#A068FF]/40"
                        title="Test and advance level"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Diagnostic Quiz</span>
                      </button>
                    </div>
                  </div>

                  {/* Metric Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        FRAC Baseline Level
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-urbanist font-bold text-lg text-white">
                          Lvl {(selectedNode.current_level || 1).toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400">
                          / Target {selectedNode.required_level || 3}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#A068FF] to-[#C084FC]"
                          style={{
                            width: `${Math.min(
                              100,
                              (((selectedNode.current_level || 1) / (selectedNode.required_level || 3)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        BKT Estimated Mastery
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-urbanist font-bold text-lg text-[#C084FC]">
                          {Math.round((selectedNode.mastery_probability || 0.3) * 100)}%
                        </span>
                        <span className="text-xs text-slate-400">Bayesian Posterior</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Updated continuously via oral viva and adaptive quizzes
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Cadre Closure Estimate
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-urbanist font-bold text-lg text-amber-300">
                          {trajectories[selectedNode.id]?.estimated_weeks_to_close_gap
                            ? `~${trajectories[selectedNode.id].estimated_weeks_to_close_gap} wks`
                            : "~2.5 wks"}
                        </span>
                        <span className="text-xs text-slate-400">Trajectory Velocity</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Based on 2.8x root bottleneck remediation multiplier
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
            {[
              { id: "all", label: "All Competencies", count: gaps.length },
              { id: "critical", label: "Critical Gaps", count: critical.length, color: "text-rose-400" },
              { id: "developing", label: "Developing", count: developing.length, color: "text-amber-400" },
              { id: "strength", label: "Strengths", count: strength.length, color: "text-[#C084FC]" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-urbanist font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#A068FF]/15 text-white border border-[#A068FF]/40 shadow-[0_0_12px_rgba(160,104,255,0.2)]"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span className={tab.color || "text-slate-200"}>{tab.label}</span>
                <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-slate-200 num-tabular">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Trajectory Spotlight Banner with GlowBorderCard */}
          {critical.length > 0 && (
            <GlowBorderCard
              width="100%"
              height="auto"
              borderRadius="16px"
              borderWidth="2px"
              blurAmount="12px"
              animationDuration={5}
              gradientColors={["#EF4444", "#DC2626", "#F59E0B", "#1F0B14", "#EF4444"]}
              className="w-full bg-[#1f0b14] border border-rose-500/40 p-5 sm:p-6"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 w-full">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-urbanist font-bold text-white">Targeted Remediation Required</p>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                      <span className="font-semibold text-white">{critical[0].competency_name}</span> exhibits a deficiency of {critical[0].gap_size.toFixed(1)} levels against the FRAC baseline.
                      {critical[0].root_gap_competency && (
                        <span className="block mt-1 text-amber-300 font-medium text-xs">
                          Root Prerequisite: Resolve <span className="underline underline-offset-2">{critical[0].root_gap_competency}</span> first.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/learn")}
                  className="btn-primary text-xs sm:text-sm py-2.5 px-5 shrink-0"
                >
                  Launch Coursework
                </button>
              </div>
            </GlowBorderCard>
          )}

          {/* Gaps List */}
          <div className="sovereign-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="divide-y divide-white/[0.06]">
              {displayedGaps.map((g) => {
                const forecast = trajectories[g.competency_id];
                return (
                  <LedgerRow
                    key={g.competency_id}
                    status={g.status}
                    title={
                      <span className="inline-flex items-center gap-2.5 flex-wrap">
                        <span className="text-white font-urbanist font-bold text-sm">{g.competency_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border ${g.gap_type === "Deep Gap" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-sky-500/10 text-sky-300 border-sky-500/20"}`}>
                          {g.gap_type || "Shallow Gap"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-xs text-slate-300 border border-white/10 font-mono num-tabular">
                          BKT: {Math.round((g.mastery_probability ?? 0.3) * 100)}%
                        </span>
                        {g.root_gap_competency && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 text-xs font-medium flex items-center gap-1 font-mono">
                            <GitFork className="w-3 h-3 text-amber-400" />
                            Root: {g.root_gap_competency} (d={g.depth})
                          </span>
                        )}
                      </span>
                    }
                    subtitle={`${g.competency_type} competency · Gap: ${g.gap_size.toFixed(1)} level deficit`}
                    right={
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-white num-tabular">
                            {g.current_level.toFixed(1)}{" "}
                            <span className="text-slate-400 font-normal">/ {g.required_level}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">Current / Target</p>
                        </div>
                        <button
                          onClick={() => navigate("/learn")}
                          className="btn-secondary text-xs py-1.5 px-3 hover:border-[#A068FF]/40"
                          title="Study targeted learning modules"
                        >
                          Remediate
                        </button>
                        <button
                          onClick={() => navigate("/quiz", { state: { competencyId: g.competency_id, competencyName: g.competency_name } })}
                          className="btn-primary text-xs py-1.5 px-3 gap-1 shadow-[0_0_12px_rgba(160,104,255,0.3)]"
                          title="Verify and close this gap through adaptive assessment"
                        >
                          <span>Reassess</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    }
                  >
                    {forecast && forecast.estimable && forecast.trend === "improving" && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A068FF]/15 border border-[#A068FF]/30 text-[#C084FC] text-xs font-mono mt-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{forecast.estimated_weeks_to_close_gap} week{forecast.estimated_weeks_to_close_gap > 1 ? "s" : ""} to target at current assessment rate</span>
                      </div>
                    )}
                    {forecast && !forecast.estimable && (
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#A068FF]" />
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
    </motion.div>
  );
}
