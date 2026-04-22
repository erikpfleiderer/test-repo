import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  X,
  Search,
  AlertTriangle,
  Gem,
  Wrench,
  Info,
  ArrowUpRight,
  Package,
  DollarSign,
  ShoppingCart,
  Hammer,
  CheckCircle2,
  Edit3,
  RotateCcw,
  TrendingDown,
  Clock,
  Calendar,
  Flag,
  Square,
  CheckSquare2,
  Send,
  ShieldAlert,
  ShieldCheck,
  Microscope,
} from "lucide-react";
import {
  CANONICAL_BOM_845_000112,
  type CanonicalBomRow,
  TOTAL_BOM_PARTS,
} from "../../data/canonicalBom";
import { PRODUCTION_INTERVENTIONS } from "../../data/productionData";
import { useAppMode } from "../../context/AppModeContext";
import { useCostModel } from "../../context/CostModelContext";
import { useBuildTarget } from "../../context/BuildTargetContext";
import {
  PART_COST_DATA,
  type CostConfidence,
  fmtCurrency,
  fmtSavingsDelta,
} from "../../data/costData";
import {
  getPartLeadTime,
  getPartOrderBy,
  isPartOverdue,
  PROTOTYPE_ASSEMBLY,
  PROTOTYPE_PART_DATA,
} from "../../data/prototypeData";
import { buildPartAnalysisModel, getDFMLevelFromFeedback, type DFMLevel } from "../../data/partModel";
import { PRODUCTION_ENGINEERING_NOTES } from "../../data/productionData";

// ─── Subsystem display config ─────────────────────────────────────────────────
// (ENGINEERING_NOTES removed — use buildPartAnalysisModel().engineeringNote)
// (ANALYSIS_PAGE_PARTS removed — use buildPartAnalysisModel().hasAnalysisPage)

// ─── Subsystem display config ─────────────────────────────────────────────────
const SUBSYSTEM_ORDER = [
  "Housing / Structure", "Geartrain", "Cable Management",
  "Retention", "Shafting", "Purchased / OTS", "Other",
];

