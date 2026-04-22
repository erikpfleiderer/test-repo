import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ChevronRight,
  ArrowLeft,
  Package,
  Wrench,
  AlertTriangle,
  Zap,
  TrendingDown,
  Layers,
  Settings,
  Gem,
  Info,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  Circle,
  ArrowRight,
  ThumbsUp,
  Clock,
  Microscope,
} from "lucide-react";
import { useDashboardData, type ProductionPartDetail, type PrototypePartRecord } from "../../data/dashboardData";
import { CANONICAL_BOM_845_000112 } from "../../data/canonicalBom";
import { buildPartAnalysisModel } from "../../data/partModel";
import { useAppMode } from "../../context/AppModeContext";
import {
  DIFFICULTY_STYLE,
  RISK_STYLE,
  CONFIDENCE_STYLE,
  SEVERITY_SIGNAL_STYLE,
} from "../ui/badgeStyles";

// ─── Badge helpers ─────────────────────────────────────────────────────────────

// BADGE_STYLES is reconstructed from shared maps so AssessmentBadge's type-keyed
// lookup continues to work, while the color definitions stay in one place.
const BADGE_STYLES = {
  difficulty: DIFFICULTY_STYLE,
  risk: {
    ...RISK_STYLE,
    Critical: { bg: "#FFF1F2", text: "#9F1239", border: "#FDA4AF" },
  },
  confidence: CONFIDENCE_STYLE,
};

function AssessmentBadge({
  value,
  type,
}: {
  value: string;
  type: keyof typeof BADGE_STYLES;
}) {
  const s = BADGE_STYLES[type][value as keyof (typeof BADGE_STYLES)[typeof type]] ?? {
    bg: "#F1F5F9",
    text: "#64748B",
    border: "#E2E8F0",
  };
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
      {value}
    </span>
  );
}

// ─── Complexity Gauge ──────────────────────────────────────────────────────────

