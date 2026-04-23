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

// ─── Risk badge styles (light theme) ─────────────────────────────────────────

const RISK_BG: Record<string, string> = {
  Low:    "bg-success-bg text-success-strong border border-success-border",
  Medium: "bg-warning-bg text-warning border border-warning-border",
  High:   "bg-danger-bg text-danger border border-danger-border",
};

const SEVERITY_BG: Record<string, string> = {
  Watch: "bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]",
  Flag:  "bg-warning-bg text-warning border border-warning-border",
  Block: "bg-danger-bg text-danger border border-danger-border",
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

const VALID_PROCESSES: DFMProcess[] = ["CNC", "Injection Molding", "Die Casting"];

// ─── Panel helpers ────────────────────────────────────────────────────────────

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-2xs font-semibold text-text-subtle uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function ProcessFitBanner({ feedback, process }: { feedback: DFMFeedback; process: DFMProcess }) {
  const ProcessIcon = PROCESS_ICON[process];
  const isHighRisk = feedback.riskLevel === "High";
  return (
    <div className={`px-5 pt-5 pb-4 border-b ${isHighRisk ? "border-danger-border" : "border-border"}`}>
      {isHighRisk && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-danger-bg border border-danger-border flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
          <span className="text-xs text-danger font-medium">
            High DFM risk — address issues before committing to this process
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
            <ProcessIcon className="w-3.5 h-3.5 text-[#2563EB]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary leading-none">{process}</p>
            <p className="text-[10px] text-text-subtle mt-0.5">{feedback.recommendedProcess}</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${RISK_BG[feedback.riskLevel]}`}>
          {feedback.riskLevel} Risk
        </span>
      </div>
      {(feedback.processNotes || feedback.alternativeProcesses.length > 0) && (
        <div className="mt-2.5 rounded-lg bg-surface-muted border border-border divide-y divide-surface-subtle">
          {feedback.processNotes && (
            <div className="px-3 py-1.5 flex items-start gap-2">
              <Info className="w-3 h-3 text-text-ghost mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-muted leading-snug">{feedback.processNotes}</span>
            </div>
          )}
          {feedback.alternativeProcesses.length > 0 && (
            <div className="px-3 py-1.5 flex items-start gap-2">
              <span className="text-[10px] text-text-ghost uppercase tracking-wider shrink-0 mt-0.5">Alt</span>
              <span className="text-[11px] text-text-muted leading-snug">
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
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <Info className="w-8 h-8 text-text-ghost opacity-40" />
        <p className="text-sm text-text-muted text-center">
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
    >
      <ProcessFitBanner feedback={feedback} process={process} />

      <div className="flex flex-col gap-5 px-5 pt-5">

        {/* What to Fix */}
        {hasIssues && (
          <PanelSection label="What to Fix">
            {feedback.geometrySignal && (
              <div className="rounded-lg bg-warning-bg border border-warning-border px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-warning mt-0.5 shrink-0" />
                <span className="text-xs text-warning leading-snug font-medium">
                  {feedback.geometrySignal}
                </span>
              </div>
            )}
            {feedback.geometryIssues.length > 0 && (
              <ol className="flex flex-col gap-1.5 pl-0.5">
                {feedback.geometryIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[10px] font-bold text-text-ghost mt-0.5 w-4 shrink-0 text-right font-mono">
                      {i + 1}.
                    </span>
                    <span className="text-xs text-text-body leading-snug">{issue}</span>
                  </li>
                ))}
              </ol>
            )}
            {feedback.criticalDimensions.length > 0 && (
              <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="w-3 h-3 text-[#2563EB] shrink-0" />
                  <span className="text-[10px] font-semibold text-[#1D4ED8] uppercase tracking-wider">
                    Lock before iterating
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {feedback.criticalDimensions.map((dim, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#93C5FD] text-[10px] mt-0.5 shrink-0 select-none">·</span>
                      <span className="text-[11px] text-[#1E3A8A] leading-snug">{dim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PanelSection>
        )}

        {/* Why It Matters */}
        {hasWhyItMatters && (
          <PanelSection label="Why It Matters">
            {feedback.primaryRisks.map((risk, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 text-warning mt-0.5 shrink-0" />
                <span className="text-xs text-text-body leading-snug">{risk}</span>
              </div>
            ))}
            {feedback.changeImpactRadius && (
              <div className="rounded bg-surface-muted border border-border px-3 py-2 flex items-start gap-2">
                <span className="text-[10px] font-semibold text-text-subtle uppercase tracking-wider shrink-0 mt-0.5 leading-none">
                  Cascades to
                </span>
                <span className="text-[11px] text-text-muted leading-snug">{feedback.changeImpactRadius}</span>
              </div>
            )}
          </PanelSection>
        )}

        {/* Impact if Unchanged */}
        <PanelSection label="Impact if Unchanged">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface-muted border border-border px-3 py-2.5">
              <p className="text-[10px] text-text-subtle uppercase tracking-wider">Lead Time</p>
              <p className="text-xl font-semibold text-text-primary mt-0.5 leading-none font-mono">
                {feedback.leadTimeDays}
                <span className="text-xs text-text-subtle ml-0.5 font-sans">d</span>
              </p>
              <p className="text-[10px] text-text-subtle mt-1 leading-snug">{feedback.leadTimeProfile}</p>
            </div>
            <div className="rounded-lg bg-surface-muted border border-border px-3 py-2.5">
              <p className="text-[10px] text-text-subtle uppercase tracking-wider">Assembly</p>
              <p className="text-xl font-semibold text-text-primary mt-0.5 leading-none font-mono">
                {feedback.complexityScore}
                <span className="text-xs text-text-subtle ml-0.5 font-sans">/10</span>
              </p>
              <p className="text-[10px] text-text-subtle mt-1">complexity</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-3 h-3 text-text-ghost mt-0.5 shrink-0" />
            <span className="text-[11px] text-text-muted leading-snug">{feedback.primaryLeadTimeDriver}</span>
          </div>
          {orderedSignals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {orderedSignals.map((s, i) => (
                <div key={i} className="rounded-lg bg-surface-muted border border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-text-body flex-1 leading-snug">{s.signal}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${SEVERITY_BG[s.severity]}`}>
                      {s.severity}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Wrench className="w-3 h-3 text-[#0284C7] mt-0.5 shrink-0" />
                    <p className="text-[11px] text-[#0369A1] leading-snug">{s.mitigation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        {/* Suggested Design Adjustments */}
        {hasAdjustments && (
          <PanelSection label="Suggested Design Adjustments">
            {feedback.iterationRecommendation && (
              <div className="rounded-lg bg-surface-muted border border-border px-3 py-2 flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-[#0284C7] mt-0.5 shrink-0" />
                <span className="text-xs text-text-secondary leading-snug italic">
                  {feedback.iterationRecommendation}
                </span>
              </div>
            )}
            {feedback.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
                <span className="text-xs text-text-body leading-snug">{rec}</span>
              </div>
            ))}
            {feedback.assemblyRecommendations.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-text-subtle uppercase tracking-wider">At assembly</p>
                {feedback.assemblyRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Wrench className="w-3 h-3 text-[#0284C7] mt-0.5 shrink-0" />
                    <span className="text-xs text-text-secondary leading-snug">{rec}</span>
                  </div>
                ))}
              </div>
            )}
            {feedback.validationRequired.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-text-subtle uppercase tracking-wider">Verify before build</p>
                {feedback.validationRequired.map((v, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#0284C7] mt-0.5 shrink-0" />
                    <span className="text-xs text-text-secondary leading-snug">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {feedback.iterationGain && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                <Zap className="w-3 h-3 text-success shrink-0" />
                <span className="text-[11px] text-success font-medium leading-snug">
                  {feedback.iterationGain}
                </span>
              </div>
            )}
          </PanelSection>
        )}

        {/* Engineering notes */}
        {feedback.notes && (
          <div className="rounded-lg bg-surface-muted border border-border px-3 py-2.5">
            <p className="text-[11px] text-text-muted leading-relaxed">{feedback.notes}</p>
          </div>
        )}

        {/* Quick wins */}
        {feedback.relaxableDimensions.length > 0 && (
          <PanelSection label="Quick Wins — Relax at Prototype">
            {feedback.relaxableDimensions.map((dim, i) => (
              <div key={i} className="flex items-start gap-2">
                <Zap className="w-3 h-3 text-success mt-0.5 shrink-0" />
                <span className="text-xs text-text-secondary leading-snug">{dim}</span>
              </div>
            ))}
          </PanelSection>
        )}

      </div>

      {/* Footer CTA */}
      {model.hasAnalysisPage && (
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate(`/part/${model.partNumber}`)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-brand-800 text-white text-xs font-medium hover:bg-brand-900 active:scale-[0.98] transition-all group"
          >
            <span className="font-medium">Open Full Part Analysis</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:opacity-80 transition-opacity" />
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

  const [activeTab, setActiveTab] = useState<DFMProcess>(() => {
    const p = searchParams.get("process");
    return VALID_PROCESSES.includes(p as DFMProcess) ? (p as DFMProcess) : "CNC";
  });
  const [selectedPartNumber, setSelectedPartNumber] = useState<string | null>(
    () => searchParams.get("part") ?? null,
  );

  useEffect(() => {
    if (searchParams.has("part") || searchParams.has("process")) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "production") {
      navigate("/bom-analysis", { replace: true });
    }
  }, [mode, navigate]);

  const allModels = useMemo(
    () =>
      CANONICAL_BOM_845_000112
        .map((row) => buildPartAnalysisModel(row.partNumber))
        .filter((m) => m.dfmFeedback !== null),
    [],
  );

  const filteredModels = useMemo(
    () => getDFMPartsForProcess(activeTab, allModels),
    [activeTab, allModels],
  );

  const selectedModel = useMemo(
    () => filteredModels.find((m) => m.partNumber === selectedPartNumber) ?? null,
    [filteredModels, selectedPartNumber],
  );

  const selectedFeedback = useMemo(
    () => (selectedModel ? getDFMFeedbackForPart(selectedModel) : null),
    [selectedModel],
  );

  const tabCounts = useMemo(() => {
    const counts: Record<DFMProcess, number> = { CNC: 0, "Injection Molding": 0, "Die Casting": 0 };
    for (const m of allModels) {
      if (m.dfmProcess) counts[m.dfmProcess]++;
    }
    return counts;
  }, [allModels]);

  useEffect(() => {
    setSelectedPartNumber((prev) => {
      if (prev && filteredModels.some((m) => m.partNumber === prev)) return prev;
      return filteredModels[0]?.partNumber ?? null;
    });
  }, [filteredModels]);

  if (mode === "production") return null;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-5 border-b border-[#E2E8F0]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl text-text-primary font-bold tracking-tight">DFM Opportunities</h1>
            <p className="text-sm text-text-subtle mt-0.5">
              Identify geometry changes that reduce lead time and iteration cost
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 font-semibold">
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
                    ? "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
                    : "text-text-muted hover:text-text-body hover:bg-surface-subtle border border-transparent active:scale-[0.97]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 font-medium ${
                    isActive ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-surface-subtle text-text-ghost"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-2xs text-text-subtle leading-relaxed">
          {PROCESS_DESCRIPTIONS[activeTab]}
        </p>
      </div>

      {/* Body: 3-column */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: part list */}
        <div className="w-64 shrink-0 flex flex-col border-r border-border overflow-y-auto bg-surface-raised">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
            >
              {filteredModels.length === 0 ? (
                <div className="flex items-center justify-center py-12 px-4">
                  <p className="text-sm text-text-muted text-center">No parts in this process category</p>
                </div>
              ) : (
                filteredModels.map((m) => {
                  const fb = getDFMFeedbackForPart(m)!;
                  const isSelected = selectedPartNumber === m.partNumber;
                  return (
                    <button
                      key={m.partNumber}
                      onClick={() => setSelectedPartNumber(m.partNumber)}
                      className={`w-full text-left px-4 py-3.5 border-b border-surface-subtle transition-colors ${
                        isSelected
                          ? "bg-[#EFF6FF] border-l-2 border-l-[#2563EB]"
                          : "hover:bg-surface-muted active:bg-surface-subtle"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-ghost font-mono truncate">
                            {m.partNumber}
                          </p>
                          <p className="text-sm text-text-body font-medium mt-0.5 leading-tight truncate">
                            {m.name}
                          </p>
                          <p className="text-[11px] text-text-subtle mt-0.5">{m.subsystem}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${RISK_BG[fb.riskLevel]}`}>
                            {fb.riskLevel}
                          </span>
                          {fb.geometrySignal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-bg text-warning border border-warning-border font-semibold">
                              DFM Flag
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-text-ghost" />
                        <span className="text-[10px] text-text-subtle">{fb.leadTimeDays}d lead time</span>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Center: part viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface-card border-r border-border">
          <div className="shrink-0 px-4 py-2.5 border-b border-surface-subtle flex items-center gap-2 bg-surface-raised">
            <span className="text-xs text-text-subtle font-semibold uppercase tracking-wider">Part Viewer</span>
            <span className="text-text-ghost">·</span>
            <span className="text-xs text-text-ghost">Prototype geometry reference</span>
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
        <div className="w-80 shrink-0 flex flex-col border-l border-border">
          <div className="shrink-0 px-4 py-2.5 border-b border-surface-subtle flex items-center gap-2 bg-surface-raised">
            <span className="text-xs text-text-subtle font-semibold uppercase tracking-wider">DFM Guidance</span>
            {selectedModel && (
              <>
                <span className="text-text-ghost">·</span>
                <span className="text-xs text-text-ghost truncate">{selectedModel.name}</span>
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
