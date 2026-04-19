import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ChevronRight,
  Box,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  Info,
  TrendingUp,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface GeometryPart {
  partNumber: string;
  partName: string;
  subsystem: string;
  faces: number;
  edges: number;
  score: number;
  interpretation: string;
  hasAnalysisPage: boolean;
}

const GEOMETRY_DATA: GeometryPart[] = [
  {
    partNumber: "430-002839",
    partName: "RS320 Ring Gear – Output",
    subsystem: "Geartrain",
    faces: 752,
    edges: 2232,
    score: 95,
    interpretation:
      "Very complex internal gear geometry requiring expensive machining.",
    hasAnalysisPage: true,
  },
  {
    partNumber: "430-002808",
    partName: "RS320 Housing",
    subsystem: "Housing / Structure",
    faces: 427,
    edges: 929,
    score: 78,
    interpretation: "Complex housing with many cylindrical bores.",
    hasAnalysisPage: true,
  },
  {
    partNumber: "430-002838",
    partName: "RS320 Ring Gear – Static",
    subsystem: "Geartrain",
    faces: 638,
    edges: 1876,
    score: 91,
    interpretation:
      "Near-identical internal gear geometry to the output ring gear; static mounting adds registration feature complexity.",
    hasAnalysisPage: false,
  },
  {
    partNumber: "430-002811",
    partName: "RS320 Output",
    subsystem: "Housing / Structure",
    faces: 406,
    edges: 939,
    score: 73,
    interpretation: "Complex machined output with tight bore and OD tolerances.",
    hasAnalysisPage: true,
  },
  {
    partNumber: "430-002837",
    partName: "RS320 Planet Gear",
    subsystem: "Geartrain",
    faces: 503,
    edges: 1461,
    score: 70,
    interpretation:
      "Tooth form and runout are cost drivers; geometry score reflects repeated tooth profiles and tight surface finish requirements.",
    hasAnalysisPage: true,
  },
  {
    partNumber: "430-002836",
    partName: "RS320 Sun Gear",
    subsystem: "Geartrain",
    faces: 306,
    edges: 912,
    score: 52,
    interpretation:
      "Moderate complexity; input element with case-hardened tooth flanks and precision ground datum bore.",
    hasAnalysisPage: true,
  },
  {
    partNumber: "430-002809",
    partName: "RS320 Rotor Frame",
    subsystem: "Housing / Structure",
    faces: 312,
    edges: 718,
    score: 60,
    interpretation:
      "Multiple concentric bore features; motor stator seating requires tight concentricity.",
    hasAnalysisPage: false,
  },
  {
    partNumber: "430-002810",
    partName: "RS320 Carrier",
    subsystem: "Housing / Structure",
    faces: 114,
    edges: 300,
    score: 34,
    interpretation: "Moderate machining complexity; precision pin hole pattern.",
    hasAnalysisPage: true,
  },
  {
    partNumber: "430-002814",
    partName: "RS320 Bore Shaft",
    subsystem: "Shafting",
    faces: 18,
    edges: 36,
    score: 22,
    interpretation: "Simple turned shaft; cost driven by runout tolerance, not geometry.",
    hasAnalysisPage: false,
  },
  {
    partNumber: "430-002816",
    partName: "RS320 Planet Shaft",
    subsystem: "Shafting",
    faces: 12,
    edges: 24,
    score: 18,
    interpretation: "Simple pin; cost driven by surface finish and diameter tolerance for needle bearing fit.",
    hasAnalysisPage: false,
  },
];

const TOTAL_FACES = GEOMETRY_DATA.reduce((s, p) => s + p.faces, 0);
const TOTAL_EDGES = GEOMETRY_DATA.reduce((s, p) => s + p.edges, 0);
const AVG_SCORE = Math.round(
  GEOMETRY_DATA.reduce((s, p) => s + p.score, 0) / GEOMETRY_DATA.length
);
const MAX_SCORE_PART = GEOMETRY_DATA[0]; // already sorted desc

// ─── Score helpers ─────────────────────────────────────────────────────────────

