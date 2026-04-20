import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CrossModeHint } from "../ui/CrossModeHint";
import {
  ChevronRight,
  X,
  TrendingDown,
  Zap,
  AlertTriangle,
  ShieldCheck,
  ThumbsUp,
  Package,
  Layers,
  Wrench,
  Gem,
  Info,
  ArrowUpRight,
  Filter,
  SortAsc,
  Check,
  Clock,
} from "lucide-react";
import { useCostModel } from "../../context/CostModelContext";
import { useAppMode } from "../../context/AppModeContext";
import { useBuildTarget } from "../../context/BuildTargetContext";
import {
  PART_COST_DATA,
  INTERVENTION_COST_DATA,
  applyImpactModel,
  fmtCurrency,
  fmtSavingsDelta,
} from "../../data/costData";
import { useDashboardData,
  type ProductionIntervention,
  type PrototypeSimplification,
} from "../../data/dashboardData";
import { PROTOTYPE_ASSEMBLY, CRITICAL_PATH_SET, PROTOTYPE_PART_DATA } from "../../data/prototypeData";
import {
  DIFFICULTY_STYLE,
  RISK_STYLE,
  CONFIDENCE_STYLE,
} from "../ui/badgeStyles";
import { MODE_CONFIG } from "../../data/modeConfig";

// ─── Normalized display row ───────────────────────────────────────────────────────────────────
// Shared table shape for production interventions and prototype simplifications.

interface DisplayRow {
  rank: number;
  partNumber: string;
  partName: string;
  subsystem: string | null;
  /** currentMaterial (prod) or currentPrototypeProcess (proto). */
  currentProcess: string | null;
  /** primaryCostDriver (prod) or primaryIterationFriction (proto). */
  primaryFriction: string | null;
  /** recommendedIntervention (prod) or simplificationPath (proto). */
  actionLabel: string;
  /** estimatedSavings (prod) or iterationImpact (proto). */
  impactDisplay: string;
  impactMin: number;
  impactMax: number;
  engineeringDifficulty: "Low" | "Medium" | "High" | null;
  /** riskLevel (prod) or iterationRisk (proto). */
  riskLevel: "Low" | "Medium" | "High" | null;
  confidenceLevel: "Low" | "Medium" | "High" | null;
  /** Lead time savings in days (prototype only). */
  leadTimeSavingsDays?: number;
  /** Hard build blocker per PROTOTYPE_ASSEMBLY.blockers (prototype only). */
  isHardBlocker?: boolean;
  /** On the assembly critical path per PROTOTYPE_ASSEMBLY.criticalPathParts (prototype only). */
  isCriticalPath?: boolean;
  /** Raw canonical item — used by the detail panel for mode-specific rendering. */
  _raw: ProductionIntervention | PrototypeSimplification;
}

function buildDisplayList(
  data: ReturnType<typeof useDashboardData>,
  criticalPathSet: ReadonlySet<string> = CRITICAL_PATH_SET,
): DisplayRow[] {
  if (data.mode === "production") {
    return (data.interventions as ProductionIntervention[]).map((i) => ({
      rank:               i.rank,
      partNumber:         i.partNumber,
      partName:           i.partName,
      subsystem:          i.subsystem,
      currentProcess:     i.currentMaterial,
      primaryFriction:    i.primaryCostDriver,
      actionLabel:        i.recommendedIntervention,
      impactDisplay:      i.estimatedSavings,
      impactMin:          i.savingsMin,
      impactMax:          i.savingsMax,
      engineeringDifficulty: i.engineeringDifficulty,
      riskLevel:          i.riskLevel,
      confidenceLevel:    i.confidenceLevel,
      _raw:               i,
    }));
  }
  // Prototype branch
  const hardBlockerSet = new Set(
    PROTOTYPE_ASSEMBLY.blockers
      .filter((b) => b.isHardBlocker && b.partNumber)
      .map((b) => b.partNumber!),
  );

  return (data.simplifications as PrototypeSimplification[]).map((s) => ({
    rank:               s.rank,
    partNumber:         s.partNumber,
    partName:           s.partName,
    subsystem:          s.subsystem,
    currentProcess:     s.currentPrototypeProcess,
    primaryFriction:    s.primaryIterationFriction,
    actionLabel:        s.simplificationPath,
    impactDisplay:      s.iterationImpact,
    impactMin:          s.leadTimeSavingsDays,
    impactMax:          s.leadTimeSavingsDays,
    engineeringDifficulty: s.engineeringDifficulty,
    riskLevel:          s.iterationRisk,
    confidenceLevel:    s.confidenceLevel,
    leadTimeSavingsDays: s.leadTimeSavingsDays,
    isHardBlocker:       hardBlockerSet.has(s.partNumber),
    isCriticalPath:      criticalPathSet.has(s.partNumber),
    _raw:               s,
  }));
}

