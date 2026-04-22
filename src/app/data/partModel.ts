// ─── Canonical Part Analysis Model ────────────────────────────────────────────
//
// buildPartAnalysisModel(partNumber, ctx) is the single authoritative function
// for assembling all part-level data used across BOMAnalysis, CostInterventions,
// and PartAnalysis. Pages MUST NOT recompute cost, DFM, or risk logic
// independently — they call this function and consume the returned model.
//
// The function is pure and deterministic: given the same inputs it always
// produces the same output, and it contains no React or UI logic.
//
// Reactive context values (cost overrides, selected interventions, build target)
// are passed as optional parameters; sensible defaults ensure the model is always
// safe to call even without full context.
//
// ─────────────────────────────────────────────────────────────────────────────

import { CANONICAL_BOM_845_000112, type CanonicalBomRow, type MakeBuy } from "./canonicalBom";
import {
  PART_COST_DATA,
  INTERVENTION_COST_DATA,
  applyImpactModel,
  type CostConfidence,
} from "./costData";
import {
  PRODUCTION_INTERVENTIONS,
  PRODUCTION_ENGINEERING_NOTES,
  PRODUCTION_PART_DETAILS,
  ANALYSIS_PAGE_PARTS_SET,
  INTERVENTION_IMPL_NOTES,
  type ProductionIntervention,
  type ProductionPartDetail,
  type EngineeringNote,
  type InterventionImplNote,
} from "./productionData";
import {
  PROTOTYPE_PART_DATA,
  PROTOTYPE_DFM_FLAGS,
  PROTOTYPE_SIMPLIFICATIONS,
  PROTOTYPE_ASSEMBLY,
  getPartLeadTime,
  getPartOrderBy,
  isPartOverdue,
  type PrototypePartRecord,
  type PrototypeDFMFlag,
  type PrototypeSimplification,
  type BuildBlocker,
  type ManufacturingRiskSignal,
  type OrderByResult,
} from "./prototypeData";

// ─── DFM shared types ─────────────────────────────────────────────────────────
// These types are the single source of truth for all DFM data consumed across
// BOM Analysis drawer, Part Analysis page, and DFM Opportunities page.
// Consumers must read from these types only — never from PrototypeDFMRecord
// or PrototypeDFMFlag fields directly.

/** Manufacturing process a part is categorised under for DFM review. */
export type DFMProcess = "CNC" | "Injection Molding" | "Die Casting";

/** DFM risk/severity level (mirrors IterationRisk from prototypeData). */
export type DFMSeverity = "Low" | "Medium" | "High";

/**
 * Normalised DFM feedback assembled from PrototypeDFMRecord + PrototypeDFMFlag.
 * Fields are grouped by the UI surface that primarily consumes them, but all
 * three surfaces (BOM drawer, Part Analysis, DFM Opportunities) may read any field.
 */
export interface DFMFeedback {
  /** Manufacturing process this part is categorised under. */
  process: DFMProcess;
  /** Overall prototype DFM risk level. */
  riskLevel: DFMSeverity;

  // ── Compact signal (from PrototypeDFMFlag — used in BOM drawer) ──────────────
  /** High-level geometry signal headline. Null if the part has no DFM flag entry. */
  geometrySignal: string | null;
  /** Single actionable prototype recommendation. Null if no DFM flag entry. */
  primaryRecommendation: string | null;
  /** Expected gain from addressing this DFM flag. Null if no DFM flag entry. */
  iterationGain: string | null;

  // ── Detailed issues / recommendations (from PrototypeDFMRecord) ──────────────
  /** Specific geometry or feature issues that slow prototype fabrication. */
  geometryIssues: string[];
  /** Actionable recommendations to improve prototype turnaround. */
  recommendations: string[];
  /** Free-text engineering notes for the drawing/process owner. */
  notes: string | null;

  // ── Prototype process (from PrototypeProcessRecord) ──────────────────────────
  /** Best-fit process for fabricating this part at prototype volume. */
  recommendedProcess: string;
  /** Qualitative lead-time description (e.g. "10–14 business days"). */
  leadTimeProfile: string;
  /** Process trade-off notes (quality vs. speed vs. cost). */
  processNotes: string;
  /** Alternative processes if the primary is unavailable. */
  alternativeProcesses: string[];

