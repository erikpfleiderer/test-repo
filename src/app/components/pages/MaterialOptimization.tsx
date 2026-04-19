import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Gem,
  ArrowRight,
  ShieldAlert,
  Info,
  Filter,
  SortAsc,
  MousePointerClick,
} from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";

// ─── Data ─────────────────────────────────────────────────────────────────────

type SavingsPotential = "Low" | "Low–Medium" | "Medium" | "High";

interface MaterialRow {
  id: string;
  partNumber: string;
  partName: string;
  currentMaterial: string;
  currentMaterialDesc: string;
  alternativeMaterial: string;
  alternativeMaterialDesc: string;
  savingsPotential: SavingsPotential;
  rationale: string;
  validationNeeded: string;
}

const MATERIAL_DATA: MaterialRow[] = [
  {
    id: "430-002811",
    partNumber: "430-002811",
    partName: "Output Hub",
    currentMaterial: "Al 7075-T6",
    currentMaterialDesc: "High-strength aluminum alloy",
    alternativeMaterial: "Al 6061-T6",
    alternativeMaterialDesc: "Lower-cost, weldable alloy",
    savingsPotential: "Medium",
    rationale:
      "7075 is typically used for maximum strength. Output hub loading may be achievable with 6061-T6 if fillets are increased and wall minimums verified, reducing material cost and improving machinability.",
    validationNeeded:
      "FEA (torque + bearing loads) comparing 7075 vs 6061 · Runout measurement at bearing journals · Torque-to-yield / slip test at torque interface",
  },
  {
    id: "430-002810",
    partNumber: "430-002810",
    partName: "Planet Carrier",
    currentMaterial: "Al 7075-T6",
    currentMaterialDesc: "High-strength aluminum alloy",
    alternativeMaterial: "Al 6061-T6 (+ local geometry reinforcement)",
    alternativeMaterialDesc: "Standard alloy; stiffen via ribs/walls if needed",
    savingsPotential: "Medium",
    rationale:
      "Carrier strength may be over-specified; primary requirements are stiffness and planet-shaft positional accuracy. If FEA confirms adequate margins, 6061-T6 reduces material premium with possible geometry adjustments at stress risers.",
    validationNeeded:
      "FEA + hole pattern positional stability + fatigue check if cyclic torque",
  },
  {
    id: "430-002812/813",
    partNumber: "430-002812 / 430-002813",
    partName: "Output Clamp Plates",
    currentMaterial: "SS 304 Half Hard",
    currentMaterialDesc: "Stainless steel, semi-hardened sheet",
    alternativeMaterial: "Low-carbon steel + Zn/Ni plating (or 301 SS)",
    alternativeMaterialDesc: "Plated carbon steel, or 301 SS if spring stiffness required",
    savingsPotential: "Low–Medium",
    rationale:
      "If the corrosion environment permits, zinc- or nickel-plated low-carbon steel is significantly cheaper than 304 half hard. 301 SS is an option where spring-back properties must be retained. Maintain clamp stiffness and edge quality from laser cut / stamping.",
    validationNeeded:
      "Corrosion exposure assessment + clamp slip / preload retention test",
  },
  {
    id: "430-002839/837/836",
    partNumber: "430-002839 / 430-002837 / 430-002836",
    partName: "Ring Gear / Planet Gear / Sun Gear",
    currentMaterial: "Steel 4340",
    currentMaterialDesc: "Through-hardened gear steel",
    alternativeMaterial: "PM alloy steel (sintered, near-net)",
    alternativeMaterialDesc: "Powder-metal near-net form; eliminates gear cutting",
    savingsPotential: "High",
    rationale:
      "PM near-net gears can deliver 50–80% cost reduction at volume by eliminating gear cutting and reducing heat-treat scrap. Tooth form feasibility (module/DP, root fillet, tip relief) must be confirmed for each gear. Post-sinter selective finishing may be required for critical fits.",
    validationNeeded:
      "NVH / acoustic test under load · Endurance life + wear inspection · Contact pattern and backlash across tolerance stack · Dimensional stability after sinter",
  },
];

// ─── Style maps ───────────────────────────────────────────────────────────────

