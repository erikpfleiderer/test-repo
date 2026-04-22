import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  Factory,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Clock,
  Zap,
  Lock,
  Info,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";
import {
  buildPartAnalysisModel,
  getDFMFeedbackForPart,
  getDFMPartsForProcess,
  type DFMProcess,
  type DFMFeedback,
  type PartAnalysisModel,
} from "../../data/partModel";
import { CANONICAL_BOM_845_000112 } from "../../data/canonicalBom";
import { DFMPartViewer, type DFMAnnotation } from "../ui/DFMPartViewer";

// ─── Process tabs ─────────────────────────────────────────────────────────────

interface ProcessTabDef {
  id: DFMProcess;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const PROCESS_TABS: ProcessTabDef[] = [
  { id: "CNC",               label: "CNC Machined",      Icon: Cpu },
  { id: "Injection Molding", label: "Injection Molding", Icon: Layers },
  { id: "Die Casting",       label: "Die Casting",       Icon: Factory },
];

// ─── Risk badge styles ────────────────────────────────────────────────────────

const RISK_BG: Record<string, string> = {
  Low:    "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
  Medium: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  High:   "bg-red-500/15 text-red-400 ring-red-500/20",
};

const SEVERITY_BG: Record<string, string> = {
  Watch: "bg-sky-500/15 text-sky-400",
  Flag:  "bg-amber-500/15 text-amber-400",
  Block: "bg-red-500/15 text-red-400",
};

const PROCESS_DESCRIPTIONS: Record<DFMProcess, string> = {
  CNC:               "Subtractive machining — evaluate wall thickness, feature access, tolerances, and multi-axis setup complexity",
  "Injection Molding": "Thermoplastic forming — evaluate draft angles, wall uniformity, gate locations, and sink risk",
  "Die Casting":       "Pressure die forming — evaluate draft, parting lines, wall thickness, and porosity risk in structural areas",
};

const PROCESS_ICON: Record<DFMProcess, React.ComponentType<{ className?: string }>> = {
  CNC:               Cpu,
  "Injection Molding": Layers,
  "Die Casting":       Factory,
};

// Valid process values for deep-link validation (module-level — not recreated on every render)
const VALID_PROCESSES: DFMProcess[] = ["CNC", "Injection Molding", "Die Casting"];

// ─── DFM detail panel helpers ─────────────────────────────────────────────────

function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      {children}
    </div>
  );
}

