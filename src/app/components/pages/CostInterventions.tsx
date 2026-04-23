import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingDown,
  Zap,
  AlertTriangle,
  Package,
  Layers,
  Wrench,
  ArrowUpRight,
  ChevronRight,
  X,
  Check,
  DollarSign,
  BarChart2,
  ShieldCheck,
  Info,
  Filter,
} from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";
import { useCostModel } from "../../context/CostModelContext";
import {
  PART_COST_DATA,
  fmtCurrency,
  fmtSavingsDelta,
} from "../../data/costData";
import { PRODUCTION_INTERVENTIONS, INTERVENTION_IMPL_NOTES, type ProductionIntervention } from "../../data/productionData";
import {
  DIFFICULTY_STYLE,
  RISK_STYLE,
  CONFIDENCE_STYLE,
} from "../ui/badgeStyles";
import { buildPartAnalysisModel } from "../../data/partModel";

// ─── Lever / filter options ───────────────────────────────────────────────────

const LEVER_OPTIONS = [
  "All",
  "Powder metal",
  "Die casting",
  "Material substitution",
  "Injection molded plastic",
  "Forged blank + finish machining",
];

function normalizeLevers(raw: string): string {
  if (raw.toLowerCase().startsWith("material sub")) return "Material substitution";
  if (raw.toLowerCase().startsWith("injection")) return "Injection molded plastic";
  if (raw.toLowerCase().startsWith("forged")) return "Forged blank + finish machining";
  return raw;
}

const SUBSYSTEM_OPTIONS = ["All", "Geartrain", "Housing / Structure", "Cable Management"];

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({
  value,
  styleMap,
}: {
  value: string | null;
  styleMap: Record<string, { bg: string; text: string; border: string }>;
}) {
  if (!value) return <span className="text-text-ghost">—</span>;
  const s = styleMap[value] ?? { bg: "#F1F5F9", text: "#64748B", border: "#E2E8F0" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium"
      style={{
        background: s.bg,
        color: s.text,
        borderColor: s.border,
      }}
    >
      {value}
    </span>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-surface-muted gap-3">
      <div className="flex items-center gap-2 text-sm text-text-subtle shrink-0">
        <Icon size={12} />
        {label}
      </div>
      {value ? (
        <span
          className={`text-sm text-text-body text-right leading-snug font-medium${mono ? " font-mono" : ""}`}
        >
          {value}
        </span>
      ) : (
        <span className="text-sm text-text-ghost">—</span>
      )}
    </div>
  );
}

// ─── Intervention detail panel ────────────────────────────────────────────────

