import { useNavigate } from "react-router";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Package,
  Layers,
  Zap,
  TrendingDown,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  Info,
  ShieldAlert,
  CalendarClock,
  Wrench,
  CircleAlert,
  CheckCircle2,
  Clock,
  ListChecks,
} from "lucide-react";
import { useCostModel } from "../../context/CostModelContext";
import {
  fmtCurrency,
  fmtSavingsDelta,
  PART_COST_DATA,
  INTERVENTION_COST_DATA,
  applyImpactModel,
} from "../../data/costData";
import {
  useDashboardData,
  isPrototypeData,
  type ProductionSubsystem,
  type PrototypeSubsystem,
} from "../../data/dashboardData";
import { BuildTimingSection } from "./BuildTimingSection";
import { buildReadinessStyle, SEVERITY_SIGNAL_STYLE, RISK_STYLE } from "../ui/badgeStyles";
import { MODE_CONFIG } from "../../data/modeConfig";
import { MODE_QUICK_NAV } from "../../data/navConfig";
import { useBuildTarget } from "../../context/BuildTargetContext";
import {
  PROTOTYPE_SIMPLIFICATIONS,
  computePrototypeSummary,
  type PrototypeSummaryData,
  getTopFunctionalRiskParts,
  getAllProductionRiskSignals,
  getBomPartName,
} from "../../data/prototypeData";

// Stable display mappings for charts — indexed by canonical subsystem name
const SUBSYSTEM_SHORT_NAMES: Record<string, string> = {
  "Housing / Structure": "Housing",
  "Geartrain":           "Geartrain",
  "Cable Management":    "Cables",
  "Retention":           "Retention",
  "Shafting":            "Shafting",
  "Purchased / OTS":     "OTS",
};

const SUBSYSTEM_CHART_COLORS: Record<string, string> = {
  "Housing / Structure": "#1B3A5C",
  "Geartrain":           "#2B6CB0",
  "Cable Management":    "#0891B2",
  "Retention":           "#7C3AED",
  "Shafting":            "#059669",
  "Purchased / OTS":     "#64748B",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        className="bg-[#0F2035] text-white rounded-lg px-3 py-2 shadow-xl border border-white/10 text-sm"
      >
        <p className="font-semibold">{d.name}</p>
        <p className="text-[#4DB6E5] mt-0.5">
          Weight: {d.value} ({d.pct}%)
        </p>
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        className="bg-[#0F2035] text-white rounded-lg px-3 py-2 shadow-xl border border-white/10 text-sm"
      >
        <p className="font-semibold">{d.name}</p>
        <p className="text-[#4DB6E5] mt-0.5">
          Relative Weight: {d.weight} ({d.pct}%)
        </p>
      </div>
    );
  }
  return null;
};

// ── Custom colored bar shape — avoids <Cell> children and recharts internal key collisions ──
const ColoredBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!height || height <= 0) return null;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={payload.color}
      rx={4}
      ry={4}
    />
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted uppercase tracking-wider font-medium">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: accent ?? "#EFF4FA" }}
        >
          <Icon size={15} color={accent ? "white" : "#1B3A5C"} />
        </div>
      </div>
      <div>
        <p className="text-[28px] text-text-primary font-semibold leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-sm text-text-subtle mt-1.5">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Prototype Summary Panel ───────────────────────────────────────────────────
