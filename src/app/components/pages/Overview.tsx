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
        className="bg-[#0F2035] text-white rounded-lg px-3 py-2 shadow-xl border border-white/10 text-[12px]"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <p style={{ fontWeight: 600 }}>{d.name}</p>
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
        className="bg-[#0F2035] text-white rounded-lg px-3 py-2 shadow-xl border border-white/10 text-[12px]"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <p style={{ fontWeight: 600 }}>{d.name}</p>
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
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="text-[12px] text-[#64748B] uppercase tracking-wider"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
        >
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
        <p
          className="text-[28px] text-[#0F2035]"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, lineHeight: 1 }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="text-[12px] text-[#94A3B8] mt-1.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
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
}: {
  summary: PrototypeSummaryData;
}) {
  const readinessStyle = buildReadinessStyle(summary.buildReadiness);

  // Map part numbers to display names via canonical BOM
  const partName = (pn: string | undefined) =>
    pn ? getBomPartName(pn) : "";

  return (
    <div
      className="rounded-xl border border-[#E2E8F0] overflow-hidden"
      style={{ background: "#FAFBFD" }}
    >
      {/* Header row */}
      <div
        className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between"
        style={{ background: "#0F2035" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-[13px] text-white"
            style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Prototype Summary
          </span>
          <span
            className="text-[11px] text-[#93C5FD]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            What matters most right now
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-md text-[11px]"
            style={{
              background: readinessStyle.bg,
              color: readinessStyle.color,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {summary.buildReadiness}
          </span>
          {summary.daysToNextBuild != null && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px]"
              style={{
                background: summary.daysToNextBuild <= 7 ? "#FFF1F2" : "#EFF6FF",
                color: summary.daysToNextBuild <= 7 ? "#BE123C" : "#2563EB",
                fontWeight: 600,
                fontFamily: "'IBM Plex Sans', sans-serif",
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
      <div className="grid grid-cols-4 divide-x divide-[#E2E8F0]">
        {/* ── Top Blocker ── */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#FFF1F2" }}
            >
              <CircleAlert size={13} color="#E11D48" />
            </div>
            <span
              className="text-[11px] uppercase tracking-wider text-[#64748B]"
              style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Top Blocker
            </span>
            {summary.hardBlockerCount > 0 && (
              <span
                className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md"
                style={{
                  background: "#FFF1F2",
                  color: "#BE123C",
                  fontWeight: 700,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {summary.hardBlockerCount}
              </span>
            )}
          </div>
          {summary.topBlocker ? (
            <>
              <p
                className="text-[12px] text-[#1E293B] leading-snug mb-1"
                style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {partName(summary.topBlocker.partNumber) || "Assembly blocker"}
              </p>
              {summary.topBlocker.leadTimeDays != null && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Clock size={10} color="#94A3B8" />
                  <span
                    className="text-[11px] text-[#94A3B8]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {summary.topBlocker.leadTimeDays}d lead time
                  </span>
                </div>
              )}
              <p
                className="text-[11px] text-[#475569] leading-snug mb-2"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {summary.topBlocker.description}
              </p>
              <div
                className="px-2.5 py-1.5 rounded-md"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <p
                  className="text-[11px] text-[#166534] leading-snug"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {summary.topBlocker.resolution}
                </p>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">No hard blockers</p>
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
            <span
              className="text-[11px] uppercase tracking-wider text-[#64748B]"
              style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Top Simplification
            </span>
          </div>
          {summary.topSimplification ? (
            <>
              <p
                className="text-[12px] text-[#1E293B] leading-snug mb-1"
                style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {summary.topSimplification.partName.replace(/^RS320 /, "")}
              </p>
              <div className="flex items-center gap-1 mb-1.5">
                <span
                  className="text-[11px] text-[#059669]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
                >
                  −{summary.topSimplification.leadTimeSavingsDays}d
                </span>
                <span className="text-[11px] text-[#94A3B8]">lead time savings</span>
              </div>
              <p
                className="text-[11px] text-[#475569] leading-snug"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {summary.topSimplification.simplificationPath}
              </p>
            </>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">No simplifications recorded</p>
          )}
        </div>

        {/* ── Top Functional Risk ── */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#FFFBEB" }}
            >
              <AlertCircle size={13} color="#D97706" />
            </div>
            <span
              className="text-[11px] uppercase tracking-wider text-[#64748B]"
              style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Top Functional Risk
            </span>
          </div>
          {summary.topFunctionalRisk ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p
                  className="text-[12px] text-[#1E293B] leading-snug"
                  style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {partName(summary.topFunctionalRisk.partNumber)}
                </p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                  style={{
                    background: summary.topFunctionalRisk.riskLevel === "High" || summary.topFunctionalRisk.riskLevel === "Critical"
                      ? "#FFF1F2" : "#FFFBEB",
                    color: summary.topFunctionalRisk.riskLevel === "High" || summary.topFunctionalRisk.riskLevel === "Critical"
                      ? "#BE123C" : "#92400E",
                    borderColor: summary.topFunctionalRisk.riskLevel === "High" || summary.topFunctionalRisk.riskLevel === "Critical"
                      ? "#FECDD3" : "#FDE68A",
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {summary.topFunctionalRisk.riskLevel}
                </span>
              </div>
              <p
                className="text-[11px] text-[#475569] leading-snug mb-2"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {summary.topFunctionalRisk.primaryRisk}
              </p>
              <div className="flex items-center gap-1">
                {summary.topFunctionalRisk.clearToBuild ? (
                  <CheckCircle2 size={11} color="#059669" />
                ) : (
                  <CircleAlert size={11} color="#E11D48" />
                )}
                <span
                  className="text-[10px]"
                  style={{
                    color: summary.topFunctionalRisk.clearToBuild ? "#059669" : "#E11D48",
                    fontWeight: 500,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {summary.topFunctionalRisk.clearToBuild ? "Clear to build" : "Blocked"}
                  {" · "}{summary.topFunctionalRisk.validationCount} validation{summary.topFunctionalRisk.validationCount !== 1 ? "s" : ""} required
                </span>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">No functional risks recorded</p>
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
            <span
              className="text-[11px] uppercase tracking-wider text-[#64748B]"
              style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Top Scale Risk
            </span>
          </div>
          {summary.topProductionRisk ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p
                  className="text-[12px] text-[#1E293B] leading-snug"
                  style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {partName(summary.topProductionRisk.partNumber)}
                </p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                  style={{
                    background: SEVERITY_SIGNAL_STYLE.Block.bg,
                    color: SEVERITY_SIGNAL_STYLE.Block.text,
                    borderColor: SEVERITY_SIGNAL_STYLE.Block.border,
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  Block
                </span>
              </div>
              <p
                className="text-[11px] text-[#475569] leading-snug mb-2"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {summary.topProductionRisk.signal}
              </p>
              <div
                className="px-2.5 py-1.5 rounded-md"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <p
                  className="text-[11px] text-[#166534] leading-snug"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {summary.topProductionRisk.mitigation}
                </p>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">No Block signals recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Production Readiness Scorecard ────────────────────────────────────────────
// Aggregates all manufacturingRiskSignals from PROTOTYPE_PART_DATA.
// Answers: "What design decisions will break us when we scale?"
function ProductionReadinessScorecard() {
  const allSignals = getAllProductionRiskSignals();

  const blockSignals = allSignals.filter((s) => s.severity === "Block");
  const flagCount    = allSignals.filter((s) => s.severity === "Flag").length;
  const watchCount   = allSignals.filter((s) => s.severity === "Watch").length;

  const categoryMap = new Map<string, number>();
  for (const s of allSignals) {
    categoryMap.set(s.category, (categoryMap.get(s.category) ?? 0) + 1);
  }
  const categorySorted = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#FFF1F2" }}
          >
            <ShieldAlert size={16} color="#E11D48" />
          </div>
          <div>
            <h2
              className="text-[#0F2035]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
            >
              Production Readiness Scorecard
            </h2>
            <p className="text-[12px] text-[#94A3B8]">
              Design decisions that will break at scale — resolve before pilot
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {blockSignals.length > 0 && (
            <span
              className="px-2.5 py-1 rounded-md text-[11px]"
              style={{
                background: SEVERITY_SIGNAL_STYLE.Block.bg,
                color: SEVERITY_SIGNAL_STYLE.Block.text,
                border: `1px solid ${SEVERITY_SIGNAL_STYLE.Block.border}`,
                fontWeight: 600,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {blockSignals.length} Block{blockSignals.length > 1 ? "s" : ""}
            </span>
          )}
          <span
            className="px-2.5 py-1 rounded-md text-[11px]"
            style={{
              background: "#F1F5F9",
              color: "#64748B",
              fontWeight: 500,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {allSignals.length} signals
          </span>
        </div>
      </div>

      {/* Severity counts + category breakdown */}
      <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
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
                <span
                  className="text-[14px]"
                  style={{ color: st.text, fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1 }}
                >
                  {count}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: st.text, fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {sev}
                </span>
              </div>
            );
          })}
        </div>
        <div className="w-px h-6 bg-[#E2E8F0] shrink-0" />
        <div className="flex items-center gap-2 flex-wrap">
          {categorySorted.map(([cat, count]) => (
            <div
              key={cat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E2E8F0]"
              style={{ background: "#F8FAFC" }}
            >
              <span
                className="text-[11px] text-[#64748B]"
                style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {cat}
              </span>
              <span
                className="text-[11px] text-[#1B3A5C]"
                style={{ fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Block signals */}
      {blockSignals.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          <p
            className="text-[11px] uppercase tracking-wider text-[#94A3B8]"
            style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Must Resolve Before Pilot
          </p>
          {blockSignals.slice(0, 3).map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#FECDD3] overflow-hidden"
              style={{ background: "#FFF8F8" }}
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "#FFF1F2", border: "1px solid #FECDD3" }}
                >
                  <span
                    className="text-[10px]"
                    style={{ color: "#BE123C", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    B
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[12px] text-[#1E293B]"
                      style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {s.partName}
                    </span>
                    <span
                      className="text-[10px] text-[#94A3B8]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {s.partNumber}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                      style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {s.category}
                    </span>
                  </div>
                  <p
                    className="text-[12px] text-[#475569]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {s.signal}
                  </p>
                  <div
                    className="mt-2 flex items-start gap-2 px-3 py-2 rounded-md"
                    style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
                  >
                    <ArrowRight size={12} color="#059669" className="shrink-0 mt-0.5" />
                    <p
                      className="text-[11px] text-[#166534]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {s.mitigation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Prototype: Fastest Iteration Wins ─────────────────────────────────────────
function ProtoIterationWins() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex flex-col">
      <div
        className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#ECFDF5" }}
          >
            <ListChecks size={16} color="#059669" />
          </div>
          <div>
            <h2
              className="text-[#0F2035]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
            >
              Fastest Iteration Wins
            </h2>
            <p
              className="text-[12px] text-[#94A3B8]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Changes with biggest cycle time impact
            </p>
          </div>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{
            background: "#F1F5F9",
            color: "#64748B",
            fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          {PROTOTYPE_SIMPLIFICATIONS.length} total
        </span>
      </div>
      <div className="flex flex-col divide-y divide-[#F1F5F9] flex-1">
        {PROTOTYPE_SIMPLIFICATIONS.slice(0, 3).map((s, i) => (
          <div key={s.partNumber} className="px-5 py-4 flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-[#E2E8F0] bg-white"
            >
              <span
                className="text-[10px] text-[#94A3B8]"
                style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {i + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[12px] text-[#1E293B]"
                  style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {s.partName.replace(/^RS320 /, "")}
                </span>
                {s.subsystem && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                    style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {s.subsystem}
                  </span>
                )}
                <span
                  className="ml-auto text-[12px]"
                  style={{ color: "#059669", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  −{s.leadTimeSavingsDays}d
                </span>
              </div>
              <p
                className="text-[11px] text-[#475569] leading-snug"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
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
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex flex-col">
      <div
        className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between"
        style={{ background: "#FAFBFD" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#FFFBEB" }}
          >
            <AlertCircle size={16} color="#D97706" />
          </div>
          <div>
            <h2
              className="text-[#0F2035]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
            >
              Functional Risk
            </h2>
            <p
              className="text-[12px] text-[#94A3B8]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Parts most likely to fail build validation
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-[#F1F5F9] flex-1">
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
                <span
                  className="text-[12px] text-[#1E293B]"
                  style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {displayName.replace(/^RS320 /, "")}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                  style={{
                    background: riskSt.bg,
                    color: riskSt.text,
                    borderColor: riskSt.border,
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {fr.riskLevel}
                </span>
                <span
                  className="ml-auto text-[10px] text-[#94A3B8]"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {fr.validationRequired.length} validation
                  {fr.validationRequired.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p
                className="text-[11px] text-[#475569] leading-snug mb-1.5"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {fr.primaryRisks[0] ?? ""}
              </p>
              <div className="flex items-center gap-1">
                {fr.clearToBuild ? (
                  <CheckCircle2 size={11} color="#059669" />
                ) : (
                  <CircleAlert size={11} color="#E11D48" />
                )}
                <span
                  className="text-[10px]"
                  style={{
                    color: fr.clearToBuild ? "#059669" : "#E11D48",
                    fontWeight: 500,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
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
  const { buildTargetDate, estimatedBuildDays } = useBuildTarget();
  const summary = computePrototypeSummary(buildTargetDate, estimatedBuildDays);
  const simplificationCount = isPrototypeData(data) ? data.simplifications.length : 0;

  return (
    <div
      className="p-6 space-y-6 min-h-full"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
              Dashboard
            </span>
            <ChevronRight size={12} className="text-[#CBD5E1]" />
            <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
              Overview
            </span>
          </div>
          <h1
            className="text-[#0F2035]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
          >
            Build Command Center
          </h1>
          <p
            className="text-[13px] text-[#64748B] mt-0.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {data.assembly.assemblyName} · {data.assembly.assemblyId} ·{" "}
            {data.assembly.totalPartCount} parts
          </p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
          style={{ fontWeight: 500 }}
        >
          <Zap size={14} />
          Update Analysis
        </button>
      </div>

      {/* 1. Prototype Summary — 10-second status board */}
      <PrototypeSummaryPanel summary={summary} />

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
        <h3
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-3"
          style={{ fontWeight: 500 }}
        >
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
                className="group bg-white rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-[#1B3A5C]/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[#94A3B8]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {statusMap[item.statusKey] ?? ""}
                  </span>
                </div>
                <p
                  className="text-[13px] text-[#1E293B] mb-1"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
                >
                  {item.label}
                </p>
                <p
                  className="text-[11px] text-[#94A3B8]"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {item.desc}
                </p>
                <div className="flex items-center gap-1 mt-3 text-[11px] text-[#CBD5E1] group-hover:text-[#1B3A5C] transition-colors">
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
    <div
      className="p-6 space-y-6 min-h-full"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
              Dashboard
            </span>
            <ChevronRight size={12} className="text-[#CBD5E1]" />
            <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
              Overview
            </span>
          </div>
          <h1
            className="text-[#0F2035]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
          >
            Assembly Overview
          </h1>
          <p
            className="text-[13px] text-[#64748B] mt-0.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {cfg.overviewSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/upload")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
            style={{ fontWeight: 500 }}
          >
            <Zap size={14} />
            Run Analysis
          </button>
        </div>
      </div>

      {/* Assembly Identity Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div
          className="flex items-center gap-3 px-5 py-4 border-b border-[#F1F5F9]"
          style={{ background: "#FAFBFD" }}
        >
          <div className="w-9 h-9 rounded-lg bg-[#1B3A5C] flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2
              className="text-[#0F2035]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
            >
              {data.assembly.assemblyName} · {data.assembly.assemblyId}
            </h2>
            <p
              className="text-[12px] text-[#94A3B8]"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Mechanical assembly · {data.assembly.makePartCount} make ·{" "}
              {data.assembly.buyPartCount} buy
            </p>
          </div>
          <div
            className="px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] text-[11px]"
            style={{ fontWeight: 500 }}
          >
            Analysis Ready
          </div>
        </div>

        {/* Subsystem tags */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={13} className="text-[#94A3B8]" />
            <span
              className="text-[12px] text-[#64748B] uppercase tracking-wider"
              style={{ fontWeight: 500 }}
            >
              Subsystems
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.subsystems.map((s) => (
              <button
                key={s.name}
                onClick={() => navigate("/subsystem-analysis")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1E293B] hover:border-[#1B3A5C]/30 hover:bg-[#EFF4FA] transition-all group"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: SUBSYSTEM_CHART_COLORS[s.name] ?? "#64748B" }}
                />
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {s.name}
                </span>
                <ArrowRight
                  size={11}
                  className="text-[#CBD5E1] group-hover:text-[#1B3A5C] transition-colors"
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
        <StatCard
          icon={Layers}
          label="Subsystem Count"
          value={data.subsystems.length}
          sub={data.subsystems
            .map((s) => SUBSYSTEM_SHORT_NAMES[s.name] ?? s.name)
            .join(" · ")}
        />
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] text-[#64748B] uppercase tracking-wider"
              style={{ fontWeight: 500 }}
            >
              {cfg.driversCardLabel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
              <AlertCircle size={15} color="#D97706" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {topDrivers.map((driver, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] border border-dashed border-[#CBD5E1] px-3 py-2"
              >
                <Info size={12} className="text-[#94A3B8] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#94A3B8]">{driver}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] text-[#64748B] uppercase tracking-wider"
              style={{ fontWeight: 500 }}
            >
              {cfg.topOpportunityLabel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
              <TrendingDown size={15} color="#15803D" />
            </div>
          </div>
          <div>
            <p
              className="text-[22px] text-[#059669]"
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {topOpportunity.headline}
            </p>
            <p
              className="text-[12px] text-[#64748B] mt-1.5"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {topOpportunity.sub}
            </p>
          </div>
        </div>
      </div>

      {/* Production Readiness Timing */}
      <BuildTimingSection />

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Donut chart */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-[#0F2035]"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
              >
                {cfg.chartTitle}
              </h3>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">{cfg.chartSubtitle}</p>
            </div>
            <div
              className="px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#64748B] text-[11px]"
              style={{ fontWeight: 500 }}
            >
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
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ background: d.color }}
                  />
                  <span
                    className="flex-1 text-[12px] text-[#475569]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {d.name}
                  </span>
                  <span
                    className="text-[12px] text-[#1B3A5C]"
                    style={{ fontWeight: 600 }}
                  >
                    {d.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-[#0F2035]"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
              >
                Subsystem Cost Weights
              </h3>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">
                Relative cost contribution score
              </p>
            </div>
            <div
              className="px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#64748B] text-[11px]"
              style={{ fontWeight: 500 }}
            >
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
                tick={{
                  fontSize: 11,
                  fill: "#94A3B8",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "#94A3B8",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
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
        <h3
          className="text-[13px] text-[#64748B] uppercase tracking-wider mb-3"
          style={{ fontWeight: 500 }}
        >
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
                  className="group bg-white rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-[#1B3A5C]/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border border-[#E2E8F0] text-[#94A3B8]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {status}
                    </span>
                  </div>
                  <p
                    className="text-[13px] text-[#1E293B] mb-1"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-[11px] text-[#94A3B8]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {item.desc}
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-[11px] text-[#CBD5E1] group-hover:text-[#1B3A5C] transition-colors">
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