  // ── Iteration profile (from IterationProfile) ────────────────────────────────
  /** Calendar days from design freeze to part in hand at prototype volume. */
  leadTimeDays: number;
  /** Single biggest lead-time driver. */
  primaryLeadTimeDriver: string;
  /** Recommended design-iteration approach for this part. */
  iterationRecommendation: string;

  // ── Assembly complexity (from AssemblyFeedback) ───────────────────────────────
  /** Assembly complexity score 1–10. */
  complexityScore: number;

  // ── Production transition risks (from ManufacturingRiskSignal[]) ─────────────
  /** Forward-looking signals for design decisions that will create production problems. */
  manufacturingRiskSignals: ManufacturingRiskSignal[];

  // ── Cascade / iteration blast radius (from IterationProfile) ──────────────────
  /** What else must change if this part changes — iteration blast radius. */
  changeImpactRadius: string;

  // ── Functional risk (from FunctionalRiskRecord) ────────────────────────────────
  /** Specific functional failure modes or open design questions. */
  primaryRisks: string[];
  /** Tests or checks required before the next build can proceed. */
  validationRequired: string[];

  // ── Specification guidance (from SpecGuidanceRecord) ──────────────────────────
  /** Dimensions that must be held to spec for the part to function. */
  criticalDimensions: string[];
  /** Dimensions that can be relaxed at prototype without functional impact. */
  relaxableDimensions: string[];

  // ── Assembly (from AssemblyFeedback) ──────────────────────────────────────────
  /** Recommendations to de-risk assembly at prototype. */
  assemblyRecommendations: string[];
  /** Assembly sequence notes specific to prototype. */
  assemblyNotes: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────
// Reactive values from React hooks that influence computed fields.
// All fields are optional — the model is always safe to build without them.

export interface PartModelContext {
  /** Manual unit-cost overrides keyed by partNumber (from useCostModel). */
  costOverrides?: Record<string, number>;
  /** Interventions currently applied to the cost model (from useCostModel). */
  selectedInterventions?: Set<string>;
  /** Annual production volume — scales savings to annual figures (from useCostModel). */
  expectedAnnualVolume?: number;
  /** Next build target date ISO string (from useBuildTarget). */
  buildTargetDate?: string | null;
  /** Assembly days buffer for order-by calculations (from useBuildTarget). */
  estimatedBuildDays?: number;
  /** Parts currently on the critical path (from useBuildTarget). */
  criticalPathParts?: readonly string[];
}

// ─── Model type ───────────────────────────────────────────────────────────────

export interface PartAnalysisModel {
  // ── Identity (from CanonicalBomRow) ─────────────────────────────────────────
  readonly partNumber:   string;
  readonly name:         string;
  readonly qty:          number;
  readonly makeBuy:      MakeBuy;
  readonly itemCategory: string;
  readonly subsystem:    string;
  readonly bomLineId:    number;

  // ── Current cost (from PART_COST_DATA + cost overrides) ──────────────────────
  /** Raw unit cost from the data layer, before any manual overrides. */
  readonly unitCostBase:          number | null;
  /** Effective unit cost after applying any manual override. */
  readonly unitCostEffective:     number | null;
  readonly unitCostConfidence:    CostConfidence | null;
  readonly isUnitCostOverridden:  boolean;
  /** unitCostEffective × qty */
  readonly extCostEffective:      number | null;
  readonly costNotes:             string;
  /** When true this line is excluded from BOM cost rollups. */
  readonly excludeFromRollup:     boolean;