// Derived at render time from static constants — no network, no context.
// Answers: "What matters most right now?" in ~10 seconds.
function PrototypeSummaryPanel({
  summary,
  perAssemblyCost,
  totalBuildCost,
  buildQuantity,
}: {
  summary: PrototypeSummaryData;
  perAssemblyCost: number;
  totalBuildCost: number;
  buildQuantity: number;
}) {
  const readinessStyle = buildReadinessStyle(summary.buildReadiness);

  // Map part numbers to display names via canonical BOM
  const partName = (pn: string | undefined) =>
    pn ? getBomPartName(pn) : "";

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-surface-raised">
      {/* Header row */}
      <div
        className="px-5 py-3.5 border-b border-border flex items-center justify-between"
        style={{ background: "#0F2035" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base text-white font-semibold">
            Prototype Summary
          </span>
          <span className="text-xs text-[#93C5FD]">
            What matters most right now
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{
              background: readinessStyle.bg,
              color: readinessStyle.color,
            }}
          >
            {summary.buildReadiness}
          </span>
          {summary.daysToNextBuild != null && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                background: summary.daysToNextBuild <= 7 ? "#FFF1F2" : "#EFF6FF",
                color: summary.daysToNextBuild <= 7 ? "#BE123C" : "#2563EB",
              }}
            >
              <CalendarClock size={11} />
              {summary.daysToNextBuild > 0
                ? `${summary.daysToNextBuild}d to build`
                : summary.daysToNextBuild === 0
                ? "build today"
                : `${Math.abs(summary.daysToNextBuild)}d overdue`}
            </span>
          )}
        </div>
      </div>

      {/* Four signal cells */}
      <div className="grid grid-cols-4 divide-x divide-border">
        {/* ── Top Blocker ── */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#FFF1F2" }}
            >
              <CircleAlert size={13} color="#E11D48" />
            </div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
              Top Blocker
            </span>
            {summary.hardBlockerCount > 0 && (
              <span
                className="ml-auto text-2xs px-1.5 py-0.5 rounded-md font-bold"
                style={{ background: "#FFF1F2", color: "#BE123C" }}
              >
                {summary.hardBlockerCount}
              </span>
            )}
          </div>
          {summary.topBlocker ? (
            <>
              <p className="text-sm text-text-body font-semibold leading-snug mb-1">
                {partName(summary.topBlocker.partNumber) || "Assembly blocker"}
              </p>
              {summary.topBlocker.leadTimeDays != null && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Clock size={10} color="#94A3B8" />
                  <span className="text-xs text-text-subtle font-mono">
                    {summary.topBlocker.leadTimeDays}d lead time
                  </span>
                </div>
              )}
              <p className="text-xs text-text-secondary leading-snug mb-2">
                {summary.topBlocker.description}
              </p>
              <div className="px-2.5 py-1.5 rounded-md bg-success-bg border border-success-border">
                <p className="text-xs text-[#166534] leading-snug">
                  {summary.topBlocker.resolution}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-subtle">No hard blockers</p>
          )}
        </div>

        {/* ── Top Simplification ── */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#ECFDF5" }}
            >
              <Wrench size={13} color="#059669" />
            </div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
              Top Simplification
            </span>
          </div>
          {summary.topSimplification ? (
            <>
              <p className="text-sm text-text-body font-semibold leading-snug mb-1">
                {summary.topSimplification.partName.replace(/^RS320 /, "")}
              </p>
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-xs text-success font-mono font-semibold">
                  −{summary.topSimplification.leadTimeSavingsDays}d
                </span>
                <span className="text-xs text-text-subtle">lead time savings</span>
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                {summary.topSimplification.simplificationPath}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-subtle">No simplifications recorded</p>
          )}
        </div>

        {/* ── Build Cost ── */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#F0FDF4" }}
            >
              <TrendingDown size={13} color="#059669" />
            </div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
              Build Cost
            </span>
          </div>
          {perAssemblyCost > 0 ? (
            <>
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-2xs text-text-subtle font-medium mb-0.5">Per Assembly</p>
                  <p className="text-[17px] text-text-primary font-bold font-mono" style={{ letterSpacing: "-0.02em" }}>
                    {fmtCurrency(perAssemblyCost)}
                  </p>
                </div>
                <div className="h-px bg-surface-subtle" />
                <div>
                  <p className="text-2xs text-text-subtle font-medium mb-0.5">
                    Total ({buildQuantity} unit{buildQuantity !== 1 ? "s" : ""})
                  </p>
                  <p className="text-[17px] text-success font-bold font-mono" style={{ letterSpacing: "-0.02em" }}>
                    {fmtCurrency(totalBuildCost)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-subtle">No cost data available</p>
          )}
        </div>

        {/* ── Top Production Risk ── */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#FFF1F2" }}
            >
              <ShieldAlert size={13} color="#BE123C" />
            </div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
              Top Scale Risk
            </span>
          </div>
          {summary.topProductionRisk ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-text-body font-semibold leading-snug">
                  {partName(summary.topProductionRisk.partNumber)}
                </p>
                <span
                  className="text-2xs px-1.5 py-0.5 rounded border shrink-0 font-semibold"
                  style={{
                    background: SEVERITY_SIGNAL_STYLE.Block.bg,
                    color: SEVERITY_SIGNAL_STYLE.Block.text,
                    borderColor: SEVERITY_SIGNAL_STYLE.Block.border,
                  }}
                >
                  Block
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-snug mb-2">
                {summary.topProductionRisk.signal}
              </p>
              <div className="px-2.5 py-1.5 rounded-md bg-success-bg border border-success-border">
                <p className="text-xs text-[#166534] leading-snug">
                  {summary.topProductionRisk.mitigation}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-subtle">No Block signals recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Production Readiness Scorecard — compact teaser (full page at /production-readiness) ──
function ProductionReadinessScorecard() {
  const navigate    = useNavigate();
  const allSignals  = getAllProductionRiskSignals();

  const blockSignals = allSignals.filter((s) => s.severity === "Block");
  const flagCount    = allSignals.filter((s) => s.severity === "Flag").length;
  const watchCount   = allSignals.filter((s) => s.severity === "Watch").length;

  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-4 border-b border-surface-subtle flex items-center justify-between bg-surface-raised">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFF1F2" }}>
            <ShieldAlert size={16} color="#E11D48" />
          </div>
          <div>
            <h2 className="text-text-primary font-semibold">
              Production Readiness Scorecard
            </h2>
            <p className="text-sm text-text-subtle">
              Design decisions that will break at scale — resolve before pilot
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/production-readiness")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:border-brand-800/30 hover:bg-surface-muted transition-all text-text-primary"
        >
          View full scorecard
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Severity stat pills */}
      <div className="px-5 py-3.5 border-b border-surface-subtle flex items-center gap-3 flex-wrap">
        {(["Block", "Flag", "Watch"] as const).map((sev) => {
          const count =
            sev === "Block" ? blockSignals.length :
            sev === "Flag"  ? flagCount :
            watchCount;
          const st = SEVERITY_SIGNAL_STYLE[sev];
          return (
            <div
              key={sev}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ background: st.bg, borderColor: st.border }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dot }} />
              <span className="text-md font-bold" style={{ color: st.text, lineHeight: 1 }}>
                {count}
              </span>
              <span className="text-xs font-medium" style={{ color: st.text }}>
                {sev}
              </span>
            </div>
          );
        })}
        <span className="ml-2 text-xs text-text-subtle">
          {allSignals.length} total signals across {new Set(allSignals.map((s) => s.partNumber)).size} parts
        </span>
      </div>

      {/* Top Block signals preview (up to 3) */}
      {blockSignals.length > 0 ? (
        <div className="divide-y divide-surface-subtle">
          {blockSignals.slice(0, 3).map((s, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "#FFF1F2", border: "1px solid #FECDD3" }}
              >
                <span className="text-[9px] text-[#BE123C] font-mono font-bold">B</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm text-text-body font-semibold">
                    {s.partName.replace(/^RS320 /, "")}
                  </span>
                  <span className="text-2xs text-text-subtle font-mono">
                    {s.partNumber}
                  </span>
                  <span className="text-2xs px-1.5 py-0.5 rounded border border-border bg-surface-muted text-text-muted font-medium">
                    {s.category}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-snug">
                  {s.signal}
                </p>
              </div>
            </div>
          ))}
          {blockSignals.length > 3 && (
            <div className="px-5 py-2.5">
              <button
                onClick={() => navigate("/production-readiness")}
                className="text-sm text-[#2563EB] font-medium hover:underline"
              >
                +{blockSignals.length - 3} more block{blockSignals.length - 3 !== 1 ? "s" : ""} — view all →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          <p className="text-sm text-success font-medium">
            No Block signals — {flagCount + watchCount} lower-severity items to review before pilot
          </p>
        </div>
      )}
    </div>
  );
}

