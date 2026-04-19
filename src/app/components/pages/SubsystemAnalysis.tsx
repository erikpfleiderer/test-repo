import { motion } from "motion/react";
import {
  ChevronRight,
  Layers,
  Zap,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";
import {
  useDashboardData,
  type ProductionSubsystem,
  type PrototypeSubsystem,
} from "../../data/dashboardData";
import { CANONICAL_BOM_845_000112 } from "../../data/canonicalBom";
import { SubsystemCrossModeHint } from "../ui/CrossModeHint";
import { iterationRiskStyle } from "../ui/badgeStyles";
import { MODE_CONFIG } from "../../data/modeConfig";

// ─── Data ─────────────────────────────────────────────────────────────────────

/** Normalized display shape — used by SubsystemCard for both modes. */
interface Subsystem {
  id: string;
  name: string;
  /** costWeight (production) or complexityScore (prototype) — same 1–10 scale. */
  costWeight: number;
  /** primaryDrivers (production) or complexitySignals (prototype). */
  primaryDrivers: string[];
  /** recommendedLever (production) or simplificationTarget (prototype). */
  recommendedLever: string;
  accentColor: string;
  knownParts: { number: string; name: string }[];
  note?: string;
  // ── Prototype-only (optional) ──
  iterationRisk?: "Low" | "Medium" | "High";
  criticalPathParts?: string[];
}

/** Accent colors keyed by subsystem id — used in prototype mode where PrototypeSubsystem has no accentColor. */
const SUBSYSTEM_ACCENT_COLORS: Record<string, string> = {
  "housing-structure": "#1B3A5C",
  "geartrain":          "#2B6CB0",
  "cable-management":   "#0891B2",
  "retention":          "#7C3AED",
  "shafting":           "#059669",
  "purchased-ots":      "#64748B",
};

// ── Dead stub removed — subsystems are resolved at runtime via useDashboardData ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SUBSYSTEMS_STUB: Subsystem[] = [/* see useDashboardData() in SubsystemAnalysis() */];
void _SUBSYSTEMS_STUB;
// ─── Cost weight dots ──────────────────────────────────────────────────────────

function CostWeightDots({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-sm"
          style={{ background: i < score ? color : "#E2E8F0" }}
        />
      ))}
    </div>
  );
}

// ─── Subsystem card ────────────────────────────────────────────────────────────