function ComplexityGauge({ score }: { score: number }) {
  const total = Math.PI * 44; // semicircle arc length for r=44
  const dashOffset = total * (1 - score / 100);
  const color =
    score >= 67 ? "#D97706" : score >= 34 ? "#3B82F6" : "#10B981";
  const label =
    score >= 67 ? "High" : score >= 34 ? "Medium" : "Low";

  return (
    <div className="flex flex-col items-center">
      <svg width="104" height="62" viewBox="0 0 104 62">
        {/* Track */}
        <path
          d="M 8 52 A 44 44 0 0 1 96 52"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <motion.path
          d="M 8 52 A 44 44 0 0 1 96 52"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={total}
          initial={{ strokeDashoffset: total }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
        {/* Score text */}
        <text
          x="52"
          y="48"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#0F2035"
          fontFamily="IBM Plex Sans, sans-serif"
        >
          {score}
        </text>
      </svg>
      <span
        className="text-[11px] -mt-1"
        style={{
          color,
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
        }}
      >
        {label} Complexity
      </span>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  accentColor = "#1B3A5C",
  children,
  delay = 0,
}: {
  icon: any;
  title: string;
  accentColor?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
    >
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F1F5F9]"
        style={{ background: "#FAFBFD" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}18` }}
        >
          <Icon size={14} color={accentColor} />
        </div>
        <h3
          className="text-[#0F2035] text-[13px]"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
        >
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Placeholder notice ────────────────────────────────────────────────────────

function PlaceholderNotice({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-[#CBD5E1] p-3">
      <Info size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
      <p
        className="text-[12px] text-[#94A3B8]"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {label}
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PartAnalysis() {
  const { partNumber } = useParams<{ partNumber: string }>();
  const navigate = useNavigate();
  const { mode } = useAppMode();

  // ── Shared model — single data assembly point ─────────────────────────────────
  const model = partNumber ? buildPartAnalysisModel(partNumber) : null;

  // Narrow to mode-specific deep-dive records
  const prodPart: ProductionPartDetail | null = (mode === "production" ? model?.productionDetail : null) ?? null;
  const protoPart: PrototypePartRecord | null = (mode === "prototype"  ? model?.prototypeDetail  : null) ?? null;

  // Normalised DFM feedback — use the shared selector, not protoPart.dfm directly
  const dfmFeedback = mode === "prototype" ? (model?.dfmFeedback ?? null) : null;

  // For prototype mode, fall back to canonical BOM for name/subsystem
  const bomRow = partNumber
    ? CANONICAL_BOM_845_000112.find((r) => r.partNumber === partNumber) ?? null
    : null;
  const partName  = prodPart?.partName  ?? bomRow?.name      ?? partNumber ?? "Unknown";
  const subsystem = prodPart?.subsystem ?? bomRow?.subsystem ?? null;

  if (!prodPart && !protoPart) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-12">
        <div className="w-12 h-12 rounded-xl bg-[#FFF1F2] flex items-center justify-center">
          <AlertTriangle size={22} color="#E11D48" />
        </div>
        <div className="text-center">
          <p
            className="text-[#0F2035] text-[15px]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
          >
            Part not found
          </p>
          <p className="text-[13px] text-[#94A3B8] mt-1">
            No analysis data for part number{" "}
            <span className="font-mono">{partNumber}</span>
          </p>
        </div>
        <button
          onClick={() => navigate("/bom-analysis")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
        >
          <ArrowLeft size={13} />
          Back to BOM Analysis
        </button>
      </div>
    );
  }

  const hasAssessment = prodPart
    ? !!(prodPart.engineeringDifficulty || prodPart.riskLevel || prodPart.confidenceLevel)
    : true;

  // Intervention for the navigation shortcut — from model, not a second lookup
  const intervention = mode === "production" ? (model?.intervention ?? null) : null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* ── Page Header ── */}
      <div className="px-6 pt-6 pb-4 shrink-0 border-b border-[#E2E8F0]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate("/bom-analysis")}
            className="text-[11px] text-[#94A3B8] uppercase tracking-wider hover:text-[#64748B] transition-colors"
          >
            BOM Analysis
          </button>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
            Part Analysis
          </span>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#475569] uppercase tracking-wider font-mono">
            {partNumber}
          </span>
          {dfmFeedback && (
            <>
              <ChevronRight size={12} className="text-[#CBD5E1]" />
              <button
                onClick={() => navigate(`/dfm-opportunities?part=${partNumber}&process=${encodeURIComponent(dfmFeedback.process)}`)}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-600 uppercase tracking-wider transition-colors"
              >
                <Microscope size={10} />
                DFM Workspace
              </button>
            </>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/bom-analysis")}
              className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#64748B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all"
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>
                  {partName}
                </h1>
                {subsystem && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#475569]"
                    style={{ fontWeight: 500 }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#1B3A5C" }} />
                    {subsystem}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#94A3B8] mt-0.5 font-mono">{partNumber}</p>
            </div>
          </div>

          {/* Header metric pill */}
          {prodPart && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#BBF7D0] text-[#059669]"
              style={{ background: "#F0FDF4" }}
            >
              <TrendingDown size={15} color="#059669" />
              <span className="text-[20px] leading-none" style={{ fontWeight: 700 }}>
                {prodPart.estimatedSavings}
              </span>
              <span className="text-[12px] text-[#6EE7B7]">savings</span>
            </div>
          )}
          {protoPart && (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#BFDBFE] text-[#2563EB]"
                style={{ background: "#EFF6FF" }}
              >
                <Clock size={15} color="#2563EB" />
                <span className="text-[20px] leading-none" style={{ fontWeight: 700 }}>
                  {protoPart.iterationProfile.leadTimeDays}d
                </span>
                <span className="text-[12px] text-[#93C5FD]">lead time</span>
              </div>
              {dfmFeedback && (
                <button
                  onClick={() => navigate(`/dfm-opportunities?part=${partNumber}&process=${encodeURIComponent(dfmFeedback.process)}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-[12px] hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                  style={{ fontWeight: 500 }}
                  title="Open in DFM Workspace"
                >
                  <Microscope size={13} />
                  DFM
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-5 p-6 min-h-full">

          {/* ── Left column (main content) ── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* 1. Design Intent / Build Readiness */}
            <Section
              icon={Package}
              title={protoPart ? "Build Readiness" : "Design Intent"}
              accentColor="#1B3A5C"
              delay={0.04}
            >
              {prodPart && (
                prodPart.designIntent ? (
                  <div className="flex items-start gap-3">
                    <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: "#1B3A5C" }} />
                    <p className="text-[14px] text-[#1E293B] leading-relaxed" style={{ fontWeight: 400 }}>
                      {prodPart.designIntent}
                    </p>
                  </div>
                ) : (
                  <PlaceholderNotice label="Design intent will be extracted from engineering drawings in a future analysis pass." />
                )
              )}
              {protoPart && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-[#E2E8F0] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1.5" style={{ fontWeight: 500 }}>
                      Change Impact Radius
                    </p>
                    <p className="text-[13px] text-[#1E293B] leading-relaxed">
                      {protoPart.iterationProfile.changeImpactRadius}
                    </p>
                  </div>
                </div>
              )}
            </Section>

            {/* 2. Current Manufacturing / Prototype Process */}
            <Section
              icon={Settings}
              title={protoPart ? "Prototype Process" : "Current Manufacturing"}
              accentColor="#2B6CB0"
              delay={0.08}
            >
              {prodPart && (
                (prodPart.currentManufacturing.material ||
                  prodPart.currentManufacturing.process ||
                  prodPart.currentManufacturing.geometryComplexityScore !== null) ? (
                  <div className="flex items-start gap-6">
                    <div className="flex-1 flex flex-col gap-3">
                      {prodPart.currentManufacturing.material && (
                        <div className="rounded-lg border border-[#E2E8F0] p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Gem size={13} color="#94A3B8" />
                            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 500 }}>
                              Material
                            </span>
                          </div>
                          <p className="text-[15px] text-[#1E293B]" style={{ fontWeight: 600 }}>
                            {prodPart.currentManufacturing.material}
                          </p>
                          {prodPart.currentManufacturing.materialNote && (
                            <p className="text-[12px] text-[#64748B] leading-relaxed" style={{ fontWeight: 400 }}>
                              {prodPart.currentManufacturing.materialNote}
                            </p>
                          )}
                        </div>
                      )}
                      {prodPart.currentManufacturing.process && (
                        <div className="rounded-lg border border-[#E2E8F0] p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Wrench size={13} color="#94A3B8" />
                            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]" style={{ fontWeight: 500 }}>
                              Process
                            </span>
                          </div>
                          <p className="text-[15px] text-[#1E293B]" style={{ fontWeight: 600 }}>
                            {prodPart.currentManufacturing.process}
                          </p>
                        </div>
                      )}
                    </div>
                    {prodPart.currentManufacturing.geometryComplexityScore !== null && (
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>
                          Geometry Score
                        </span>
                        <ComplexityGauge score={prodPart.currentManufacturing.geometryComplexityScore} />
                        <span className="text-[10px] text-[#94A3B8]">out of 100</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <PlaceholderNotice label="Manufacturing process data will be extracted from STEP geometry and engineering drawings." />
                )
              )}
              {protoPart && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-[#BFDBFE] p-4" style={{ background: "#EFF6FF" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wrench size={13} color="#2563EB" />
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "#2563EB", fontWeight: 500 }}>
                        Recommended Process
                      </span>
                    </div>
                    <p className="text-[15px] text-[#1E3A8A]" style={{ fontWeight: 600 }}>
                      {protoPart.prototypeProcess.recommendedProcess}
                    </p>
                    {protoPart.prototypeProcess.processNotes && (
                      <p className="text-[12px] text-[#3B82F6] mt-1.5 leading-relaxed">
                        {protoPart.prototypeProcess.processNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg border border-[#E2E8F0] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>
                        Lead Time
                      </p>
                      <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 600 }}>
                        {protoPart.prototypeProcess.leadTimeProfile}
                      </p>
                    </div>
                    {protoPart.prototypeProcess.alternativeProcesses.length > 0 && (
                      <div className="flex-1 rounded-lg border border-[#E2E8F0] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>
                          Alternatives
                        </p>
                        {protoPart.prototypeProcess.alternativeProcesses.map((alt, i) => (
                          <p key={i} className="text-[12px] text-[#64748B]">{alt}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* 3. Cost Drivers / DFM & Complexity Factors */}
            <Section
              icon={AlertTriangle}
              title={protoPart ? "DFM / Complexity Factors" : "Cost Drivers"}
              accentColor="#D97706"
              delay={0.12}
            >
              {prodPart && (
                prodPart.costDrivers.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {prodPart.costDrivers.map((driver, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#FDE68A]"
                        style={{ background: "#FFFBEB" }}
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "#FEF3C7" }}>
                          <AlertTriangle size={11} color="#D97706" />
                        </div>
                        <p className="text-[13px] text-[#92400E]" style={{ fontWeight: 500 }}>{driver}</p>
                        <div className="ml-auto w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <PlaceholderNotice label="Cost driver identification will be populated after geometry and BOM analysis." />
                )
              )}
              {protoPart && (
                <div className="flex flex-col gap-4">
                  {dfmFeedback && dfmFeedback.geometryIssues.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 500 }}>
                        Geometry Issues
                      </p>
                      <div className="flex flex-col gap-2">
                        {dfmFeedback.geometryIssues.map((issue, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#FDE68A]"
                            style={{ background: "#FFFBEB" }}
                          >
                            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "#FEF3C7" }}>
                              <AlertTriangle size={11} color="#D97706" />
                            </div>
                            <p className="text-[13px] text-[#92400E]" style={{ fontWeight: 500 }}>{issue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dfmFeedback && dfmFeedback.recommendations.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 500 }}>
                        DFM Recommendations
                      </p>
                      <div className="flex flex-col gap-2">
                        {dfmFeedback.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] text-white" style={{ background: "#D97706", fontWeight: 700 }}>
                              {i + 1}
                            </div>
                            <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 400 }}>{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dfmFeedback?.notes && (
                    <div className="rounded-lg border border-dashed border-[#CBD5E1] p-3 flex items-start gap-2.5">
                      <Info size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
                      <p className="text-[12px] text-[#64748B]">{dfmFeedback.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* 4. Required Design Changes / Spec Guidance */}
            <Section
              icon={ClipboardList}
              title={protoPart ? "Spec Guidance" : "Required Design Changes"}
              accentColor="#7C3AED"
              delay={0.16}
            >
              {prodPart && (
                prodPart.requiredDesignChanges.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {prodPart.requiredDesignChanges.map((change, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] text-white" style={{ background: "#7C3AED", fontWeight: 700 }}>
                          {i + 1}
                        </div>
                        <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 400 }}>{change}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <PlaceholderNotice label="Required design changes will be detailed after intervention planning." />
                )
              )}
              {protoPart && (
                <div className="flex flex-col gap-4">
                  {protoPart.specGuidance.criticalDimensions.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 500 }}>
                        Critical Dimensions
                      </p>
                      <div className="flex flex-col gap-2">
                        {protoPart.specGuidance.criticalDimensions.map((dim, i) => (
                          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] text-white" style={{ background: "#7C3AED", fontWeight: 700 }}>
                              {i + 1}
                            </div>
                            <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 400 }}>{dim}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {protoPart.specGuidance.requiredDrawingCallouts.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-2" style={{ fontWeight: 500 }}>
                        Required Drawing Callouts
                      </p>
                      <div className="flex flex-col gap-2">
                        {protoPart.specGuidance.requiredDrawingCallouts.map((callout, i) => (
                          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                            <Circle size={15} className="shrink-0" color="#7C3AED" />
                            <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 400 }}>{callout}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {protoPart.specGuidance.notes && (
                    <div className="rounded-lg border border-dashed border-[#CBD5E1] p-3 flex items-start gap-2.5">
                      <Info size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
                      <p className="text-[12px] text-[#64748B]">{protoPart.specGuidance.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* 5. Assembly Impact / Assembly Notes */}
            <Section
              icon={Layers}
              title={protoPart ? "Assembly Notes" : "Assembly Impact"}
              accentColor="#0891B2"
              delay={0.2}
            >
              {prodPart && (
                prodPart.assemblyImpact ? (
                  <p className="text-[13px] text-[#1E293B] leading-relaxed">{prodPart.assemblyImpact}</p>
                ) : (
                  <PlaceholderNotice label="Assembly impact analysis will be available once the full BOM and subsystem relationships have been mapped." />
                )
              )}
              {protoPart && (
                <div className="flex flex-col gap-3">
                  {protoPart.assemblyFeedback.assemblyNotes && (
                    <p className="text-[13px] text-[#1E293B] leading-relaxed">
                      {protoPart.assemblyFeedback.assemblyNotes}
                    </p>
                  )}
                  {protoPart.assemblyFeedback.assemblyRecommendations.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {protoPart.assemblyFeedback.assemblyRecommendations.map((rec, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                          <Circle size={15} className="shrink-0" color="#CBD5E1" />
                          <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 400 }}>{rec}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* 6. Validation Required */}
            <Section
              icon={ShieldAlert}
              title="Validation Required"
              accentColor="#059669"
              delay={0.24}
            >
              {(() => {
                const items = prodPart
                  ? prodPart.validationRequired
                  : (protoPart?.functionalRisk.validationRequired ?? []);
                return items.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                        <Circle size={15} className="shrink-0" color="#CBD5E1" />
                        <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 400 }}>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <PlaceholderNotice label="Validation requirements will be specified after intervention planning is complete." />
                );
              })()}
            </Section>

            {/* 7. Manufacturing Risk Signals (prototype only) */}
            {protoPart && protoPart.manufacturingRiskSignals.length > 0 && (
              <Section
                icon={ShieldAlert}
                title="Manufacturing Risk Signals"
                accentColor="#E11D48"
                delay={0.28}
              >
                <div className="flex flex-col gap-3">
                  {protoPart.manufacturingRiskSignals.map((sig, i) => {
                    const severityStyle = SEVERITY_SIGNAL_STYLE[sig.severity] ?? {
                        bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0", dot: "#94A3B8",
                      };
                    return (
                      <div key={i} className="rounded-lg border border-[#E2E8F0] p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-[13px] text-[#1E293B]" style={{ fontWeight: 500 }}>
                            {sig.signal}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded border text-[11px]"
                              style={{ background: severityStyle.bg, color: severityStyle.text, borderColor: severityStyle.border, fontWeight: 600 }}
                            >
                              {sig.severity}
                            </span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded border text-[11px]"
                              style={{ background: "#F1F5F9", color: "#64748B", borderColor: "#E2E8F0", fontWeight: 500 }}
                            >
                              {sig.category}
                            </span>
                          </div>
                        </div>
                        <p className="text-[12px] text-[#64748B]">
                          <span className="text-[#94A3B8]">Mitigation: </span>
                          {sig.mitigation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-72 shrink-0 flex flex-col gap-4">

            {/* Savings / Lead time hero */}
            {prodPart && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.06 }}
                className="rounded-xl border border-[#BBF7D0] overflow-hidden"
                style={{ background: "#F0FDF4" }}
              >
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown size={14} color="#16A34A" />
                    <span className="text-[11px] uppercase tracking-wider" style={{ color: "#16A34A", fontWeight: 500 }}>
                      Estimated Savings
                    </span>
                  </div>
                  <p className="text-[48px] leading-none" style={{ color: "#059669", fontWeight: 700 }}>
                    {prodPart.estimatedSavings}
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-[#D1FAE5] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #10B981, #059669)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${prodPart.savingsValue}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: "#34D399" }}>
                    {prodPart.savingsValue}% cost reduction opportunity
                  </p>
                </div>
              </motion.div>
            )}
            {protoPart && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.06 }}
                className="rounded-xl border border-[#BFDBFE] overflow-hidden"
                style={{ background: "#EFF6FF" }}
              >
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} color="#2563EB" />
                    <span className="text-[11px] uppercase tracking-wider" style={{ color: "#2563EB", fontWeight: 500 }}>
                      Prototype Lead Time
                    </span>
                  </div>
                  <p className="text-[48px] leading-none" style={{ color: "#1D4ED8", fontWeight: 700 }}>
                    {protoPart.iterationProfile.leadTimeDays}d
                  </p>
                  <p className="text-[12px] text-[#3B82F6] mt-2 leading-relaxed">
                    {protoPart.iterationProfile.primaryLeadTimeDriver}
                  </p>
                  <div className="mt-3 rounded-lg border border-[#BFDBFE] p-3" style={{ background: "#DBEAFE" }}>
                    <p className="text-[11px] text-[#1E3A8A] leading-relaxed">
                      {protoPart.iterationProfile.iterationRecommendation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recommended Intervention / Process */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.1 }}
              className="rounded-xl border border-[#BFDBFE] overflow-hidden"
              style={{ background: "#EFF6FF" }}
            >
              <div className="px-4 pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} color="#3B82F6" />
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: "#3B82F6", fontWeight: 500 }}>
                    {protoPart ? "Recommended Process" : "Recommended Intervention"}
                  </span>
                </div>
                <p className="text-[14px] text-[#1E3A8A]" style={{ fontWeight: 600 }}>
                  {prodPart
                    ? prodPart.recommendedIntervention
                    : protoPart!.prototypeProcess.recommendedProcess}
                </p>
              </div>
            </motion.div>

            {/* Engineering Assessment */}
            {hasAssessment && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.14 }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4"
              >
                <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>
                  Engineering Assessment
                </p>
                <div className="flex flex-col gap-2.5">
                  {prodPart && (
                    <>
                      {prodPart.engineeringDifficulty && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                            <Wrench size={12} />
                            Difficulty
                          </div>
                          <AssessmentBadge value={prodPart.engineeringDifficulty} type="difficulty" />
                        </div>
                      )}
                      {prodPart.riskLevel && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                            <AlertTriangle size={12} />
                            Risk
                          </div>
                          <AssessmentBadge value={prodPart.riskLevel} type="risk" />
                        </div>
                      )}
                      {prodPart.confidenceLevel && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                            <ThumbsUp size={12} />
                            Confidence
                          </div>
                          <AssessmentBadge value={prodPart.confidenceLevel} type="confidence" />
                        </div>
                      )}
                    </>
                  )}
                  {protoPart && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                          <Wrench size={12} />
                          Iteration Complexity
                        </div>
                        <AssessmentBadge value={protoPart.iterationProfile.iterationComplexity} type="difficulty" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                          <Layers size={12} />
                          Fit Risk
                        </div>
                        <AssessmentBadge value={protoPart.assemblyFeedback.fitIssueRisk} type="risk" />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Quick reference */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.18 }}
              className="bg-white rounded-xl border border-[#E2E8F0] p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3" style={{ fontWeight: 500 }}>
                Part Reference
              </p>
              <div className="flex flex-col gap-2">
                {(prodPart
                  ? [
                      { label: "Part No.", value: prodPart.partNumber, mono: true },
                      { label: "Name", value: prodPart.partName, mono: false },
                      { label: "Subsystem", value: prodPart.subsystem, mono: false },
                      { label: "Material", value: prodPart.currentManufacturing.material, mono: true },
                      { label: "Process", value: prodPart.currentManufacturing.process, mono: false },
                    ]
                  : [
                      { label: "Part No.", value: partNumber ?? null, mono: true },
                      { label: "Name", value: partName, mono: false },
                      { label: "Subsystem", value: subsystem, mono: false },
                      { label: "Rec. Process", value: protoPart!.prototypeProcess.recommendedProcess, mono: false },
                      { label: "Lead Time", value: protoPart!.prototypeProcess.leadTimeProfile, mono: false },
                      { label: "Iter. Complexity", value: protoPart!.iterationProfile.iterationComplexity, mono: false },
                    ]
                ).map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC] last:border-0"
                  >
                    <span className="text-[11px] text-[#94A3B8]">{row.label}</span>
                    {row.value ? (
                      <span
                        className="text-[11px] text-[#1E293B]"
                        style={{
                          fontFamily: row.mono
                            ? "'IBM Plex Mono', monospace"
                            : "'IBM Plex Sans', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {row.value}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#CBD5E1]">—</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.22 }}
              className="flex flex-col gap-2"
            >
              <button
                onClick={() => navigate("/bom-analysis")}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
                style={{ fontWeight: 500 }}
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft size={13} />
                  Back to BOM Analysis
                </span>
              </button>
              {/* Cost Interventions — production mode only, when this part has an intervention */}
              {mode === "production" && intervention && (
                <button
                  onClick={() => navigate("/cost-interventions")}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-[#BBF7D0] text-[13px] hover:border-[#86EFAC] transition-colors"
                  style={{ background: "#F0FDF4", color: "#065F46", fontWeight: 500 }}
                >
                  <span className="flex items-center gap-2">
                    <TrendingDown size={13} color="#16A34A" />
                    View Cost Interventions
                  </span>
                  <span className="text-[11px] text-[#16A34A]" style={{ fontWeight: 600 }}>
                    #{intervention.rank}
                  </span>
                </button>
              )}
              <button
                onClick={() => navigate("/upload")}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#1B3A5C] text-[13px] hover:bg-[#EFF4FA] hover:border-[#1B3A5C]/20 transition-colors"
                style={{ fontWeight: 500 }}
              >
                <span>Run New Analysis</span>
                <ArrowRight size={13} />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
