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
} from "lucide-react";
import {
  CANONICAL_BOM_845_000112,
  type CanonicalBomRow,
  TOTAL_BOM_PARTS,
} from "../../data/canonicalBom";
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
  CRITICAL_PATH_SET,
  getPartLeadTime,
  getPartOrderBy,
  isOnCriticalPath,
  isPartOverdue,
} from "../../data/prototypeData";

// ─── Parts with full analysis pages ──────────────────────────────────────────
const ANALYSIS_PAGE_PARTS = new Set([
  "430-002808", "430-002810", "430-002811",
  "430-002836", "430-002837", "430-002839", "432-001540",
]);

// ─── Engineering notes lookup ─────────────────────────────────────────────────
interface EngineeringNote {
  material: string;
  manufacturingProcess: string;
  designIntent: string;
  costDrivers: string[];
}

const ENGINEERING_NOTES: Record<string, EngineeringNote> = {
  "430-002808": { material: "Aluminum 6061-T6", manufacturingProcess: "CNC billet machining (candidate for casting/forging)", designIntent: "Structural housing aligning bearings and maintaining gear center distance.", costDrivers: ["Deep pocket machining", "Multiple CNC setups", "High material removal"] },
  "430-002809": { material: "Aluminum 6061-T6", manufacturingProcess: "CNC billet machining (candidate for casting/forging)", designIntent: "Rotor frame; maintains concentricity with gear housing.", costDrivers: ["CNC billet machining", "Multiple setups", "Bore concentricity requirements"] },
  "430-002810": { material: "Aluminum 7075-T6", manufacturingProcess: "CNC billet machining (candidate for casting/forging)", designIntent: "Planet carrier transmitting torque between gears.", costDrivers: ["Pocket milling", "Precision hole pattern", "Multi-axis setup"] },
  "430-002811": { material: "Aluminum 7075-T6", manufacturingProcess: "CNC billet machining (candidate for casting/forging)", designIntent: "Output transmitting torque to external shaft.", costDrivers: ["Complex geometry", "7075 material premium", "Machining time"] },
  "430-002812": { material: "Stainless Steel 304", manufacturingProcess: "CNC machined", designIntent: "Outer clamp half securing output shaft interface.", costDrivers: ["Machining", "Flatness requirement", "Small-batch inefficiency"] },
  "430-002813": { material: "Stainless Steel 304", manufacturingProcess: "Sheet metal laser cut", designIntent: "Inner clamp half for output shaft.", costDrivers: ["Laser cut + deburr", "Hole position tolerance", "Small-batch inefficiency"] },
  "430-002814": { material: "Steel 4140", manufacturingProcess: "Turned shaft + grinding", designIntent: "Central bore shaft providing axial reference for gear stack.", costDrivers: ["Runout tolerance", "Surface finish requirement", "Grinding"] },
  "430-002816": { material: "Steel 4140", manufacturingProcess: "Turned shaft + grinding", designIntent: "Planet shaft supporting planet gear rotation; precision diameter for needle bearing.", costDrivers: ["Needle bearing diameter tolerance", "Surface finish", "Heat treat"] },
  "430-002817": { material: "Steel 4140", manufacturingProcess: "Turned sleeve", designIntent: "Planet sleeve providing bearing running surface on planet shaft.", costDrivers: ["OD/ID tolerance", "Surface finish"] },
  "430-002836": { material: "Steel 4340", manufacturingProcess: "Gear cutting + heat treat + inspection", designIntent: "Sun gear driving planetary gear system.", costDrivers: ["Gear machining", "Heat treatment", "CMM inspection"] },
  "430-002837": { material: "Steel 4340", manufacturingProcess: "Gear cutting + heat treat + inspection", designIntent: "Planet gear transmitting torque between sun and ring gear.", costDrivers: ["Gear cutting", "Heat treatment", "×4 quantity"] },
  "430-002838": { material: "Steel 4340", manufacturingProcess: "Gear cutting + heat treat + inspection", designIntent: "Static ring gear fixed to housing; reacts against planet gear rotation.", costDrivers: ["Internal gear cutting", "Inspection", "Heat treatment"] },
  "430-002839": { material: "Steel 4340", manufacturingProcess: "Gear cutting + heat treat + inspection", designIntent: "Output ring gear transmitting torque in planetary gearbox.", costDrivers: ["Internal gear cutting", "Inspection", "Heat treatment"] },
  "430-002916": { material: "Aluminum 6061-T6", manufacturingProcess: "CNC billet machining", designIntent: "Cap for Axon motor interface; sealing and cable management.", costDrivers: ["Machining", "Sealing interface"] },
  "432-001479": { material: "ABS / Nylon", manufacturingProcess: "3D printed (candidate for injection molding)", designIntent: "Cable cover protecting cable routing at assembly exit.", costDrivers: ["3D print unit cost", "Post-processing"] },
  "432-001480": { material: "ABS / Nylon", manufacturingProcess: "3D printed (candidate for injection molding)", designIntent: "Cable grip at input connector; strain relief and routing.", costDrivers: ["3D print unit cost", "Fit iteration"] },
  "432-001482": { material: "ABS / Nylon", manufacturingProcess: "3D printed (candidate for injection molding)", designIntent: "Cable relief mount; mounts strain relief clamp to housing.", costDrivers: ["3D print unit cost", "Post-processing"] },
  "432-001483": { material: "ABS / Nylon", manufacturingProcess: "3D printed (candidate for injection molding)", designIntent: "Cable relief clamp; secures cable bundle at exit.", costDrivers: ["3D print unit cost", "Post-processing"] },
  "432-001540": { material: "ABS", manufacturingProcess: "3D printed (candidate for injection molding)", designIntent: "Output grommet; cable routing/strain relief at output port.", costDrivers: ["3D print unit cost", "Low throughput", "Post-processing / fit iteration"] },
};

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