function SubsystemCard({
  subsystem,
  delay,
}: {
  subsystem: Subsystem;
  delay: number;
}) {
  const { mode } = useAppMode();
  const cfg = MODE_CONFIG[mode];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex flex-col"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Card header */}
      <div
        className="px-5 py-4 flex items-center gap-3 border-b border-[#F1F5F9]"
        style={{ background: "#FAFBFD" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${subsystem.accentColor}18` }}
        >
          <Layers size={17} color={subsystem.accentColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-[#0F2035] text-[15px]"
            style={{ fontWeight: 600 }}
          >
            {subsystem.name}
          </h3>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            {subsystem.knownParts.length} part
            {subsystem.knownParts.length !== 1 ? "s" : ""} identified
          </p>
        </div>
        {/* Cost weight pill */}
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${subsystem.accentColor}20` }}
        >
          <span
            className="text-[14px]"
            style={{ color: subsystem.accentColor, fontWeight: 700 }}
          >
            {subsystem.costWeight}
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5">

        {/* Cost Weight / Complexity Score */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2"
            style={{ fontWeight: 500 }}
          >
          {cfg.weightScoreLabel}
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className="text-[36px] leading-none"
              style={{ color: subsystem.accentColor, fontWeight: 700 }}
            >
              {subsystem.costWeight}
            </span>
            <div className="flex flex-col gap-1.5 pb-1">
              <CostWeightDots
                score={subsystem.costWeight}
                color={subsystem.accentColor}
              />
              <span className="text-[10px] text-[#94A3B8]">score out of 10</span>
            </div>
          </div>
          {/* Prototype: iteration risk + critical path count */}
          {mode === "prototype" && subsystem.iterationRisk && (
            <div className="flex items-center gap-2 mt-2">
              <Clock size={11} className="text-[#94A3B8]" />
              <span className="text-[11px] text-[#94A3B8]">Iteration risk:</span>
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-md"
                style={{
                  ...iterationRiskStyle(subsystem.iterationRisk),
                  fontWeight: 600,
                }}
              >
                {subsystem.iterationRisk}
              </span>
              {(subsystem.criticalPathParts?.length ?? 0) > 0 && (
                <span className="text-[11px] text-[#94A3B8]">
                  · {subsystem.criticalPathParts!.length} critical path part{subsystem.criticalPathParts!.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Primary Drivers */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2.5"
            style={{ fontWeight: 500 }}
          >
            {cfg.driversLabel}
          </p>
          <div className="flex flex-col gap-1.5">
            {subsystem.primaryDrivers.map((driver) => (
              <span
                key={driver}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FDE68A] text-[12px]"
                style={{ background: "#FFFBEB", color: "#92400E", fontWeight: 500 }}
              >
                <AlertTriangle size={11} color="#D97706" className="shrink-0" />
                {driver}
              </span>
            ))}
          </div>
        </div>

        {/* Recommended Lever */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2.5"
            style={{ fontWeight: 500 }}
          >
            {cfg.leverLabel}
          </p>
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[#BFDBFE]"
            style={{ background: "#EFF6FF" }}
          >
            <Zap size={14} color="#3B82F6" className="shrink-0 mt-0.5" />
            <span
              className="text-[12px] text-[#1E3A8A] leading-snug"
              style={{ fontWeight: 600 }}
            >
              {subsystem.recommendedLever}
            </span>
          </div>
        </div>

        {/* Known parts */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2.5"
            style={{ fontWeight: 500 }}
          >
            Known Parts
          </p>
          {subsystem.knownParts.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {subsystem.knownParts.map((part) => (
                <div
                  key={part.number}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-[#F1F5F9] bg-[#FAFBFD]"
                >
                  <span
                    className="text-[12px] text-[#475569] font-mono"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {part.number}
                  </span>
                  <span
                    className="text-[12px] text-[#1E293B]"
                    style={{ fontWeight: 500 }}
                  >
                    {part.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#CBD5E1]">
              <Info size={12} className="text-[#CBD5E1] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#94A3B8] leading-snug">
                {subsystem.note}
              </p>
            </div>
          )}
        </div>

        {/* Cross-mode aggregate hint */}
        <SubsystemCrossModeHint
          partNumbers={subsystem.knownParts.map((p) => p.number)}
          mode={mode}
        />
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SubsystemAnalysis() {
  const { mode } = useAppMode();
  const data = useDashboardData();
  const cfg = MODE_CONFIG[mode];

  // Normalize canonical subsystems to the local Subsystem display shape.
  const SUBSYSTEMS: Subsystem[] = data.mode === "production"
    ? (data.subsystems as ProductionSubsystem[])
    : (data.subsystems as PrototypeSubsystem[]).map((s) => ({
        id: s.id,
        name: s.name,
        costWeight: s.complexityScore,
        primaryDrivers: s.complexitySignals,
        recommendedLever: s.simplificationTarget,
        accentColor: SUBSYSTEM_ACCENT_COLORS[s.id] ?? "#64748B",
        knownParts: CANONICAL_BOM_845_000112
          .filter((p) => p.subsystem === s.name)
          .map((p) => ({ number: p.partNumber, name: p.partName })),
        iterationRisk: s.iterationRisk,
        criticalPathParts: s.criticalPathParts,
      }));

  const highestWeight = Math.max(...SUBSYSTEMS.map((s) => s.costWeight));
  const highestWeightName = SUBSYSTEMS.find(
    (s) => s.costWeight === highestWeight
  )!.name;

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
            Subsystem Analysis
          </span>
        </div>
        <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>
          Subsystem Analysis
        </h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          {mode === "prototype"
            ? `Per-subsystem complexity breakdown for Assembly 845-000112 · ${SUBSYSTEMS.length} subsystems identified`
            : `Per-subsystem cost driver breakdown for Assembly 845-000112 · ${SUBSYSTEMS.length} subsystems identified`}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Subsystems",
              value: String(SUBSYSTEMS.length),
              sub: "identified",
              color: "#1B3A5C",
            },
            {
              label: cfg.highestWeightLabel,
              value: String(highestWeight),
              sub: highestWeightName,
              color: "#D97706",
            },
            {
              label: cfg.leverCountLabel,
              value: String(SUBSYSTEMS.filter((s) => s.recommendedLever).length),
              sub: cfg.leverCountSub,
              color: "#059669",
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

        {/* Subsystem cards grid */}
        <div className="grid grid-cols-2 gap-5">
          {SUBSYSTEMS.map((subsystem, i) => (
            <SubsystemCard
              key={subsystem.id}
              subsystem={subsystem}
              delay={i * 0.06}
            />
          ))}
        </div>
      </div>
    </div>
  );
}