  // ── Intervention & projected cost (from PRODUCTION_INTERVENTIONS + INTERVENTION_COST_DATA) ──
  /** The matching PRODUCTION_INTERVENTIONS entry, if any. */
  readonly intervention:          ProductionIntervention | null;
  /** Static implementation notes for this intervention. */
  readonly interventionNotes:     InterventionImplNote | null;
  /** Projected unit cost if the intervention is applied (always computed when data exists). */
  readonly unitCostProjected:     number | null;
  /** unitCostProjected × qty */
  readonly extCostProjected:      number | null;
  /** unitCostEffective − unitCostProjected */
  readonly unitSaving:            number | null;
  /** unitSaving / unitCostEffective × 100 (rounded integer) */
  readonly unitSavingPct:         number | null;
  /** unitSaving × qty × expectedAnnualVolume */
  readonly annualSavingPotential: number | null;
  /** Whether this part's intervention is currently toggled on in the cost model. */
  readonly isInterventionSelected: boolean;

  // ── Engineering notes (from PRODUCTION_ENGINEERING_NOTES) ────────────────────
  readonly engineeringNote: EngineeringNote | null;

  // ── Production deep dive (from PRODUCTION_PART_DETAILS) ──────────────────────
  readonly productionDetail: ProductionPartDetail | null;
  /** True when a full Part Analysis page exists for this part. */
  readonly hasAnalysisPage:  boolean;

  // ── Prototype deep dive (from PROTOTYPE_PART_DATA) ────────────────────────────
  readonly prototypeDetail:          PrototypePartRecord | null;
  /** Assembly-level build blocker for this part, if any. */
  readonly buildBlocker:             BuildBlocker | null;
  /** Prototype DFM flag for this part, if any. */
  readonly dfmFlag:                  PrototypeDFMFlag | null;
  /** Prototype iteration simplification for this part, if any. */
  readonly simplification:           PrototypeSimplification | null;
  /** Forward-looking production risk signals (from prototype data). */
  readonly manufacturingRiskSignals: ManufacturingRiskSignal[];

  // ── Lead time / build urgency (prototype mode) ───────────────────────────────
  readonly leadTimeDays:    number | null;
  readonly orderBy:         OrderByResult | null;
  readonly onCriticalPath:  boolean;
  readonly overdueToOrder:  boolean;