// ── Prototype: Fastest Iteration Wins ─────────────────────────────────────────
function ProtoIterationWins() {
  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-surface-subtle flex items-center justify-between bg-surface-raised">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#ECFDF5" }}>
            <ListChecks size={16} color="#059669" />
          </div>
          <div>
            <h2 className="text-text-primary font-semibold">
              Fastest Iteration Wins
            </h2>
            <p className="text-sm text-text-subtle">
              Changes with biggest cycle time impact
            </p>
          </div>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-md font-medium bg-surface-subtle text-text-muted"
        >
          {PROTOTYPE_SIMPLIFICATIONS.length} total
        </span>
      </div>
      <div className="flex flex-col divide-y divide-surface-subtle flex-1">
        {PROTOTYPE_SIMPLIFICATIONS.slice(0, 3).map((s, i) => (
          <div key={s.partNumber} className="px-5 py-4 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-border bg-white">
              <span className="text-2xs text-text-subtle font-bold font-mono">
                {i + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm text-text-body font-semibold">
                  {s.partName.replace(/^RS320 /, "")}
                </span>
                {s.subsystem && (
                  <span className="text-2xs px-1.5 py-0.5 rounded border border-border bg-surface-muted text-text-muted font-medium">
                    {s.subsystem}
                  </span>
                )}
                <span className="ml-auto text-sm text-success font-bold font-mono">
                  −{s.leadTimeSavingsDays}d
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                {s.simplificationPath}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prototype: Functional Risk ────────────────────────────────────────────────
function ProtoFunctionalRisk() {
  const top3 = getTopFunctionalRiskParts(3);

  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-surface-subtle flex items-center justify-between bg-surface-raised">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFFBEB" }}>
            <AlertCircle size={16} color="#D97706" />
          </div>
          <div>
            <h2 className="text-text-primary font-semibold">
              Functional Risk
            </h2>
            <p className="text-sm text-text-subtle">
              Parts most likely to fail build validation
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-surface-subtle flex-1">
        {top3.map(({ partNumber: pn, record }) => {
          const displayName = getBomPartName(pn).replace(/^RS320 /, "");
          const fr = record.functionalRisk;
          const isHighOrCrit =
            fr.riskLevel === "High" || fr.riskLevel === "Critical";
          const riskSt = RISK_STYLE[fr.riskLevel] ?? RISK_STYLE.Medium;
          return (
            <div
              key={pn}
              className="px-5 py-4"
              style={{
                borderLeft: `3px solid ${isHighOrCrit ? "#E11D48" : "#D97706"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-sm text-text-body font-semibold">
                  {displayName.replace(/^RS320 /, "")}
                </span>
                <span
                  className="text-2xs px-1.5 py-0.5 rounded border shrink-0 font-semibold"
                  style={{
                    background: riskSt.bg,
                    color: riskSt.text,
                    borderColor: riskSt.border,
                  }}
                >
                  {fr.riskLevel}
                </span>
                <span className="ml-auto text-2xs text-text-subtle">
                  {fr.validationRequired.length} validation
                  {fr.validationRequired.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-snug mb-1.5">
                {fr.primaryRisks[0] ?? ""}
              </p>
              <div className="flex items-center gap-1">
                {fr.clearToBuild ? (
                  <CheckCircle2 size={11} color="#059669" />
                ) : (
                  <CircleAlert size={11} color="#E11D48" />
                )}
                <span
                  className="text-2xs font-medium"
                  style={{ color: fr.clearToBuild ? "#059669" : "#E11D48" }}
                >
                  {fr.clearToBuild ? "Clear to build" : "Not clear to build"}
                  {fr.clearToBuildNotes ? ` · ${fr.clearToBuildNotes}` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Overview — dispatches by mode ─────────────────────────────────────────────
export function Overview() {
  const data = useDashboardData();
  if (isPrototypeData(data)) return <PrototypeOverview />;
  return <ProductionOverview />;
}

// ── Prototype Build Command Center ────────────────────────────────────────────
function PrototypeOverview() {
  const navigate = useNavigate();
  const data = useDashboardData();
  const { buildTargetDate, estimatedBuildDays, buildQuantity } = useBuildTarget();
  const { currentBomCost } = useCostModel();
  const summary = computePrototypeSummary(buildTargetDate, estimatedBuildDays);
  const simplificationCount = isPrototypeData(data) ? data.simplifications.length : 0;
  const totalBuildCost = currentBomCost * buildQuantity;

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-subtle uppercase tracking-wider">
              Dashboard
            </span>
            <ChevronRight size={12} className="text-text-ghost" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Overview
            </span>
          </div>
          <h1 className="text-text-primary font-semibold">
            Build Command Center
          </h1>
          <p className="text-base text-text-muted mt-0.5">
            {data.assembly.assemblyName} · {data.assembly.assemblyId} ·{" "}
            {data.assembly.totalPartCount} parts
          </p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-800 text-white text-base font-medium hover:bg-brand-900 transition-colors"
        >
          <Zap size={14} />
          Update Analysis
        </button>
      </div>

      {/* 1. Prototype Summary — 10-second status board */}
      <PrototypeSummaryPanel
        summary={summary}
        perAssemblyCost={currentBomCost}
        totalBuildCost={totalBuildCost}
        buildQuantity={buildQuantity}
      />

      {/* 2 + 3. Build Readiness + Order Timeline */}
      <BuildTimingSection />

      {/* 4 + 5. Fastest Iteration Wins / Functional Risk */}
      <div className="grid grid-cols-2 gap-4">
        <ProtoIterationWins />
        <ProtoFunctionalRisk />
      </div>

      {/* 6. Future Production Risk */}
      <ProductionReadinessScorecard />

      {/* Analysis Modules nav */}
      <div>
        <h3 className="text-base text-text-muted uppercase tracking-wider font-medium mb-3">
          Analysis Modules
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {MODE_QUICK_NAV["prototype"].map((item) => {
            const statusMap: Record<string, string> = {
              interventions: `${simplificationCount} actions`,
              bom:           `${data.assembly.totalPartCount} parts`,
              subsystems:    `${data.subsystems.length} subsystems`,
              dfm:           `${data.dfmFlags.length} findings`,
            };
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="group bg-surface-card rounded-xl border border-border p-4 text-left hover:border-brand-800/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-2xs px-2 py-0.5 rounded-full border border-border text-text-subtle">
                    {statusMap[item.statusKey] ?? ""}
                  </span>
                </div>
                <p className="text-base text-text-body font-medium mb-1">
                  {item.label}
                </p>
                <p className="text-xs text-text-subtle">
                  {item.desc}
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-text-ghost group-hover:text-brand-800 transition-colors">
                  <span>Open</span>
                  <ArrowRight size={11} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Production Cost Dashboard ─────────────────────────────────────────────────
function ProductionOverview() {
  const navigate = useNavigate();
  const data = useDashboardData();
  const { mode } = data;
  const cfg = MODE_CONFIG[mode];
  const {
    currentBomCost,
    projectedBomCost,
    annualSavingsPotential,
    expectedAnnualVolume,
    selectedInterventions,
    fullProjectedBomCost,
    fullAnnualSavingsPotential,
  } = useCostModel();

  const hasInterventions = selectedInterventions.size > 0;

  // ── Chart data ───────────────────────────────────────────────────────────────
  const chartData = data.subsystems.map((s) => {
    const weight =
      data.mode === "production"
        ? (s as ProductionSubsystem).costWeight
        : (s as PrototypeSubsystem).complexityScore;
    return {
      name: s.name,
      shortName: SUBSYSTEM_SHORT_NAMES[s.name] ?? s.name,
      weight,
      color: SUBSYSTEM_CHART_COLORS[s.name] ?? "#64748B",
    };
  });
  const chartTotal = chartData.reduce((sum, d) => sum + d.weight, 0);
  const pieData = chartData.map((d) => ({
    ...d,
    value: d.weight,
    fill: d.color,
    pct: chartTotal > 0 ? Math.round((d.weight / chartTotal) * 100) : 0,
  }));
  const barData = chartData.map((d) => ({
    name: d.shortName,
    weight: d.weight,
    pct: chartTotal > 0 ? Math.round((d.weight / chartTotal) * 100) : 0,
    color: d.color,
  }));

  const topSubsystemName = chartData.reduce(
    (best, s) => (s.weight > best.weight ? s : best),
    chartData[0],
  ).name;
  const topSubsystemRaw = data.subsystems.find((s) => s.name === topSubsystemName)!;
  const topDrivers =
    data.mode === "production"
      ? (topSubsystemRaw as ProductionSubsystem).primaryDrivers.slice(0, 2)
      : (topSubsystemRaw as PrototypeSubsystem).complexitySignals.slice(0, 2);

  const topOpportunity =
    data.mode === "production"
      ? (() => {
          const i = data.interventions[0];
          const costRec = PART_COST_DATA[i.partNumber];
          const intData = INTERVENTION_COST_DATA[i.partNumber];
          const savingsDisplay =
            costRec?.unitCostCurrent != null && intData
              ? fmtSavingsDelta(
                  costRec.unitCostCurrent,
                  applyImpactModel(costRec.unitCostCurrent, intData.costImpactModel),
                )
              : i.estimatedSavings;
          return { headline: savingsDisplay, sub: `${i.partName} · ${i.recommendedIntervention}` };
        })()
      : (() => {
          const s = data.simplifications[0];
          return {
            headline: s.partName.replace(/^RS320 /, ""),
            sub: s.iterationImpact,
          };
        })();

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-subtle uppercase tracking-wider">
              Dashboard
            </span>
            <ChevronRight size={12} className="text-text-ghost" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Overview
            </span>
          </div>
          <h1 className="text-text-primary font-semibold">
            Assembly Overview
          </h1>
          <p className="text-base text-text-muted mt-0.5">
            {cfg.overviewSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/upload")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-800 text-white text-base font-medium hover:bg-brand-900 transition-colors"
          >
            <Zap size={14} />
            Run Analysis
          </button>
        </div>
      </div>

      {/* Assembly Identity Card */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-subtle bg-surface-raised">
          <div className="w-9 h-9 rounded-lg bg-brand-800 flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-text-primary font-semibold">
              {data.assembly.assemblyName} · {data.assembly.assemblyId}
            </h2>
            <p className="text-sm text-text-subtle">
              Mechanical assembly · {data.assembly.makePartCount} make ·{" "}
              {data.assembly.buyPartCount} buy
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] text-xs font-medium">
            Analysis Ready
          </div>
        </div>

        {/* Subsystem tags */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={13} className="text-text-subtle" />
            <span className="text-sm text-text-muted uppercase tracking-wider font-medium">
              Subsystems
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.subsystems.map((s) => (
              <button
                key={s.name}
                onClick={() => navigate("/subsystem-analysis")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-muted text-base text-text-body hover:border-brand-800/30 hover:bg-surface-subtle transition-all group"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: SUBSYSTEM_CHART_COLORS[s.name] ?? "#64748B" }}
                />
                <span>{s.name}</span>
                <ArrowRight
                  size={11}
                  className="text-text-ghost group-hover:text-brand-800 transition-colors"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Parts"
          value={data.assembly.totalPartCount}
          sub={`${data.assembly.makePartCount} make · ${data.assembly.buyPartCount} buy`}
        />
        <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted uppercase tracking-wider font-medium">
              Current BOM Cost
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF4FA] flex items-center justify-center">
              <Package size={15} color="#1B3A5C" />
            </div>
          </div>
          <div>
            <p className="text-[28px] text-text-primary font-bold leading-none font-mono">
              {fmtCurrency(currentBomCost)}
            </p>
            <p className="text-sm text-text-subtle mt-1.5">
              per assembly · real-time pricing
            </p>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted uppercase tracking-wider font-medium">
              Projected BOM Cost
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
              <TrendingDown size={15} color="#15803D" />
            </div>
          </div>
          <div>
            <p className="text-[28px] text-success font-bold leading-none font-mono">
              {fmtCurrency(fullProjectedBomCost)}
            </p>
            <p className="text-sm text-text-subtle mt-1.5">
              {fmtSavingsDelta(currentBomCost, fullProjectedBomCost)} if all interventions applied
            </p>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted uppercase tracking-wider font-medium">
              Annual Savings Potential
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
              <TrendingDown size={15} color="#15803D" />
            </div>
          </div>
          <div>
            <p className="text-[28px] text-success font-bold leading-none font-mono">
              {fmtCurrency(fullAnnualSavingsPotential)}
            </p>
            <p className="text-sm text-text-subtle mt-1.5">
              {fmtSavingsDelta(currentBomCost, fullProjectedBomCost)} / unit · {expectedAnnualVolume.toLocaleString()} units/yr
            </p>
          </div>
        </div>
      </div>

      {/* Production Readiness Timing */}
      <BuildTimingSection />

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Donut chart */}
        <div className="bg-surface-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-text-primary font-semibold">
                {cfg.chartTitle}
              </h3>
              <p className="text-sm text-text-subtle mt-0.5">{cfg.chartSubtitle}</p>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-surface-subtle text-text-muted text-xs font-medium">
              Weighted
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-48 h-48 shrink-0">
              <PieChart width={192} height={192}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 text-sm text-text-secondary">
                    {d.name}
                  </span>
                  <span className="text-sm text-brand-800 font-semibold">
                    {d.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-surface-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-text-primary font-semibold">
                Subsystem Cost Weights
              </h3>
              <p className="text-sm text-text-subtle mt-0.5">
                Relative cost contribution score
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-surface-subtle text-text-muted text-xs font-medium">
              Raw Score
            </div>
          </div>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart
              data={barData}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 2, 4, 6, 8, 10]}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar
                dataKey="weight"
                radius={[4, 4, 0, 0]}
                shape={ColoredBar}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick nav cards */}
      <div>
        <h3 className="text-base text-text-muted uppercase tracking-wider font-medium mb-3">
          Analysis Modules
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(() => {
            const statusMap: Record<string, string> = {
              interventions:
                data.mode === "production"
                  ? `${data.interventions.length} interventions`
                  : `${data.simplifications.length} simplifications`,
              bom:        `${data.assembly.totalPartCount} parts`,
              subsystems: `${data.subsystems.length} subsystems`,
              dfm:        `${data.dfmFlags.length} findings`,
              materials:  "4 candidates",
              transition: "3 stages",
            };
            return MODE_QUICK_NAV[mode].map((item) => {
              const status = statusMap[item.statusKey] ?? "";
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="group bg-surface-card rounded-xl border border-border p-4 text-left hover:border-brand-800/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-2xs px-2 py-0.5 rounded-full border border-border text-text-subtle">
                      {status}
                    </span>
                  </div>
                  <p className="text-base text-text-body font-medium mb-1">
                    {item.label}
                  </p>
                  <p className="text-xs text-text-subtle">
                    {item.desc}
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-text-ghost group-hover:text-brand-800 transition-colors">
                    <span>Open</span>
                    <ArrowRight size={11} />
                  </div>
                </button>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
