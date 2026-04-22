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
    <div className="flex items-start justify-between py-1.5 border-b border-[#F8FAFC] gap-3">
      <div className="flex items-center gap-2 text-[12px] text-[#94A3B8] shrink-0">
        <Icon size={12} />
        {label}
      </div>
      {value ? (
        <span
          className="text-[12px] text-[#1E293B] text-right leading-snug"
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
      className="w-full xl:w-[380px] xl:shrink-0 bg-white xl:border-l border-[#E2E8F0] flex flex-col xl:h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-[#E2E8F0] shrink-0 flex items-start justify-between"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] shrink-0"
            style={{ background: "#1B3A5C", fontWeight: 700 }}
          >
            #{item.rank}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-[#0F2035] leading-snug" style={{ fontWeight: 600 }}>
              {item.partName}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {item.partNumber}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 flex flex-col gap-5">

          {/* Apply to model toggle */}
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
                className="w-5 h-5 flex items-center justify-center shrink-0 rounded"
                style={{ background: isApplied ? "#2563EB" : "#F1F5F9" }}
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

          {/* Savings hero */}
          <div className="rounded-xl p-4 border" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={13} color="#16A34A" />
              <span className="text-[11px] uppercase tracking-wider" style={{ color: "#16A34A", fontWeight: 600 }}>
                Savings Potential
              </span>
            </div>
            {hasCostData ? (
              <>
                <p className="text-[26px] leading-none" style={{ color: "#059669", fontWeight: 700 }}>
                  {fmtSavingsDelta(model.unitCostEffective!, model.unitCostProjected!)}
                </p>
                <p className="text-[11px] mt-1" style={{ color: "#6EE7B7" }}>
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
                <p className="text-[11px] mt-1.5" style={{ color: "#6EE7B7" }}>{pct}% unit cost reduction</p>
                {model.annualSavingPotential != null && (
                  <div className="mt-3 pt-3 border-t border-[#86EFAC] flex items-center gap-2">
                    <DollarSign size={12} color="#16A34A" />
                    <span className="text-[12px] text-[#16A34A]" style={{ fontWeight: 600 }}>
                      {fmtCurrency(model.annualSavingPotential)} / yr at {expectedAnnualVolume.toLocaleString()} units
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[26px] leading-none" style={{ color: "#059669", fontWeight: 700 }}>
                  {item.estimatedSavings}
                </p>
                <p className="text-[11px] mt-1" style={{ color: "#6EE7B7" }}>estimated unit cost reduction</p>
              </>
            )}
          </div>

          {/* Recommended intervention */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 600 }}>
              Recommended Intervention
            </p>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-[#BFDBFE]" style={{ background: "#EFF6FF" }}>
              <Zap size={13} color="#3B82F6" className="mt-0.5 shrink-0" />
              <p className="text-[13px] text-[#1E3A8A]" style={{ fontWeight: 500 }}>{item.recommendedIntervention}</p>
            </div>
          </div>

          {/* Rationale */}
          {implNote && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 600 }}>
                Rationale
              </p>
              <p className="text-[12px] text-[#475569] leading-relaxed">{implNote.rationale}</p>
            </div>
          )}

          {/* Implementation considerations */}
          {implNote && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 600 }}>
                Implementation Considerations
              </p>
              <div className="flex flex-col gap-2">
                {implNote.considerations.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#93C5FD] mt-2 shrink-0" />
                    <p className="text-[12px] text-[#475569] leading-snug">{c}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-0.5" style={{ fontWeight: 600 }}>Tooling Est.</p>
                  <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 600 }}>{implNote.toolingEst}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-0.5" style={{ fontWeight: 600 }}>Lead Time</p>
                  <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 600 }}>{implNote.leadTimeNote}</p>
                </div>
              </div>
            </div>
          )}

          {/* Validation required */}
          {implNote && implNote.validationNeeded.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 600 }}>
                Validation Required
              </p>
              <div className="flex flex-col gap-1.5">
                {implNote.validationNeeded.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0]">
                    <ShieldCheck size={12} className="text-[#94A3B8] shrink-0" />
                    <span className="text-[12px] text-[#475569]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 600 }}>Assessment</p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]"><Wrench size={12} />Effort</div>
                <Badge value={item.engineeringDifficulty} styleMap={DIFFICULTY_STYLE} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]"><AlertTriangle size={12} />Risk</div>
                <Badge value={item.riskLevel} styleMap={RISK_STYLE} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]"><BarChart2 size={12} />Confidence</div>
                <Badge value={item.confidenceLevel} styleMap={CONFIDENCE_STYLE} />
              </div>
            </div>
          </div>

          {/* Part details */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 600 }}>Part Details</p>
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
      <div className="px-5 py-4 border-t border-[#E2E8F0] shrink-0" style={{ background: "#FAFBFD" }}>
        <button
          onClick={() => navigate(`/part/${item.partNumber}`)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
          style={{ fontWeight: 500 }}
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
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Page header */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => navigate("/bom-analysis")}
              className="text-[11px] text-[#94A3B8] hover:text-[#64748B] transition-colors uppercase tracking-wider"
            >
              BOM Analysis
            </button>
            <ChevronRight size={11} className="text-[#CBD5E1]" />
            <span className="text-[11px] text-[#64748B] uppercase tracking-wider">Cost Interventions</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[#0F2035]" style={{ fontWeight: 700 }}>Cost Interventions</h1>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">
                {filtered.length} interventions · Assembly 845-000112 · Production mode · Click a row to review
              </p>
            </div>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] transition-colors shrink-0"
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
                  className="ml-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center"
                  style={{ background: "#2563EB", fontWeight: 700 }}
                >
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero summary cards */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* 1. Annual savings opportunity */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600 }}>
                  Annual Savings Opp.
                </p>
                <TrendingDown size={13} className="text-[#CBD5E1]" />
              </div>
              <p className="text-[26px] leading-none text-[#059669]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                {fmtCurrency(fullAnnualSavingsPotential)}
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-1">at {expectedAnnualVolume.toLocaleString()} units/yr (all interventions)</p>
              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                <p className="text-[11px] text-[#64748B]">
                  BOM unit:{" "}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{fmtCurrency(currentBomCost)}</span>
                  {" → "}
                  <span className="text-[#059669]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{fmtCurrency(projectedBomCost)}</span>
                </p>
              </div>
            </div>

            {/* 2. Addressable spend */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600 }}>
                  Addressable Spend
                </p>
                <DollarSign size={13} className="text-[#CBD5E1]" />
              </div>
              <p className="text-[26px] leading-none text-[#1B3A5C]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                {fmtCurrency(addressableSpend)}
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-1">annual spend in parts with active interventions</p>
              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                <p className="text-[11px] text-[#64748B]">
                  {PRODUCTION_INTERVENTIONS.length} parts · {new Set(PRODUCTION_INTERVENTIONS.map((i) => i.subsystem)).size} subsystems
                </p>
              </div>
            </div>

            {/* 3. High-confidence count */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600 }}>
                  High-Confidence
                </p>
                <ShieldCheck size={13} className="text-[#CBD5E1]" />
              </div>
              <p className="text-[30px] leading-none text-[#1B3A5C]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                {highConfCount}
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-1">of {PRODUCTION_INTERVENTIONS.length} interventions are high-confidence</p>
              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#10B981]"
                    style={{ width: `${Math.round((highConfCount / PRODUCTION_INTERVENTIONS.length) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Applied to model */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600 }}>
                  Applied to Model
                </p>
                <BarChart2 size={13} className="text-[#CBD5E1]" />
              </div>
              <p className="text-[30px] leading-none text-[#1B3A5C]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                {appliedCount}
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-1">of {PRODUCTION_INTERVENTIONS.length} interventions active in cost model</p>
              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                {appliedCount === 0 ? (
                  <p className="text-[11px] text-[#94A3B8]">Toggle rows below to model savings</p>
                ) : (
                  <p className="text-[11px] text-[#059669]" style={{ fontWeight: 500 }}>
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
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">

                  {/* Subsystem */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider shrink-0" style={{ fontWeight: 600 }}>Subsystem</span>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white border border-[#E2E8F0]">
                      {SUBSYSTEM_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSubsystemFilter(s)}
                          className="px-2.5 py-1 rounded-md text-[11px] transition-all"
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
                    <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider shrink-0" style={{ fontWeight: 600 }}>Lever</span>
                    <select
                      value={leverFilter}
                      onChange={(e) => setLeverFilter(e.target.value)}
                      className="h-7 px-2 rounded-lg border border-[#E2E8F0] bg-white text-[11px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {LEVER_OPTIONS.map((l) => (
                        <option key={l} value={l}>{l === "All" ? "All Levers" : l}</option>
                      ))}
                    </select>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider shrink-0" style={{ fontWeight: 600 }}>Confidence</span>
                    <select
                      value={confidenceFilter}
                      onChange={(e) => setConfidenceFilter(e.target.value)}
                      className="h-7 px-2 rounded-lg border border-[#E2E8F0] bg-white text-[11px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {["All", "High", "Medium", "Low"].map((v) => (
                        <option key={v} value={v}>{v === "All" ? "All Confidence" : v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Effort */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider shrink-0" style={{ fontWeight: 600 }}>Effort</span>
                    <select
                      value={effortFilter}
                      onChange={(e) => setEffortFilter(e.target.value)}
                      className="h-7 px-2 rounded-lg border border-[#E2E8F0] bg-white text-[11px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {["All", "Low", "Medium", "High"].map((v) => (
                        <option key={v} value={v}>{v === "All" ? "All Effort" : v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min savings */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider shrink-0" style={{ fontWeight: 600 }}>Min Savings</span>
                    <select
                      value={minSavingsPct}
                      onChange={(e) => setMinSavingsPct(Number(e.target.value))}
                      className="h-7 px-2 rounded-lg border border-[#E2E8F0] bg-white text-[11px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
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
                      className="text-[11px] text-[#94A3B8] hover:text-[#475569] underline transition-colors"
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
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
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
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <p className="text-[13px] text-[#94A3B8]">No interventions match the active filters.</p>
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-[12px] text-[#2563EB] hover:underline"
                        >
                          Clear filters
                        </button>
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
                          className="cursor-pointer transition-colors group"
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
                          <td className="px-4 py-3.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px]"
                              style={{
                                background: isSelected ? "#DBEAFE" : "#F1F5F9",
                                color: isSelected ? "#1D4ED8" : "#475569",
                                fontWeight: 700,
                              }}
                            >
                              {item.rank}
                            </div>
                          </td>

                          {/* Part */}
                          <td className="px-4 py-3.5">
                            <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 500 }}>{item.partName}</p>
                            <p className="text-[10px] text-[#CBD5E1] mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {item.partNumber}
                            </p>
                          </td>

                          {/* Intervention */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-px" />
                              <span className="text-[12px] text-[#475569] leading-snug">{item.recommendedIntervention}</span>
                            </div>
                          </td>

                          {/* Unit savings */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[12px] text-[#059669]" style={{ fontWeight: 700 }}>{unitSaving}</span>
                              <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden w-16">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${midPct}%`, background: "linear-gradient(90deg, #10B981, #059669)" }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Annual @ volume */}
                          <td className="px-4 py-3.5">
                            <span
                              className="text-[12px] text-[#1E293B]"
                              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
                            >
                              {annualAmt}
                            </span>
                          </td>

                          {/* Effort */}
                          <td className="px-4 py-3.5">
                            <Badge value={item.engineeringDifficulty} styleMap={DIFFICULTY_STYLE} />
                          </td>

                          {/* Risk */}
                          <td className="px-4 py-3.5">
                            <Badge value={item.riskLevel} styleMap={RISK_STYLE} />
                          </td>

                          {/* Confidence */}
                          <td className="px-4 py-3.5">
                            <Badge value={item.confidenceLevel} styleMap={CONFIDENCE_STYLE} />
                          </td>

                          {/* Status toggle */}
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleIntervention(item.partNumber)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-all"
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
                          <td className="px-3 py-3.5">
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
              className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between"
              style={{ background: "#FAFBFD" }}
            >
              <p className="text-[11px] text-[#94A3B8]">
                Showing {filtered.length} of {PRODUCTION_INTERVENTIONS.length} interventions · Assembly 845-000112
              </p>
              <button
                onClick={() => navigate("/bom-analysis")}
                className="flex items-center gap-1 text-[11px] text-[#64748B] hover:text-[#1B3A5C] transition-colors"
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
                <div className="w-10 h-1 rounded-full bg-[#E2E8F0]" />
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