// ─── Prototype sort ────────────────────────────────────────────────────────────
// Re-orders a prototype list so the user sees:
//   1. Hard build blockers (parts that must be resolved before any build)
//   2. Critical-path parts (longest lead time gates)
//   3. Everything else, descending by lead-time savings
// Within each tier, higher leadTimeSavingsDays wins.

function sortForPrototype(rows: DisplayRow[]): DisplayRow[] {
  const priorityOf = (row: DisplayRow): number => {
    if (row.isHardBlocker) return 0;
    if (row.isCriticalPath) return 1;
    return 2;
  };
  return [...rows].sort((a, b) => {
    const diff = priorityOf(a) - priorityOf(b);
    if (diff !== 0) return diff;
    return (b.leadTimeSavingsDays ?? 0) - (a.leadTimeSavingsDays ?? 0);
  });
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────


function Badge({
  value,
  styleMap,
}: {
  value: string | null;
  styleMap: Record<string, { bg: string; text: string; border: string }>;
}) {
  if (!value) return <span className="text-[#CBD5E1]">—</span>;
  const s = styleMap[value] ?? { bg: "#F1F5F9", text: "#64748B", border: "#E2E8F0" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px]"
      style={{
        background: s.bg,
        color: s.text,
        borderColor: s.border,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 500,
      }}
    >
      {value}
    </span>
  );
}