function ProcessFitBanner({
  feedback,
  process,
}: {
  feedback: DFMFeedback;
  process: DFMProcess;
}) {
  const ProcessIcon = PROCESS_ICON[process];
  const isHighRisk = feedback.riskLevel === "High";
  return (
    <div
      className={`px-4 pt-4 pb-3 border-b ${
        isHighRisk ? "border-red-500/20" : "border-slate-800/50"
      }`}
    >
      {isHighRisk && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-xs text-red-300 font-medium">
            High DFM risk — address issues before committing to this process
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ProcessIcon className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-none">{process}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{feedback.recommendedProcess}</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ring-1 ring-inset ${RISK_BG[feedback.riskLevel]}`}>
          {feedback.riskLevel} Risk
        </span>
      </div>
      {(feedback.processNotes || feedback.alternativeProcesses.length > 0) && (
        <div className="mt-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 divide-y divide-slate-700/30">
          {feedback.processNotes && (
            <div className="px-3 py-1.5 flex items-start gap-2">
              <Info className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
              <span className="text-[11px] text-slate-500 leading-snug">{feedback.processNotes}</span>
            </div>
          )}
          {feedback.alternativeProcesses.length > 0 && (
            <div className="px-3 py-1.5 flex items-start gap-2">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider shrink-0 mt-0.5">Alt</span>
              <span className="text-[11px] text-slate-500 leading-snug">
                {feedback.alternativeProcesses.join(" · ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DFM detail panel ─────────────────────────────────────────────────────────

function DFMDetailPanel({
  feedback,
  model,
  process,
}: {
  feedback: DFMFeedback | null;
  model: PartAnalysisModel | null;
  process: DFMProcess;
}) {
  const navigate = useNavigate();

  if (!feedback || !model) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600 px-6">
        <Info className="w-8 h-8 opacity-30" />
        <p className="text-sm text-center" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Select a part from the list to see DFM guidance
        </p>
      </div>
    );
  }

  const blockSignals   = feedback.manufacturingRiskSignals.filter((s) => s.severity === "Block");
  const flagSignals    = feedback.manufacturingRiskSignals.filter((s) => s.severity === "Flag");
  const watchSignals   = feedback.manufacturingRiskSignals.filter((s) => s.severity === "Watch");
  const orderedSignals = [...blockSignals, ...flagSignals, ...watchSignals];

  const hasIssues       = !!feedback.geometrySignal || feedback.geometryIssues.length > 0;
  const hasWhyItMatters = feedback.primaryRisks.length > 0 || !!feedback.changeImpactRadius;
  const hasAdjustments  =
    !!feedback.iterationRecommendation ||
    feedback.recommendations.length > 0 ||
    feedback.assemblyRecommendations.length > 0 ||
    feedback.validationRequired.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col pb-4"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* ── 0. Process Fit ── */}
      <ProcessFitBanner feedback={feedback} process={process} />

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* ── 1. What to Fix ── */}
        {hasIssues && (
          <PanelSection label="What to Fix">
            {feedback.geometrySignal && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-xs text-amber-200/90 leading-snug font-medium">
                  {feedback.geometrySignal}
                </span>
              </div>
            )}
            {feedback.geometryIssues.length > 0 && (
              <ol className="flex flex-col gap-1.5 pl-0.5">
                {feedback.geometryIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="text-[10px] font-bold text-slate-600 mt-0.5 w-4 shrink-0 text-right"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {i + 1}.
                    </span>
                    <span className="text-xs text-slate-300 leading-snug">{issue}</span>
                  </li>
                ))}
              </ol>
            )}
            {feedback.criticalDimensions.length > 0 && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                    Lock before iterating
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {feedback.criticalDimensions.map((dim, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-500/50 text-[10px] mt-0.5 shrink-0 select-none">·</span>
                      <span className="text-[11px] text-blue-300/80 leading-snug">{dim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PanelSection>
        )}

        {/* ── 2. Why It Matters ── */}
        {hasWhyItMatters && (
          <PanelSection label="Why It Matters">
            {feedback.primaryRisks.map((risk, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 text-amber-400/80 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-300 leading-snug">{risk}</span>
              </div>
            ))}
            {feedback.changeImpactRadius && (
              <div className="rounded bg-slate-800/60 border border-slate-700/40 px-3 py-2 flex items-start gap-2">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider shrink-0 mt-0.5 leading-none">
                  Cascades to
                </span>
                <span className="text-[11px] text-slate-500 leading-snug">{feedback.changeImpactRadius}</span>
              </div>
            )}
          </PanelSection>
        )}

        {/* ── 3. Impact if Unchanged ── */}
        <PanelSection label="Impact if Unchanged">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lead Time</p>
              <p
                className="text-xl font-semibold text-white mt-0.5 leading-none"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {feedback.leadTimeDays}
                <span className="text-xs text-slate-500 ml-0.5">d</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{feedback.leadTimeProfile}</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Assembly</p>
              <p
                className="text-xl font-semibold text-white mt-0.5 leading-none"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {feedback.complexityScore}
                <span className="text-xs text-slate-500 ml-0.5">/10</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">complexity</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
            <span className="text-[11px] text-slate-500 leading-snug">{feedback.primaryLeadTimeDriver}</span>
          </div>
          {orderedSignals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {orderedSignals.map((s, i) => (
                <div key={i} className="rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-300 flex-1 leading-snug">{s.signal}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${SEVERITY_BG[s.severity]}`}>
                      {s.severity}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Wrench className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-sky-300/80 leading-snug">{s.mitigation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        {/* ── 4. Suggested Design Adjustments ── */}
        {hasAdjustments && (
          <PanelSection label="Suggested Design Adjustments">
            {feedback.iterationRecommendation && (
              <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-2 flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-400 leading-snug italic">
                  {feedback.iterationRecommendation}
                </span>
              </div>
            )}
            {feedback.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-300 leading-snug">{rec}</span>
              </div>
            ))}
            {feedback.assemblyRecommendations.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">At assembly</p>
                {feedback.assemblyRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Wrench className="w-3 h-3 text-sky-400/70 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-400 leading-snug">{rec}</span>
                  </div>
                ))}
              </div>
            )}
            {feedback.validationRequired.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Verify before build</p>
                {feedback.validationRequired.map((v, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-sky-400/70 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-400 leading-snug">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {feedback.iterationGain && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700/40">
                <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-400/80 font-medium leading-snug">
                  {feedback.iterationGain}
                </span>
              </div>
            )}
          </PanelSection>
        )}

        {/* Engineering notes */}
        {feedback.notes && (
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/40 px-3 py-2.5">
            <p className="text-[11px] text-slate-500 leading-relaxed">{feedback.notes}</p>
          </div>
        )}

        {/* Quick wins — relax at prototype */}
        {feedback.relaxableDimensions.length > 0 && (
          <PanelSection label="Quick Wins — Relax at Prototype">
            {feedback.relaxableDimensions.map((dim, i) => (
              <div key={i} className="flex items-start gap-2">
                <Zap className="w-3 h-3 text-emerald-400/60 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-400 leading-snug">{dim}</span>
              </div>
            ))}
          </PanelSection>
        )}

      </div>

      {/* ── Footer ── */}
      {model.hasAnalysisPage && (
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate(`/part/${model.partNumber}`)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs hover:bg-slate-700/60 hover:border-slate-600/60 hover:text-white transition-all group"
          >
            <span className="font-medium">Open Full Part Analysis</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DFMOpportunities() {
  const { mode } = useAppMode();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Deep-link: ?process=CNC|Injection+Molding|Die+Casting  ?part=430-002808 ──
  // Lazy initialisers: only read searchParams on the first render.
  const [activeTab, setActiveTab] = useState<DFMProcess>(() => {
    const p = searchParams.get("process");
    return VALID_PROCESSES.includes(p as DFMProcess) ? (p as DFMProcess) : "CNC";
  });
  const [selectedPartNumber, setSelectedPartNumber] = useState<string | null>(
    () => searchParams.get("part") ?? null,
  );

  // Clear deep-link params from URL after they are consumed (single navigation)
  useEffect(() => {
    if (searchParams.has("part") || searchParams.has("process")) {
      setSearchParams({}, { replace: true });
    }
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to BOM Analysis when switching to production mode
  useEffect(() => {
    if (mode === "production") {
      navigate("/bom-analysis", { replace: true });
    }
  }, [mode, navigate]);

  // Build all part models from the canonical BOM (static — no reactive ctx needed)
  const allModels = useMemo(
    () =>
      CANONICAL_BOM_845_000112
        .map((row) => buildPartAnalysisModel(row.partNumber))
        .filter((m) => m.dfmFeedback !== null),
    [],
  );

  // Filter models by the active process tab using the shared selector
  const filteredModels = useMemo(
    () => getDFMPartsForProcess(activeTab, allModels),
    [activeTab, allModels],
  );

  const selectedModel = useMemo(
    () => filteredModels.find((m) => m.partNumber === selectedPartNumber) ?? null,
    [filteredModels, selectedPartNumber],
  );
  // Retrieve DFM feedback via selector — null when no part is selected.
  const selectedFeedback = useMemo(
    () => selectedModel ? getDFMFeedbackForPart(selectedModel) : null,
    [selectedModel],
  );

  const tabCounts = useMemo(() => {
    const counts: Record<DFMProcess, number> = { CNC: 0, "Injection Molding": 0, "Die Casting": 0 };
    for (const m of allModels) {
      if (m.dfmProcess) counts[m.dfmProcess]++;
    }
    return counts;
  }, [allModels]);

  // Preserve selection across tab changes if the part is still applicable; else pick first.
  // When a deep-linked part is provided and belongs to the active tab, keep it selected.
  useEffect(() => {
    setSelectedPartNumber((prev) => {
      if (prev && filteredModels.some((m) => m.partNumber === prev)) return prev;
      return filteredModels[0]?.partNumber ?? null;
    });
  }, [filteredModels]);

  if (mode === "production") return null;

  return (
    <div
      className="flex flex-col h-full bg-[#0A1929]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">DFM Opportunities</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Inspect prototype manufacturability by process — identify geometry changes that reduce lead time and iteration cost
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 font-semibold">
            Prototype
          </span>
        </div>

        {/* Process tabs */}
        <div className="flex gap-1 mt-4">
          {PROCESS_TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const count = tabCounts[id];
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                    : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 ${
                    isActive ? "bg-blue-500/20 text-blue-300" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
          {PROCESS_DESCRIPTIONS[activeTab]}
        </p>
      </div>

      {/* ── Body: 3-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: part list */}
        <div className="w-64 shrink-0 flex flex-col border-r border-slate-800/60 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
            >
              {filteredModels.length === 0 ? (
                <div className="flex items-center justify-center py-12 px-4 text-slate-600">
                  <p className="text-sm text-center">No parts in this process category</p>
                </div>
              ) : (
                filteredModels.map((m) => {
                  const fb = getDFMFeedbackForPart(m)!;
                  const isSelected = selectedPartNumber === m.partNumber;
                  return (
                    <button
                      key={m.partNumber}
                      onClick={() => setSelectedPartNumber(m.partNumber)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-800/40 transition-colors ${
                        isSelected
                          ? "bg-blue-600/10 border-l-2 border-l-blue-500"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs text-slate-400 truncate"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {m.partNumber}
                          </p>
                          <p className="text-sm text-white font-medium mt-0.5 leading-tight truncate">
                            {m.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{m.subsystem}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ring-1 ring-inset ${RISK_BG[fb.riskLevel]}`}>
                            {fb.riskLevel}
                          </span>
                          {fb.geometrySignal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                              DFM Flag
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500">
                          {fb.leadTimeDays}d lead time
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Center: part viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0D1F33]/80 border-r border-slate-800/60">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-800/40 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Part Viewer</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-600">Prototype geometry reference</span>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <DFMPartViewer
                key={selectedModel?.partNumber ?? "empty"}
                model={selectedModel}
                process={activeTab}
                annotations={(selectedFeedback?.manufacturingRiskSignals ?? []).map(
                  (s): DFMAnnotation => ({ label: s.signal, severity: s.severity }),
                )}
              />
            </AnimatePresence>
          </div>
        </div>

        {/* Right: DFM guidance */}
        <div className="w-80 shrink-0 flex flex-col">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-800/40 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">DFM Guidance</span>
            {selectedModel && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500 truncate">{selectedModel.name}</span>
              </>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait">
              <DFMDetailPanel
                key={(selectedModel?.partNumber ?? "empty") + "-" + activeTab}
                feedback={selectedFeedback}
                model={selectedModel}
                process={activeTab}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