function InterventionDetailPanel({
  part: item,
  onClose,
}: {
  part: ProductionIntervention;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { isInterventionSelected, toggleIntervention, expectedAnnualVolume, selectedInterventions } = useCostModel();

  // ── Model ── single source of derived data ──────────────────────────────────
  const model = buildPartAnalysisModel(item.partNumber, {
    expectedAnnualVolume,
    selectedInterventions,
  });

  const isApplied    = isInterventionSelected(item.partNumber);
  const hasCostData  = model.unitCostEffective != null && model.unitCostProjected != null;
  const pct          = model.unitSavingPct ?? Math.round((item.savingsMin + item.savingsMax) / 2);
  const implNote     = model.interventionNotes;

  return (
    <div
      className="w-full xl:w-[380px] xl:shrink-0 bg-surface-card xl:border-l border-border flex flex-col xl:h-full overflow-hidden"
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-border shrink-0 flex items-start justify-between bg-surface-raised"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold bg-brand-800 shrink-0"
          >
            #{item.rank}
          </div>
          <div className="min-w-0">
            <p className="text-base text-text-primary font-semibold leading-snug">
              {item.partName}
            </p>
            <p className="text-xs text-text-subtle mt-0.5 font-mono">
              {item.partNumber}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 w-7 h-7 flex items-center justify-center rounded-md text-text-subtle hover:bg-surface-subtle hover:text-text-secondary transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 flex flex-col gap-6">

          {/* Apply to model toggle */}
          <button
            onClick={() => toggleIntervention(item.partNumber)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all hover:shadow-sm active:scale-[0.99]"
            style={{
              borderColor: isApplied ? "#2563EB" : "#E2E8F0",
              background: isApplied ? "#EFF6FF" : "white",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-5 h-5 flex items-center justify-center shrink-0 rounded"
                style={{ background: isApplied ? "#2563EB" : "#F1F5F9" }}
              >
                {isApplied && <Check size={12} color="white" />}
              </div>
              <span className="text-base font-medium" style={{ color: isApplied ? "#1D4ED8" : "#475569" }}>
                {isApplied ? "Applied to cost model" : "Apply to cost model"}
              </span>
            </div>
            <span className="text-xs" style={{ color: isApplied ? "#3B82F6" : "#94A3B8" }}>
              {isApplied ? "✓ Active" : "Click to apply"}
            </span>
          </button>

          {/* Savings hero */}
          <div className="rounded-xl p-4 border" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={13} color="#16A34A" />
              <span className="text-xs uppercase tracking-wider font-semibold text-success-strong">
                Savings Potential
              </span>
            </div>
            {hasCostData ? (
              <>
                <p className="text-[26px] leading-none text-success font-bold">
                  {fmtSavingsDelta(model.unitCostEffective!, model.unitCostProjected!)}
                </p>
                <p className="text-xs mt-1" style={{ color: "#6EE7B7" }}>
                  {fmtCurrency(model.unitCostEffective!)} → {fmtCurrency(model.unitCostProjected!)} per unit
                </p>
                <div className="mt-3 h-2 rounded-full bg-[#D1FAE5] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #10B981, #059669)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#6EE7B7" }}>{pct}% unit cost reduction</p>
                {model.annualSavingPotential != null && (
                  <div className="mt-3 pt-3 border-t border-[#86EFAC] flex items-center gap-2">
                    <DollarSign size={12} color="#16A34A" />
                    <span className="text-sm text-success-strong font-semibold">
                      {fmtCurrency(model.annualSavingPotential)} / yr at {expectedAnnualVolume.toLocaleString()} units
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[26px] leading-none text-success font-bold">
                  {item.estimatedSavings}
                </p>
                <p className="text-xs mt-1" style={{ color: "#6EE7B7" }}>estimated unit cost reduction</p>
              </>
            )}
          </div>

          {/* Recommended intervention */}
          <div>
            <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold mb-2">
              Recommended Intervention
            </p>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-[#BFDBFE]" style={{ background: "#EFF6FF" }}>
              <Zap size={13} color="#3B82F6" className="mt-0.5 shrink-0" />
              <p className="text-base text-[#1E3A8A] font-medium">{item.recommendedIntervention}</p>
            </div>
          </div>

          {/* Rationale */}
          {implNote && (
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold mb-2">
                Rationale
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">{implNote.rationale}</p>
            </div>
          )}

          {/* Implementation considerations */}
          {implNote && (
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold mb-2">
                Implementation Considerations
              </p>
              <div className="flex flex-col gap-2">
                {implNote.considerations.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#93C5FD] mt-2 shrink-0" />
                    <p className="text-sm text-text-secondary leading-snug">{c}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg border border-border bg-surface-muted">
                  <p className="text-2xs uppercase tracking-wider text-text-subtle font-semibold mb-0.5">Tooling Est.</p>
                  <p className="text-sm text-text-body font-semibold">{implNote.toolingEst}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-surface-muted">
                  <p className="text-2xs uppercase tracking-wider text-text-subtle font-semibold mb-0.5">Lead Time</p>
                  <p className="text-sm text-text-body font-semibold">{implNote.leadTimeNote}</p>
                </div>
              </div>
            </div>
          )}

          {/* Validation required */}
          {implNote && implNote.validationNeeded.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold mb-2">
                Validation Required
              </p>
              <div className="flex flex-col gap-1.5">
                {implNote.validationNeeded.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border">
                    <ShieldCheck size={12} className="text-text-subtle shrink-0" />
                    <span className="text-sm text-text-secondary">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment */}
          <div>
            <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold mb-3">Assessment</p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-muted"><Wrench size={12} />Effort</div>
                <Badge value={item.engineeringDifficulty} styleMap={DIFFICULTY_STYLE} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-muted"><AlertTriangle size={12} />Risk</div>
                <Badge value={item.riskLevel} styleMap={RISK_STYLE} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-muted"><BarChart2 size={12} />Confidence</div>
                <Badge value={item.confidenceLevel} styleMap={CONFIDENCE_STYLE} />
              </div>
            </div>
          </div>

          {/* Part details */}
          <div>
            <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold mb-3">Part Details</p>
            <div className="flex flex-col">
              <DetailRow icon={Package} label="Part Number" value={item.partNumber} mono />
              <DetailRow icon={Layers} label="Subsystem" value={item.subsystem} />
              <DetailRow icon={Info} label="Current Material" value={item.currentMaterial} />
              <DetailRow icon={Wrench} label="Current Process" value={item.currentManufacturing} />
              <DetailRow icon={AlertTriangle} label="Primary Cost Driver" value={item.primaryCostDriver} />
              {hasCostData && (
                <>
                  <DetailRow icon={DollarSign} label="Current Unit Cost" value={fmtCurrency(model.unitCostEffective!)} mono />
                  <DetailRow icon={TrendingDown} label="Projected Unit Cost" value={fmtCurrency(model.unitCostProjected!)} mono />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer CTA */}
      <div className="px-5 py-4 border-t border-border shrink-0 bg-surface-raised">
        <button
          onClick={() => navigate(`/part/${item.partNumber}`)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-brand-800 text-white text-base font-medium hover:bg-brand-900 active:scale-[0.98] transition-all"
        >
          <span>Open Part Analysis</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CostInterventions() {
  const navigate = useNavigate();
  const { mode } = useAppMode();

  // Guard: prototype users land on BOM Analysis
  useEffect(() => {
    if (mode === "prototype") {
      navigate("/bom-analysis", { replace: true });
    }
  }, [mode, navigate]);

  const {
    isInterventionSelected,
    toggleIntervention,
    currentBomCost,
    projectedBomCost,
    fullAnnualSavingsPotential,
    expectedAnnualVolume,
    selectedInterventions,
  } = useCostModel();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [subsystemFilter,  setSubsystemFilter]  = useState<string>("All");
  const [leverFilter,      setLeverFilter]      = useState<string>("All");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("All");
  const [effortFilter,     setEffortFilter]     = useState<string>("All");
  const [minSavingsPct,    setMinSavingsPct]    = useState<number>(0);
  const [selectedRank,     setSelectedRank]     = useState<number | null>(null);
  const [filtersOpen,      setFiltersOpen]      = useState(false);

  // ── Hero stats ────────────────────────────────────────────────────────────
  const highConfCount = PRODUCTION_INTERVENTIONS.filter((i) => i.confidenceLevel === "High").length;
  const appliedCount  = selectedInterventions.size;

  const addressableSpend = PRODUCTION_INTERVENTIONS.reduce((sum, item) => {
    const rec = PART_COST_DATA[item.partNumber];
    if (!rec?.unitCostCurrent) return sum;
    return sum + rec.unitCostCurrent * rec.qty * expectedAnnualVolume;
  }, 0);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = PRODUCTION_INTERVENTIONS.filter((item) => {
    if (subsystemFilter !== "All" && item.subsystem !== subsystemFilter) return false;
    if (leverFilter !== "All" && normalizeLevers(item.recommendedIntervention) !== leverFilter) return false;
    if (confidenceFilter !== "All" && item.confidenceLevel !== confidenceFilter) return false;
    if (effortFilter !== "All" && item.engineeringDifficulty !== effortFilter) return false;
    const midPct = (item.savingsMin + item.savingsMax) / 2;
    if (midPct < minSavingsPct) return false;
    return true;
  });

  const selectedItem = filtered.find((i) => i.rank === selectedRank) ?? null;

  const activeFilters = [
    subsystemFilter !== "All",
    leverFilter !== "All",
    confidenceFilter !== "All",
    effortFilter !== "All",
    minSavingsPct > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSubsystemFilter("All");
    setLeverFilter("All");
    setConfidenceFilter("All");
    setEffortFilter("All");
    setMinSavingsPct(0);
  };

  if (mode === "prototype") return null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Page header */}
        <div className="px-6 pt-6 pb-5 shrink-0 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => navigate("/bom-analysis")}
              className="text-xs text-text-subtle hover:text-text-muted active:opacity-70 transition-all uppercase tracking-wider"
            >
              BOM Analysis
            </button>
            <ChevronRight size={11} className="text-text-ghost" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Cost Interventions</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl text-text-primary font-bold tracking-tight">Cost Interventions</h1>
              <p className="text-sm text-text-subtle mt-0.5">
                {filtered.length} interventions · Assembly 845-000112
              </p>
            </div>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all active:scale-[0.97] shrink-0"
              style={{
                borderColor: filtersOpen || activeFilters > 0 ? "#2563EB" : "#E2E8F0",
                background: filtersOpen || activeFilters > 0 ? "#EFF6FF" : "white",
                color: filtersOpen || activeFilters > 0 ? "#1D4ED8" : "#64748B",
              }}
            >
              <Filter size={12} />
              Filters
              {activeFilters > 0 && (
                <span
                  className="ml-0.5 w-4 h-4 rounded-full text-white text-2xs font-bold flex items-center justify-center"
                  style={{ background: "#2563EB" }}
                >
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero summary cards */}
        <div className="px-6 pt-6 pb-5 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* 1. Annual savings opportunity — most important, given slightly elevated treatment */}
            <div
              className="rounded-xl border p-4 flex flex-col"
              style={{ background: fullAnnualSavingsPotential > 0 ? "#F0FDF4" : "white", borderColor: fullAnnualSavingsPotential > 0 ? "#BBF7D0" : "#E2E8F0" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xs uppercase tracking-widest font-semibold" style={{ color: fullAnnualSavingsPotential > 0 ? "#16A34A" : "#94A3B8" }}>
                  Annual Savings Opp.
                </p>
                <TrendingDown size={13} style={{ color: fullAnnualSavingsPotential > 0 ? "#16A34A" : "#CBD5E1" }} />
              </div>
              <p className="text-[30px] leading-none font-bold font-mono" style={{ color: fullAnnualSavingsPotential > 0 ? "#059669" : "#94A3B8" }}>
                {fmtCurrency(fullAnnualSavingsPotential)}
              </p>
              <p className="text-xs mt-1" style={{ color: fullAnnualSavingsPotential > 0 ? "#6EE7B7" : "#CBD5E1" }}>at {expectedAnnualVolume.toLocaleString()} units/yr (all interventions)</p>
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${fullAnnualSavingsPotential > 0 ? "#BBF7D0" : "#F1F5F9"}` }}>
                <p className="text-xs text-text-muted">
                  BOM unit:{" "}
                  <span className="font-mono font-semibold">{fmtCurrency(currentBomCost)}</span>
                  {" → "}
                  <span className="font-mono font-semibold text-success">{fmtCurrency(projectedBomCost)}</span>
                </p>
              </div>
            </div>

            {/* 2. Addressable spend */}
            <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xs uppercase tracking-widest text-text-subtle font-semibold">
                  Addressable Spend
                </p>
                <DollarSign size={13} className="text-text-ghost" />
              </div>
              <p className="text-[26px] leading-none text-brand-800 font-bold font-mono">
                {fmtCurrency(addressableSpend)}
              </p>
              <p className="text-xs text-text-subtle mt-1">annual spend in parts with active interventions</p>
              <div className="mt-3 pt-3 border-t border-surface-subtle">
                <p className="text-xs text-text-muted">
                  {PRODUCTION_INTERVENTIONS.length} parts · {new Set(PRODUCTION_INTERVENTIONS.map((i) => i.subsystem)).size} subsystems
                </p>
              </div>
            </div>

            {/* 3. High-confidence count */}
            <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xs uppercase tracking-widest text-text-subtle font-semibold">
                  High-Confidence
                </p>
                <ShieldCheck size={13} className="text-text-ghost" />
              </div>
              <p className="text-[30px] leading-none text-brand-800 font-bold font-mono">
                {highConfCount}
              </p>
              <p className="text-xs text-text-subtle mt-1">of {PRODUCTION_INTERVENTIONS.length} interventions are high-confidence</p>
              <div className="mt-3 pt-3 border-t border-surface-subtle">
                <div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#10B981]"
                    style={{ width: `${Math.round((highConfCount / PRODUCTION_INTERVENTIONS.length) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Applied to model */}
            <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xs uppercase tracking-widest text-text-subtle font-semibold">
                  Applied to Model
                </p>
                <BarChart2 size={13} className="text-text-ghost" />
              </div>
              <p className="text-[30px] leading-none text-brand-800 font-bold font-mono">
                {appliedCount}
              </p>
              <p className="text-xs text-text-subtle mt-1">of {PRODUCTION_INTERVENTIONS.length} interventions active in cost model</p>
              <div className="mt-3 pt-3 border-t border-surface-subtle">
                {appliedCount === 0 ? (
                  <p className="text-xs text-text-subtle">Toggle rows below to model savings</p>
                ) : (
                  <p className="text-xs text-success font-medium">
                    {fmtCurrency((currentBomCost - projectedBomCost) * expectedAnnualVolume)} annual saving active
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-6 pb-4">
                <div className="flex flex-wrap items-center gap-3 p-5 rounded-xl border border-border bg-surface-muted">

                  {/* Subsystem */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-subtle uppercase tracking-wider font-semibold shrink-0">Subsystem</span>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white border border-border">
                      {SUBSYSTEM_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSubsystemFilter(s)}
                          className="px-2.5 py-1 rounded-md text-xs transition-all hover:bg-black/[0.04] active:scale-[0.95]"
                          style={{
                            fontWeight: subsystemFilter === s ? 600 : 400,
                            background: subsystemFilter === s ? "#1B3A5C" : "transparent",
                            color: subsystemFilter === s ? "white" : "#64748B",
                          }}
                        >
                          {s === "All" ? "All" : s.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lever */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-subtle uppercase tracking-wider font-semibold shrink-0">Lever</span>
                    <select
                      value={leverFilter}
                      onChange={(e) => setLeverFilter(e.target.value)}
                      className="h-7 px-2 rounded-lg border border-border bg-white text-xs text-text-body focus:outline-none focus:border-[#93C5FD]"
                      
                    >
                      {LEVER_OPTIONS.map((l) => (
                        <option key={l} value={l}>{l === "All" ? "All Levers" : l}</option>
                      ))}
                    </select>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-subtle uppercase tracking-wider font-semibold shrink-0">Confidence</span>
                    <select
                      value={confidenceFilter}
                      onChange={(e) => setConfidenceFilter(e.target.value)}
                      className="h-7 px-2 rounded-lg border border-border bg-white text-xs text-text-body focus:outline-none focus:border-[#93C5FD]"
                      
                    >
                      {["All", "High", "Medium", "Low"].map((v) => (
                        <option key={v} value={v}>{v === "All" ? "All Confidence" : v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Effort */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-subtle uppercase tracking-wider font-semibold shrink-0">Effort</span>
                    <select
                      value={effortFilter}
                      onChange={(e) => setEffortFilter(e.target.value)}
                      className="h-7 px-2 rounded-lg border border-border bg-white text-xs text-text-body focus:outline-none focus:border-[#93C5FD]"
                      
                    >
                      {["All", "Low", "Medium", "High"].map((v) => (
                        <option key={v} value={v}>{v === "All" ? "All Effort" : v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min savings */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-subtle uppercase tracking-wider font-semibold shrink-0">Min Savings</span>
                    <select
                      value={minSavingsPct}
                      onChange={(e) => setMinSavingsPct(Number(e.target.value))}
                      className="h-7 px-2 rounded-lg border border-border bg-white text-xs text-text-body focus:outline-none focus:border-[#93C5FD]"
                      
                    >
                      {[0, 25, 50, 75].map((v) => (
                        <option key={v} value={v}>{v === 0 ? "Any" : `${v}%+`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Clear */}
                  {activeFilters > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-text-subtle hover:text-text-secondary underline transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="flex-1 px-6 pb-6 overflow-auto min-h-0">
          <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="bg-surface-muted" style={{ borderBottom: "1px solid #E2E8F0" }}>
                    {[
                      { label: "Rank",           width: 64  },
                      { label: "Part",            width: 180 },
                      { label: "Intervention",    width: 210 },
                      { label: "Unit Savings",    width: 130 },
                      { label: "Annual @ Vol",    width: 120 },
                      { label: "Effort",          width: 80  },
                      { label: "Risk",            width: 80  },
                      { label: "Confidence",      width: 90  },
                      { label: "Status",          width: 90  },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap"
                        style={{
                          width: col.width,
                          minWidth: col.width,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Filter size={22} className="text-text-ghost" />
                          <p className="text-base text-text-subtle font-medium">No interventions match the active filters</p>
                          <p className="text-sm text-text-ghost">Try adjusting subsystem, lever, or savings threshold.</p>
                          <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-muted border border-border hover:bg-surface-muted hover:border-border-strong active:scale-[0.97] transition-all"
                          >
                            <X size={11} />
                            Clear all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, idx) => {
                      const isSelected = selectedRank === item.rank;
                      const isApplied  = isInterventionSelected(item.partNumber);
                      const model = buildPartAnalysisModel(item.partNumber, { expectedAnnualVolume });
                      const unitSaving = model.unitSaving != null && model.unitCostEffective != null
                        ? fmtSavingsDelta(model.unitCostEffective, model.unitCostProjected!)
                        : item.estimatedSavings;
                      const annualAmt = model.annualSavingPotential != null
                        ? fmtCurrency(model.annualSavingPotential)
                        : "—";
                      const midPct = (item.savingsMin + item.savingsMax) / 2;

                      return (
                        <tr
                          key={item.rank}
                          onClick={() => setSelectedRank((prev) => (prev === item.rank ? null : item.rank))}
                          className={`cursor-pointer transition-colors group ci-row${isSelected ? " ci-row--selected" : ""}${isApplied && !isSelected ? " ci-row--applied" : ""}`}
                          style={{
                            background: isSelected
                              ? "#EFF6FF"
                              : isApplied
                              ? "#F0FDF4"
                              : idx % 2 === 0
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
                          {/* Rank */}
                          <td className="px-4 py-4">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold"
                              style={{
                                background: isSelected ? "#DBEAFE" : "#F1F5F9",
                                color: isSelected ? "#1D4ED8" : "#475569",
                              }}
                            >
                              {item.rank}
                            </div>
                          </td>

                          {/* Part */}
                          <td className="px-4 py-4">
                            <p className="text-base text-text-body font-medium">{item.partName}</p>
                            <p className="text-2xs text-text-ghost mt-0.5 font-mono">
                              {item.partNumber}
                            </p>
                          </td>

                          {/* Intervention */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-px" />
                              <span className="text-sm text-text-secondary leading-snug">{item.recommendedIntervention}</span>
                            </div>
                          </td>

                          {/* Unit savings */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-sm text-success font-bold">{unitSaving}</span>
                              <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden w-16">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${midPct}%`, background: "linear-gradient(90deg, #10B981, #059669)" }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Annual @ volume */}
                          <td className="px-4 py-4">
                            <span className="text-sm text-text-body font-mono font-semibold">
                              {annualAmt}
                            </span>
                          </td>

                          {/* Effort */}
                          <td className="px-4 py-4">
                            <Badge value={item.engineeringDifficulty} styleMap={DIFFICULTY_STYLE} />
                          </td>

                          {/* Risk */}
                          <td className="px-4 py-4">
                            <Badge value={item.riskLevel} styleMap={RISK_STYLE} />
                          </td>

                          {/* Confidence */}
                          <td className="px-4 py-4">
                            <Badge value={item.confidenceLevel} styleMap={CONFIDENCE_STYLE} />
                          </td>

                          {/* Status toggle */}
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleIntervention(item.partNumber)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-all hover:shadow-sm active:scale-[0.95]"
                              style={{
                                borderColor: isApplied ? "#2563EB" : "#E2E8F0",
                                background: isApplied ? "#EFF6FF" : "white",
                                color: isApplied ? "#1D4ED8" : "#94A3B8",
                                fontWeight: isApplied ? 600 : 400,
                              }}
                            >
                              {isApplied
                                ? <Check size={11} />
                                : <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                              }
                              {isApplied ? "Applied" : "Queue"}
                            </button>
                          </td>

                          {/* Expand arrow */}
                          <td className="px-3 py-4">
                            <ChevronRight
                              size={13}
                              className="text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors"
                              style={isSelected ? { color: "#3B82F6" } : {}}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div
              className="px-5 py-3 border-t border-border flex items-center justify-between bg-surface-raised"
            >
              <p className="text-xs text-text-subtle">
                Showing {filtered.length} of {PRODUCTION_INTERVENTIONS.length} interventions · Assembly 845-000112
              </p>
              <button
                onClick={() => navigate("/bom-analysis")}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-800 transition-colors"
              >
                <ArrowUpRight size={11} />
                View full BOM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {selectedItem && (
          <>
            {/* Narrow overlay backdrop */}
            <motion.div
              key="ci-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="xl:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedRank(null)}
            />

            {/* Mobile / tablet: bottom sheet */}
            <motion.div
              key={`ci-sheet-${selectedItem.rank}`}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="xl:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "85vh" }}
            >
              <div className="shrink-0 flex justify-center pt-2.5 pb-1 bg-white rounded-t-2xl">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <InterventionDetailPanel part={selectedItem} onClose={() => setSelectedRank(null)} />
            </motion.div>

            {/* Desktop: side panel */}
            <motion.div
              key={`ci-side-${selectedItem.rank}`}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="hidden xl:block"
            >
              <InterventionDetailPanel part={selectedItem} onClose={() => setSelectedRank(null)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
