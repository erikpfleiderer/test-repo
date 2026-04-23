// ─── DFMPartViewer ────────────────────────────────────────────────────────────
//
// Reusable viewer container for the DFM Opportunities page.
//
// Current implementation: SVG technical-drawing placeholder.
// Integration boundary: when a 3D engine (e.g. Three.js / @react-three/fiber,
// Babylon.js, or a CAD viewer SDK) is added to the project, replace the
// <PlaceholderDrawing> subtree with a <Canvas> or viewer iframe. All props stay
// the same — callers do not need to change.
//
// Annotation layer: the `annotations` prop accepts an optional list of named
// callouts. The placeholder renders their labels as text nodes; a real 3D
// integration would position them as world-space sprites or screen-space overlays.
//
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "motion/react";
import { Cpu, Loader2, PackageX } from "lucide-react";
import type { DFMProcess, DFMFeedback, PartAnalysisModel } from "../../data/partModel";
import { getDFMFeedbackForPart } from "../../data/partModel";

// ─── Public types ─────────────────────────────────────────────────────────────

/** A single DFM annotation or callout to render over the part geometry. */
export interface DFMAnnotation {
  /** Short label shown on the callout, e.g. "Thin wall — 0.8 mm". */
  label: string;
  /**
   * Semantic severity used to colour the callout.
   * Matches ManufacturingRiskSignal.severity from prototypeData.
   */
  severity: "Watch" | "Flag" | "Block";
}

export interface DFMPartViewerProps {
  /** The canonical part model to display. Null renders the empty state. */
  model: PartAnalysisModel | null;
  /** Currently active manufacturing process — shown as context in the viewer. */
  process: DFMProcess;
  /**
   * Optional DFM annotations/callouts to display over the geometry.
   * Derived from model.dfmFeedback.manufacturingRiskSignals by the caller;
   * the viewer does not compute them independently.
   */
  annotations?: DFMAnnotation[];
  /**
   * When true, renders a loading spinner instead of the geometry area.
   * Use while an async model asset fetch is in progress.
   */
  isLoading?: boolean;
  /**
   * When true, renders an "asset unavailable" state.
   * Use when the part exists in data but no 3D asset is found.
   */
  isUnavailable?: boolean;
}

// ─── Severity colour map (annotation callouts) ────────────────────────────────