function SavingsCell({ item }: { item: DisplayRow }) {
  const { mode } = useAppMode();

  if (mode === "production") {
    const costRec = PART_COST_DATA[item.partNumber];
    const interventionData = INTERVENTION_COST_DATA[item.partNumber];
    if (costRec?.unitCostCurrent != null && interventionData) {
      const current   = costRec.unitCostCurrent;
      const projected = applyImpactModel(current, interventionData.costImpactModel);
      const pct       = Math.round(((current - projected) / current) * 100);
      return (
        <div className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-[13px]" style={{ fontWeight: 700, color: "#059669" }}>
            {fmtSavingsDelta(current, projected)}
          </span>
          <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden w-16">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #10B981, #059669)" }} />
          </div>
        </div>
      );
    }
    const mid = (item.impactMin + item.impactMax) / 2;
    return (
      <div className="flex flex-col gap-1 min-w-[80px]">
        <span className="text-[13px]" style={{ fontWeight: 700, color: "#059669" }}>{item.impactDisplay}</span>
        <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden w-16">
          <div className="h-full rounded-full" style={{ width: `${mid}%`, background: "linear-gradient(90deg, #10B981, #059669)" }} />
        </div>
      </div>
    );
  }

  // Prototype mode: show iterationImpact string + lead-time bar
  const maxLeadTimeDays = 21;
  const barPct = item.leadTimeSavingsDays
    ? Math.min(100, Math.round((item.leadTimeSavingsDays / maxLeadTimeDays) * 100))
    : Math.round((item.impactMin / 30) * 100);
  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <span className="text-[12px] leading-snug" style={{ fontWeight: 600, color: "#059669" }}>{item.impactDisplay}</span>
      <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden w-16">
        <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: "linear-gradient(90deg, #10B981, #059669)" }} />
      </div>
    </div>
  );
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  item,
  onClose,
}: {
  item: DisplayRow;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { isInterventionSelected, toggleIntervention } = useCostModel();
  const { mode } = useAppMode();
  const cfg = MODE_CONFIG[mode];
  const isApplied = isInterventionSelected(item.partNumber);
  const protoPartData = PROTOTYPE_PART_DATA[item.partNumber];

  // ── Production-mode cost computations ──
  const costRec = PART_COST_DATA[item.partNumber];
  const interventionData = INTERVENTION_COST_DATA[item.partNumber];
  const hasCostData = costRec?.unitCostCurrent != null && interventionData != null;
  const current   = hasCostData ? costRec!.unitCostCurrent! : null;
  const projected = hasCostData ? applyImpactModel(current!, interventionData!.costImpactModel) : null;
  const savingsDisplay = hasCostData
    ? fmtSavingsDelta(current!, projected!)
    : item.impactDisplay;
  const mid = hasCostData
    ? Math.round(((current! - projected!) / current!) * 100)
    : (item.impactMin + item.impactMax) / 2;

  return (
    <motion.div
      key={item.partNumber}
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-[360px] shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col h-full overflow-y-auto"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Panel header */}
      <div
        className="px-5 py-4 border-b border-[#F1F5F9] flex items-start justify-between shrink-0"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] shrink-0 mt-0.5"
            style={{ background: "#1B3A5C", fontWeight: 700 }}
          >
            #{item.rank}
          </div>
          <div>
            <p
              className="text-[#0F2035] text-[14px]"
              style={{ fontWeight: 600 }}
            >
              {item.partName}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5 font-mono">
              {item.partNumber}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">

        {/* Production: apply-to-model toggle */}
        {mode === "production" && (
          <button
            onClick={() => toggleIntervention(item.partNumber)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
            style={{
              borderColor: isApplied ? "#2563EB" : "#E2E8F0",
              background: isApplied ? "#EFF6FF" : "white",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-5 h-5 flex items-center justify-center shrink-0"
                style={{ background: isApplied ? "#2563EB" : "#F1F5F9", borderRadius: 4 }}
              >
                {isApplied && <Check size={12} color="white" />}
              </div>
              <span className="text-[13px]" style={{ fontWeight: 500, color: isApplied ? "#1D4ED8" : "#475569" }}>
                {isApplied ? "Applied to cost model" : "Apply to cost model"}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: isApplied ? "#3B82F6" : "#94A3B8" }}>
              {isApplied ? "✓ Active" : "Click to apply"}
            </span>
          </button>
        )}

        {/* Impact hero */}
        <div className="rounded-xl p-4 border" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
          <div className="flex items-center gap-2 mb-2">
            {mode === "prototype" ? <Clock size={14} color="#16A34A" /> : <TrendingDown size={14} color="#16A34A" />}
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "#16A34A", fontWeight: 500 }}>
              {cfg.impactLabel}
            </span>
          </div>
          {mode === "prototype" ? (
            <>
              <p className="text-[28px] leading-none" style={{ color: "#059669", fontWeight: 700 }}>
                {item.leadTimeSavingsDays != null ? `−${item.leadTimeSavingsDays}d` : item.impactDisplay}
              </p>
              <p className="text-[11px] mt-1 leading-snug" style={{ color: "#6EE7B7" }}>
                {item.impactDisplay}
              </p>
              {item.leadTimeSavingsDays != null && (
                <>
                  <div className="mt-3 h-2 rounded-full bg-[#D1FAE5] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #10B981, #059669)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round((item.leadTimeSavingsDays / 21) * 100))}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: "#6EE7B7" }}>
                    {item.leadTimeSavingsDays} days lead time reduction
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-[28px] leading-none" style={{ color: "#059669", fontWeight: 700 }}>
                {savingsDisplay}
              </p>
              {hasCostData && (
                <p className="text-[11px] mt-1" style={{ color: "#6EE7B7" }}>
                  {fmtCurrency(current!)} → {fmtCurrency(projected!)} per unit
                </p>
              )}
              <div className="mt-3 h-2 rounded-full bg-[#D1FAE5] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #10B981, #059669)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${mid}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                />
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "#6EE7B7" }}>{mid}% cost reduction opportunity</p>
            </>
          )}
        </div>

        {/* Action label (intervention / simplification path) */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 500 }}>
            {cfg.actionLabel}
          </p>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-[#BFDBFE]" style={{ background: "#EFF6FF" }}>
            <Zap size={14} color="#3B82F6" className="mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#1E3A8A]" style={{ fontWeight: 500 }}>{item.actionLabel}</p>
          </div>
        </div>

        {/* Cross-mode annotation */}
        <CrossModeHint partNumber={item.partNumber} mode={mode} variant="banner" />

        {/* Assessment badges */}
        {(item.engineeringDifficulty || item.riskLevel || item.confidenceLevel) && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>Assessment</p>
            <div className="flex flex-col gap-2.5">
              {item.engineeringDifficulty && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] text-[#64748B]"><Wrench size={13} />Engineering Difficulty</div>
                  <Badge value={item.engineeringDifficulty} styleMap={DIFFICULTY_STYLE} />
                </div>
              )}
              {item.riskLevel && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                    <AlertTriangle size={13} />
                    {cfg.riskLabel}
                  </div>
                  <Badge value={item.riskLevel} styleMap={RISK_STYLE} />
                </div>
              )}
              {item.confidenceLevel && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] text-[#64748B]"><ThumbsUp size={13} />Confidence</div>
                  <Badge value={item.confidenceLevel} styleMap={CONFIDENCE_STYLE} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prototype: iteration profile from PROTOTYPE_PART_DATA */}
        {mode === "prototype" && protoPartData && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>Iteration Profile</p>
            <div className="flex flex-col gap-2">
              <DetailRow icon={Clock} label="Current Lead Time" value={`${protoPartData.iterationProfile.leadTimeDays} days`} />
              <DetailRow icon={AlertTriangle} label="Lead Time Driver" value={protoPartData.iterationProfile.primaryLeadTimeDriver} />
              <DetailRow icon={Info} label="Iteration Complexity" value={protoPartData.iterationProfile.iterationComplexity} />
              <DetailRow icon={Layers} label="Change Impact Radius" value={protoPartData.iterationProfile.changeImpactRadius} />
            </div>
          </div>
        )}

        {/* Prototype: manufacturing risk signals */}
        {mode === "prototype" && protoPartData && protoPartData.manufacturingRiskSignals.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>Production Risk Signals</p>
            <div className="flex flex-col gap-2">
              {protoPartData.manufacturingRiskSignals.map((sig, i) => (
                <div key={i} className="rounded-lg border border-[#E2E8F0] p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{
                        background: sig.severity === "Block" ? "#FFF1F2" : sig.severity === "Flag" ? "#FFFBEB" : "#EFF6FF",
                        color:      sig.severity === "Block" ? "#E11D48" : sig.severity === "Flag" ? "#D97706" : "#3B82F6",
                        fontWeight: 600,
                      }}
                    >
                      {sig.severity}
                    </span>
                    <span className="text-[11px] text-[#64748B]">{sig.category}</span>
                  </div>
                  <p className="text-[12px] text-[#1E293B] leading-snug mb-1">{sig.signal}</p>
                  <p className="text-[11px] text-[#94A3B8] leading-snug">→ {sig.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production: part details */}
        {mode === "production" && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>Part Details</p>
            <div className="flex flex-col gap-2">
              <DetailRow icon={Package} label="Part Number" value={item.partNumber} mono />
              <DetailRow icon={Layers} label="Subsystem" value={item.subsystem} />
              <DetailRow icon={Gem} label="Current Material / Process" value={item.currentProcess} />
              <DetailRow icon={AlertTriangle} label="Primary Cost Driver" value={item.primaryFriction} />
              {hasCostData && (
                <>
                  <DetailRow icon={ShieldCheck} label="Current Unit Cost" value={fmtCurrency(current!)} mono />
                  <DetailRow icon={TrendingDown} label="Projected Unit Cost" value={fmtCurrency(projected!)} mono />
                </>
              )}
            </div>
          </div>
        )}

        {/* Prototype: part reference */}
        {mode === "prototype" && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>Part Reference</p>
            <div className="flex flex-col gap-2">
              <DetailRow icon={Package} label="Part Number" value={item.partNumber} mono />
              <DetailRow icon={Layers} label="Subsystem" value={item.subsystem} />
              <DetailRow icon={Wrench} label="Current Process" value={item.currentProcess} />
              <DetailRow icon={AlertTriangle} label="Iteration Friction" value={item.primaryFriction} />
            </div>
          </div>
        )}

        {/* View Full Analysis CTA */}
        <button
          onClick={() => navigate(`/part/${item.partNumber}`)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
          style={{ fontWeight: 500 }}
        >
          <span>View Full Analysis</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
      <div className="flex items-center gap-2 text-[12px] text-[#94A3B8]">
        <Icon size={12} />
        {label}
      </div>
      {value ? (
        <span
          className="text-[12px] text-[#1E293B]"
          style={{
            fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          {value}
        </span>
      ) : (
        <span className="text-[12px] text-[#CBD5E1]">—</span>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CostInterventions() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = useDashboardData();
  const mode = data.mode;
  const { criticalPathParts } = useBuildTarget();
  const activeCriticalPathSet = new Set(criticalPathParts);
  const {
    isInterventionSelected,
    toggleIntervention,
    currentBomCost,
    projectedBomCost,
    annualSavingsPotential,
    expectedAnnualVolume,
  } = useCostModel();

  const rawList = buildDisplayList(data, activeCriticalPathSet);
  const INTERVENTIONS = mode === "prototype" ? sortForPrototype(rawList) : rawList;
  const cfg = MODE_CONFIG[mode];

  const selectedItem = INTERVENTIONS.find(
    (i) => i.partNumber === selectedId
  ) ?? null;

  const handleRowClick = (partNumber: string) => {
    setSelectedId((prev) => (prev === partNumber ? null : partNumber));
  };

  // Production: compute top savings string (Ring Gear — highest dollar savings)
  const ringGearCost = PART_COST_DATA["430-002839"]?.unitCostCurrent ?? 540;
  const ringGearProj = applyImpactModel(
    ringGearCost,
    INTERVENTION_COST_DATA["430-002839"]!.costImpactModel
  );
  const topSavingsStr = fmtSavingsDelta(ringGearCost, ringGearProj);
  const hasActiveBomSavings = annualSavingsPotential > 0;

  // Prototype: derive top item stats from built list
  const topProtoItem = mode === "prototype" ? INTERVENTIONS[0] ?? null : null;
  const totalLeadTimeSavings = mode === "prototype"
    ? INTERVENTIONS.reduce((sum, i) => sum + (i.leadTimeSavingsDays ?? 0), 0)
    : 0;

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Main table area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
              Dashboard
            </span>
            <ChevronRight size={12} className="text-[#CBD5E1]" />
            <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
              {cfg.pageTitle}
            </span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="text-[#0F2035]"
                style={{ fontWeight: 600 }}
              >
                {cfg.pageTitle}
              </h1>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                {`${INTERVENTIONS.length} ${cfg.interventionsNoun} identified for Assembly 845-000112 · Click any row to expand`}
              </p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#64748B] hover:border-[#CBD5E1] transition-colors">
                <Filter size={13} />
                Filter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#64748B] hover:border-[#CBD5E1] transition-colors">
                <SortAsc size={13} />
                Sort
              </button>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="px-6 mb-4 shrink-0">
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: cfg.interventionsShortLabel,
                value: String(INTERVENTIONS.length),
                sub: cfg.summaryCountSub,
                color: "#1B3A5C",
                bg: "#EFF4FA",
              },
              {
                label: mode === "prototype"
                  ? `Top Simplification${topProtoItem ? ` (${topProtoItem.partName})` : ""}`
                  : "Top Saving (Ring Gear)",
                value: mode === "prototype"
                  ? (topProtoItem?.impactDisplay ?? "—")
                  : topSavingsStr,
                sub: mode === "prototype"
                  ? (topProtoItem?.actionLabel ?? "—")
                  : "Powder metal · 430-002839",
                color: "#059669",
                bg: "#F0FDF4",
              },
              {
                label: mode === "prototype" ? "Total Lead Time Savings" : "BOM Unit Saving",
                value: mode === "prototype"
                  ? (totalLeadTimeSavings > 0 ? `${totalLeadTimeSavings}d` : "—")
                  : (hasActiveBomSavings ? fmtSavingsDelta(currentBomCost, projectedBomCost) : "—"),
                sub: mode === "prototype"
                  ? (totalLeadTimeSavings > 0 ? "across all simplifications" : "No lead time data available")
                  : (hasActiveBomSavings ? "vs current BOM cost" : "Select interventions to model"),
                color: "#0891B2",
                bg: "#F0F9FF",
              },
              {
                label: mode === "prototype" ? "Annual Impact" : "Annual Savings",
                value: mode === "prototype" ? "—" : (hasActiveBomSavings ? fmtCurrency(annualSavingsPotential) : "—"),
                sub: mode === "prototype" ? "Switch to Production to model costs" : `at ${expectedAnnualVolume.toLocaleString()} units/yr`,
                color: "#7C3AED",
                bg: "#FAF5FF",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <div>
                  <p
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "#94A3B8", fontWeight: 500 }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-[16px] leading-tight mt-0.5"
                    style={{ color: s.color, fontWeight: 700 }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-6 pb-6 overflow-auto min-h-0">
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]" style={{ borderCollapse: "collapse" }}>
                {/* Header */}
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    {/* Apply col — first: hidden in prototype */}
                    {mode === "production" && (
                      <th
                        className="px-3 py-3 text-center"
                        style={{ width: 72, minWidth: 72, fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        Apply
                      </th>
                    )}
                    {[
                      { label: "Rank", width: 56 },
                      { label: "Part Number", width: 130 },
                      { label: "Part Name", width: 130 },
                      { label: cfg.currentProcessLabel, width: 130 },
                      { label: cfg.interventionColumnLabel, width: 220 },
                      { label: cfg.impactColumnLabel, width: 100 },
                      { label: "Difficulty", width: 90 },
                      { label: cfg.dfmRiskLabel, width: 80 },
                      { label: "Confidence", width: 100 },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className="px-4 py-3 text-left"
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#64748B",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                    {/* Expand col */}
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {INTERVENTIONS.map((item, idx) => {
                    const isSelected = selectedId === item.partNumber;
                    const isEven = idx % 2 === 0;
                    const isApplied = isInterventionSelected(item.partNumber);
                    return (
                      <tr
                        key={item.partNumber}
                        onClick={() => handleRowClick(item.partNumber)}
                        className="cursor-pointer transition-colors group"
                        style={{
                          background: isSelected
                            ? "#EFF6FF"
                            : isApplied
                            ? "#F0FDF4"
                            : isEven
                            ? "#FFFFFF"
                            : "#FAFBFD",
                          borderBottom: "1px solid #F1F5F9",
                          borderLeft: isSelected
                            ? "3px solid #2563EB"
                            : isApplied
                            ? "3px solid #10B981"
                            : "3px solid transparent",
                        }}
                      >
                        {/* Apply toggle: production only */}
                        {mode === "production" && (
                          <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleIntervention(item.partNumber)}
                              className="w-7 h-7 rounded-md flex items-center justify-center mx-auto transition-all"
                              style={{
                                background: isApplied ? "#2563EB" : "#F1F5F9",
                                border: isApplied ? "2px solid #2563EB" : "2px solid #E2E8F0",
                              }}
                              title={isApplied ? "Remove from model" : "Add to model"}
                            >
                              {isApplied
                                ? <Check size={12} color="white" />
                                : <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                              }
                            </button>
                          </td>
                        )}

                        {/* Rank */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px]"
                              style={{
                                background: isSelected ? "#DBEAFE" : "#F1F5F9",
                                color: isSelected ? "#1D4ED8" : "#475569",
                                fontWeight: 700,
                              }}
                            >
                              {mode === "prototype" ? idx + 1 : item.rank}
                            </div>
                            {mode === "prototype" && item.isHardBlocker && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-md"
                                style={{ background: "#FFF1F2", color: "#E11D48", fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: "nowrap" }}
                              >
                                Blocker
                              </span>
                            )}
                            {mode === "prototype" && !item.isHardBlocker && item.isCriticalPath && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-md"
                                style={{ background: "#FFF7ED", color: "#EA580C", fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: "nowrap" }}
                              >
                                Critical
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Part Number */}
                        <td className="px-4 py-3.5">
                          <span
                            className="text-[12px] text-[#475569]"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {item.partNumber}
                          </span>
                        </td>

                        {/* Part Name */}
                        <td className="px-4 py-3.5">
                          <span
                            className="text-[13px] text-[#1E293B]"
                            style={{ fontWeight: 500 }}
                          >
                            {item.partName}
                          </span>
                          <CrossModeHint partNumber={item.partNumber} mode={mode} variant="inline" />
                        </td>

                        {/* Current Process / Material */}
                        <td className="px-4 py-3.5">
                          {item.currentProcess ? (
                            <span className="text-[12px] text-[#475569]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {item.currentProcess}
                            </span>
                          ) : (
                            <span className="text-[#CBD5E1] text-[12px]">—</span>
                          )}
                        </td>

                        {/* Action label */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3B82F6" }} />
                            <span className="text-[12px] text-[#1E293B]" style={{ fontWeight: 500 }}>
                              {item.actionLabel}
                            </span>
                          </div>
                        </td>

                        {/* Savings */}
                        <td className="px-4 py-3.5">
                          <SavingsCell item={item} />
                        </td>

                        {/* Difficulty */}
                        <td className="px-4 py-3.5">
                          <Badge
                            value={item.engineeringDifficulty}
                            styleMap={DIFFICULTY_STYLE}
                          />
                        </td>

                        {/* Risk */}
                        <td className="px-4 py-3.5">
                          <Badge
                            value={item.riskLevel}
                            styleMap={RISK_STYLE}
                          />
                        </td>

                        {/* Confidence */}
                        <td className="px-4 py-3.5">
                          <Badge
                            value={item.confidenceLevel}
                            styleMap={CONFIDENCE_STYLE}
                          />
                        </td>

                        {/* Expand arrow */}
                        <td className="px-3 py-3.5">
                          <ArrowUpRight
                            size={13}
                            className="text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors"
                            style={isSelected ? { color: "#3B82F6" } : {}}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div
              className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between"
              style={{ background: "#FAFBFD" }}
            >
              <p className="text-[11px] text-[#94A3B8]">
                Showing {INTERVENTIONS.length} {cfg.interventionsShortLabel.toLowerCase()} · Assembly 845-000112
              </p>
              <p className="text-[11px] text-[#CBD5E1]">
                All {cfg.interventionsNoun} · Dataset v1
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedItem && (
          <DetailPanel
            key={selectedItem.partNumber}
            item={selectedItem}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}