function getScoreLevel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
  track: string;
} {
  if (score >= 80)
    return {
      label: "Very High",
      color: "#DC2626",
      bg: "#FFF1F2",
      border: "#FECDD3",
      track: "#FEE2E2",
    };
  if (score >= 60)
    return {
      label: "High",
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      track: "#FEF3C7",
    };
  if (score >= 40)
    return {
      label: "Medium",
      color: "#CA8A04",
      bg: "#FEFCE8",
      border: "#FEF08A",
      track: "#FEF9C3",
    };
  return {
    label: "Low",
    color: "#0891B2",
    bg: "#F0F9FF",
    border: "#BAE6FD",
    track: "#E0F2FE",
  };
}

// ─── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const s = getScoreLevel(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px]"
      style={{
        background: s.bg,
        borderColor: s.border,
        color: s.color,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Subsystem badge ───────────────────────────────────────────────────────────

const SUBSYSTEM_DOT: Record<string, string> = {
  "Housing / Structure": "#1B3A5C",
  Geartrain: "#2B6CB0",
  Shafting: "#64748B",
};

function SubsystemTag({ value }: { value: string }) {
  const dot = SUBSYSTEM_DOT[value] ?? "#64748B";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-[#64748B]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      {value}
    </span>
  );
}

// ─── Score bar row ─────────────────────────────────────────────────────────────

function ScoreBarRow({
  part,
  rank,
  delay,
  isSelected,
  onClick,
}: {
  part: GeometryPart;
  rank: number;
  delay: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const s = getScoreLevel(part.score);
  const maxScore = 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="rounded-xl border px-5 py-4 transition-all"
        style={{
          borderColor: isSelected ? s.color + "60" : "#E2E8F0",
          background: isSelected ? s.bg : "white",
          boxShadow: isSelected ? `0 0 0 2px ${s.color}20` : "none",
        }}
      >
        <div className="flex items-center gap-4">
          {/* Rank badge */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[13px]"
            style={{
              background: isSelected ? s.color : "#F1F5F9",
              color: isSelected ? "white" : "#475569",
              fontWeight: 700,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {rank}
          </div>

          {/* Part info */}
          <div className="w-44 shrink-0">
            <p
              className="text-[13px] text-[#0F2035]"
              style={{ fontWeight: 600 }}
            >
              {part.partName}
            </p>
            <p
              className="text-[11px] text-[#94A3B8] font-mono"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {part.partNumber}
            </p>
          </div>

          {/* Bar */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: s.track }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: s.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(part.score / maxScore) * 100}%` }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                  delay: delay + 0.1,
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-[#94A3B8]">
                {part.faces.toLocaleString()} faces
              </span>
              <span className="text-[10px] text-[#CBD5E1]">·</span>
              <span className="text-[10px] text-[#94A3B8]">
                {part.edges.toLocaleString()} edges
              </span>
            </div>
          </div>

          {/* Score number */}
          <div className="text-right shrink-0 w-16">
            <p
              className="text-[24px] leading-none"
              style={{ color: s.color, fontWeight: 700 }}
            >
              {part.score}
            </p>
            <p className="text-[10px] text-[#CBD5E1] mt-0.5">/ 100</p>
          </div>

          {/* Level badge */}
          <div className="w-20 shrink-0 text-right">
            <ScoreBadge score={part.score} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  part,
  rank,
  onNavigate,
}: {
  part: GeometryPart;
  rank: number;
  onNavigate: (pn: string) => void;
}) {
  const s = getScoreLevel(part.score);
  const facesEdgeRatio = (part.faces / part.edges).toFixed(2);

  return (
    <motion.div
      key={part.partNumber}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="mt-3 rounded-xl border p-5"
      style={{
        borderColor: s.color + "40",
        background: `linear-gradient(135deg, ${s.bg} 0%, white 60%)`,
      }}
    >
      <div className="flex items-start gap-6">
        {/* Complexity arc */}
        <div className="shrink-0 flex flex-col items-center">
          <svg width="96" height="58" viewBox="0 0 96 58">
            <path
              d="M 6 50 A 42 42 0 0 1 90 50"
              fill="none"
              stroke={s.track}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <motion.path
              d="M 6 50 A 42 42 0 0 1 90 50"
              fill="none"
              stroke={s.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={String(Math.PI * 42)}
              initial={{ strokeDashoffset: String(Math.PI * 42) }}
              animate={{
                strokeDashoffset: String(
                  Math.PI * 42 * (1 - part.score / 100)
                ),
              }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            />
            <text
              x="48"
              y="46"
              textAnchor="middle"
              fontSize="20"
              fontWeight="700"
              fill={s.color}
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {part.score}
            </text>
          </svg>
          <span
            className="text-[10px] -mt-1"
            style={{
              color: s.color,
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600,
            }}
          >
            {s.label} Complexity
          </span>
        </div>

        {/* Metrics grid */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          {[
            {
              label: "Faces",
              value: part.faces.toLocaleString(),
              icon: Box,
              color: "#1B3A5C",
            },
            {
              label: "Edges",
              value: part.edges.toLocaleString(),
              icon: Layers,
              color: "#2B6CB0",
            },
            {
              label: "Face/Edge Ratio",
              value: facesEdgeRatio,
              icon: TrendingUp,
              color: "#64748B",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon size={11} color={m.color} />
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{
                    color: "#94A3B8",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {m.label}
                </span>
              </div>
              <p
                className="text-[16px] font-mono"
                style={{ color: m.color, fontWeight: 700 }}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Interpretation + CTA */}
        <div className="w-52 shrink-0 flex flex-col gap-3">
          <div>
            <p
              className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1.5"
              style={{ fontWeight: 500 }}
            >
              STEP Interpretation
            </p>
            <div className="flex items-start gap-2">
              <div
                className="w-0.5 self-stretch rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <p className="text-[12px] text-[#1E293B] leading-relaxed">
                {part.interpretation}
              </p>
            </div>
          </div>
          {part.hasAnalysisPage ? (
            <button
              onClick={() => onNavigate(part.partNumber)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-white text-[12px] transition-colors"
              style={{
                background: "#1B3A5C",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              <span>View Part Analysis</span>
              <ArrowUpRight size={13} />
            </button>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2">
              <Info size={11} className="text-[#CBD5E1] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#94A3B8]">
                Full analysis not yet available.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GeometryAnalysis() {
  const navigate = useNavigate();
  const [selectedPN, setSelectedPN] = useState<string | null>(null);

  const handleRowClick = (pn: string) => {
    setSelectedPN((prev) => (prev === pn ? null : pn));
  };

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
            Geometry Analysis
          </span>
        </div>
        <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>
          STEP Topology Analysis
        </h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          6 parts analysed · Assembly 845-000112 · Click any row to inspect
          topology metrics
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 flex flex-col gap-5">

          {/* ── Summary strip ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Parts Analysed",
                value: String(GEOMETRY_DATA.length),
                sub: "STEP files processed",
                color: "#1B3A5C",
                valueSize: "text-[22px]",
              },
              {
                label: "Avg Complexity",
                value: `${AVG_SCORE}`,
                sub: "out of 100",
                color: "#D97706",
                valueSize: "text-[22px]",
              },
              {
                label: "Peak Complexity",
                value: String(MAX_SCORE_PART.score),
                sub: `${MAX_SCORE_PART.partName} · ${MAX_SCORE_PART.partNumber}`,
                color: "#DC2626",
                valueSize: "text-[22px]",
              },
              {
                label: "Total Faces / Edges",
                value: `${TOTAL_FACES.toLocaleString()} / ${TOTAL_EDGES.toLocaleString()}`,
                sub: "across all analysed parts",
                color: "#2B6CB0",
                valueSize: "text-[16px]",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3.5 flex items-center gap-3"
              >
                <div
                  className="w-1.5 h-10 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <div>
                  <p
                    className="text-[10px] uppercase tracking-wider text-[#94A3B8]"
                    style={{ fontWeight: 500 }}
                  >
                    {s.label}
                  </p>
                  <p
                    className={`${s.valueSize} leading-tight mt-0.5`}
                    style={{ color: s.color, fontWeight: 700 }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Score ranking bars ── */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div
              className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between"
              style={{ background: "#FAFBFD" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "#1B3A5C18" }}
                >
                  <Box size={14} color="#1B3A5C" />
                </div>
                <div>
                  <h2
                    className="text-[13px] text-[#0F2035]"
                    style={{ fontWeight: 600 }}
                  >
                    Complexity Score Ranking
                  </h2>
                  <p className="text-[11px] text-[#94A3B8]">
                    Derived from STEP face &amp; edge topology · sorted
                    highest → lowest
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
                {[
                  { label: "Very High", color: "#DC2626" },
                  { label: "High", color: "#D97706" },
                  { label: "Medium", color: "#CA8A04" },
                  { label: "Low", color: "#0891B2" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: l.color }}
                    />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {GEOMETRY_DATA.map((part, idx) => (
                <div key={part.partNumber}>
                  <ScoreBarRow
                    part={part}
                    rank={idx + 1}
                    delay={idx * 0.06}
                    isSelected={selectedPN === part.partNumber}
                    onClick={() => handleRowClick(part.partNumber)}
                  />
                  {selectedPN === part.partNumber && (
                    <DetailPanel
                      part={part}
                      rank={idx + 1}
                      onNavigate={(pn) => navigate(`/part/${pn}`)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Full metrics table ── */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div
              className="px-5 py-4 border-b border-[#F1F5F9]"
              style={{ background: "#FAFBFD" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "#2B6CB018" }}
                >
                  <AlertTriangle size={14} color="#2B6CB0" />
                </div>
                <div>
                  <h2
                    className="text-[13px] text-[#0F2035]"
                    style={{ fontWeight: 600 }}
                  >
                    STEP Topology Metrics
                  </h2>
                  <p className="text-[11px] text-[#94A3B8]">
                    Raw face &amp; edge counts extracted from part geometry
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table
                className="w-full"
                style={{ borderCollapse: "collapse", minWidth: 820 }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#F8FAFC",
                      borderBottom: "1px solid #E2E8F0",
                    }}
                  >
                    {[
                      { label: "#", width: 44 },
                      { label: "Part Number", width: 140 },
                      { label: "Part Name", width: 140 },
                      { label: "Subsystem", width: 170 },
                      { label: "Faces", width: 90 },
                      { label: "Edges", width: 90 },
                      { label: "Score", width: 80 },
                      { label: "Level", width: 100 },
                      { label: "Interpretation", width: 260 },
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
                  </tr>
                </thead>
                <tbody>
                  {GEOMETRY_DATA.map((part, idx) => {
                    const s = getScoreLevel(part.score);
                    return (
                      <tr
                        key={part.partNumber}
                        style={{
                          background: idx % 2 === 0 ? "#FFFFFF" : "#FAFBFD",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        {/* # */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[12px] text-[#CBD5E1]"
                            style={{ fontWeight: 600 }}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        {/* Part Number */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[12px] text-[#1B3A5C]"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontWeight: 600,
                            }}
                          >
                            {part.partNumber}
                          </span>
                        </td>
                        {/* Part Name */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[13px] text-[#1E293B]"
                            style={{ fontWeight: 500 }}
                          >
                            {part.partName}
                          </span>
                        </td>
                        {/* Subsystem */}
                        <td className="px-4 py-3">
                          <SubsystemTag value={part.subsystem} />
                        </td>
                        {/* Faces */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[13px] text-[#1E293B] font-mono"
                            style={{ fontWeight: 600 }}
                          >
                            {part.faces.toLocaleString()}
                          </span>
                        </td>
                        {/* Edges */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[13px] text-[#1E293B] font-mono"
                            style={{ fontWeight: 600 }}
                          >
                            {part.edges.toLocaleString()}
                          </span>
                        </td>
                        {/* Score */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[14px]"
                            style={{ color: s.color, fontWeight: 700 }}
                          >
                            {part.score}
                          </span>
                        </td>
                        {/* Level */}
                        <td className="px-4 py-3">
                          <ScoreBadge score={part.score} />
                        </td>
                        {/* Interpretation */}
                        <td className="px-4 py-3">
                          <p
                            className="text-[12px] text-[#64748B]"
                            style={{ maxWidth: 260 }}
                          >
                            {part.interpretation}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr
                    style={{
                      background: "#F8FAFC",
                      borderTop: "2px solid #E2E8F0",
                    }}
                  >
                    <td colSpan={4} className="px-4 py-3">
                      <span
                        className="text-[11px] uppercase tracking-wider text-[#94A3B8]"
                        style={{ fontWeight: 600 }}
                      >
                        Totals / Averages
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[12px] text-[#1B3A5C] font-mono"
                        style={{ fontWeight: 700 }}
                      >
                        {TOTAL_FACES.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[12px] text-[#1B3A5C] font-mono"
                        style={{ fontWeight: 700 }}
                      >
                        {TOTAL_EDGES.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[12px] text-[#D97706]"
                        style={{ fontWeight: 700 }}
                      >
                        {AVG_SCORE} avg
                      </span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}