const SUBSYSTEM_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  "Housing / Structure": { dot: "#1B3A5C", bg: "#EFF4FA", text: "#1B3A5C", border: "#BFDBFE" },
  "Geartrain":          { dot: "#2B6CB0", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
  "Cable Management":   { dot: "#0891B2", bg: "#F0F9FF", text: "#0C4A6E", border: "#BAE6FD" },
  "Retention":          { dot: "#7C3AED", bg: "#F5F3FF", text: "#4C1D95", border: "#C4B5FD" },
  "Shafting":           { dot: "#059669", bg: "#F0FDF4", text: "#065F46", border: "#BBF7D0" },
  "Purchased / OTS":    { dot: "#64748B", bg: "#F8FAFC", text: "#334155", border: "#E2E8F0" },
  "Other":              { dot: "#94A3B8", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
};

// ─── Confidence badge ─────────────────────────────────────────────────────────
const CONFIDENCE_STYLE: Record<CostConfidence, { bg: string; text: string; border: string; dot: string }> = {
  High:   { bg: "#F0FDF4", text: "#065F46", border: "#BBF7D0", dot: "#10B981" },
  Medium: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#D97706" },
  Low:    { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3", dot: "#F43F5E" },
};

function ConfidenceBadge({ level }: { level: CostConfidence }) {
  const s = CONFIDENCE_STYLE[level];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
      style={{ background: s.bg, color: s.text, borderColor: s.border, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {level}
    </span>
  );
}

function SubsystemBadge({ value }: { value: string }) {
  const s = SUBSYSTEM_COLORS[value] ?? { dot: "#64748B", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px]"
      style={{ background: s.bg, color: s.text, borderColor: s.border, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, whiteSpace: "nowrap" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {value}
    </span>
  );
}

function MakeBuyBadge({ value }: { value: "Make" | "Buy" }) {
  const isMake = value === "Make";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px]"
      style={{
        background: isMake ? "#EFF4FA" : "#F0FDF4",
        color:      isMake ? "#1B3A5C" : "#065F46",
        borderColor:isMake ? "#BFDBFE" : "#BBF7D0",
        fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
      }}
    >
      {isMake ? <Hammer size={10} /> : <ShoppingCart size={10} />}
      {value}
    </span>
  );
}

// ─── Prototype indicator helpers ─────────────────────────────────────────────

type ProdReadinessLevel = "block" | "flag" | "watch" | "clear" | "none";

function getProdReadinessLevel(partNumber: string): ProdReadinessLevel {
  const rec = PROTOTYPE_PART_DATA[partNumber];
  if (!rec) return "none";
  const sigs = rec.manufacturingRiskSignals;
  if (sigs.some((s) => s.severity === "Block")) return "block";
  if (sigs.some((s) => s.severity === "Flag"))  return "flag";
  if (sigs.some((s) => s.severity === "Watch")) return "watch";
  return rec.functionalRisk.clearToBuild ? "clear" : "watch";
}

const DFM_INDICATOR: Record<DFMLevel, { color: string; bg: string; border: string; title: string }> = {
  high:   { color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3", title: "DFM: High risk" },
  medium: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "DFM: Medium risk" },
  low:    { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", title: "DFM: Low risk" },
  none:   { color: "#CBD5E1", bg: "transparent", border: "transparent", title: "DFM: No data" },
};

const PROD_READINESS_INDICATOR: Record<ProdReadinessLevel, { color: string; bg: string; border: string; title: string }> = {
  block: { color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3", title: "Prod readiness: Blocker" },
  flag:  { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "Prod readiness: Flag" },
  watch: { color: "#94A3B8", bg: "#F8FAFC", border: "#E2E8F0", title: "Prod readiness: Watch" },
  clear: { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", title: "Prod readiness: Clear" },
  none:  { color: "#CBD5E1", bg: "transparent", border: "transparent", title: "Prod readiness: No data" },
};

function GroupHeader({ label, count, extCost, protoMode = false }: { label: string; count: number; extCost: number | null; protoMode?: boolean }) {
  const s = SUBSYSTEM_COLORS[label] ?? { dot: "#64748B", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
  return (
    <tr>
      <td
        colSpan={protoMode ? 14 : 10}
        className="px-4 py-2"
        style={{ background: s.bg, borderBottom: `1px solid ${s.border}`, borderTop: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
            <span
              className="text-[11px] uppercase tracking-wider"
              style={{ color: s.text, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, letterSpacing: "0.06em" }}
            >
              {label}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: `${s.dot}1A`, color: s.dot, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
            >
              {count} parts
            </span>
          </div>
          {extCost != null && extCost > 0 && (
            <span className="text-[11px]" style={{ color: s.text, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, opacity: 0.7 }}>
              {fmtCurrency(extCost)}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Inline cost editor ───────────────────────────────────────────────────────

function InlineCostEditor({
  partNumber,
  baseValue,
  overrideValue,
  qty,
  onSave,
  onClear,
}: {
  partNumber: string;
  baseValue: number | null;
  overrideValue: number | undefined;
  qty: number;
  onSave: (v: number) => void;
  onClear: () => void;
}) {
  const isOverridden = overrideValue !== undefined;
  const displayVal = overrideValue ?? baseValue;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(displayVal ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(String(displayVal ?? ""));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 500 }}>
          Unit Cost
          {isOverridden && (
            <span className="ml-2 text-[10px] text-[#D97706]" style={{ fontWeight: 600 }}>OVERRIDDEN</span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          {isOverridden && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#94A3B8] hover:text-[#F43F5E] transition-colors border border-[#E2E8F0] hover:border-[#FECDD3]"
              title="Restore original"
            >
              <RotateCcw size={9} />
              Reset
            </button>
          )}
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#64748B] hover:text-[#1B3A5C] transition-colors border border-[#E2E8F0] hover:border-[#BFDBFE]"
            >
              <Edit3 size={9} />
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[13px]">$</span>
            <input
              ref={inputRef}
              type="number"
              min={0}
              step={0.01}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              className="w-full h-8 pl-6 pr-3 rounded-lg border border-[#93C5FD] text-[13px] text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            />
          </div>
          <button
            onClick={commit}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1B3A5C] hover:bg-[#162F4A] transition-colors"
          >
            <CheckCircle2 size={14} color="white" />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors text-[#94A3B8]"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div
            className="rounded-lg border p-3 cursor-pointer hover:border-[#93C5FD] transition-colors"
            style={{ borderColor: isOverridden ? "#93C5FD" : "#E2E8F0", background: isOverridden ? "#EFF6FF" : "white" }}
            onClick={startEdit}
          >
            <p className="text-[10px] text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>Per Unit</p>
            <p className="text-[20px] leading-none" style={{ color: isOverridden ? "#1D4ED8" : "#1B3A5C", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
              {displayVal != null ? fmtCurrency(displayVal) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] p-3">
            <p className="text-[10px] text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>Extended ({qty}×)</p>
            <p className="text-[20px] leading-none text-[#1B3A5C]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
              {displayVal != null ? fmtCurrency(qty * displayVal) : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drawer helpers ───────────────────────────────────────────────────────────

function DrawerSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2"
      style={{ fontWeight: 600, letterSpacing: "0.08em" }}
    >
      {children}
    </p>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({
  part,
  onClose,
}: {
  part: CanonicalBomRow;
  onClose: () => void;
}) {
  const navigate  = useNavigate();
  const { mode }  = useAppMode();
  const protoMode = mode === "prototype";

  const {
    setCostOverride,
    clearCostOverride,
    costOverrides,
    selectedInterventions,
    expectedAnnualVolume,
  } = useCostModel();

  const { buildTargetDate, estimatedBuildDays, criticalPathParts } = useBuildTarget();

  // ── Single model build — all derived data from one place ──────────────────
  const model = buildPartAnalysisModel(part.partNumber, {
    costOverrides,
    selectedInterventions,
    expectedAnnualVolume,
    buildTargetDate,
    estimatedBuildDays,
    criticalPathParts,
  });

  const subsystemColor = SUBSYSTEM_COLORS[part.subsystem] ?? { dot: "#64748B", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
  const isExcluded     = model.excludeFromRollup;
  const hasAnalysisPage = model.hasAnalysisPage;

  // Prototype-only references (null-safe in production)
  const protoRec        = protoMode ? model.prototypeDetail      : null;
  const dfmFeedback     = protoMode ? model.dfmFeedback          : null;
  const simplification  = protoMode ? model.simplification       : null;
  const blocker         = protoMode ? model.buildBlocker         : null;
  const prodRiskSignals = protoMode ? model.manufacturingRiskSignals : [];

  // Projected saving indicator
  const hasProjectedSaving =
    model.isInterventionSelected &&
    model.unitSaving != null &&
    model.unitSaving > 0 &&
    model.unitCostEffective != null &&
    model.unitCostProjected != null;

  return (
    <div
      className="w-full xl:w-[340px] xl:shrink-0 bg-white xl:border-l border-[#E2E8F0] flex flex-col xl:h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >

      {/* ── Header ── */}
      <div
        className="px-5 py-4 border-b border-[#E2E8F0] shrink-0 flex items-start justify-between"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#0F2035] leading-snug" style={{ fontWeight: 600 }}>
            {part.name}
          </p>
          <p
            className="text-[11px] text-[#94A3B8] mt-0.5"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {part.partNumber}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <SubsystemBadge value={part.subsystem} />
            <MakeBuyBadge value={part.makeBuy} />
            {model.unitCostConfidence && !isExcluded && <ConfidenceBadge level={model.unitCostConfidence} />}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-3 w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 flex flex-col gap-5">

          {/* Specs strip */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Qty",      value: String(part.qty) },
              { label: "Category", value: part.itemCategory.replace("COTS, Standard Hardware", "COTS/OTS") },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[#E2E8F0] p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>{item.label}</p>
                <p className="text-[11px] text-[#1E293B] leading-snug" style={{ fontWeight: 600 }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Excluded notice */}
          {isExcluded && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-[#FDE68A]" style={{ background: "#FFFBEB" }}>
              <Info size={13} color="#D97706" className="shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#92400E]">Documentation only — excluded from cost rollups.</p>
            </div>
          )}

          {/* Design Intent */}
          {model.engineeringNote?.designIntent && (
            <div>
              <DrawerSectionLabel>Design Intent</DrawerSectionLabel>
              <div className="flex items-start gap-2.5">
                <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: subsystemColor.dot }} />
                <p className="text-[12px] text-[#1E293B] leading-relaxed">{model.engineeringNote.designIntent}</p>
              </div>
            </div>
          )}

          {/* Manufacturing */}
          {model.engineeringNote && (
            <div>
              <DrawerSectionLabel>Manufacturing</DrawerSectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[#E2E8F0] p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Gem size={10} color="#94A3B8" />
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider" style={{ fontWeight: 500 }}>Material</span>
                  </div>
                  <p className="text-[11px] text-[#1E293B]" style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{model.engineeringNote.material}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Wrench size={10} color="#94A3B8" />
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider" style={{ fontWeight: 500 }}>Process</span>
                  </div>
                  <p className="text-[11px] text-[#1E293B] leading-snug" style={{ fontWeight: 500 }}>{model.engineeringNote.manufacturingProcess}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cost */}
          {model.unitCostBase != null && !isExcluded && (
            <div>
              <DrawerSectionLabel>Cost</DrawerSectionLabel>
              <InlineCostEditor
                partNumber={part.partNumber}
                baseValue={model.unitCostBase}
                overrideValue={costOverrides[part.partNumber]}
                qty={model.qty}
                onSave={(v) => setCostOverride(part.partNumber, v)}
                onClear={() => clearCostOverride(part.partNumber)}
              />
              {hasProjectedSaving && (
                <div className="rounded-lg border border-[#BBF7D0] px-3 py-2.5 mt-2" style={{ background: "#F0FDF4" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown size={11} color="#10B981" />
                    <p className="text-[10px] uppercase tracking-wider text-[#16A34A]" style={{ fontWeight: 500 }}>Projected w/ interventions</p>
                  </div>
                  <p className="text-[16px] text-[#059669] leading-none" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fmtCurrency(model.unitCostProjected!)}
                    <span className="ml-2 text-[11px]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
                      saves {fmtSavingsDelta(model.unitCostEffective!, model.unitCostProjected!)}
                    </span>
                  </p>
                </div>
              )}
              {model.costNotes && (
                <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-2">{model.costNotes}</p>
              )}
            </div>
          )}

          {/* Cost Drivers */}
          {model.engineeringNote?.costDrivers && model.engineeringNote.costDrivers.length > 0 && (
            <div>
              <DrawerSectionLabel>Cost Drivers</DrawerSectionLabel>
              <div className="flex flex-col gap-1.5">
                {model.engineeringNote.costDrivers.map((d) => (
                  <div
                    key={d}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#FDE68A]"
                    style={{ background: "#FFFBEB" }}
                  >
                    <AlertTriangle size={11} color="#D97706" className="shrink-0" />
                    <span className="text-[11px] text-[#92400E]" style={{ fontWeight: 500 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Prototype-only sections ── */}
          {protoMode && (
            <>
              {/* Build Blocker */}
              {blocker && (
                <div
                  className="rounded-lg border px-3 py-3"
                  style={{
                    background:   blocker.isHardBlocker ? "#FFF1F2" : "#FFFBEB",
                    borderColor:  blocker.isHardBlocker ? "#FECDD3" : "#FDE68A",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={12} color={blocker.isHardBlocker ? "#E11D48" : "#D97706"} />
                    <span
                      className="text-[10px] uppercase tracking-wider"
                      style={{ fontWeight: 600, color: blocker.isHardBlocker ? "#E11D48" : "#D97706" }}
                    >
                      {blocker.isHardBlocker ? "Hard Blocker" : "Conditional Blocker"}
                    </span>
                  </div>
                  <p
                    className="text-[12px] leading-snug mb-2"
                    style={{ color: blocker.isHardBlocker ? "#9F1239" : "#92400E", fontWeight: 500 }}
                  >
                    {blocker.description}
                  </p>
                  <p className="text-[11px] text-[#64748B] leading-snug">
                    <span style={{ fontWeight: 600 }}>Action: </span>{blocker.resolution}
                  </p>
                </div>
              )}

              {/* DFM Opportunities */}
              {dfmFeedback && (
                <div>
                  <DrawerSectionLabel>DFM Opportunities</DrawerSectionLabel>
                  <div className="rounded-lg border border-[#E2E8F0] p-3 flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Signal</p>
                      <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 500 }}>{dfmFeedback.geometrySignal ?? dfmFeedback.geometryIssues[0] ?? "See Part Analysis for details"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Recommendation</p>
                      <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 500 }}>{dfmFeedback.primaryRecommendation ?? dfmFeedback.recommendations[0] ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-[#F1F5F9]">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
                        style={{
                          background:   dfmFeedback.riskLevel === "High" ? "#FFF1F2" : dfmFeedback.riskLevel === "Medium" ? "#FFFBEB" : "#F0FDF4",
                          color:        dfmFeedback.riskLevel === "High" ? "#E11D48" : dfmFeedback.riskLevel === "Medium" ? "#D97706" : "#059669",
                          borderColor:  dfmFeedback.riskLevel === "High" ? "#FECDD3" : dfmFeedback.riskLevel === "Medium" ? "#FDE68A" : "#BBF7D0",
                          fontWeight: 600,
                        }}
                      >
                        {dfmFeedback.riskLevel} risk
                      </span>
                      {dfmFeedback.iterationGain && (
                        <span className="text-[11px] text-[#64748B]">{dfmFeedback.iterationGain}</span>
                      )}
                    </div>
                    {/* CTA: open this part in the DFM workspace */}
                    <button
                      onClick={() => navigate(`/dfm-opportunities?part=${part.partNumber}&process=${encodeURIComponent(dfmFeedback.process)}`)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] hover:bg-indigo-100 hover:border-indigo-300 transition-colors group"
                      style={{ fontWeight: 500 }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Microscope size={11} className="shrink-0" />
                        <span>Inspect in DFM Workspace</span>
                      </div>
                      <ArrowUpRight size={11} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Iteration Simplification */}
              {simplification && (
                <div>
                  <DrawerSectionLabel>Iteration Simplification</DrawerSectionLabel>
                  <div className="rounded-lg border border-[#E2E8F0] p-3 flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Friction</p>
                      <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 500 }}>{simplification.primaryIterationFriction}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Simplification path</p>
                      <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 500 }}>{simplification.simplificationPath}</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#F1F5F9]">
                      <Clock size={11} color="#059669" />
                      <span className="text-[11px] text-[#059669]" style={{ fontWeight: 600 }}>
                        saves ~{simplification.leadTimeSavingsDays}d lead time
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Production Risk Signals */}
              {prodRiskSignals.length > 0 && (
                <div>
                  <DrawerSectionLabel>Production Risk Signals</DrawerSectionLabel>
                  <div className="flex flex-col gap-2">
                    {prodRiskSignals.map((sig, i) => {
                      const sc =
                        sig.severity === "Block"
                          ? { bg: "#FFF1F2", border: "#FECDD3", text: "#E11D48", dot: "#E11D48" }
                          : sig.severity === "Flag"
                          ? { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#D97706" }
                          : { bg: "#F8FAFC", border: "#E2E8F0", text: "#64748B", dot: "#94A3B8" };
                      return (
                        <div
                          key={i}
                          className="rounded-lg border p-2.5"
                          style={{ background: sc.bg, borderColor: sc.border }}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
                              style={{ background: "white", color: sc.text, borderColor: sc.border, fontWeight: 600 }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                              {sig.severity}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>{sig.category}</span>
                          </div>
                          <p className="text-[11px] text-[#1E293B] leading-snug mb-1.5" style={{ fontWeight: 500 }}>{sig.signal}</p>
                          <p className="text-[10px] text-[#64748B] leading-snug">
                            <span style={{ fontWeight: 600 }}>Mitigation: </span>{sig.mitigation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── CTA footer ── */}
      <div className="shrink-0 px-5 py-4 border-t border-[#E2E8F0] flex flex-col gap-2" style={{ background: "#FAFBFD" }}>
        {/* Intervention opportunity — production mode only */}
        {(() => {
          const intervention = !protoMode
            ? PRODUCTION_INTERVENTIONS.find((i) => i.partNumber === part.partNumber)
            : null;
          if (!intervention) return null;
          return (
            <button
              onClick={() => navigate("/cost-interventions")}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#BBF7D0] hover:border-[#86EFAC] transition-colors group"
              style={{ background: "#F0FDF4" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <TrendingDown size={12} color="#16A34A" className="shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-[11px] text-[#065F46] leading-none" style={{ fontWeight: 600 }}>
                    {intervention.recommendedIntervention}
                  </p>
                  <p className="text-[10px] text-[#16A34A] mt-0.5">
                    {intervention.estimatedSavings} savings · Rank #{intervention.rank}
                  </p>
                </div>
              </div>
              <ArrowUpRight size={12} color="#16A34A" className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          );
        })()}

        {hasAnalysisPage ? (
          <button
            onClick={() => navigate(`/part/${part.partNumber}`)}
            className="w-full flex items-start justify-between px-4 py-3 rounded-xl bg-[#1B3A5C] text-white hover:bg-[#162F4A] transition-colors group"
          >
            <div className="text-left">
              <p className="text-[13px] text-white" style={{ fontWeight: 600 }}>Open full part analysis</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Design intent · manufacturing · cost drivers</p>
            </div>
            <ArrowUpRight size={14} className="shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <div className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-[#E2E8F0]" style={{ background: "white" }}>
            <Info size={12} className="text-[#CBD5E1] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-[#64748B]" style={{ fontWeight: 500 }}>Deep dive not yet available</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">Full analysis available for custom-manufactured parts only.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Group rows wrapper (avoids Fragment receiving Figma inspector data-* props) ─
function GroupRows({
  subsystem,
  parts,
  selectedLineId,
  costOverrides,
  getEffectiveUnitCost,
  onSelect,
  protoMode = false,
  headerless = false,
  buildTargetDate,
  estimatedBuildDays,
  criticalPathSet,
  onToggleCriticalPath,
  selectedParts,
  onTogglePartSelect,
}: {
  subsystem: string;
  parts: CanonicalBomRow[];
  selectedLineId: number | null;
  costOverrides: Record<string, number>;
  getEffectiveUnitCost: (pn: string) => number | null;
  onSelect: (id: number | null) => void;
  protoMode?: boolean;
  headerless?: boolean;
  buildTargetDate?: string;
  estimatedBuildDays?: number;
  criticalPathSet?: ReadonlySet<string>;
  onToggleCriticalPath?: (partNumber: string) => void;
  selectedParts: Set<string>;
  onTogglePartSelect: (partNumber: string) => void;
}) {
  const groupExtCost = (() => {
    let sum = 0;
    for (const p of parts) {
      const rec = PART_COST_DATA[p.partNumber];
      if (!rec || rec.excludeFromRollup) continue;
      const u = getEffectiveUnitCost(p.partNumber);
      if (u != null) sum += p.qty * u;
    }
    return sum;
  })();

  return (
    <>
      {!headerless && <GroupHeader label={subsystem} count={parts.length} extCost={groupExtCost} protoMode={protoMode} />}
      {parts.map((part, idx) => {
        const isSelected = selectedLineId === part.bomLineId;
        const isEven = idx % 2 === 0;
        const costRec = PART_COST_DATA[part.partNumber];
        const isExcluded = costRec?.excludeFromRollup;
        const unitCost = getEffectiveUnitCost(part.partNumber);
        const extCost = unitCost != null && !isExcluded ? part.qty * unitCost : null;
        const isOverridden = part.partNumber in costOverrides;

        // Prototype-mode sourcing columns
        const leadTimeDays = protoMode ? getPartLeadTime(part.partNumber) : null;
        const orderBy = protoMode ? getPartOrderBy(part.partNumber, buildTargetDate, estimatedBuildDays) : null;
        const isOverdue = orderBy?.isOverdue ?? false;
        const isCriticalPath = protoMode && (criticalPathSet?.has(part.partNumber) ?? false);

        return (
          <motion.tr
            key={part.bomLineId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: idx * 0.01 }}
            onClick={() => onSelect(isSelected ? null : part.bomLineId)}
            className="cursor-pointer transition-colors group"
            style={{
              background: isSelected ? "#EFF6FF" : isCriticalPath ? "#FFF8F8" : isOverdue ? "#FFF8F8" : isEven ? "#FFFFFF" : "#FAFBFD",
              borderBottom: "1px solid #F1F5F9",
              borderLeft: isSelected
                ? "3px solid #2563EB"
                : isCriticalPath
                ? "3px solid #E11D48"
                : isOverdue
                ? "3px solid #FECDD3"
                : "3px solid transparent",
            }}
          >
            {/* Select checkbox */}
            <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onTogglePartSelect(part.partNumber)}
                className="flex items-center justify-center w-full"
                title={selectedParts.has(part.partNumber) ? "Deselect" : "Select for ordering"}
              >
                {selectedParts.has(part.partNumber)
                  ? <CheckSquare2 size={14} color="#2563EB" />
                  : <Square size={14} color="#CBD5E1" />}
              </button>
            </td>
            {/* # */}
            <td className="px-3 py-2.5">
              <span className="text-[10px] text-[#CBD5E1]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{part.bomLineId}</span>
            </td>
            {/* Part — combined name + part number */}
            <td className="px-3 py-2.5">
              <span
                className="text-[13px] text-[#1E293B] leading-snug"
                style={{ fontWeight: 500, display: "block" }}
              >
                {part.name}
              </span>
              <span
                className="text-[11px] text-[#94A3B8] mt-0.5"
                style={{ fontFamily: "'IBM Plex Mono', monospace", display: "block" }}
              >
                {part.partNumber}
              </span>
            </td>
            {/* Category */}
            <td className="px-3 py-2.5">
              <span className="text-[10px] text-[#64748B] leading-snug" style={{ display: "block" }}>
                {part.itemCategory.replace("COTS, Standard Hardware", "COTS/OTS")}
              </span>
            </td>
            {/* Material */}
            <td className="px-3 py-2.5">
              {PRODUCTION_ENGINEERING_NOTES[part.partNumber]?.material ? (
                <span
                  className="text-[10px] text-[#475569] leading-snug"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", display: "block" }}
                >
                  {PRODUCTION_ENGINEERING_NOTES[part.partNumber]!.material}
                </span>
              ) : (
                <span className="text-[11px] text-[#CBD5E1]">—</span>
              )}
            </td>
            {/* Qty */}
            <td className="px-3 py-2.5">
              <span className="text-[12px] text-[#1E293B]" style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{part.qty}</span>
            </td>
            {/* Make/Buy */}
            <td className="px-3 py-2.5">
              <MakeBuyBadge value={part.makeBuy} />
            </td>
            {/* Lead Time — prototype mode only */}
            {protoMode && (
              <td className="px-3 py-2.5">
                {leadTimeDays != null ? (
                  <div className="flex items-center gap-1">
                    <Clock
                      size={10}
                      style={{
                        color: leadTimeDays >= 21 ? "#E11D48" : leadTimeDays >= 14 ? "#D97706" : "#059669",
                      }}
                    />
                    <span
                      className="text-[12px]"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 600,
                        color: leadTimeDays >= 21 ? "#E11D48" : leadTimeDays >= 14 ? "#D97706" : "#059669",
                      }}
                    >
                      {leadTimeDays}d
                    </span>
                  </div>
                ) : (
                  <span className="text-[12px] text-[#CBD5E1]">—</span>
                )}
              </td>
            )}
            {/* Order By — prototype mode only */}
            {protoMode && (
              <td className="px-3 py-2.5">
                {orderBy ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <Calendar
                        size={9}
                        style={{ color: isOverdue ? "#E11D48" : orderBy.daysUntilDeadline <= 3 ? "#D97706" : "#94A3B8" }}
                      />
                      <span
                        className="text-[11px]"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 600,
                          color: isOverdue ? "#E11D48" : orderBy.daysUntilDeadline <= 3 ? "#D97706" : "#475569",
                        }}
                      >
                        {orderBy.orderByDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span
                      className="text-[10px]"
                      style={{
                        color: isOverdue ? "#E11D48" : orderBy.daysUntilDeadline <= 3 ? "#D97706" : "#94A3B8",
                        fontWeight: isOverdue || orderBy.daysUntilDeadline <= 3 ? 600 : 400,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      }}
                    >
                      {isOverdue
                        ? `${Math.abs(orderBy.daysUntilDeadline)}d overdue`
                        : orderBy.daysUntilDeadline === 0
                        ? "order today"
                        : `${orderBy.daysUntilDeadline}d left`}
                    </span>
                  </div>
                ) : (
                  <span className="text-[12px] text-[#CBD5E1]">—</span>
                )}
              </td>
            )}
            {/* DFM indicator — prototype mode only */}
            {protoMode && (() => {
              const level = getDFMLevelFromFeedback(buildPartAnalysisModel(part.partNumber).dfmFeedback);
              const s     = DFM_INDICATOR[level];
              return (
                <td className="px-2 py-2.5" title={s.title}>
                  <div className="flex items-center justify-center">
                    {level === "none" ? (
                      <span className="text-[10px] text-[#CBD5E1]">—</span>
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                      >
                        {level === "low" ? (
                          <CheckCircle2 size={10} style={{ color: s.color }} />
                        ) : (
                          <AlertTriangle size={10} style={{ color: s.color }} />
                        )}
                      </div>
                    )}
                  </div>
                </td>
              );
            })()}
            {/* Prod Readiness indicator — prototype mode only */}
            {protoMode && (() => {
              const level = getProdReadinessLevel(part.partNumber);
              const s     = PROD_READINESS_INDICATOR[level];
              return (
                <td className="px-2 py-2.5" title={s.title}>
                  <div className="flex items-center justify-center">
                    {level === "none" ? (
                      <span className="text-[10px] text-[#CBD5E1]">—</span>
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                      >
                        {level === "clear" ? (
                          <ShieldCheck size={10} style={{ color: s.color }} />
                        ) : (
                          <ShieldAlert size={10} style={{ color: s.color }} />
                        )}
                      </div>
                    )}
                  </div>
                </td>
              );
            })()}
            {/* Unit Cost */}
            <td className="px-3 py-2.5">
              {isExcluded ? (
                <span className="text-[11px] text-[#CBD5E1] italic">—</span>
              ) : unitCost != null ? (
                <span
                  className="text-[12px]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: isOverridden ? "#1D4ED8" : "#1E293B" }}
                >
                  {fmtCurrency(unitCost)}
                  {isOverridden && <span className="ml-1 text-[9px] text-[#3B82F6]">✎</span>}
                </span>
              ) : (
                <span className="text-[12px] text-[#CBD5E1]">—</span>
              )}
            </td>
            {/* Ext. Cost */}
            <td className="px-3 py-2.5">
              {extCost != null ? (
                <span className="text-[12px] text-[#059669]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                  {fmtCurrency(extCost)}
                </span>
              ) : (
                <span className="text-[12px] text-[#CBD5E1]">—</span>
              )}
            </td>
            {/* Expand chevron */}
            <td className="px-2 py-2.5">
              <ChevronRight
                size={13}
                className="text-[#CBD5E1] group-hover:text-[#94A3B8] transition-colors"
                style={isSelected ? { color: "#2563EB" } : {}}
              />
            </td>
          </motion.tr>
        );
      })}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const SUBSYSTEM_OPTIONS = ["All", ...SUBSYSTEM_ORDER];
const MAKEBUY_OPTIONS   = ["All", "Make", "Buy"];

export function BOMAnalysis() {
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [subsystemFilter,    setSubsystemFilter]    = useState("All");
  const [makeBuyFilter,      setMakeBuyFilter]      = useState("All");
  const [sortBy,             setSortBy]             = useState<"default" | "leadTime">("default");
  const [filterCriticalPath, setFilterCriticalPath] = useState(false);
  const [filterOverdue,      setFilterOverdue]      = useState(false);
  const [selectedParts,      setSelectedParts]      = useState<Set<string>>(new Set());
  const [fictivSent,         setFictivSent]         = useState(false);

  const navigate = useNavigate();
  const { mode } = useAppMode();
  const { buildTargetDate, estimatedBuildDays, criticalPathParts, toggleCriticalPath, buildQuantity } = useBuildTarget();
  const protoMode = mode === "prototype";

  // Build a Set once per render for O(1) lookups throughout this component
  const activeCriticalPathSet = useMemo(
    () => new Set(criticalPathParts),
    [criticalPathParts]
  );

  const {
    hasMissingCosts,
    currentBomCost,
    projectedBomCost,
    fullProjectedBomCost,
    annualSavingsPotential,
    fullAnnualSavingsPotential,
    expectedAnnualVolume,
    getEffectiveUnitCost,
    costOverrides,
  } = useCostModel();

  const filtered = useMemo(() => {
    return CANONICAL_BOM_845_000112.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.partNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.subsystem.toLowerCase().includes(q) ||
        p.itemCategory.toLowerCase().includes(q);
      const matchSub  = subsystemFilter === "All" || p.subsystem === subsystemFilter;
      const matchMake = makeBuyFilter   === "All" || p.makeBuy   === makeBuyFilter;
      const matchCP   = !filterCriticalPath || activeCriticalPathSet.has(p.partNumber);
      const matchOD   = !filterOverdue || isPartOverdue(p.partNumber, buildTargetDate, estimatedBuildDays);
      return matchSearch && matchSub && matchMake && matchCP && matchOD;
    });
  }, [searchQuery, subsystemFilter, makeBuyFilter, filterCriticalPath, filterOverdue, buildTargetDate, estimatedBuildDays, activeCriticalPathSet]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, CanonicalBomRow[]> = {};
    for (const sub of SUBSYSTEM_ORDER) {
      const parts = filtered.filter((p) => p.subsystem === sub);
      if (parts.length > 0) groups[sub] = parts;
    }
    return groups;
  }, [filtered]);

  // Prototype: flat sorted list for lead-time view
  const sortedFlat = useMemo(() => {
    if (!protoMode || sortBy === "default") return null;
    return [...filtered].sort((a, b) => {
      const aLt = getPartLeadTime(a.partNumber) ?? 0;
      const bLt = getPartLeadTime(b.partNumber) ?? 0;
      return bLt - aLt;
    });
  }, [filtered, protoMode, sortBy]);

  // Prototype summary stats (computed once over the full BOM, not the filtered view)
  const criticalPathCount = protoMode ? activeCriticalPathSet.size : 0;
  const overdueCount = protoMode
    ? CANONICAL_BOM_845_000112.filter((p) => isPartOverdue(p.partNumber, buildTargetDate, estimatedBuildDays)).length
    : 0;

  const makeParts = CANONICAL_BOM_845_000112.filter((p) => p.makeBuy === "Make").length;
  const buyParts  = CANONICAL_BOM_845_000112.filter((p) => p.makeBuy === "Buy").length;

  // Part selection helpers
  const allFilteredPartNumbers = (sortedFlat ?? Object.values(groupedRows).flat()).map((p) => p.partNumber);
  const allSelected = allFilteredPartNumbers.length > 0 && allFilteredPartNumbers.every((pn) => selectedParts.has(pn));
  const someSelected = !allSelected && allFilteredPartNumbers.some((pn) => selectedParts.has(pn));

  const togglePartSelect = (partNumber: string) => {
    setSelectedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partNumber)) next.delete(partNumber);
      else next.add(partNumber);
      return next;
    });
    setFictivSent(false);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(allFilteredPartNumbers));
    }
    setFictivSent(false);
  };

  const handleSendToFictiv = () => {
    // Hypothetical: in a real integration this would POST to Fictiv's order API.
    setFictivSent(true);
    setTimeout(() => {
      setSelectedParts(new Set());
      setFictivSent(false);
    }, 2500);
  };
  const selectedPart = selectedLineId != null
    ? CANONICAL_BOM_845_000112.find((p) => p.bomLineId === selectedLineId) ?? null
    : null;

  const hasSavings = projectedBomCost < currentBomCost;

  // ── Prototype hero derived values ─────────────────────────────────────────
  const effectiveBuildTarget = buildTargetDate || PROTOTYPE_ASSEMBLY.nextBuildTargetDate || null;
  const daysToTarget = (() => {
    if (!effectiveBuildTarget) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(effectiveBuildTarget); target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  })();
  const totalBlockerCount = PROTOTYPE_ASSEMBLY.blockers.length;
  const hardBlockerCount  = PROTOTYPE_ASSEMBLY.blockers.filter((b) => b.isHardBlocker).length;
  const topHardBlocker    = PROTOTYPE_ASSEMBLY.blockers.find((b) => b.isHardBlocker) ?? null;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0F2035]" style={{ fontWeight: 700 }}>BOM Analysis</h1>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">
                {TOTAL_BOM_PARTS} parts · Assembly 845-000112 · Click a row to inspect · open the panel CTA to deep dive
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!protoMode && (
                <button
                  onClick={() => navigate("/cost-interventions")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] hover:border-[#1B3A5C]/30 hover:bg-[#EFF4FA] hover:text-[#1B3A5C] transition-colors"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
                >
                  <TrendingDown size={12} />
                  Cost Interventions
                </button>
              )}
              {protoMode && (
                <button
                  onClick={() => navigate("/dfm-opportunities")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
                >
                  <Microscope size={12} />
                  DFM Workspace
                </button>
              )}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]"
                style={{ background: "#F8FAFC" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-[11px] text-[#64748B]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>845-000112</span>
              </div>
            </div>
          </div>
        </div>

        {/* Missing costs banner */}
        {hasMissingCosts && (
          <div className="mx-6 mt-4 shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-lg border border-[#FDE68A]" style={{ background: "#FFFBEB" }}>
            <AlertTriangle size={14} color="#D97706" className="shrink-0" />
            <p className="text-[12px] text-[#92400E]">Some unit costs are missing — click any row and edit inline to add estimates.</p>
          </div>
        )}

        {/* ── Hero summary ── */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* 1. Parts Overview — shared composite card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Assembly Parts</p>
                <Package size={13} className="text-[#CBD5E1]" />
              </div>
              <div className="flex-1">
                <p className="text-[30px] leading-none text-[#0F2035]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {TOTAL_BOM_PARTS}
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-1">line items · 845-000112</p>
              </div>
              <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Hammer size={11} color="#2B6CB0" />
                    <span className="text-[12px] text-[#64748B]" style={{ fontWeight: 500 }}>Make</span>
                  </div>
                  <span className="text-[12px] text-[#1B3A5C]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{makeParts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart size={11} color="#059669" />
                    <span className="text-[12px] text-[#64748B]" style={{ fontWeight: 500 }}>Buy / OTS</span>
                  </div>
                  <span className="text-[12px] text-[#059669]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{buyParts}</span>
                </div>
              </div>
            </div>

            {/* 2–4. Mode-specific cards */}
            {protoMode ? (
              <>
                {/* Next Build Target */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Next Build Target</p>
                    <Calendar size={13} className="text-[#CBD5E1]" />
                  </div>
                  <div className="flex-1">
                    {effectiveBuildTarget ? (
                      <>
                        <p className="text-[26px] leading-none text-[#0F2035]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {new Date(effectiveBuildTarget + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">
                          {new Date(effectiveBuildTarget + "T00:00:00").getFullYear()}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[26px] leading-none text-[#CBD5E1]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>—</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">not set</p>
                      </>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                    {daysToTarget != null ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border"
                        style={{
                          background:  daysToTarget < 0 ? "#FFF1F2" : daysToTarget <= 7 ? "#FFFBEB" : "#F0FDF4",
                          color:       daysToTarget < 0 ? "#E11D48" : daysToTarget <= 7 ? "#92400E" : "#065F46",
                          borderColor: daysToTarget < 0 ? "#FECDD3" : daysToTarget <= 7 ? "#FDE68A" : "#BBF7D0",
                          fontWeight: 600,
                          fontFamily: "'IBM Plex Sans', sans-serif",
                        }}
                      >
                        <Clock size={10} />
                        {daysToTarget < 0 ? `${Math.abs(daysToTarget)}d past` : daysToTarget === 0 ? "today" : `${daysToTarget}d away`}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8]">No target date set</span>
                    )}
                  </div>
                </div>

                {/* Build Cost */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Build Cost</p>
                    <DollarSign size={13} className="text-[#CBD5E1]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[26px] leading-none text-[#0F2035]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {fmtCurrency(currentBomCost * buildQuantity)}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      {buildQuantity} unit{buildQuantity !== 1 ? "s" : ""} · prototype build
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#94A3B8]">Unit cost</span>
                      <span className="text-[11px] text-[#1E293B]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{fmtCurrency(currentBomCost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#94A3B8]">Qty</span>
                      <span className="text-[11px] text-[#1E293B]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>× {buildQuantity}</span>
                    </div>
                  </div>
                </div>

                {/* Order Overdue */}
                <div
                  className="rounded-xl border p-4 flex flex-col"
                  style={{ background: overdueCount > 0 ? "#FFF8F8" : "white", borderColor: overdueCount > 0 ? "#FECDD3" : "#E2E8F0" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Order Overdue</p>
                    <Clock size={13} color={overdueCount > 0 ? "#E11D48" : "#CBD5E1"} />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[30px] leading-none"
                      style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: overdueCount > 0 ? "#E11D48" : "#059669" }}
                    >
                      {overdueCount}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: overdueCount > 0 ? "#E11D48" : "#94A3B8" }}>
                      {overdueCount > 0 ? "parts must be ordered now" : "all orders on schedule"}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: overdueCount > 0 ? "#FECDD3" : "#F1F5F9" }}>
                    <button
                      onClick={() => setFilterOverdue(true)}
                      className="text-[11px] transition-colors hover:underline"
                      style={{ color: overdueCount > 0 ? "#E11D48" : "#94A3B8", fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {overdueCount > 0 ? "View overdue parts →" : "No action needed"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Current BOM Cost */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Current BOM Cost</p>
                    <DollarSign size={13} className="text-[#CBD5E1]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[28px] leading-none text-[#0F2035]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {fmtCurrency(currentBomCost)}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">per assembly · real-time pricing</p>
                  </div>
                  {hasSavings && (
                    <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown size={11} color="#10B981" />
                        <span className="text-[11px] text-[#64748B]" style={{ fontWeight: 500 }}>
                          {fmtSavingsDelta(currentBomCost, projectedBomCost)} reducible
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Projected BOM Cost */}
                <div
                  className="rounded-xl border p-4 flex flex-col"
                  style={{ background: hasSavings ? "#F0FDF4" : "white", borderColor: hasSavings ? "#BBF7D0" : "#E2E8F0" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Projected BOM Cost</p>
                    <TrendingDown size={13} color={hasSavings ? "#10B981" : "#CBD5E1"} />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[28px] leading-none"
                      style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: hasSavings ? "#059669" : "#0F2035" }}
                    >
                      {fmtCurrency(projectedBomCost)}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: hasSavings ? "#16A34A" : "#94A3B8" }}>
                      {hasSavings ? "if all interventions applied" : "no interventions selected"}
                    </p>
                  </div>
                  {hasSavings && (
                    <div className="mt-3 pt-3 border-t border-[#BBF7D0]">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-[#BBF7D0]"
                        style={{ background: "white", color: "#065F46", fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        saves {fmtSavingsDelta(currentBomCost, projectedBomCost)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Annual Savings Potential */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>Annual Savings Potential</p>
                    <Gem size={13} className="text-[#CBD5E1]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[28px] leading-none text-[#059669]" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {fmtCurrency(fullAnnualSavingsPotential)}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      {fullAnnualSavingsPotential > 0
                        ? `${fmtCurrency(currentBomCost - fullProjectedBomCost)}/unit · ${expectedAnnualVolume.toLocaleString()} units/yr`
                        : `—/unit · ${expectedAnnualVolume.toLocaleString()} units/yr`}
                    </p>
                  </div>
                  {annualSavingsPotential > 0 && annualSavingsPotential < fullAnnualSavingsPotential && (
                    <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                      <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>Active selections</p>
                      <p className="text-[13px] text-[#059669]" style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {fmtCurrency(annualSavingsPotential)}
                      </p>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                    <button
                      onClick={() => navigate("/cost-interventions")}
                      className="flex items-center gap-1 text-[11px] text-[#64748B] hover:text-[#1B3A5C] transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <TrendingDown size={11} />
                      {PRODUCTION_INTERVENTIONS.length} interventions available →
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Filters */}
        <div className="px-6 pb-4 shrink-0 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-[280px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search parts, categories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#93C5FD]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            />
          </div>

          {/* Subsystem filter — pill strip ≥900px, native select below */}
          <div className="hidden min-[900px]:flex items-center gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] flex-wrap">
            {SUBSYSTEM_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setSubsystemFilter(opt)}
                className="px-2.5 py-1 rounded-md text-[11px] transition-all"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
                  background: subsystemFilter === opt ? "white" : "transparent",
                  color: subsystemFilter === opt ? "#0F2035" : "#64748B",
                  boxShadow: subsystemFilter === opt ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {opt === "All" ? "All Subsystems" : opt.split(" ")[0]}
              </button>
            ))}
          </div>
          <select
            value={subsystemFilter}
            onChange={(e) => setSubsystemFilter(e.target.value)}
            className="flex min-[900px]:hidden h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {SUBSYSTEM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "All" ? "All Subsystems" : opt}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0]">
            {MAKEBUY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setMakeBuyFilter(opt)}
                className="px-3 py-1 rounded-md text-[11px] transition-all"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
                  background: makeBuyFilter === opt ? "white" : "transparent",
                  color: makeBuyFilter === opt ? "#0F2035" : "#64748B",
                  boxShadow: makeBuyFilter === opt ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {(searchQuery || subsystemFilter !== "All" || makeBuyFilter !== "All" || filterCriticalPath || filterOverdue) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSubsystemFilter("All");
                setMakeBuyFilter("All");
                setFilterCriticalPath(false);
                setFilterOverdue(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[#94A3B8] border border-[#E2E8F0] hover:text-[#64748B] transition-colors"
            >
              <X size={11} />
              Clear
            </button>
          )}

          {/* Prototype quick filters */}
          {protoMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterCriticalPath((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 500,
                  background: filterCriticalPath ? "#FFF1F2" : "white",
                  color: filterCriticalPath ? "#E11D48" : "#64748B",
                  borderColor: filterCriticalPath ? "#FECDD3" : "#E2E8F0",
                }}
              >
                <Flag size={11} />
                Critical Path
                {filterCriticalPath && <span className="ml-1 text-[10px] font-mono">{criticalPathCount}</span>}
              </button>
              <button
                onClick={() => setFilterOverdue((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 500,
                  background: filterOverdue ? "#FFF1F2" : "white",
                  color: filterOverdue ? "#E11D48" : "#64748B",
                  borderColor: filterOverdue ? "#FECDD3" : "#E2E8F0",
                }}
              >
                <Calendar size={11} />
                Overdue Only
                {filterOverdue && <span className="ml-1 text-[10px] font-mono">{overdueCount}</span>}
              </button>
            </div>
          )}

          {/* Prototype sort toggle */}
          {protoMode && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] ml-auto">
              {(["default", "leadTime"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all"
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 500,
                    background: sortBy === opt ? "white" : "transparent",
                    color: sortBy === opt ? "#0F2035" : "#64748B",
                    boxShadow: sortBy === opt ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt === "default" ? "Group by Subsystem" : "Sort: Lead Time ↓"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 px-6 pb-6 overflow-auto min-h-0">
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 34 }} />  {/* checkbox */}
                  <col style={{ width: 34 }} />  {/* # */}
                  <col style={{ width: 190 }} /> {/* Part (name + number) */}
                  <col style={{ width: 90 }} />  {/* Category */}
                  <col style={{ width: 110 }} /> {/* Material */}
                  <col style={{ width: 44 }} />  {/* Qty */}
                  <col style={{ width: 70 }} />  {/* Make/Buy */}
                  {protoMode && <col style={{ width: 68 }} />}  {/* Lead Time */}
                  {protoMode && <col style={{ width: 94 }} />}  {/* Order By */}
                  {protoMode && <col style={{ width: 44 }} />}  {/* DFM */}
                  {protoMode && <col style={{ width: 44 }} />}  {/* Prod Readiness */}
                  <col style={{ width: 80 }} />  {/* Unit Cost */}
                  <col style={{ width: 82 }} />  {/* Ext. Cost */}
                  <col style={{ width: 32 }} />  {/* expand chevron */}
                </colgroup>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                    {/* Select-all checkbox */}
                    <th className="px-2 py-3 w-8">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center w-full"
                        title={allSelected ? "Deselect all" : "Select all"}
                      >
                        {allSelected
                          ? <CheckSquare2 size={14} color="#2563EB" />
                          : someSelected
                          ? <CheckSquare2 size={14} color="#93C5FD" />
                          : <Square size={14} color="#CBD5E1" />}
                      </button>
                    </th>
                    {[
                      { label: "#"              },
                      { label: "Part"           },
                      { label: "Category"       },
                      { label: "Material"       },
                      { label: "Qty"            },
                      { label: "Make/Buy"       },
                      ...(protoMode ? [{ label: "Lead Time" }, { label: "Order By" }, { label: "DFM" }, { label: "Prod." }] : []),
                      { label: "Unit Cost"      },
                      { label: "Ext. Cost"      },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className="px-3 py-3 text-left"
                        style={{
                          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10,
                          fontWeight: 600, color: "#64748B",
                          textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {sortedFlat != null ? (
                    // Flat sorted view (prototype: lead time or urgency sort)
                    sortedFlat.length === 0 ? (
                      <tr>
                        <td colSpan={protoMode ? 14 : 10} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Search size={22} color="#CBD5E1" />
                            <p className="text-[13px] text-[#94A3B8]" style={{ fontWeight: 500 }}>No parts match your current filters</p>
                            <button
                              onClick={() => {
                                setSearchQuery("");
                                setSubsystemFilter("All");
                                setMakeBuyFilter("All");
                                setFilterCriticalPath(false);
                                setFilterOverdue(false);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                            >
                              <X size={11} />
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <GroupRows
                        subsystem=""
                        parts={sortedFlat}
                        selectedLineId={selectedLineId}
                        costOverrides={costOverrides}
                        getEffectiveUnitCost={getEffectiveUnitCost}
                        onSelect={setSelectedLineId}
                        protoMode={protoMode}
                        headerless
                        buildTargetDate={buildTargetDate}
                        estimatedBuildDays={estimatedBuildDays}
                        criticalPathSet={activeCriticalPathSet}
                        onToggleCriticalPath={toggleCriticalPath}
                        selectedParts={selectedParts}
                        onTogglePartSelect={togglePartSelect}
                      />
                    )
                  ) : Object.keys(groupedRows).length === 0 ? (
                    <tr>
                      <td colSpan={protoMode ? 14 : 10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Search size={22} color="#CBD5E1" />
                          <p className="text-[13px] text-[#94A3B8]" style={{ fontWeight: 500 }}>No parts match your current filters</p>
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setSubsystemFilter("All");
                              setMakeBuyFilter("All");
                              setFilterCriticalPath(false);
                              setFilterOverdue(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                          >
                            <X size={11} />
                            Clear all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedRows).map(([subsystem, parts]) => (
                      <GroupRows
                        key={`group-${subsystem}`}
                        subsystem={subsystem}
                        parts={parts}
                        selectedLineId={selectedLineId}
                        costOverrides={costOverrides}
                        getEffectiveUnitCost={getEffectiveUnitCost}
                        onSelect={setSelectedLineId}
                        protoMode={protoMode}
                        buildTargetDate={buildTargetDate}
                        estimatedBuildDays={estimatedBuildDays}
                        criticalPathSet={activeCriticalPathSet}
                        onToggleCriticalPath={toggleCriticalPath}
                        selectedParts={selectedParts}
                        onTogglePartSelect={togglePartSelect}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer — cost totals */}
            <div className="border-t border-[#E2E8F0]" style={{ background: "#FAFBFD" }}>
              <div className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#94A3B8]">
                    Showing {filtered.length} of {TOTAL_BOM_PARTS} parts · Assembly 845-000112 · excl. MFG resource pkg
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign size={11} className="text-[#94A3B8]" />
                      <span className="text-[11px] text-[#64748B]" style={{ fontWeight: 500 }}>
                        Current BOM Total:
                      </span>
                      <span className="text-[12px] text-[#0F2035]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                        {fmtCurrency(currentBomCost)}
                      </span>
                    </div>
                    {hasSavings && (
                      <>
                        <span className="text-[#E2E8F0]">|</span>
                        <div className="flex items-center gap-2">
                          <TrendingDown size={11} className="text-[#10B981]" />
                          <span className="text-[11px] text-[#64748B]" style={{ fontWeight: 500 }}>Projected:</span>
                          <span className="text-[12px] text-[#059669]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                            {fmtCurrency(projectedBomCost)}
                          </span>
                          <span className="text-[11px] text-[#059669]" style={{ fontWeight: 500 }}>
                            ({fmtSavingsDelta(currentBomCost, projectedBomCost)} saved)
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fictiv action bar — pinned at column bottom, always visible */}
        <AnimatePresence>
          {selectedParts.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 border-t border-[#E2E8F0]"
              style={{ background: fictivSent ? "#F0FDF4" : "#EFF6FF" }}
            >
              <div className="px-6 py-3 flex items-center gap-3">
                {fictivSent ? (
                  <>
                    <CheckCircle2 size={15} color="#16A34A" />
                    <span
                      className="text-[13px] text-[#15803D]"
                      style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {selectedParts.size} part{selectedParts.size !== 1 ? "s" : ""} submitted to Fictiv
                    </span>
                    <span className="text-[12px] text-[#86EFAC]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      Order request sent
                    </span>
                  </>
                ) : (
                  <>
                    <CheckSquare2 size={15} color="#2563EB" />
                    <span
                      className="text-[13px] text-[#1D4ED8]"
                      style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {selectedParts.size} part{selectedParts.size !== 1 ? "s" : ""} selected
                    </span>
                    <button
                      onClick={() => setSelectedParts(new Set())}
                      className="text-[12px] text-[#93C5FD] hover:text-[#1D4ED8] transition-colors"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      Clear
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={handleSendToFictiv}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-[12px] transition-colors"
                        style={{
                          background: "#1D4ED8",
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        <Send size={12} />
                        Send to Fictiv
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {selectedPart && (
          <>
            {/* Narrow-screen slide-over overlay (< xl) */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="xl:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedLineId(null)}
            />
            {/* Panel — side panel on xl+, fixed bottom-anchored slide-up on narrower */}
            <motion.div
              key={selectedPart.bomLineId}
              initial={{ x: 0, y: "100%", opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              exit={{ x: 0, y: "100%", opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="xl:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "85vh" }}
            >
              {/* Drag handle */}
              <div className="shrink-0 flex justify-center pt-2.5 pb-1 bg-white rounded-t-2xl">
                <div className="w-10 h-1 rounded-full bg-[#E2E8F0]" />
              </div>
              <DetailPanel
                part={selectedPart}
                onClose={() => setSelectedLineId(null)}
              />
            </motion.div>
            {/* Side panel on xl screens */}
            <motion.div
              key={`side-${selectedPart.bomLineId}`}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="hidden xl:block"
            >
              <DetailPanel
                part={selectedPart}
                onClose={() => setSelectedLineId(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}