const SAVINGS_STYLE: Record<SavingsPotential, { bg: string; text: string; border: string }> = {
  "Low":       { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
  "Low–Medium":{ bg: "#F0FDFA", text: "#0D9488", border: "#99F6E4" },
  "Medium":    { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  "High":      { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
};

function SavingsBadge({ value }: { value: SavingsPotential }) {
  const s = SAVINGS_STYLE[value];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md border text-[12px]"
      style={{
        background: s.bg,
        color: s.text,
        borderColor: s.border,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

// ─── Material transition chip ──────────────────────────────────────────────────

function MaterialTransition({ current, alternative }: { current: string; alternative: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#64748B]"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, whiteSpace: "nowrap" }}
      >
        {current}
      </span>
      <ArrowRight size={13} color="#94A3B8" className="shrink-0" />
      <span
        className="px-2.5 py-1 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] text-[11px] text-[#1E3A8A]"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, whiteSpace: "nowrap" }}
      >
        {alternative}
      </span>
    </div>
  );
}

// ─── Detail card ──────────────────────────────────────────────────────────────

function DetailCard({ row, onClose }: { row: MaterialRow; onClose: () => void }) {
  const s = SAVINGS_STYLE[row.savingsPotential];
  return (
    <motion.div
      key={row.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="mt-5 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
    >
      {/* Card header */}
      <div
        className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#05966918" }}
          >
            <Gem size={14} color="#059669" />
          </div>
          <div>
            <p className="text-[13px] text-[#0F2035]" style={{ fontWeight: 600 }}>
              Substitution Detail
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.partNumber}</span>
              {" · "}
              {row.partName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SavingsBadge value={row.savingsPotential} />
          <button
            onClick={onClose}
            className="ml-1 w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors text-[18px] leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Three material/validation tiles */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Current */}
          <div className="rounded-lg border border-[#E2E8F0] p-4">
            <p
              className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2"
              style={{ fontWeight: 500 }}
            >
              Current Material
            </p>
            <p
              className="text-[16px] text-[#1E293B] leading-tight"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            >
              {row.currentMaterial}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-1.5">{row.currentMaterialDesc}</p>
          </div>

          {/* Alternative */}
          <div
            className="rounded-lg border border-[#BFDBFE] p-4"
            style={{ background: "#EFF6FF" }}
          >
            <p
              className="text-[10px] uppercase tracking-wider text-[#3B82F6] mb-2"
              style={{ fontWeight: 500 }}
            >
              Proposed Alternative
            </p>
            <p
              className="text-[15px] text-[#1E3A8A] leading-tight"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            >
              {row.alternativeMaterial}
            </p>
            <p className="text-[11px] text-[#3B82F6] mt-1.5">{row.alternativeMaterialDesc}</p>
          </div>

          {/* Validation */}
          <div
            className="rounded-lg border border-[#FDE68A] p-4"
            style={{ background: "#FFFBEB" }}
          >
            <p
              className="text-[10px] uppercase tracking-wider text-[#D97706] mb-2"
              style={{ fontWeight: 500 }}
            >
              Validation Required
            </p>
            <p className="text-[12px] text-[#92400E] leading-relaxed" style={{ fontWeight: 500 }}>
              {row.validationNeeded}
            </p>
          </div>
        </div>

        {/* Rationale */}
        <div
          className="rounded-lg border border-[#E2E8F0] p-4"
          style={{ background: "#FAFBFD" }}
        >
          <p
            className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2"
            style={{ fontWeight: 500 }}
          >
            Engineering Rationale
          </p>
          <div className="flex items-start gap-2.5">
            <div
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ background: s.border }}
            />
            <p className="text-[13px] text-[#1E293B] leading-relaxed">
              {row.rationale}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function DetailEmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="mt-5 bg-white rounded-xl border border-dashed border-[#CBD5E1] p-8 flex flex-col items-center gap-3"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "#F1F5F9" }}
      >
        <MousePointerClick size={18} color="#94A3B8" />
      </div>
      <p className="text-[13px] text-[#94A3B8]" style={{ fontWeight: 500 }}>
        Select a candidate to view rationale and validation plan.
      </p>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function MaterialOptimization() {
  const { mode } = useAppMode();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRow = MATERIAL_DATA.find((r) => r.id === selectedId) ?? null;

  const highCount   = MATERIAL_DATA.filter((r) => r.savingsPotential === "High").length;
  const partsCount  = 7; // unique parts covered across all rows

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">Dashboard</span>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
            Material Optimization
          </span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>
              Material Optimization
            </h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              {mode === "prototype"
                ? `Material change candidates for Assembly 845-000112 · ${MATERIAL_DATA.length} substitutions identified · Click a row to inspect`
                : `Material substitution candidates for Assembly 845-000112 · ${MATERIAL_DATA.length} substitutions identified · Click a row to inspect`}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-auto p-6">

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Substitutions",
              value: String(MATERIAL_DATA.length),
              sub: "candidates identified",
              color: "#059669",
            },
            {
              label: "High Potential",
              value: String(highCount),
              sub: mode === "prototype" ? "High iteration impact" : "50\u201380% cost reduction opportunity",
              color: "#16A34A",
            },
            {
              label: "Parts in Scope",
              value: String(partsCount),
              sub: "unique parts covered",
              color: "#1B3A5C",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-[#E2E8F0] px-5 py-4 flex items-center gap-4"
            >
              <div
                className="w-1.5 h-10 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <div>
                <p
                  className="text-[11px] uppercase tracking-wider text-[#94A3B8]"
                  style={{ fontWeight: 500 }}
                >
                  {s.label}
                </p>
                <p
                  className="text-[22px] leading-tight mt-0.5"
                  style={{ color: s.color, fontWeight: 700 }}
                >
                  {s.value}
                </p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
          className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                  {[
                    { label: "Part",                width: 190 },
                    { label: "Material Transition", width: 380 },
                    { label: mode === "prototype" ? "Iteration Risk" : "Savings Potential",   width: 148 },
                    { label: "Validation Needed",   width: 260 },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="px-5 py-3 text-left"
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
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {MATERIAL_DATA.map((row, idx) => {
                  const isSelected = selectedId === row.id;
                  const isEven = idx % 2 === 0;
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.12 + idx * 0.04 }}
                      onClick={() => setSelectedId(isSelected ? null : row.id)}
                      className="cursor-pointer group transition-colors"
                      style={{
                        background: isSelected
                          ? "#EFF6FF"
                          : isEven
                          ? "#FFFFFF"
                          : "#FAFBFD",
                        borderBottom: "1px solid #F1F5F9",
                        borderLeft: isSelected
                          ? "3px solid #2563EB"
                          : "3px solid transparent",
                      }}
                    >
                      {/* Part */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-[12px] text-[#1B3A5C]"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontWeight: 600,
                            }}
                          >
                            {row.partNumber}
                          </span>
                          <span className="text-[11px] text-[#94A3B8]">
                            {row.partName}
                          </span>
                        </div>
                      </td>

                      {/* Material transition */}
                      <td className="px-5 py-4">
                        <MaterialTransition
                          current={row.currentMaterial}
                          alternative={row.alternativeMaterial}
                        />
                      </td>

                      {/* Savings Potential */}
                      <td className="px-5 py-4">
                        <SavingsBadge value={row.savingsPotential} />
                      </td>

                      {/* Validation Needed */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <ShieldAlert
                            size={13}
                            color="#94A3B8"
                            className="shrink-0 mt-0.5"
                          />
                          <span
                            className="text-[12px] text-[#475569] leading-snug"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            } as React.CSSProperties}
                          >
                            {row.validationNeeded}
                          </span>
                        </div>
                      </td>

                      {/* Expand caret */}
                      <td className="px-4 py-4">
                        <ArrowRight
                          size={13}
                          className="text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors"
                          style={isSelected ? { color: "#3B82F6" } : {}}
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between"
            style={{ background: "#FAFBFD" }}
          >
            <p className="text-[11px] text-[#94A3B8]">
              Showing {MATERIAL_DATA.length} substitution candidates · Assembly 845-000112
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#CBD5E1]">
              <Info size={11} />
              Additional substitutions will populate as material analysis expands
            </div>
          </div>
        </motion.div>

        {/* Dynamic detail card / empty state */}
        <AnimatePresence mode="wait">
          {selectedRow ? (
            <DetailCard
              key={selectedRow.id}
              row={selectedRow}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <DetailEmptyState key="empty" />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
