import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  ShieldAlert,
  TrendingDown,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import {
  useDashboardData,
  type ProductionIntervention,
} from "../../data/dashboardData";
import {
  PROTOTYPE_PART_DATA,
  computeOrderByDate,
  getPartOrderBy,
  type BuildBlocker,
  type ChecklistEntry,
  computeBuildChecklist,
} from "../../data/prototypeData";
import { useBuildTarget } from "../../context/BuildTargetContext";
import {
  PRODUCTION_PART_DETAILS,
} from "../../data/productionData";
import { CANONICAL_BOM_845_000112 } from "../../data/canonicalBom";
import { buildReadinessStyle } from "../ui/badgeStyles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-2"
      style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {children}
    </p>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-[#F8FAFC] last:border-0">
      {children}
    </div>
  );
}

// ─── Prototype: critical-path part row ───────────────────────────────────────

function ProtoCriticalPart({
  partNumber,
  rank,
}: {
  partNumber: string;
  rank: number;
}) {
  const { buildTargetDate, estimatedBuildDays } = useBuildTarget();
  const pd = PROTOTYPE_PART_DATA[partNumber];
  const bom = CANONICAL_BOM_845_000112.find((r) => r.partNumber === partNumber);
  const name = bom?.name ?? partNumber;
  const leadTime = pd?.iterationProfile.leadTimeDays;
  const clearToBuild = pd?.functionalRisk.clearToBuild ?? true;
  const driver = pd?.iterationProfile.primaryLeadTimeDriver ?? "Lead time driver unknown";

  return (
    <Row>
      <span
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] text-white mt-0.5"
        style={{
          background: rank <= 2 ? "#1B3A5C" : "#94A3B8",
          fontWeight: 700,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[12px] text-[#1E293B] truncate"
            style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {name.replace(/^RS320 /i, "")}
          </span>
          <span
            className="text-[10px] font-mono text-[#94A3B8]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {partNumber}
          </span>
        </div>
        <p
          className="text-[11px] text-[#64748B] mt-0.5 leading-snug"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {driver}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {leadTime != null && (
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-[#94A3B8]" />
            <span
              className="text-[11px]"
              style={{
                color: leadTime >= 21 ? "#E11D48" : leadTime >= 14 ? "#D97706" : "#059669",
                fontWeight: 600,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {leadTime}d
            </span>
          </div>
        )}
        {leadTime != null && (() => {
          const ob = computeOrderByDate(leadTime, buildTargetDate, estimatedBuildDays);
          if (!ob) return null;
          const label = ob.orderByDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const urgencyColor = ob.isOverdue ? "#E11D48" : ob.daysUntilDeadline <= 3 ? "#D97706" : "#94A3B8";
          return (
            <div className="flex items-center gap-1">
              <Calendar size={9} style={{ color: urgencyColor }} />
              <span
                className="text-[10px]"
                style={{
                  color: urgencyColor,
                  fontWeight: ob.isOverdue || ob.daysUntilDeadline <= 3 ? 700 : 400,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {ob.isOverdue
                  ? `${label}!`
                  : ob.daysUntilDeadline === 0
                  ? "order today"
                  : label}
              </span>
            </div>
          );
        })()}
        {clearToBuild ? (
          <CheckCircle2 size={11} className="text-[#16A34A]" />
        ) : (
          <AlertTriangle size={11} className="text-[#E11D48]" />
        )}
      </div>
    </Row>
  );
}

// ─── Prototype: blocker row ───────────────────────────────────────────────────

function BlockerRow({ blocker }: { blocker: BuildBlocker }) {
  return (
    <Row>
      <div
        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
        style={{ background: blocker.isHardBlocker ? "#E11D48" : "#F59E0B" }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] text-[#1E293B] leading-snug"
          style={{ fontWeight: blocker.isHardBlocker ? 500 : 400, fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {blocker.description}
        </p>
        <p
          className="text-[11px] text-[#64748B] mt-0.5 leading-snug"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Resolution: {blocker.resolution}
        </p>
      </div>
      {blocker.isHardBlocker && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
          style={{
            background: "#FFF1F2",
            color: "#E11D48",
            borderColor: "#FECDD3",
            fontWeight: 600,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          Hard
        </span>
      )}
    </Row>
  );
}

// ─── Production: critical-path intervention row ───────────────────────────────

function ProdCriticalRow({
  intervention,
  rank,
}: {
  intervention: ProductionIntervention;
  rank: number;
}) {
  const detail = PRODUCTION_PART_DETAILS[intervention.partNumber];
  const validationCount = detail?.validationRequired.length ?? 0;
  const difficultyColor =
    intervention.engineeringDifficulty === "High"
      ? "#E11D48"
      : intervention.engineeringDifficulty === "Medium"
      ? "#D97706"
      : "#059669";

  return (
    <Row>
      <span
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] text-white mt-0.5"
        style={{
          background: rank <= 2 ? "#1B3A5C" : "#94A3B8",
          fontWeight: 700,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[12px] text-[#1E293B]"
            style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {intervention.partName}
          </span>
          <span
            className="text-[10px]"
            style={{
              color: difficultyColor,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {intervention.engineeringDifficulty}
          </span>
        </div>
        <p
          className="text-[11px] text-[#64748B] mt-0.5 leading-snug"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {intervention.recommendedIntervention}
        </p>
      </div>
      {validationCount > 0 && (
        <div className="shrink-0 flex items-center gap-1">
          <ShieldAlert size={10} className="text-[#94A3B8]" />
          <span
            className="text-[11px] text-[#94A3B8]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {validationCount}v
          </span>
        </div>
      )}
    </Row>
  );
}

// ─── Production: scale gate row (Block-severity risk signal) ─────────────────

interface ScaleGate {
  partNumber: string;
  partName: string;
  signal: string;
  category: string;
  mitigation: string;
}

function ScaleGateRow({ gate }: { gate: ScaleGate }) {
  return (
    <Row>
      <AlertTriangle size={11} style={{ color: "#E11D48", marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span
            className="text-[11px] text-[#475569]"
            style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {gate.partName}
          </span>
          <span
            className="text-[10px] px-1.5 py-0 rounded"
            style={{
              background: "#F1F5F9",
              color: "#64748B",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {gate.category}
          </span>
        </div>
        <p
          className="text-[11px] text-[#64748B] leading-snug"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {gate.signal}
        </p>
        <p
          className="text-[10px] text-[#94A3B8] mt-0.5 leading-snug"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          → {gate.mitigation}
        </p>
      </div>
    </Row>
  );
}

// ─── Pre-Build Checklist ──────────────────────────────────────────────────────
// Aggregates clearToBuild status across all Make parts plus any Buy parts that
// appear as hard blockers. Groups: Blocked → Conditional → Ready.
//
// Logic lives in computeBuildChecklist() (prototypeData.ts).

function ChecklistRow({ entry }: { entry: ChecklistEntry }) {
  const isBlocked     = entry.status === "blocked";
  const isConditional = entry.status === "conditional";

  const iconColor = isBlocked ? "#E11D48" : isConditional ? "#D97706" : "#16A34A";
  const Icon = isBlocked ? AlertTriangle : isConditional ? AlertTriangle : CheckCircle2;

  return (
    <div
      className="flex items-start gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0"
      style={{
        background: isBlocked ? "#FFF8F8" : "transparent",
        borderLeft: isBlocked ? "2px solid #FECDD3" : isConditional ? "2px solid #FDE68A" : "2px solid transparent",
        paddingLeft: 8,
      }}
    >
      <Icon size={13} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[12px] text-[#1E293B]"
            style={{ fontWeight: isBlocked ? 600 : 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {entry.name}
          </span>
          <span
            className="text-[10px] text-[#94A3B8]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {entry.partNumber}
          </span>
          <span
            className="text-[10px] px-1.5 py-0 rounded"
            style={{ background: "#F1F5F9", color: "#64748B", fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {entry.subsystem}
          </span>
        </div>
        {isBlocked && entry.blocker && (
          <p
            className="text-[11px] text-[#64748B] mt-0.5 leading-snug"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Resolution: {entry.blocker.resolution}
          </p>
        )}
        {isConditional && (entry.clearToBuildNotes ?? entry.blocker?.resolution) && (
          <p
            className="text-[11px] text-[#64748B] mt-0.5 leading-snug"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {entry.clearToBuildNotes ?? entry.blocker!.resolution}
          </p>
        )}
      </div>
      {entry.validationCount > 0 && (
        <div className="shrink-0 flex items-center gap-1">
          <ShieldAlert size={10} className="text-[#94A3B8]" />
          <span
            className="text-[11px] text-[#94A3B8]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {entry.validationCount}v
          </span>
        </div>
      )}
    </div>
  );
}

function PreBuildChecklist({
  buildTargetDate,
  estimatedBuildDays,
}: {
  buildTargetDate: string;
  estimatedBuildDays: number;
}) {
  const [readyExpanded, setReadyExpanded] = useState(false);
  const { blocked, conditional, ready } = computeBuildChecklist(buildTargetDate, estimatedBuildDays);
  const totalIssues = blocked.length + conditional.length;
  const totalValidation = [...blocked, ...conditional, ...ready].reduce(
    (s, e) => s + e.validationCount,
    0,
  );

  const headerColor = blocked.length > 0 ? "#E11D48" : conditional.length > 0 ? "#D97706" : "#16A34A";
  const headerBg    = blocked.length > 0 ? "#FFF1F2" : conditional.length > 0 ? "#FFFBEB" : "#F0FDF4";
  const statusLabel = blocked.length > 0
    ? `${blocked.length} hard blocker${blocked.length > 1 ? "s" : ""}`
    : conditional.length > 0
    ? `${conditional.length} conditional item${conditional.length > 1 ? "s" : ""}`
    : "All parts clear";

  return (
    <div
      className="border-t border-[#F1F5F9]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Section header */}
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#FAFBFD" }}>
        <span
          className="text-[11px] uppercase tracking-wider text-[#94A3B8]"
          style={{ fontWeight: 500 }}
        >
          Pre-Build Checklist
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border"
          style={{
            background: headerBg,
            color: headerColor,
            borderColor: headerColor + "33",
            fontWeight: 600,
          }}
        >
          {statusLabel}
        </span>
        <span className="ml-auto text-[11px] text-[#CBD5E1]">
          {ready.length + totalIssues} parts · {totalValidation} validation steps
        </span>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {/* Blocked */}
        {blocked.length > 0 && (
          <div className="mb-4">
            <p
              className="text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
              style={{ color: "#E11D48", fontWeight: 600 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] inline-block" />
              Blocked — must resolve before build
            </p>
            {blocked.map((e) => <ChecklistRow key={e.partNumber} entry={e} />)}
          </div>
        )}

        {/* Conditional */}
        {conditional.length > 0 && (
          <div className="mb-4">
            <p
              className="text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
              style={{ color: "#D97706", fontWeight: 600 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] inline-block" />
              Conditional — build with precautions
            </p>
            {conditional.map((e) => <ChecklistRow key={e.partNumber} entry={e} />)}
          </div>
        )}

        {/* Ready */}
        <div>
          <button
            className="w-full flex items-center gap-1.5 mb-1.5 text-left"
            onClick={() => setReadyExpanded((v) => !v)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block" />
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#16A34A", fontWeight: 600 }}
            >
              Ready — {ready.length} part{ready.length !== 1 ? "s" : ""}
            </p>
            {readyExpanded
              ? <ChevronUp size={11} className="ml-auto text-[#94A3B8]" />
              : <ChevronDown size={11} className="ml-auto text-[#94A3B8]" />
            }
          </button>
          {readyExpanded && ready.map((e) => <ChecklistRow key={e.partNumber} entry={e} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  sub,
  valueColor = "#1B3A5C",
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p
        className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1.5"
        style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {label}
      </p>
      <p
        className="text-[26px] leading-none"
        style={{ fontWeight: 700, color: valueColor, fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {value}
      </p>
      <p
        className="text-[11px] text-[#94A3B8] mt-1"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {sub}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuildTimingSection() {
  const data = useDashboardData();
  const { buildTargetDate, estimatedBuildDays, criticalPathParts } = useBuildTarget();
  const mode = data.mode;

  // ── Prototype ──────────────────────────────────────────────────────────────
  if (mode === "prototype") {
    const br = data.buildRecord;

    // Dynamic blocker lists: overdue order-by = hard blocker, ≤7 days = conditional.
    // Walk all BOM rows that have prototype part data or are static hard blockers.
    const staticHardBlockerSet = new Set(
      br.blockers.filter((b) => b.isHardBlocker && b.partNumber).map((b) => b.partNumber!),
    );
    const allBomParts = CANONICAL_BOM_845_000112.filter(
      (r) => PROTOTYPE_PART_DATA[r.partNumber] || staticHardBlockerSet.has(r.partNumber),
    );

    const dynamicHardBlockers: BuildBlocker[] = [];
    const dynamicSoftBlockers: BuildBlocker[] = [];

    for (const row of allBomParts) {
      const orderBy = getPartOrderBy(row.partNumber, buildTargetDate, estimatedBuildDays);
      // Keep static hard-blocker description/resolution if available
      const staticBlocker = br.blockers.find((b) => b.partNumber === row.partNumber && b.isHardBlocker);
      const staticSoft    = br.blockers.find((b) => b.partNumber === row.partNumber && !b.isHardBlocker);
      if (staticBlocker || orderBy?.isOverdue) {
        const daysOverdue = orderBy ? Math.abs(orderBy.daysUntilDeadline) : null;
        dynamicHardBlockers.push(staticBlocker ?? {
          description: daysOverdue != null
            ? `${row.name.replace(/^RS320 /i, "")} — order deadline passed (${daysOverdue}d overdue)`
            : `${row.name.replace(/^RS320 /i, "")} — order deadline passed`,
          resolution: "Order immediately to avoid build delay",
          isHardBlocker: true,
          partNumber: row.partNumber,
        });
      } else if (staticSoft || (orderBy && orderBy.daysUntilDeadline <= 7)) {
        const daysLeft = orderBy?.daysUntilDeadline ?? null;
        dynamicSoftBlockers.push(staticSoft ?? {
          description: daysLeft != null
            ? `${row.name.replace(/^RS320 /i, "")} — must order within ${daysLeft}d`
            : `${row.name.replace(/^RS320 /i, "")} — order soon`,
          resolution: "Order now to stay on schedule",
          isHardBlocker: false,
          partNumber: row.partNumber,
        });
      }
    }
    // Include any assembly-level (no partNumber) static blockers
    for (const b of br.blockers) {
      if (b.partNumber) continue;
      if (b.isHardBlocker) dynamicHardBlockers.push(b);
      else dynamicSoftBlockers.push(b);
    }

    const hardBlockers = dynamicHardBlockers;
    const softBlockers = dynamicSoftBlockers;

    // Next build date: use context value (user-configurable) then fall back to assembly record
    const { color: readinessColor } = buildReadinessStyle(br.buildReadiness);
    const today = new Date();
    const effectiveTargetDate = buildTargetDate || br.nextBuildTargetDate;
    const targetDate = effectiveTargetDate ? new Date(effectiveTargetDate) : null;
    const daysToTarget = targetDate
      ? Math.ceil((targetDate.getTime() - today.getTime()) / 86_400_000)
      : null;
    const nextBuildLabel = targetDate
      ? targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "TBD";

    // Longest-lead critical path parts with PROTOTYPE_PART_DATA lead times
    const criticalPartsRanked = [...criticalPathParts]
      .map((pn) => ({
        pn,
        lead: PROTOTYPE_PART_DATA[pn]?.iterationProfile.leadTimeDays ?? 0,
      }))
      .sort((a, b) => b.lead - a.lead)
      .slice(0, 4)
      .map((x, i) => ({ pn: x.pn, rank: i + 1 }));

    // Top simplification for acceleration
    const topSimplifications = data.simplifications.slice(0, 3);

    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center gap-2" style={{ background: "#FAFBFD" }}>
          <Clock size={13} className="text-[#94A3B8]" />
          <span
            className="text-[12px] text-[#64748B] uppercase tracking-wider"
            style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Clear to Build Timing
          </span>
          <span className="ml-auto text-[11px] text-[#94A3B8]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Assembly {data.assembly.assemblyId} · Prototype mode
          </span>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 divide-x divide-[#F1F5F9] border-b border-[#F1F5F9]">
          <StatCell
            label="Build Status"
            value={br.buildReadiness}
            sub={`${hardBlockers.length + softBlockers.length} blocker${hardBlockers.length + softBlockers.length !== 1 ? "s" : ""} total`}
            valueColor={readinessColor}
          />
          <StatCell
            label="Hard Blockers"
            value={hardBlockers.length}
            sub="must resolve before build"
            valueColor={hardBlockers.length > 0 ? "#E11D48" : "#059669"}
          />
          <StatCell
            label="Next Build Target"
            value={nextBuildLabel}
            sub={
              daysToTarget != null
                ? daysToTarget > 0
                  ? `${daysToTarget} days from today`
                  : daysToTarget === 0
                  ? "today"
                  : `${Math.abs(daysToTarget)}d overdue`
                : `${criticalPathParts.length} critical path parts`
            }
          />
          <StatCell
            label="Est. Build Duration"
            value={`${estimatedBuildDays}d`}
            sub="once all parts are in hand"
          />
        </div>

        {/* Body: two columns */}
        <div className="grid grid-cols-2 divide-x divide-[#F1F5F9]">

          {/* Left: critical path + blockers */}
          <div className="p-5 flex flex-col gap-5">

            {/* Critical path parts */}
            <div>
              <SectionLabel>Critical Path Parts</SectionLabel>
              {criticalPartsRanked.length > 0 ? (
                <div>
                  {criticalPartsRanked.map(({ pn, rank }) => (
                    <ProtoCriticalPart key={pn} partNumber={pn} rank={rank} />
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  No critical path data available.
                </p>
              )}
            </div>

            {/* Hard blockers */}
            {hardBlockers.length > 0 && (
              <div>
                <SectionLabel>Hard Blockers</SectionLabel>
                {hardBlockers.map((b, i) => (
                  <BlockerRow key={i} blocker={b} />
                ))}
              </div>
            )}

            {/* Soft conditions */}
            {softBlockers.length > 0 && (
              <div>
                <SectionLabel>Conditional Items</SectionLabel>
                {softBlockers.map((b, i) => (
                  <BlockerRow key={i} blocker={b} />
                ))}
              </div>
            )}
          </div>

          {/* Right: acceleration */}
          <div className="p-5 flex flex-col gap-5">

            {/* Acceleration suggestions from simplifications */}
            {topSimplifications.length > 0 && (
              <div>
                <SectionLabel>Acceleration Opportunities</SectionLabel>
                <div>
                  {topSimplifications.map((s) => (
                    <Row key={s.partNumber}>
                      <Zap size={11} style={{ color: "#3B82F6", flexShrink: 0, marginTop: 2 }} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[12px] text-[#1E293B] leading-snug"
                          style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                        >
                          {s.simplificationPath}
                        </p>
                        <p
                          className="text-[11px] text-[#64748B] mt-0.5"
                          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                        >
                          {s.iterationImpact}
                          {s.leadTimeSavingsDays > 0 && (
                            <span className="text-[#059669] ml-1" style={{ fontWeight: 600 }}>
                              −{s.leadTimeSavingsDays}d
                            </span>
                          )}
                        </p>
                      </div>
                    </Row>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Pre-Build Checklist */}
        <PreBuildChecklist
            buildTargetDate={buildTargetDate}
            estimatedBuildDays={estimatedBuildDays}
          />
      </div>
    );
  }

  // ── Production ─────────────────────────────────────────────────────────────

  const interventions = data.interventions;

  // Critical path: High or Medium difficulty interventions, ranked
  const criticalInterventions = [...interventions]
    .filter((i) => i.engineeringDifficulty === "High" || i.engineeringDifficulty === "Medium")
    .slice(0, 4)
    .map((item, i) => ({ item, rank: i + 1 }));

  // Total validation steps across all intervention part details
  const totalValidationSteps = interventions.reduce((sum, i) => {
    return sum + (PRODUCTION_PART_DETAILS[i.partNumber]?.validationRequired.length ?? 0);
  }, 0);

  // High-difficulty count
  const highDifficultyCount = interventions.filter(
    (i) => i.engineeringDifficulty === "High"
  ).length;

  // Scale gates: Block-severity manufacturingRiskSignals from all intervention parts
  const scaleGates: ScaleGate[] = interventions.flatMap((i) => {
    const pd = PROTOTYPE_PART_DATA[i.partNumber];
    if (!pd) return [];
    return pd.manufacturingRiskSignals
      .filter((s) => s.severity === "Block")
      .map((s) => ({
        partNumber: i.partNumber,
        partName: i.partName,
        signal: s.signal,
        category: s.category,
        mitigation: s.mitigation,
      }));
  });

  // Scale acceleration: required design changes for highest-priority interventions
  const scaleAccelerators = interventions.slice(0, 3).flatMap((i) => {
    const detail = PRODUCTION_PART_DETAILS[i.partNumber];
    if (!detail) return [];
    return (detail.requiredDesignChanges ?? []).slice(0, 2).map((change) => ({
      partName: i.partName,
      intervention: i.recommendedIntervention,
      change,
      savings: i.estimatedSavings,
    }));
  });

  // Tooling/inspection/material/sourcing bottleneck categories from Flag-severity signals
  const productionBottlenecks: ScaleGate[] = interventions.flatMap((i) => {
    const pd = PROTOTYPE_PART_DATA[i.partNumber];
    if (!pd) return [];
    return pd.manufacturingRiskSignals
      .filter((s) => s.severity === "Flag")
      .map((s) => ({
        partNumber: i.partNumber,
        partName: i.partName,
        signal: s.signal,
        category: s.category,
        mitigation: s.mitigation,
      }));
  }).slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center gap-2" style={{ background: "#FAFBFD" }}>
        <TrendingDown size={13} className="text-[#94A3B8]" />
        <span
          className="text-[12px] text-[#64748B] uppercase tracking-wider"
          style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Production Readiness Timing
        </span>
        <span className="ml-auto text-[11px] text-[#94A3B8]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Assembly {data.assembly.assemblyId} · Production mode
        </span>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 divide-x divide-[#F1F5F9] border-b border-[#F1F5F9]">
        <StatCell
          label="Interventions Pending"
          value={interventions.length}
          sub="before production readiness"
        />
        <StatCell
          label="High Complexity"
          value={highDifficultyCount}
          sub="high-difficulty interventions"
          valueColor={highDifficultyCount > 0 ? "#D97706" : "#059669"}
        />
        <StatCell
          label="Validation Steps"
          value={totalValidationSteps}
          sub="across critical path parts"
          valueColor={totalValidationSteps > 10 ? "#D97706" : "#1B3A5C"}
        />
        <StatCell
          label="Scale Blockers"
          value={scaleGates.length}
          sub="Block-severity signals"
          valueColor={scaleGates.length > 0 ? "#E11D48" : "#059669"}
        />
      </div>

      {/* Body: two columns */}
      <div className="grid grid-cols-2 divide-x divide-[#F1F5F9]">

        {/* Left: critical path interventions + scale blockers */}
        <div className="p-5 flex flex-col gap-5">

          <div>
            <SectionLabel>Critical Path Interventions</SectionLabel>
            {criticalInterventions.length > 0 ? (
              <div>
                {criticalInterventions.map(({ item, rank }) => (
                  <ProdCriticalRow key={item.partNumber} intervention={item} rank={rank} />
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                No high-complexity interventions identified.
              </p>
            )}
          </div>

          {scaleGates.length > 0 && (
            <div>
              <SectionLabel>Scale Blockers (Block-severity)</SectionLabel>
              {scaleGates.map((g, i) => (
                <ScaleGateRow key={i} gate={g} />
              ))}
            </div>
          )}

          {productionBottlenecks.length > 0 && (
            <div>
              <SectionLabel>Scaling Bottlenecks</SectionLabel>
              {productionBottlenecks.map((g, i) => (
                <Row key={i}>
                  <div
                    className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ background: "#F59E0B" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span
                        className="text-[11px] text-[#475569]"
                        style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {g.partName}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0 rounded"
                        style={{ background: "#F1F5F9", color: "#64748B", fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {g.category}
                      </span>
                    </div>
                    <p
                      className="text-[11px] text-[#64748B] leading-snug"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {g.signal}
                    </p>
                  </div>
                </Row>
              ))}
            </div>
          )}
        </div>

        {/* Right: required design changes + acceleration strategies */}
        <div className="p-5 flex flex-col gap-5">

          {scaleAccelerators.length > 0 && (
            <div>
              <SectionLabel>Required Design Changes (Scale Path)</SectionLabel>
              <div>
                {scaleAccelerators.map((a, i) => (
                  <Row key={i}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] text-white mt-0.5"
                      style={{ background: "#1B3A5C", fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[10px] text-[#94A3B8]"
                          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                        >
                          {a.partName} · {a.savings}
                        </span>
                      </div>
                      <p
                        className="text-[12px] text-[#1E293B] leading-snug"
                        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {a.change}
                      </p>
                    </div>
                  </Row>
                ))}
              </div>
            </div>
          )}

          {/* Validation requirements per critical part */}
          <div>
            <SectionLabel>Validation Gates (Top Parts)</SectionLabel>
            <div>
              {interventions.slice(0, 3).flatMap((i) => {
                const detail = PRODUCTION_PART_DETAILS[i.partNumber];
                const steps = detail?.validationRequired ?? [];
                return steps.map((step, j) => (
                  <Row key={`${i.partNumber}-${j}`}>
                    <Layers size={11} style={{ color: "#94A3B8", flexShrink: 0, marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      {j === 0 && (
                        <span
                          className="text-[10px] text-[#94A3B8] block mb-0.5"
                          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                        >
                          {i.partName}
                        </span>
                      )}
                      <p
                        className="text-[11px] text-[#64748B] leading-snug"
                        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {step}
                      </p>
                    </div>
                  </Row>
                ));
              })}
            </div>
          </div>

          {/* Acceleration: top lever per high-difficulty part */}
          <div>
            <SectionLabel>Acceleration Strategies</SectionLabel>
            <div>
              {interventions
                .filter((i) => i.engineeringDifficulty === "High" || i.engineeringDifficulty === "Medium")
                .slice(0, 3)
                .map((i) => (
                  <Row key={i.partNumber}>
                    <Zap size={11} style={{ color: "#3B82F6", flexShrink: 0, marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-[10px] text-[#94A3B8] block mb-0.5"
                        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {i.partName} · {i.estimatedSavings} savings
                      </span>
                      <p
                        className="text-[12px] text-[#1E293B] leading-snug"
                        style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                      >
                        {i.recommendedIntervention}
                      </p>
                    </div>
                  </Row>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