const ANNOTATION_STYLE: Record<DFMAnnotation["severity"], string> = {
  Watch: "bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]",
  Flag:  "bg-warning-bg text-warning border border-warning-border",
  Block: "bg-danger-bg text-danger border border-danger-border",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** SVG technical drawing — stands in for a real 3D geometry render. */
function PlaceholderDrawing({ partNumber }: { partNumber: string }) {
  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
        {/* outer reference circle */}
        <circle
          cx="100" cy="100" r="88"
          fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6"
        />
        {/* body rect */}
        <rect x="38" y="38" width="124" height="124" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
        {/* inner feature rect */}
        <rect x="58" y="58" width="84" height="84" rx="4" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 2" />
        {/* centre mark */}
        <line x1="94" y1="100" x2="106" y2="100" stroke="#2563EB" strokeWidth="1.5" />
        <line x1="100" y1="94" x2="100" y2="106" stroke="#2563EB" strokeWidth="1.5" />
        {/* corner datums */}
        <circle cx="38"  cy="38"  r="3" fill="#CBD5E1" />
        <circle cx="162" cy="38"  r="3" fill="#CBD5E1" />
        <circle cx="38"  cy="162" r="3" fill="#CBD5E1" />
        <circle cx="162" cy="162" r="3" fill="#CBD5E1" />
        {/* horizontal dimension line */}
        <line x1="38" y1="172" x2="162" y2="172" stroke="#CBD5E1" strokeWidth="0.8" />
        <line x1="38"  y1="167" x2="38"  y2="177" stroke="#CBD5E1" strokeWidth="0.8" />
        <line x1="162" y1="167" x2="162" y2="177" stroke="#CBD5E1" strokeWidth="0.8" />
        {/* vertical dimension line */}
        <line x1="172" y1="38"  x2="172" y2="162" stroke="#CBD5E1" strokeWidth="0.8" />
        <line x1="167" y1="38"  x2="177" y2="38"  stroke="#CBD5E1" strokeWidth="0.8" />
        <line x1="167" y1="162" x2="177" y2="162" stroke="#CBD5E1" strokeWidth="0.8" />
      </svg>
      {/* part number overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs text-text-muted font-mono bg-white/80 px-2 py-0.5 rounded border border-border">
          {partNumber}
        </span>
      </div>
    </div>
  );
}

/** Stat tile used in the metrics row below the geometry. */
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2.5 rounded-lg bg-surface-muted border border-border">
      <span className="text-2xl font-semibold text-text-primary leading-none font-mono">
        {value}
      </span>
      <span className="text-[10px] text-text-subtle mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * `DFMPartViewer` — viewer container for the DFM Opportunities page.
 *
 * Renders a placeholder geometry area with DFM-relevant stats and optional
 * annotation callouts. The placeholder SVG is the integration boundary: replace
 * `<PlaceholderDrawing>` with a real 3D canvas when a renderer is added.
 */
export function DFMPartViewer({
  model,
  process,
  annotations = [],
  isLoading = false,
  isUnavailable = false,
}: DFMPartViewerProps) {
  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Cpu className="w-12 h-12 text-text-ghost opacity-30" />
        <p className="text-sm font-medium text-text-muted">
          Select a part to inspect
        </p>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 text-text-ghost opacity-50 animate-spin" />
        <p className="text-sm text-text-muted">Loading geometry…</p>
      </div>
    );
  }

  // ── Unavailable state ────────────────────────────────────────────────────────
  if (isUnavailable) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
        <PackageX className="w-10 h-10 text-text-ghost opacity-30" />
        <div className="text-center">
          <p className="text-sm font-medium text-text-secondary">
            Geometry not available
          </p>
          <p className="text-xs text-text-muted mt-1">
            No 3D asset found for{" "}
            <span className="font-mono">{model.partNumber}</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Part loaded ──────────────────────────────────────────────────────────────
  const feedback: DFMFeedback | null = getDFMFeedbackForPart(model);

  return (
    <motion.div
      key={model.partNumber}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center h-full gap-5 px-8 py-6"
    >
      {/* Process context badge */}
      <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]">
        {process}
      </span>

      {/*
       * ── Geometry area ──────────────────────────────────────────────────────
       * INTEGRATION POINT: Replace <PlaceholderDrawing> with your 3D canvas.
       *
       * Example (Three.js / @react-three/fiber):
       *   <Canvas className="w-full h-full">
       *     <PartGeometry assetUrl={model.assetUrl} />
       *     {annotations.map(a => <AnnotationSprite key={a.label} {...a} />)}
       *   </Canvas>
       *
       * Example (Babylon.js viewer iframe):
       *   <BabylonViewer src={model.assetUrl} partNumber={model.partNumber} />
       */}
      <PlaceholderDrawing partNumber={model.partNumber} />

      {/* Part identity */}
      <div className="text-center">
        <p className="text-text-primary font-semibold text-base leading-tight">
          {model.name}
        </p>
        {feedback && (
          <p className="text-text-subtle text-xs mt-1">
            {feedback.recommendedProcess}
          </p>
        )}
      </div>

      {/* Stats row */}
      {feedback && (
        <div className="flex gap-3">
          <StatTile value={`${feedback.leadTimeDays}d`} label="Lead Time" />
          <StatTile value={String(feedback.complexityScore)} label="Complexity" />
          {model.qty > 1 && (
            <StatTile value={`×${model.qty}`} label="Quantity" />
          )}
        </div>
      )}

      {/* Lead-time profile line */}
      {feedback && (
        <p className="text-text-muted text-xs max-w-xs text-center leading-relaxed">
          {feedback.leadTimeProfile}
        </p>
      )}

      {/*
       * ── Annotation layer ────────────────────────────────────────────────────
       * Placeholder renders annotations as a horizontal list of callout chips.
       * In a real 3D integration, these become world-space or screen-space
       * overlays positioned relative to the geometry.
       */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
          {annotations.map((a, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded font-medium ${ANNOTATION_STYLE[a.severity]}`}
            >
              {a.label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
