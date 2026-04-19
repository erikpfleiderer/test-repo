import { AlertTriangle, Clock } from "lucide-react";
import {
  PROTOTYPE_PART_DATA,
  type ManufacturingRiskSignal,
} from "../../data/prototypeData";
import { SEVERITY_SIGNAL_STYLE } from "./badgeStyles";

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<ManufacturingRiskSignal["severity"], number> = {
  Block: 3,
  Flag: 2,
  Watch: 1,
};

function topSignal(signals: ManufacturingRiskSignal[]): ManufacturingRiskSignal | null {
  return signals.reduce<ManufacturingRiskSignal | null>((best, s) => {
    if (!best || SEVERITY_RANK[s.severity] > SEVERITY_RANK[best.severity]) return s;
    return best;
  }, null);
}

// ─── Part-level hint ──────────────────────────────────────────────────────────

/**
 * Renders a secondary annotation sourced from canonical prototype data.
 *
 * • Prototype mode  → production risk annotation (manufacturingRiskSignals, top by severity).
 * • Production mode → prototype-origin context (iterationComplexity === "High" or block signal).
 *
 * Returns null when no relevant cross-mode data exists for the part.
 */
export function CrossModeHint({
  partNumber,
  mode,
  variant = "inline",
}: {
  partNumber: string;
  mode: "production" | "prototype";
  /** "inline" = compact one-liner for table cells; "banner" = labeled block for detail panels. */
  variant?: "inline" | "banner";
}) {
  const protoData = PROTOTYPE_PART_DATA[partNumber];
  if (!protoData) return null;

  // ── Prototype mode: surface top production-scale risk signal ─────────────
  if (mode === "prototype") {
    const signal = topSignal(protoData.manufacturingRiskSignals);
    if (!signal) return null;
    const s = SEVERITY_SIGNAL_STYLE[signal.severity];

    if (variant === "inline") {
      return (
        <div
          className="flex items-center gap-1 mt-1"
          title={`Production risk (${signal.severity}): ${signal.signal}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: s.dot }}
          />
          <span
            className="text-[10px] leading-tight truncate max-w-[160px]"
            style={{
              color: s.text,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            Prod risk: {signal.category} · {signal.severity}
          </span>
        </div>
      );
    }

    return (
      <div
        className="flex items-start gap-2 mt-2 px-3 py-2.5 rounded-lg border"
        style={{ background: s.bg, borderColor: s.border }}
      >
        <AlertTriangle
          size={11}
          style={{ color: s.dot, marginTop: 1, flexShrink: 0 }}
        />
        <div>
          <p
            className="text-[9px] uppercase tracking-wider mb-0.5"
            style={{
              color: s.text,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            Production risk · {signal.severity}
          </p>
          <p
            className="text-[11px] leading-snug"
            style={{ color: s.text, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {signal.signal}
          </p>
          {signal.mitigation && (
            <p
              className="text-[10px] leading-snug mt-1 opacity-80"
              style={{ color: s.text, fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Mitigation: {signal.mitigation}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Production mode: surface prototype-origin context ────────────────────
  const complexity = protoData.iterationProfile.iterationComplexity;
  const blockSignal = protoData.manufacturingRiskSignals.find(
    (s) => s.severity === "Block"
  ) ?? null;

  if (complexity !== "High" && !blockSignal) return null;

  if (variant === "inline") {
    return (
      <div
        className="flex items-center gap-1 mt-1"
        title={
          complexity === "High"
            ? `High prototype iteration complexity — ${protoData.iterationProfile.primaryLeadTimeDriver}`
            : `Block-level prototype signal: ${blockSignal!.signal}`
        }
      >
        <Clock size={9} style={{ color: "#CBD5E1", flexShrink: 0 }} />
        <span
          className="text-[10px] text-[#CBD5E1] leading-tight truncate max-w-[160px]"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {complexity === "High"
            ? "High prototype iteration complexity"
            : `Prototype block: ${blockSignal!.category}`}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-2 mt-2 px-3 py-2.5 rounded-lg border border-[#E2E8F0]"
      style={{ background: "#F8FAFC" }}
    >
      <Clock size={11} style={{ color: "#94A3B8", marginTop: 1, flexShrink: 0 }} />
      <div>
        <p
          className="text-[9px] uppercase tracking-wider mb-0.5 text-[#94A3B8]"
          style={{ fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Prototype origin
        </p>
        {complexity === "High" && (
          <p
            className="text-[11px] text-[#64748B] leading-snug"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            High iteration complexity — {protoData.iterationProfile.primaryLeadTimeDriver}
          </p>
        )}
        {blockSignal && (
          <p
            className="text-[11px] text-[#64748B] leading-snug mt-0.5"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Block-level signal: {blockSignal.signal}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Subsystem-level aggregate hint ──────────────────────────────────────────

/**
 * Aggregates cross-mode signals across all parts in a subsystem.
 *
 * • Prototype mode  → count of parts with Block-severity production-scale risks.
 * • Production mode → count of parts with High prototype iteration complexity.
 *
 * Returns null when no relevant signals exist across the part set.
 */
export function SubsystemCrossModeHint({
  partNumbers,
  mode,
}: {
  partNumbers: string[];
  mode: "production" | "prototype";
}) {
  const partData = partNumbers
    .map((pn) => PROTOTYPE_PART_DATA[pn])
    .filter(Boolean);

  if (partData.length === 0) return null;

  if (mode === "prototype") {
    const atRisk = partData.filter((d) =>
      d.manufacturingRiskSignals.some((s) => s.severity === "Block")
    );
    if (atRisk.length === 0) return null;

    return (
      <div
        className="flex items-center gap-2 mt-auto pt-3 px-3 py-2 rounded-lg border border-[#FDBA74]"
        style={{ background: "#FFF7ED" }}
      >
        <AlertTriangle size={11} style={{ color: "#F97316", flexShrink: 0 }} />
        <p
          className="text-[11px] leading-snug"
          style={{ color: "#9A3412", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {atRisk.length} part{atRisk.length !== 1 ? "s" : ""} with production-scale risks
        </p>
      </div>
    );
  }

  // Production mode
  const highComplexity = partData.filter(
    (d) => d.iterationProfile.iterationComplexity === "High"
  );
  if (highComplexity.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 mt-auto pt-3 px-3 py-2 rounded-lg border border-[#E2E8F0]"
      style={{ background: "#F8FAFC" }}
    >
      <Clock size={11} style={{ color: "#94A3B8", flexShrink: 0 }} />
      <p
        className="text-[11px] leading-snug text-[#64748B]"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {highComplexity.length} part{highComplexity.length !== 1 ? "s" : ""} had high prototype iteration complexity
      </p>
    </div>
  );
}
