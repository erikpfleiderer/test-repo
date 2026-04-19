import { motion } from "motion/react";
import {
  ChevronRight,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Filter,
  SortAsc,
} from "lucide-react";
import {
  useDashboardData,
  type ProductionDFMRow,
  type PrototypeDFMFlag,
} from "../../data/dashboardData";
import { CrossModeHint } from "../ui/CrossModeHint";
import { RISK_STYLE } from "../ui/badgeStyles";
import { MODE_CONFIG } from "../../data/modeConfig";

// ─── Normalized display row ───────────────────────────────────────────────────────
// Maps ProductionDFMRow and PrototypeDFMFlag to a shared table shape.

interface DFMDisplayRow {
  partNumber: string;
  partName: string;
  geometrySignal: string;
  /** recommendedChange (production) or prototypeRecommendation (prototype). */
  recommendedChange: string;
  /** benefit (production) or iterationGain (prototype). */
  benefit: string;
  risk: "Low" | "Medium" | "High";
}

function normalizeRows(
  flags: ProductionDFMRow[] | PrototypeDFMFlag[],
  isPrototype: boolean,
): DFMDisplayRow[] {
  if (!isPrototype) {
    return (flags as ProductionDFMRow[]).map((r) => ({
      partNumber: r.partNumber,
      partName:   r.partName,
      geometrySignal:    r.geometrySignal,
      recommendedChange: r.recommendedChange,
      benefit: r.benefit,
      risk:    r.risk,
    }));
  }
  return (flags as PrototypeDFMFlag[]).map((r) => ({
    partNumber: r.partNumber,
    partName:   r.partName,
    geometrySignal:    r.geometrySignal,
    recommendedChange: r.prototypeRecommendation,
    benefit: r.iterationGain,
    risk:    r.risk,
  }));
}

// ─── Badge ─────────────────────────────────────────────────────────────────────

function RiskBadge({ value }: { value: "Low" | "Medium" | "High" }) {
  const s = RISK_STYLE[value];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md border text-[12px]"
      style={{
        background: s.bg,
        color: s.text,
        borderColor: s.border,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 500,
      }}
    >
      {value} risk
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DFMOpportunities() {
  const data = useDashboardData();
  const { mode } = data;
  const cfg = MODE_CONFIG[mode];
  const DFM_DATA: DFMDisplayRow[] = normalizeRows(
    data.dfmFlags as ProductionDFMRow[] | PrototypeDFMFlag[],
    mode === "prototype",
  );
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
            Dashboard
          </span>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
            DFM Opportunities
          </span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-[#0F2035]"
              style={{ fontWeight: 600 }}
            >
              DFM Opportunities
            </h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              {mode === "prototype"
                ? `Design iteration flags for Assembly 845-000112 · ${DFM_DATA.length} flags identified`
                : `Design for manufacturability flags for Assembly 845-000112 · ${DFM_DATA.length} opportunities identified`}
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
              label: "Flags Identified",
              value: String(DFM_DATA.length),
              sub: mode === "prototype" ? "prototype fabrication friction points" : "geometry issues found",
              color: "#D97706",
            },
            {
              label: mode === "prototype" ? "Low Iteration Risk" : "Low Risk",
              value: String(DFM_DATA.filter((r) => r.risk === "Low").length),
              sub: mode === "prototype" ? "low-risk simplifications" : "easy-win changes",
              color: "#059669",
            },
            {
              label: "Parts Affected",
              value: String(new Set(DFM_DATA.map((r) => r.partNumber)).size),
              sub: "unique parts flagged",
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
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  {[
                    { label: "Part", width: 160 },
                    { label: "Geometry Signal", width: 200 },
                    { label: "Recommended Change", width: 220 },
                    { label: cfg.dfmBenefitLabel, width: 220 },
                    { label: cfg.dfmRiskLabel, width: 120 },
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
                </tr>
              </thead>
              <tbody>
                {DFM_DATA.map((row, idx) => (
                  <motion.tr
                    key={`${row.partNumber}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 + idx * 0.04 }}
                    style={{ borderBottom: "1px solid #F1F5F9" }}
                  >
                    {/* Part */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-[12px] text-[#475569] font-mono"
                        >
                          {row.partNumber}
                        </span>
                        <span
                          className="text-[12px] text-[#94A3B8]"
                        >
                          {row.partName}
                        </span>
                        <CrossModeHint partNumber={row.partNumber} mode={mode} variant="inline" />
                      </div>
                    </td>

                    {/* Geometry Issue */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: "#FEF3C7" }}
                        >
                          <AlertTriangle size={11} color="#D97706" />
                        </div>
                        <span
                          className="text-[13px] text-[#1E293B]"
                          style={{ fontWeight: 400 }}
                        >
                          {row.geometrySignal}
                        </span>
                      </div>
                    </td>

                    {/* Recommended Change */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: "#3B82F6" }}
                        />
                        <span
                          className="text-[13px] text-[#1E293B]"
                          style={{ fontWeight: 500 }}
                        >
                          {row.recommendedChange}
                        </span>
                      </div>
                    </td>

                    {/* Benefit */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <TrendingDown size={13} color="#059669" className="shrink-0" />
                        <span className="text-[13px] text-[#475569]">
                          {row.benefit}
                        </span>
                      </div>
                    </td>

                    {/* Risk */}
                    <td className="px-5 py-4">
                      <RiskBadge value={row.risk} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between"
            style={{ background: "#FAFBFD" }}
          >
            <p className="text-[11px] text-[#94A3B8]">
              Showing {DFM_DATA.length} DFM flags · Assembly 845-000112
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#CBD5E1]">
              <Info size={11} />
              {mode === "prototype"
                ? "Flags focus on prototype fabrication friction"
                : "Flags derived from STEP topology geometry analysis"}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}