function GroupHeader({ label, count, extCost, protoMode = false }: { label: string; count: number; extCost: number | null; protoMode?: boolean }) {
  const s = SUBSYSTEM_COLORS[label] ?? { dot: "#64748B", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
  return (
    <tr>
      <td
        colSpan={protoMode ? 15 : 12}
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

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({
  part,
  onClose,
}: {
  part: CanonicalBomRow;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const {
    getEffectiveUnitCost,
    getProjectedUnitCost,
    setCostOverride,
    clearCostOverride,
    costOverrides,
  } = useCostModel();

  const subsystemColor = SUBSYSTEM_COLORS[part.subsystem] ?? { dot: "#64748B", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
  const notes    = ENGINEERING_NOTES[part.partNumber] ?? null;
  const costRec  = PART_COST_DATA[part.partNumber] ?? null;
  const hasAnalysisPage = ANALYSIS_PAGE_PARTS.has(part.partNumber);

  const effectiveUnit  = getEffectiveUnitCost(part.partNumber);
  const projectedUnit  = getProjectedUnitCost(part.partNumber);
  const hasProjectedSaving = projectedUnit != null && effectiveUnit != null && projectedUnit < effectiveUnit;
  const isExcluded = costRec?.excludeFromRollup;

  return (
    <motion.div
      key={part.bomLineId}
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-[370px] shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col h-full overflow-y-auto"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-start justify-between shrink-0" style={{ background: "#FAFBFD" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#1B3A5C" }}>
            <Package size={14} color="white" />
          </div>
          <div>
            <p className="text-[#0F2035] text-[14px]" style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{part.partNumber}</p>
            <p className="text-[12px] text-[#475569] mt-0.5 mb-1.5" style={{ fontWeight: 500 }}>{part.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <SubsystemBadge value={part.subsystem} />
              <MakeBuyBadge value={part.makeBuy} />
              {costRec && <ConfidenceBadge level={costRec.unitCostConfidence} />}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">

        {/* Line info strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "BOM Line", value: String(part.bomLineId) },
            { label: "Qty",      value: String(part.qty) },
            { label: "Category", value: part.itemCategory.replace("COTS, Standard Hardware", "COTS/OTS") },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[#E2E8F0] p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>{item.label}</p>
              <p className="text-[12px] text-[#1E293B] leading-snug" style={{ fontWeight: 600 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Excluded badge */}
        {isExcluded && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-[#FDE68A]" style={{ background: "#FFFBEB" }}>
            <Info size={13} color="#D97706" className="shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#92400E]">This item is documentation only and is excluded from BOM cost rollups.</p>
          </div>
        )}

        {/* Design Intent */}
        {notes?.designIntent && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 500 }}>Design Intent</p>
            <div className="flex items-start gap-2.5">
              <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: subsystemColor.dot }} />
              <p className="text-[13px] text-[#1E293B] leading-relaxed">{notes.designIntent}</p>
            </div>
          </div>
        )}

        {/* Material + Process */}
        {notes && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Gem size={11} color="#94A3B8" />
                <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 500 }}>Material</span>
              </div>
              <p className="text-[12px] text-[#1E293B]" style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{notes.material}</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wrench size={11} color="#94A3B8" />
                <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 500 }}>Process</span>
              </div>
              <p className="text-[12px] text-[#1E293B] leading-snug" style={{ fontWeight: 500 }}>{notes.manufacturingProcess}</p>
            </div>
          </div>
        )}

        {/* Cost Drivers */}
        {notes?.costDrivers && notes.costDrivers.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2.5" style={{ fontWeight: 500 }}>Cost Driver Flags</p>
            <div className="flex flex-col gap-2">
              {notes.costDrivers.map((d) => (
                <div key={d} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[#FDE68A]" style={{ background: "#FFFBEB" }}>
                  <AlertTriangle size={12} color="#D97706" className="shrink-0" />
                  <span className="text-[12px] text-[#92400E]" style={{ fontWeight: 500 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost section */}
        {costRec && !isExcluded && (
          <div>
            <InlineCostEditor
              partNumber={part.partNumber}
              baseValue={costRec.unitCostCurrent}
              overrideValue={costOverrides[part.partNumber]}
              qty={part.qty}
              onSave={(v) => setCostOverride(part.partNumber, v)}
              onClear={() => clearCostOverride(part.partNumber)}
            />

            {/* Projected cost (if intervention active) */}
            {hasProjectedSaving && effectiveUnit != null && (
              <div className="rounded-lg border border-[#BBF7D0] p-3 mb-2" style={{ background: "#F0FDF4" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown size={11} color="#10B981" />
                  <p className="text-[10px] uppercase tracking-wider text-[#16A34A]" style={{ fontWeight: 500 }}>Projected w/ Interventions</p>
                </div>
                <p className="text-[18px] text-[#059669] leading-none" style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {fmtCurrency(projectedUnit!)}
                  <span className="ml-2 text-[12px]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
                    saves {fmtSavingsDelta(effectiveUnit, projectedUnit!)}
                  </span>
                </p>
              </div>
            )}

            {/* Confidence + notes */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] text-[#94A3B8]">Confidence:</span>
              <ConfidenceBadge level={costRec.unitCostConfidence} />
            </div>
            {costRec.costNotes && (
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">{costRec.costNotes}</p>
            )}
          </div>
        )}

        {/* OTS notice (no cost record) */}
        {!costRec && (
          <div className="rounded-lg border border-dashed border-[#CBD5E1] p-3 flex items-start gap-2.5">
            <Info size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#94A3B8]">No cost record. Add costs via Upload page.</p>
          </div>
        )}

        {/* CTA */}
        {hasAnalysisPage ? (
          <button
            onClick={() => navigate(`/part/${part.partNumber}`)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
            style={{ fontWeight: 500 }}
          >
            <span>View Part Analysis</span>
            <ArrowUpRight size={14} />
          </button>
        ) : (
          <div className="w-full flex items-start gap-2.5 px-4 py-3 rounded-xl border border-dashed border-[#CBD5E1]">
            <Info size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#94A3B8]">Full part analysis not yet available for this part.</p>
          </div>
        )}
      </div>
    </motion.div>
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
}: {
  subsystem: string;
  parts: CanonicalBomRow[];
  selectedLineId: number | null;
  costOverrides: Record<string, number>;
  getEffectiveUnitCost: (pn: string) => number | null;
  onSelect: (id: number | null) => void;
  protoMode?: boolean;
  headerless?: boolean;
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
        const isCriticalPath = protoMode && isOnCriticalPath(part.partNumber);

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
            {/* Line ID */}
            <td className="px-3 py-2.5">
              <span className="text-[10px] text-[#CBD5E1]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{part.bomLineId}</span>
            </td>
            {/* Part Number */}
            <td className="px-3 py-2.5">
              <span className="text-[11px] text-[#1B3A5C]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{part.partNumber}</span>
            </td>
            {/* Name */}
            <td className="px-3 py-2.5">
              <span className="text-[11px] text-[#1E293B] leading-snug" style={{ fontWeight: 500, display: "block", wordBreak: "break-word" }}>{part.name}</span>
            </td>
            {/* Category */}
            <td className="px-3 py-2.5">
              <span className="text-[10px] text-[#64748B] leading-snug" style={{ display: "block", wordBreak: "break-word" }}>{part.itemCategory}</span>
            </td>
            {/* Material */}
            <td className="px-3 py-2.5">
              {ENGINEERING_NOTES[part.partNumber]?.material ? (
                <span
                  className="text-[10px] text-[#475569] leading-snug"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", display: "block", wordBreak: "break-word" }}
                >
                  {ENGINEERING_NOTES[part.partNumber].material}
                </span>
              ) : (
                <span className="text-[11px] text-[#CBD5E1]">—</span>
              )}
            </td>
            {/* Design Intent */}
            <td className="px-3 py-2.5">
              {ENGINEERING_NOTES[part.partNumber]?.designIntent ? (
                <span
                  className="text-[10px] text-[#64748B] leading-snug"
                  style={{ display: "block", wordBreak: "break-word" }}
                >
                  {ENGINEERING_NOTES[part.partNumber].designIntent}
                </span>
              ) : (
                <span className="text-[11px] text-[#CBD5E1]">—</span>
              )}
            </td>
            {/* Cost Drivers */}
            <td className="px-3 py-2.5">
              {ENGINEERING_NOTES[part.partNumber]?.costDrivers?.length ? (
                <div className="flex flex-wrap gap-1">
                  {ENGINEERING_NOTES[part.partNumber].costDrivers.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-[#FDE68A]"
                      style={{ background: "#FFFBEB", color: "#92400E", fontWeight: 500, whiteSpace: "nowrap" }}
                    >
                      <span className="w-1 h-1 rounded-full bg-[#D97706] shrink-0" />
                      {d}
                    </span>
                  ))}
                </div>
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
            {/* Critical Path — prototype mode only */}
            {protoMode && (
              <td className="px-3 py-2.5">
                {isCriticalPath ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
                    style={{
                      background: "#FFF1F2",
                      color: "#E11D48",
                      borderColor: "#FECDD3",
                      fontWeight: 600,
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Flag size={9} />
                    CP
                  </span>
                ) : (
                  <span className="text-[12px] text-[#E2E8F0]">—</span>
                )}
              </td>
            )}
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
              <ArrowUpRight
                size={13}
                className="text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors"
                style={isSelected ? { color: "#3B82F6" } : {}}
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
  const [sortBy,             setSortBy]             = useState<"default" | "leadTime" | "urgency">("default");
  const [filterCriticalPath, setFilterCriticalPath] = useState(false);
  const [filterOverdue,      setFilterOverdue]      = useState(false);

  const { mode } = useAppMode();
  const { buildTargetDate, estimatedBuildDays } = useBuildTarget();
  const protoMode = mode === "prototype";

  const {
    hasMissingCosts,
    currentBomCost,
    projectedBomCost,
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
      const matchCP   = !filterCriticalPath || isOnCriticalPath(p.partNumber);
      const matchOD   = !filterOverdue || isPartOverdue(p.partNumber, buildTargetDate, estimatedBuildDays);
      return matchSearch && matchSub && matchMake && matchCP && matchOD;
    });
  }, [searchQuery, subsystemFilter, makeBuyFilter, filterCriticalPath, filterOverdue, buildTargetDate, estimatedBuildDays]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, CanonicalBomRow[]> = {};
    for (const sub of SUBSYSTEM_ORDER) {
      const parts = filtered.filter((p) => p.subsystem === sub);
      if (parts.length > 0) groups[sub] = parts;
    }
    return groups;
  }, [filtered]);

  // Prototype: flat sorted list for urgency/lead-time views
  const sortedFlat = useMemo(() => {
    if (!protoMode || sortBy === "default") return null;
    return [...filtered].sort((a, b) => {
      if (sortBy === "leadTime") {
        const aLt = getPartLeadTime(a.partNumber) ?? 0;
        const bLt = getPartLeadTime(b.partNumber) ?? 0;
        return bLt - aLt;
      }
      // urgency: ascending by daysUntilDeadline (overdue first)
      const aOb = getPartOrderBy(a.partNumber, buildTargetDate, estimatedBuildDays);
      const bOb = getPartOrderBy(b.partNumber, buildTargetDate, estimatedBuildDays);
      const aDays = aOb?.daysUntilDeadline ?? 999;
      const bDays = bOb?.daysUntilDeadline ?? 999;
      return aDays - bDays;
    });
  }, [filtered, protoMode, sortBy, buildTargetDate, estimatedBuildDays]);

  // Prototype summary stats (computed once over the full BOM, not the filtered view)
  const criticalPathCount = protoMode ? CRITICAL_PATH_SET.size : 0;
  const overdueCount = protoMode
    ? CANONICAL_BOM_845_000112.filter((p) => isPartOverdue(p.partNumber, buildTargetDate, estimatedBuildDays)).length
    : 0;

  const makeParts = CANONICAL_BOM_845_000112.filter((p) => p.makeBuy === "Make").length;
  const buyParts  = CANONICAL_BOM_845_000112.filter((p) => p.makeBuy === "Buy").length;
  const selectedPart = selectedLineId != null
    ? CANONICAL_BOM_845_000112.find((p) => p.bomLineId === selectedLineId) ?? null
    : null;

  const hasSavings = projectedBomCost < currentBomCost;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 shrink-0 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">Dashboard</span>
            <ChevronRight size={12} className="text-[#CBD5E1]" />
            <span className="text-[11px] text-[#64748B] uppercase tracking-wider">BOM Analysis</span>
          </div>
          <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>BOM Analysis</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Assembly 845-000112 · {TOTAL_BOM_PARTS} line items · Click any row to inspect
          </p>
        </div>

        {/* Missing costs banner */}
        {hasMissingCosts && (
          <div className="mx-6 mt-4 shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-lg border border-[#FDE68A]" style={{ background: "#FFFBEB" }}>
            <AlertTriangle size={14} color="#D97706" className="shrink-0" />
            <p className="text-[12px] text-[#92400E]">Some unit costs missing — add costs via the Upload page or by clicking a row and editing inline.</p>
          </div>
        )}

        {/* Summary strip */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          {(() => {
            const cards = protoMode ? [
              { label: "Total Parts",   value: String(TOTAL_BOM_PARTS),   sub: "line items in 845-000112",          color: "#1B3A5C" },
              { label: "Make Parts",    value: String(makeParts),          sub: "machined / printed / sheet",        color: "#2B6CB0" },
              { label: "Critical Path", value: String(criticalPathCount),  sub: "parts gating build start",          color: "#E11D48" },
              { label: "Order Overdue", value: String(overdueCount),       sub: overdueCount > 0 ? "must order now" : "all orders on schedule", color: overdueCount > 0 ? "#E11D48" : "#059669" },
            ] : [
              { label: "Total Parts",  value: String(TOTAL_BOM_PARTS), sub: "line items in 845-000112",  color: "#1B3A5C" },
              { label: "Make Parts",   value: String(makeParts),        sub: "machined / printed / sheet", color: "#2B6CB0" },
              { label: "Buy / OTS",    value: String(buyParts),         sub: "purchased COTS / OTS",       color: "#059669" },
              hasSavings
                ? { label: "Projected BOM Cost", value: fmtCurrency(projectedBomCost), sub: `saves ${fmtSavingsDelta(currentBomCost, projectedBomCost)} w/ interventions`, color: "#059669" }
                : { label: "Current BOM Cost",   value: fmtCurrency(currentBomCost),   sub: "engineering estimates; excl. MFG pkg", color: "#0F2035" },
            ];
            return (
              <div className="grid grid-cols-4 gap-3">
                {cards.map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3.5 flex items-center gap-3">
                    <div className="w-1.5 h-10 rounded-full shrink-0" style={{ background: s.color }} />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 500 }}>{s.label}</p>
                      <p className="text-[20px] leading-tight mt-0.5" style={{ color: s.color, fontWeight: 700 }}>{s.value}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
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

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] flex-wrap">
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
              {(["default", "leadTime", "urgency"] as const).map((opt) => (
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
                  {opt === "default" ? "Group by Subsystem" : opt === "leadTime" ? "Sort: Lead Time ↓" : "Sort: Order Urgency ↑"}
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
                  <col style={{ width: 36 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 190 }} />
                  <col style={{ width: 165 }} />
                  <col style={{ width: 40 }} />
                  <col style={{ width: 76 }} />
                  {protoMode && <col style={{ width: 68 }} />}
                  {protoMode && <col style={{ width: 96 }} />}
                  {protoMode && <col style={{ width: 46 }} />}
                  <col style={{ width: 82 }} />
                  <col style={{ width: 85 }} />
                  <col style={{ width: 34 }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                    {[
                      { label: "#"            },
                      { label: "Part Number"  },
                      { label: "Name"         },
                      { label: "Category"     },
                      { label: "Material"     },
                      { label: "Design Intent"},
                      { label: "Cost Drivers" },
                      { label: "Qty"          },
                      { label: "Make/Buy"     },
                      ...(protoMode ? [{ label: "Lead Time" }, { label: "Order By" }, { label: "CP" }] : []),
                      { label: "Unit Cost"    },
                      { label: "Ext. Cost"    },
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
                        <td colSpan={protoMode ? 15 : 12} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Search size={24} color="#CBD5E1" />
                            <p className="text-[13px] text-[#94A3B8]" style={{ fontWeight: 500 }}>No parts match your current filters</p>
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
                      />
                    )
                  ) : Object.keys(groupedRows).length === 0 ? (
                    <tr>
                      <td colSpan={protoMode ? 15 : 12} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Search size={24} color="#CBD5E1" />
                          <p className="text-[13px] text-[#94A3B8]" style={{ fontWeight: 500 }}>No parts match your current filters</p>
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
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer — cost totals */}
            <div className="px-5 py-3 border-t border-[#E2E8F0]" style={{ background: "#FAFBFD" }}>
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

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {selectedPart && (
          <DetailPanel
            key={selectedPart.bomLineId}
            part={selectedPart}
            onClose={() => setSelectedLineId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}