  // ── DFM (normalised, from prototype data via shared selectors) ────────────────
  /** Manufacturing process category for DFM review. Null if no prototype data. */
  readonly dfmProcess:  DFMProcess | null;
  /** Normalised DFM feedback. Null if no prototype data exists for this part. */
  readonly dfmFeedback: DFMFeedback | null;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Builds the canonical PartAnalysisModel for a given part number.
 *
 * @param partNumber  Must exist in CANONICAL_BOM_845_000112 (asserted at runtime-dev).
 * @param ctx         Reactive context values from hooks; all fields are optional.
 */
export function buildPartAnalysisModel(
  partNumber: string,
  ctx: PartModelContext = {},
): PartAnalysisModel {
  const {
    costOverrides       = {},
    selectedInterventions = new Set<string>(),
    expectedAnnualVolume  = 0,
    buildTargetDate,
    estimatedBuildDays,
    criticalPathParts   = [],
  } = ctx;

  // ── Identity ────────────────────────────────────────────────────────────────
  const bomRow: CanonicalBomRow | undefined = CANONICAL_BOM_845_000112.find(
    (r) => r.partNumber === partNumber,
  );
  const name         = bomRow?.name         ?? partNumber;
  const qty          = bomRow?.qty          ?? 1;
  const makeBuy      = bomRow?.makeBuy      ?? "Buy";
  const itemCategory = bomRow?.itemCategory ?? "";
  const subsystem    = bomRow?.subsystem    ?? "";
  const bomLineId    = bomRow?.bomLineId    ?? 0;

  // ── Cost ────────────────────────────────────────────────────────────────────
  const costRec             = PART_COST_DATA[partNumber] ?? null;
  const unitCostBase        = costRec?.unitCostCurrent ?? null;
  const isUnitCostOverridden = partNumber in costOverrides;
  const unitCostEffective   = isUnitCostOverridden ? costOverrides[partNumber]! : unitCostBase;
  const unitCostConfidence  = costRec?.unitCostConfidence ?? null;
  const extCostEffective    = unitCostEffective != null ? unitCostEffective * qty : null;
  const costNotes           = costRec?.costNotes         ?? "";
  const excludeFromRollup   = costRec?.excludeFromRollup ?? false;

  // ── Intervention / projected cost ───────────────────────────────────────────
  const intervention    = PRODUCTION_INTERVENTIONS.find((i) => i.partNumber === partNumber) ?? null;
  const interventionNotes = intervention
    ? (INTERVENTION_IMPL_NOTES[intervention.rank] ?? null)
    : null;
  const intCostData     = INTERVENTION_COST_DATA[partNumber] ?? null;

  const unitCostProjected =
    unitCostEffective != null && intCostData != null
      ? applyImpactModel(unitCostEffective, intCostData.costImpactModel)
      : null;
  const extCostProjected =
    unitCostProjected != null ? unitCostProjected * qty : null;
  const unitSaving =
    unitCostEffective != null && unitCostProjected != null
      ? unitCostEffective - unitCostProjected
      : null;
  const unitSavingPct =
    unitSaving != null && unitCostEffective != null && unitCostEffective > 0
      ? Math.round((unitSaving / unitCostEffective) * 100)
      : null;
  // Annual saving = per-unit saving × qty × volume
  const annualSavingPotential =
    unitSaving != null && qty > 0 && expectedAnnualVolume > 0
      ? unitSaving * qty * expectedAnnualVolume
      : null;
  const isInterventionSelected = selectedInterventions.has(partNumber);

  // ── Engineering notes ────────────────────────────────────────────────────────
  const engineeringNote = PRODUCTION_ENGINEERING_NOTES[partNumber] ?? null;

  // ── Production deep dive ─────────────────────────────────────────────────────
  const productionDetail = PRODUCTION_PART_DETAILS[partNumber] ?? null;
  const hasAnalysisPage  = ANALYSIS_PAGE_PARTS_SET.has(partNumber);

  // ── Prototype deep dive ──────────────────────────────────────────────────────
  const prototypeDetail = PROTOTYPE_PART_DATA[partNumber] ?? null;
  const buildBlocker    =
    (PROTOTYPE_ASSEMBLY.blockers.find(
      (b) => b.partNumber === partNumber,
    ) as BuildBlocker | undefined) ?? null;
  const dfmFlag =
    PROTOTYPE_DFM_FLAGS.find((f) => f.partNumber === partNumber) ?? null;
  const simplification =
    PROTOTYPE_SIMPLIFICATIONS.find((s) => s.partNumber === partNumber) ?? null;
  const manufacturingRiskSignals: ManufacturingRiskSignal[] =
    prototypeDetail?.manufacturingRiskSignals ?? [];

  // ── Lead time / urgency ──────────────────────────────────────────────────────
  const leadTimeDays   = getPartLeadTime(partNumber);
  const orderBy        = getPartOrderBy(partNumber, buildTargetDate, estimatedBuildDays);
  const onCriticalPath = (criticalPathParts as string[]).includes(partNumber);
  const overdueToOrder = isPartOverdue(partNumber, buildTargetDate, estimatedBuildDays);

  // ── DFM process and feedback ──────────────────────────────────────────────────
  // The manufacturing process is derived from the recommended prototype process
  // string. Parts with FDM processes are injection-mould candidates at production;
  // the Housing (430-002808) is the primary die-casting candidate.
  const dfmProcess: DFMProcess | null = (() => {
    if (!prototypeDetail) return null;
    const proc = prototypeDetail.prototypeProcess.recommendedProcess.toLowerCase();
    if (proc.includes("fdm")) return "Injection Molding";
    if (partNumber === "430-002808") return "Die Casting";
    return "CNC";
  })();

  const dfmFeedback: DFMFeedback | null = prototypeDetail
    ? {
        process:               dfmProcess!,
        riskLevel:             prototypeDetail.dfm.riskLevel,
        geometrySignal:        dfmFlag?.geometrySignal          ?? null,
        primaryRecommendation: dfmFlag?.prototypeRecommendation ?? null,
        iterationGain:         dfmFlag?.iterationGain           ?? null,
        geometryIssues:        prototypeDetail.dfm.geometryIssues,
        recommendations:       prototypeDetail.dfm.recommendations,
        notes:                 prototypeDetail.dfm.notes        ?? null,
        recommendedProcess:    prototypeDetail.prototypeProcess.recommendedProcess,
        leadTimeProfile:       prototypeDetail.prototypeProcess.leadTimeProfile,
        processNotes:          prototypeDetail.prototypeProcess.processNotes,
        alternativeProcesses:  prototypeDetail.prototypeProcess.alternativeProcesses,
        leadTimeDays:          prototypeDetail.iterationProfile.leadTimeDays,
        primaryLeadTimeDriver: prototypeDetail.iterationProfile.primaryLeadTimeDriver,
        iterationRecommendation: prototypeDetail.iterationProfile.iterationRecommendation,
        complexityScore:         prototypeDetail.assemblyFeedback.complexityScore,
        manufacturingRiskSignals: prototypeDetail.manufacturingRiskSignals,
        changeImpactRadius:      prototypeDetail.iterationProfile.changeImpactRadius,
        primaryRisks:            prototypeDetail.functionalRisk.primaryRisks,
        validationRequired:      prototypeDetail.functionalRisk.validationRequired,
        criticalDimensions:      prototypeDetail.specGuidance.criticalDimensions,
        relaxableDimensions:     prototypeDetail.specGuidance.relaxableDimensions,
        assemblyRecommendations: prototypeDetail.assemblyFeedback.assemblyRecommendations,
        assemblyNotes:           prototypeDetail.assemblyFeedback.assemblyNotes,
      }
    : null;

  return {
    partNumber,
    name,
    qty,
    makeBuy,
    itemCategory,
    subsystem,
    bomLineId,
    unitCostBase,
    unitCostEffective,
    unitCostConfidence,
    isUnitCostOverridden,
    extCostEffective,
    costNotes,
    excludeFromRollup,
    intervention,
    interventionNotes,
    unitCostProjected,
    extCostProjected,
    unitSaving,
    unitSavingPct,
    annualSavingPotential,
    isInterventionSelected,
    engineeringNote,
    productionDetail,
    hasAnalysisPage,
    prototypeDetail,
    buildBlocker,
    dfmFlag,
    simplification,
    manufacturingRiskSignals,
    leadTimeDays,
    orderBy,
    onCriticalPath,
    overdueToOrder,
    dfmProcess,
    dfmFeedback,
  };
}

// ─── DFM selectors ─────────────────────────────────────────────────────────────
// Thin accessors over the model fields — stable API for all consumers.
// Pages must use these selectors rather than accessing prototypeDetail.dfm directly.

/**
 * Returns the manufacturing process category for a part's DFM review.
 * Accessor over model.dfmProcess.
 */
export function getDFMProcessForPart(model: PartAnalysisModel): DFMProcess | null {
  return model.dfmProcess;
}

/**
 * Returns normalised DFM feedback for a part.
 * Accessor over model.dfmFeedback.
 */
export function getDFMFeedbackForPart(model: PartAnalysisModel): DFMFeedback | null {
  return model.dfmFeedback;
}

/**
 * Filters an array of part models to those matching a given DFM process.
 * Used by DFM Opportunities page to populate its process-tab part lists.
 */
export function getDFMPartsForProcess(
  process: DFMProcess,
  models: PartAnalysisModel[],
): PartAnalysisModel[] {
  return models.filter((m) => m.dfmProcess === process);
}

/** Display level for DFM risk indicator dots in the BOM table. */
export type DFMLevel = "high" | "medium" | "low" | "none";

/**
 * Converts DFMFeedback to a display level for table indicator icons.
 * Returns "none" when feedback is null (no prototype data for this part).
 */
export function getDFMLevelFromFeedback(feedback: DFMFeedback | null): DFMLevel {
  if (!feedback) return "none";
  if (feedback.riskLevel === "High")   return "high";
  if (feedback.riskLevel === "Medium") return "medium";
  return "low";
}
