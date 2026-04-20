// ─── PROTOTYPE MODE — Canonical Data Schema ───────────────────────────────────
//
// This file is the parallel data layer for "prototype" mode. It shadows the
// production schema defined in costData.ts and canonicalBom.ts, reusing part
// numbers from CANONICAL_BOM_845_000112 as the shared identity layer.
//
// Naming conventions:
//   - Production type  →  Prototype equivalent
//   - PartCostRecord   →  PrototypePartRecord
//   - InterventionCostRecord → PrototypeSimplification
//   - DFMRow           →  PrototypeDFMFlag
//   - Subsystem        →  PrototypeSubsystem
//
// All types are exported so pages can import only what they need.
// Data constants follow each type block, matching the pattern in costData.ts.
//
// ─────────────────────────────────────────────────────────────────────────────

import type { CostConfidence } from "./costData";
import { CANONICAL_BOM_845_000112 } from "./canonicalBom";

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Reuses the same Low / Medium / High / null pattern as production assessment badges. */
export type IterationRisk = "Low" | "Medium" | "High";
export type FunctionalRisk = "Low" | "Medium" | "High" | "Critical";
export type Difficulty = "Low" | "Medium" | "High";

/** Build readiness for a part or assembly. */
export type BuildReadinessStatus = "Ready" | "Conditional" | "Blocked";

// ─── Part-level prototype record ──────────────────────────────────────────────
// Primary unit of the prototype data model.
// One record per part number; keyed by partNumber in PROTOTYPE_PART_DATA.
// Mirrors PartCostRecord from costData.ts, with cost replaced by iteration signal.

export interface PrototypePartRecord {
  /** Prototype DFM — geometry or feature signals that hurt prototype fabrication speed. */
  dfm: PrototypeDFMRecord;

  /** How long it takes to source/make and change this part at prototype volume. */
  iterationProfile: IterationProfile;

  /** Whether the part is likely to work as-designed at prototype. */
  functionalRisk: FunctionalRiskRecord;

  /**
   * Signals that are acceptable at prototype but will become problems at production.
   * Intended for early warning — does not block build.
   */
  manufacturingRiskSignals: ManufacturingRiskSignal[];

  /**
   * Rough cost bracket for awareness. Not used for rollup calculations in prototype mode.
   * Maps to PartCostRecord.unitCostCurrent but is intentionally imprecise.
   */
  costAwareness: PrototypeCostRecord;

  /** Recommended prototype process and sourcing path. */
  prototypeProcess: PrototypeProcessRecord;

  /** Drawing and specification guidance specific to prototype fabrication. */
  specGuidance: SpecGuidanceRecord;

  /** Assembly simplicity feedback — is this part easy to fit and assemble? */
  assemblyFeedback: AssemblyFeedback;
}

// ─── Prototype DFM ────────────────────────────────────────────────────────────
// Parallel to DFMRow from DFMOpportunities.tsx.
// Focuses on what slows down prototype fabrication, not production DFM.

export interface PrototypeDFMRecord {
  /** Geometry or feature signals that are problematic at prototype volume. */
  geometryIssues: string[];

  /**
   * Actionable recommendations that improve prototype turnaround.
   * Each entry maps to DFMRow.recommendedChange in production.
   */
  recommendations: string[];

  /** Overall prototype DFM risk. Maps to DFMRow.risk. */
  riskLevel: IterationRisk;

  /** Optional free-text notes for the engineering team. */
  notes?: string;
}

// ─── Iteration profile ────────────────────────────────────────────────────────
// No direct production equivalent — specific to prototype mode.
// Drives the "iteration speed analysis" capability.

export interface IterationProfile {
  /**
   * Typical calendar days from design freeze to part in hand at prototype volume.
   * Used to estimate next-build readiness.
   */
  leadTimeDays: number;

  /** The single biggest driver of lead time (e.g. "Gear cutting", "3D print queue"). */
  primaryLeadTimeDriver: string;

  /**
   * How hard it is to iterate on this part — accounts for tooling lock-in,
   * drawing revision overhead, and supplier MOQ constraints.
   */
  iterationComplexity: Difficulty;

  /**
   * Description of what else must change if this part changes.
   * Helps the team understand iteration blast radius.
   */
  changeImpactRadius: string;

  /** Recommended approach for the next design iteration on this part. */
  iterationRecommendation: string;
}

// ─── Functional risk ──────────────────────────────────────────────────────────
// Parallel to riskLevel / validationRequired in PartDetail (PartAnalysis.tsx).
// Answers: "will it work?" not "how much does it cost?"

export interface FunctionalRiskRecord {
  /**
   * Overall confidence that the part will perform its design intent at prototype.
   * "Critical" = known gap that must be resolved before build.
   */
  riskLevel: FunctionalRisk;

  /** Specific functional failure modes or open questions. */
  primaryRisks: string[];

  /**
   * Tests or checks required before the next build can start.
   * Maps to PartDetail.validationRequired in production.
   */
  validationRequired: string[];

  /**
   * Whether this part is safe to build without further validation.
   * Contributes to assembly-level BuildReadiness.
   */
  clearToBuild: boolean;

  /** Conditions or caveats if clearToBuild is true but with constraints. */
  clearToBuildNotes?: string;
}

// ─── Manufacturing risk signals ───────────────────────────────────────────────
// No direct production equivalent; intended as forward-looking signals.
// Captures design decisions acceptable at prototype that will create
// production problems — surfaced as warnings, not blockers.

export interface ManufacturingRiskSignal {
  /** Description of the signal (e.g. "FDM part — not scalable beyond ~500 units"). */
  signal: string;

  /** Which manufacturing domain this signal belongs to. */
  category: "Material" | "Process" | "Tolerance" | "Assembly" | "Sourcing";

  /**
   * Severity at production transition:
   *   Watch  = note for design review
   *   Flag   = needs design resolution before production
   *   Block  = cannot scale without fundamental redesign
   */
  severity: "Watch" | "Flag" | "Block";

  /** Recommended mitigation path for when the team transitions to production. */
  mitigation: string;
}

// ─── Prototype cost awareness ─────────────────────────────────────────────────
// Parallel to PartCostRecord but intentionally lightweight.
// Used only for rough ordering / awareness — not for BOM rollup in prototype mode.

export interface PrototypeCostRecord {
  /**
   * Rough unit cost range at prototype volume (1–10 units).
   * Null if unknown. Range width reflects uncertainty.
   */
  estimatedUnitCostRange: { low: number; high: number } | null;

  /** Confidence in the estimate. Reuses CostConfidence from production. */
  confidence: CostConfidence;

  /** Primary cost driver at prototype scale (may differ from production driver). */
  costDriver: string;

  /** Optional sourcing note (e.g. "Quickturn supplier", "In-house FDM"). */
  notes?: string;
}

// ─── Prototype process record ─────────────────────────────────────────────────
// Parallel to currentManufacturing in PartDetail (PartAnalysis.tsx) but describes
// what process to USE at prototype, not what process is currently in use.

export interface PrototypeProcessRecord {
  /** Best-fit process for fabricating this part at prototype volume. */
  recommendedProcess: string;

  /** Alternative processes if primary is unavailable. */
  alternativeProcesses: string[];

  /** Notes on process selection trade-offs (quality, speed, cost). */
  processNotes: string;

  /** Qualitative lead time description (e.g. "1–3 days", "2–3 weeks"). */
  leadTimeProfile: string;
}

// ─── Specification guidance ───────────────────────────────────────────────────
// No direct production equivalent. Guides drawing callouts and tolerance decisions
// specific to prototype fabrication — avoids over-specifying early drawings.

export interface SpecGuidanceRecord {
  /**
   * Dimensions that must be held to specification for the part to function.
   * These should always be called out on prototype drawings.
   */
  criticalDimensions: string[];

  /**
   * Dimensions that can be relaxed at prototype without functional impact.
   * Relaxing these speeds up fabrication and reduces cost.
   */
  relaxableDimensions: string[];

  /**
   * Notes, tolerances, or callouts that must appear on the prototype drawing
   * regardless of relaxation decisions (e.g. "Call out bearing bore finish Ra").
   */
  requiredDrawingCallouts: string[];

  /** Optional notes for the drawing owner. */
  notes?: string;
}

// ─── Assembly feedback ────────────────────────────────────────────────────────
// Parallel to assemblyImpact in PartDetail (PartAnalysis.tsx) but prototype-specific.
// Captures fit risk and assembly complexity for the upcoming build.

export interface AssemblyFeedback {
  /**
   * 1–10 assembly complexity score at prototype.
   * Maps directionally to Subsystem.costWeight (production) which tracks
   * relative assembly/manufacturing weight per subsystem.
   */
  complexityScore: number;

  /** Risk of fit issues between this part and mating interfaces. */
  fitIssueRisk: IterationRisk;

  /** Recommendations to simplify or de-risk assembly at prototype. */
  assemblyRecommendations: string[];

  /** Any assembly sequence notes specific to prototype (tooling, fixturing, etc.). */
  assemblyNotes: string;
}

// ─── Part-level PROTOTYPE_PART_DATA record ────────────────────────────────────
// Future contributors: add one entry per part number that needs prototype-mode
// detail. Part numbers must exist in CANONICAL_BOM_845_000112.
// Keyed identically to PART_COST_DATA in costData.ts.

export const PROTOTYPE_PART_DATA: Record<string, PrototypePartRecord> = {

  "430-002808": {
    dfm: {
      geometryIssues: ["Deep internal pockets limit tool reach", "Multiple datum setups required"],
      recommendations: ["Increase pocket radii to ≥ 2× tool diameter", "Consolidate setups via fixture design"],
      riskLevel: "Medium",
      notes: "Prototype run from billet is acceptable; flag for casting redesign before pilot.",
    },
    iterationProfile: {
      leadTimeDays: 14,
      primaryLeadTimeDriver: "CNC billet machining with multiple setups",
      iterationComplexity: "High",
      changeImpactRadius: "Bearing bores, gear center distance, cable routing path — all interfaces key off housing datums",
      iterationRecommendation: "Freeze housing interface geometry before iterating on internal features",
    },
    functionalRisk: {
      riskLevel: "Medium",
      primaryRisks: ["Bearing bore position affects gear mesh quality", "Housing stiffness under torque load unvalidated at prototype"],
      validationRequired: ["CMM check on bearing bore positions", "Gear backlash measurement post-assembly"],
      clearToBuild: true,
      clearToBuildNotes: "Build with CMM inspection plan in place",
    },
    manufacturingRiskSignals: [
      {
        signal: "CNC billet machining — high material removal drives unit cost at volume",
        category: "Process",
        severity: "Flag",
        mitigation: "Die casting with secondary machining on critical features",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 400, high: 600 },
      confidence: "Medium",
      costDriver: "CNC billet — multiple setups, high material removal",
      notes: "Quickturn CNC supplier typical at prototype volume",
    },
    prototypeProcess: {
      recommendedProcess: "CNC billet machining (Al 6061-T6)",
      alternativeProcesses: ["Wire EDM for internal features if needed"],
      processNotes: "No alternative for functional prototype — billet machining required to hold bearing bore tolerances",
      leadTimeProfile: "10–14 business days at typical quickturn CNC supplier",
    },
    specGuidance: {
      criticalDimensions: ["Bearing bore diameters and positions", "Gear center distance", "Housing-to-frame mating face flatness"],
      relaxableDimensions: ["External cosmetic surfaces", "Non-functional chamfers and edge breaks"],
      requiredDrawingCallouts: ["Bearing bore finish Ra 0.8", "Positional tolerance on bearing bores relative to datum A"],
    },
    assemblyFeedback: {
      complexityScore: 9,
      fitIssueRisk: "Medium",
      assemblyRecommendations: ["Assemble with gear backlash check fixture at first build", "Mark datum surfaces to avoid orientation errors"],
      assemblyNotes: "Primary structural part — all other parts key off housing; assemble and inspect before installing geartrain",
    },
  },

  "430-002839": {
    dfm: {
      geometryIssues: ["Internal gear geometry requires gear-cutting machine or EDM at prototype", "Tooth form accuracy is critical for mesh quality"],
      recommendations: ["Consider wire EDM if gear cutting lead time is limiting", "Specify root fillet radius explicitly on drawing"],
      riskLevel: "High",
      notes: "Highest functional risk part at prototype — NVH and backlash are build-qualifying tests.",
    },
    iterationProfile: {
      leadTimeDays: 21,
      primaryLeadTimeDriver: "Internal gear cutting + heat treatment + inspection cycle",
      iterationComplexity: "High",
      changeImpactRadius: "Any tooth form change affects planet and sun gear mesh, backlash, and NVH",
      iterationRecommendation: "Do not iterate tooth geometry without full mesh validation; iterate on housing/carrier interfaces first",
    },
    functionalRisk: {
      riskLevel: "High",
      primaryRisks: ["Gear mesh quality (backlash, contact pattern) unvalidated under load", "Heat treat distortion may shift tooth geometry", "NVH unknown until system-level test"],
      validationRequired: ["Contact pattern check under no-load", "Backlash measurement across tolerance stack", "Loaded NVH test at target RPM"],
      clearToBuild: true,
      clearToBuildNotes: "Build with explicit test plan — no load run first, then loaded validation",
    },
    manufacturingRiskSignals: [
      {
        signal: "Gear cutting at volume is expensive; heat treat distortion requires tight process control",
        category: "Process",
        severity: "Block",
        mitigation: "Powder metal near-net gear form at production — confirm tooth form feasibility early",
      },
      {
        signal: "4340 steel through-hardening has scrap risk at tight tolerance",
        category: "Material",
        severity: "Flag",
        mitigation: "Define hardness band and distortion limits; consider case-hardening strategy for production",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 450, high: 650 },
      confidence: "Medium",
      costDriver: "Internal gear cutting + heat treat + CMM inspection cycle",
    },
    prototypeProcess: {
      recommendedProcess: "Gear cutting from 4340 billet + through-hardening + grind if needed",
      alternativeProcesses: ["Wire EDM for tooth form if gear cutting lead time exceeds 3 weeks"],
      processNotes: "Wire EDM produces acceptable prototype geometry but surface finish differs from production — flag for comparison",
      leadTimeProfile: "3–4 weeks including heat treat and inspection",
    },
    specGuidance: {
      criticalDimensions: ["Tooth form (module, pressure angle, root fillet)", "OD / bore concentricity", "Face width and tooth width"],
      relaxableDimensions: ["Non-mating OD surfaces", "Weight-relief pockets if not load-bearing"],
      requiredDrawingCallouts: ["AGMA gear class callout", "Heat treat hardness band", "Runout tolerance on pitch circle"],
    },
    assemblyFeedback: {
      complexityScore: 8,
      fitIssueRisk: "High",
      assemblyRecommendations: ["Check backlash with planet gears before sealing housing", "Use assembly fixture to maintain planet-shaft spacing during installation"],
      assemblyNotes: "Do not final-assemble gearbox without confirming mesh pattern — partial assembly inspection is required",
    },
  },

  "432-001540": {
    dfm: {
      geometryIssues: ["FDM print lines may affect sealing surface quality", "Small features may not resolve accurately on FDM printers"],
      recommendations: ["Orient part to minimize layer lines on sealing face", "Increase wall thickness to ≥ 2mm for FDM printability"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 2,
      primaryLeadTimeDriver: "FDM print time + post-processing",
      iterationComplexity: "Low",
      changeImpactRadius: "Minimal — envelope and attachment features only; no gear or bearing interfaces",
      iterationRecommendation: "Iterate freely; print and test multiple variants in parallel",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["ABS creep at elevated temperature if near motor heat source", "FDM layer delamination under cable pull force"],
      validationRequired: ["Cable pull/strain relief test at max expected load"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "FDM ABS not scalable — 3D print unit cost is 10× injection mold unit cost at volume",
        category: "Process",
        severity: "Flag",
        mitigation: "Injection mold redesign required before pilot; add draft angles and nominal wall thickness now",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 15, high: 45 },
      confidence: "High",
      costDriver: "FDM print time and material",
      notes: "In-house FDM or service bureau both viable at prototype volume",
    },
    prototypeProcess: {
      recommendedProcess: "FDM (ABS or PETG)",
      alternativeProcesses: ["SLA for better surface finish on sealing face", "Urethane cast if 5+ units needed quickly"],
      processNotes: "FDM acceptable for prototype validation; SLA recommended if sealing face fit is critical",
      leadTimeProfile: "1–2 days in-house, 3–5 days service bureau",
    },
    specGuidance: {
      criticalDimensions: ["Cable pass-through hole diameter", "Attachment features / snap geometry"],
      relaxableDimensions: ["External cosmetic form", "Chamfer details"],
      requiredDrawingCallouts: ["Cable hole diameter with min clearance", "Attachment method (snap/press/adhesive) must be called out"],
    },
    assemblyFeedback: {
      complexityScore: 2,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Test cable insertion force before final assembly", "Mark correct orientation on part if not visually obvious"],
      assemblyNotes: "Low-risk assembly step; validate fit and strain relief in isolation before full system build",
    },
  },

  "430-002811": {
    dfm: {
      geometryIssues: ["Small internal radii at torque interfaces increase tool wear", "7075 work-hardens more than 6061 — slows machining"],
      recommendations: ["Increase corner radii at non-critical features", "Verify minimum wall thickness at torque features before material change"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 10,
      primaryLeadTimeDriver: "CNC machining of 7075-T6 billet",
      iterationComplexity: "Medium",
      changeImpactRadius: "Bearing fits, output shaft interface, assembly torque path — check before changing",
      iterationRecommendation: "Freeze output interface geometry and torque features first; iterate cosmetics last",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Torque-to-yield at output interface not validated", "Runout at bearing journals may affect gear mesh"],
      validationRequired: ["Runout measurement at bearing journals", "Torque test at output interface"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "7075-T6 is over-specified if loads are achievable with 6061-T6",
        category: "Material",
        severity: "Watch",
        mitigation: "Run FEA with 6061-T6 — if margins hold, switch at pilot to reduce cost and improve machinability",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 150, high: 250 },
      confidence: "High",
      costDriver: "7075-T6 material premium + CNC machining time",
    },
    prototypeProcess: {
      recommendedProcess: "CNC billet machining (Al 7075-T6)",
      alternativeProcesses: ["CNC from 6061-T6 if running a material comparison build"],
      processNotes: "Machine from 7075-T6 for first build to baseline; material substitution test can run in parallel",
      leadTimeProfile: "7–10 business days at quickturn CNC supplier",
    },
    specGuidance: {
      criticalDimensions: ["Bearing journal diameters and runout", "Output torque interface geometry", "Mating face to housing"],
      relaxableDimensions: ["Exterior envelope not affecting mating parts", "Non-functional weight-relief features"],
      requiredDrawingCallouts: ["Bearing journal surface finish Ra", "Runout tolerance relative to bearing datum", "Torque interface dimensions with tolerances"],
    },
    assemblyFeedback: {
      complexityScore: 5,
      fitIssueRisk: "Medium",
      assemblyRecommendations: ["Check bearing fit before pressing", "Verify output shaft runout after assembly"],
      assemblyNotes: "Install last in housing sub-assembly; runout check required before sealing",
    },
  },

  "430-002810": {
    dfm: {
      geometryIssues: ["Deep pockets with tight positional tolerance on planet shaft holes", "Multi-axis setup increases setup time and risk of datum shift"],
      recommendations: ["Machine planet-shaft holes in single setup using fixture", "Add reference features for CMM alignment"],
      riskLevel: "Medium",
    },
    iterationProfile: {
      leadTimeDays: 12,
      primaryLeadTimeDriver: "Multi-axis CNC setup and precision hole pattern",
      iterationComplexity: "High",
      changeImpactRadius: "Planet shaft positions directly affect gear mesh — any change propagates to ring gear, sun gear, and housing",
      iterationRecommendation: "Freeze planet-shaft hole pattern before first build; extremely high iteration cost for this feature",
    },
    functionalRisk: {
      riskLevel: "Medium",
      primaryRisks: ["Planet-shaft positional accuracy determines gear mesh quality", "Pocket depth tolerance affects axial float of planet gears"],
      validationRequired: ["CMM check of planet-shaft hole positions relative to bearing bore datum", "Axial float measurement post-assembly"],
      clearToBuild: true,
      clearToBuildNotes: "CMM inspection required before assembly",
    },
    manufacturingRiskSignals: [
      {
        signal: "7075-T6 over-specified if carrier stiffness requirements can be met with 6061-T6 + geometry optimization",
        category: "Material",
        severity: "Watch",
        mitigation: "FEA comparison at production design review",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 200, high: 350 },
      confidence: "High",
      costDriver: "Multi-axis CNC + precision hole pattern + 7075-T6 material",
    },
    prototypeProcess: {
      recommendedProcess: "CNC billet machining (Al 7075-T6) in single 5-axis setup for hole pattern",
      alternativeProcesses: ["3+2 axis with precision fixture if 5-axis not available"],
      processNotes: "Do not split planet hole pattern across setups — datum shift will compromise gear mesh",
      leadTimeProfile: "10–14 business days",
    },
    specGuidance: {
      criticalDimensions: ["Planet shaft hole true-position relative to central bearing bore", "Bearing bore diameter and concentricity", "Axial depth of planet shaft pockets"],
      relaxableDimensions: ["External lightening pocket form", "Non-functional fillets"],
      requiredDrawingCallouts: ["True position callout on planet shaft holes (datum from bearing bore)", "Surface finish on bearing bore"],
    },
    assemblyFeedback: {
      complexityScore: 7,
      fitIssueRisk: "High",
      assemblyRecommendations: ["Use CMM inspection record to verify before installing planet gears", "Check axial float of each planet before closing housing"],
      assemblyNotes: "Critical geartrain structural part — inspect before build, not after",
    },
  },

  // ─── Housing / Structure (cont.) ────────────────────────────────────────────

  "430-002809": {
    dfm: {
      geometryIssues: ["Multiple bore features require separate setup fixturing", "Bore concentricity across housing length is difficult to hold in single lathe setup"],
      recommendations: ["Use mandrel or dedicated boring bar fixture to hold concentricity without flipping", "Add reference bosses to simplify CMM alignment"],
      riskLevel: "Medium",
      notes: "Concentricity is the primary functional concern — all other geometry is straightforward.",
    },
    iterationProfile: {
      leadTimeDays: 12,
      primaryLeadTimeDriver: "CNC billet setup and bore concentricity verification",
      iterationComplexity: "Medium",
      changeImpactRadius: "Concentricity interfaces with gear housing and motor — any bore change cascades to both",
      iterationRecommendation: "Freeze bore diameters and concentricity datums before first build; iterate on non-interface geometry after validation",
    },
    functionalRisk: {
      riskLevel: "Medium",
      primaryRisks: ["Bore concentricity directly affects gear mesh quality", "Thermal expansion at motor interface unvalidated under load"],
      validationRequired: ["CMM concentricity check across bore pair", "Motor interface fit verification at assembly"],
      clearToBuild: true,
      clearToBuildNotes: "CMM check required before assembling into housing stack",
    },
    manufacturingRiskSignals: [
      {
        signal: "CNC billet machining at volume — high material removal rate drives unit cost",
        category: "Process",
        severity: "Flag",
        mitigation: "Die casting with finish bores; evaluate at pilot design review",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 280, high: 420 },
      confidence: "Medium",
      costDriver: "CNC billet — concentricity setup + multiple bore features",
      notes: "Same quickturn CNC shop as housing; can batch with 430-002808 to reduce fixturing overhead",
    },
    prototypeProcess: {
      recommendedProcess: "CNC billet machining (Al 6061-T6)",
      alternativeProcesses: ["Turning on manual lathe for simple bore pass if CNC queue is long"],
      processNotes: "Bore concentricity requirement rules out manual turning for primary runs — CNC required",
      leadTimeProfile: "10–12 business days at quickturn CNC supplier",
    },
    specGuidance: {
      criticalDimensions: ["Primary and secondary bore diameters", "Bore-to-bore concentricity", "Housing mating face flatness"],
      relaxableDimensions: ["External envelope features not affecting mating parts", "Cosmetic chamfers"],
      requiredDrawingCallouts: ["Concentricity callout (datum from primary bore)", "Motor interface fit class (H7/h6 or equivalent)"],
    },
    assemblyFeedback: {
      complexityScore: 6,
      fitIssueRisk: "Medium",
      assemblyRecommendations: ["Verify bore concentricity before assembling gear housing stack", "Use alignment pins to prevent rotation during bolted assembly"],
      assemblyNotes: "Install before geartrain; concentricity error is not recoverable after sealing",
    },
  },

  "430-002916": {
    dfm: {
      geometryIssues: ["Sealing groove on small OD feature requires close tolerancing", "Internal cable routing pocket is a reentrant feature — limited access for deburring"],
      recommendations: ["Specify sealing groove width explicitly on drawing with ±0.05mm tolerance", "Open cable pocket to improve deburr access"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 7,
      primaryLeadTimeDriver: "CNC billet turning + milling of sealing groove",
      iterationComplexity: "Low",
      changeImpactRadius: "Cap interfaces only with Axon motor and cable exit — minimal blast radius",
      iterationRecommendation: "Iterate freely; short lead time allows fast cycle; confirm sealing fit before finalizing groove geometry",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Sealing groove geometry may not seat O-ring correctly at prototype tolerances", "Cable routing pocket may conflict with cable routing at assembly"],
      validationRequired: ["O-ring seating test at assembly", "Cable routing clearance check"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "CNC single-piece aluminum cap — no significant volume scaling concern",
        category: "Process",
        severity: "Watch",
        mitigation: "At high volume, evaluate injection-molded cap with insert-molded thread feature",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 60, high: 110 },
      confidence: "High",
      costDriver: "CNC turning with sealing groove feature",
      notes: "Low complexity — can batch with other turned parts to reduce setup cost",
    },
    prototypeProcess: {
      recommendedProcess: "CNC billet turning + milling (Al 6061-T6)",
      alternativeProcesses: ["FDM for a non-sealing functional mockup only"],
      processNotes: "FDM not acceptable for sealing validation — CNC required for first functional prototype",
      leadTimeProfile: "5–8 business days",
    },
    specGuidance: {
      criticalDimensions: ["O-ring sealing groove width and depth", "Thread interface to Axon motor", "OD fit to housing bore"],
      relaxableDimensions: ["External cosmetic profile", "Non-functional face chamfers"],
      requiredDrawingCallouts: ["Sealing groove tolerance ±0.05mm", "Thread class callout", "Surface finish on sealing groove Ra 1.6 or better"],
    },
    assemblyFeedback: {
      complexityScore: 2,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Test O-ring seating in isolation before installing on assembly", "Verify cable routing clearance before torquing down"],
      assemblyNotes: "Last part to install on motor end — set aside until all internal cable routing is confirmed",
    },
  },

  // ─── Retention ──────────────────────────────────────────────────────────────

  "430-002812": {
    dfm: {
      geometryIssues: ["Flatness requirement across clamping face may be difficult to hold after parting from billet", "Small-batch machining adds per-unit setup overhead"],
      recommendations: ["Face-grind mating face after machining to ensure flatness", "Batch with 430-002813 to share setup at supplier"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 8,
      primaryLeadTimeDriver: "CNC turning + milling with flatness requirement",
      iterationComplexity: "Medium",
      changeImpactRadius: "Interfaces with output shaft — bore diameter and clamping geometry are functionally critical",
      iterationRecommendation: "Freeze bore diameter and clamping split interface before machining; cosmetic changes can iterate freely",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Clamping force vs. output torque not analytically validated", "Flatness deviation may reduce clamping uniformity"],
      validationRequired: ["Clamping torque test under max expected output load"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "CNC single-piece SS304 — corrosion resistance probably over-specified; 4140 or Al 7075 may suffice",
        category: "Material",
        severity: "Watch",
        mitigation: "Evaluate material substitution at pilot if load analysis confirms lower-spec material meets fatigue and corrosion requirements",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 20, high: 40 },
      confidence: "High",
      costDriver: "CNC + SS304 material + flatness requirement",
    },
    prototypeProcess: {
      recommendedProcess: "CNC machined (SS 304 or 4140 depending on corrosion exposure)",
      alternativeProcesses: ["Al 7075 if corrosion environment is dry/enclosed"],
      processNotes: "Use SS304 for first prototype build; material comparison can run in second build",
      leadTimeProfile: "5–8 business days",
    },
    specGuidance: {
      criticalDimensions: ["Clamping bore diameter", "Flatness of clamping face", "Split interface geometry"],
      relaxableDimensions: ["External profile", "Non-clamping surface finish"],
      requiredDrawingCallouts: ["Bore diameter tolerance", "Flatness tolerance on clamping face", "Split geometry relative datum"],
    },
    assemblyFeedback: {
      complexityScore: 3,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Torque fasteners evenly to avoid uneven clamping", "Check clamping gap with feeler gauge before finalizing"],
      assemblyNotes: "Install as clamp pair with 430-002813; torque sequence matters for uniform clamping",
    },
  },

  "430-002813": {
    dfm: {
      geometryIssues: ["Laser cut edge quality may have burrs at hole positions — requires deburr step", "Hole positional accuracy from laser varies with sheet flatness"],
      recommendations: ["Use brake-press to deburr or tumble after laser cut", "Specify hole positions from single datum edge to reduce stack-up"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 5,
      primaryLeadTimeDriver: "Laser cut + deburr + delivery",
      iterationComplexity: "Low",
      changeImpactRadius: "Interfaces with output shaft bore and clamp outer — hole positions are the critical interface",
      iterationRecommendation: "Fast to iterate; cut new blanks if hole positions need adjustment; keep geometry simple",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Hole position tolerance from laser may not be tight enough for clamping alignment", "Edge quality at bore could mar output shaft under clamping load"],
      validationRequired: ["Hole position check against drawing before assembly", "Shaft surface check after clamping test"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "Sheet metal one-off is expensive relative to stamped part at volume",
        category: "Process",
        severity: "Flag",
        mitigation: "Stamping with secondary piercing at volume — qualify stamping tooling early",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 10, high: 25 },
      confidence: "High",
      costDriver: "Laser cut + deburr (small batch)",
    },
    prototypeProcess: {
      recommendedProcess: "Laser cut sheet metal (SS 304, ~1.5mm)",
      alternativeProcesses: ["Waterjet if laser not available for SS at gauge"],
      processNotes: "Laser cut is fastest for prototype; confirm deburr requirement explicitly in purchase order",
      leadTimeProfile: "3–5 business days",
    },
    specGuidance: {
      criticalDimensions: ["Hole diameter and position relative to datum edge", "Overall blank dimensions"],
      relaxableDimensions: ["Edge chamfer details", "Cosmetic surface finish"],
      requiredDrawingCallouts: ["Hole position tolerance (from single datum edge)", "Sheet thickness tolerance"],
    },
    assemblyFeedback: {
      complexityScore: 2,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Deburr all laser-cut edges before assembly", "Verify hole alignment with outer clamp before installing on shaft"],
      assemblyNotes: "Inner clamp — assemble as pair with outer clamp; inspect edges before contact with output shaft",
    },
  },

  // ─── Shafting ────────────────────────────────────────────────────────────────

  "430-002814": {
    dfm: {
      geometryIssues: ["Surface finish requirement on bearing journals requires cylindrical grinding as a separate operation", "Runout tolerance is tight — any deflection during machining will fail inspection"],
      recommendations: ["Machine turning diameter with 0.1mm overstock; grind to final dimension in separate grinding op", "Use steady rest during grinding for long shaft sections"],
      riskLevel: "Medium",
      notes: "Grinding is a separate supplier step — adds 3–5 days to lead time beyond turning.",
    },
    iterationProfile: {
      leadTimeDays: 10,
      primaryLeadTimeDriver: "CNC turning + cylindrical grinding + runout inspection",
      iterationComplexity: "High",
      changeImpactRadius: "Central reference for gear stack axial position — any diameter or length change propagates to gear shimming and axial float",
      iterationRecommendation: "Freeze shaft diameter and shoulder positions before first build; grinding adds iteration cost that is hard to recover",
    },
    functionalRisk: {
      riskLevel: "Medium",
      primaryRisks: ["Runout at bearing journals directly affects gear mesh and NVH", "Shaft deflection under load not validated by FEA at prototype"],
      validationRequired: ["Runout measurement at bearing journals post-grinding (≤0.005mm TIR)", "Shaft deflection check after assembly under static load"],
      clearToBuild: true,
      clearToBuildNotes: "Runout must be measured before gear stack assembly",
    },
    manufacturingRiskSignals: [
      {
        signal: "Grinding is a secondary supplier step — creates scheduling dependency",
        category: "Process",
        severity: "Flag",
        mitigation: "Qualify a CNC supplier with in-house grinding to reduce hand-offs; consider profile tolerance approach on drawing to avoid separate grind step",
      },
      {
        signal: "4140 at prototype — acceptable, but nitriding surface hardening may be required for long-term wear life",
        category: "Material",
        severity: "Watch",
        mitigation: "Design review before pilot to decide on surface treatment strategy",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 55, high: 100 },
      confidence: "High",
      costDriver: "CNC turning + cylindrical grinding + runout inspection",
    },
    prototypeProcess: {
      recommendedProcess: "CNC turning (4140) + external cylindrical grinding",
      alternativeProcesses: ["Turn with tight tolerance if grinding shop unavailable — validate runout first"],
      processNotes: "Do not skip grinding on journal surfaces — turned surface finish will not meet bearing interface requirements",
      leadTimeProfile: "8–12 business days including grinding step",
    },
    specGuidance: {
      criticalDimensions: ["Journal diameters for needle bearing interface", "Shoulder positions for gear stack axial location", "Overall shaft length"],
      relaxableDimensions: ["Non-bearing OD surfaces", "Chamfer sizes at non-critical features"],
      requiredDrawingCallouts: ["Journal surface finish Ra 0.4 or better", "Runout tolerance TIR (reference bearing bore datum)", "Hardness range if heat-treated"],
    },
    assemblyFeedback: {
      complexityScore: 6,
      fitIssueRisk: "Medium",
      assemblyRecommendations: ["Measure runout before inserting into gear stack", "Apply light oil to journal surfaces before pressing bearings"],
      assemblyNotes: "Install as central reference; gear stack and bearing positions are shimmed relative to shaft shoulders",
    },
  },

  "430-002816": {
    dfm: {
      geometryIssues: ["Needle bearing running surface OD requires tight diameter and surface finish — no grinding skip possible", "×4 quantity means any setup issue is multiplied across all four"],
      recommendations: ["Process all four in single batch to maintain consistency", "Specify OD tolerance explicitly — needle bearings are sensitive to slight undersize"],
      riskLevel: "Medium",
      notes: "×4 quantity: any process deviation affects all four shafts and therefore all four planet gear positions.",
    },
    iterationProfile: {
      leadTimeDays: 10,
      primaryLeadTimeDriver: "CNC turning + cylindrical grinding × 4 pieces",
      iterationComplexity: "High",
      changeImpactRadius: "Planet shaft OD feeds directly into needle bearing ID — any change requires re-inspection of all four and re-validation of planet gear float",
      iterationRecommendation: "Freeze planet shaft OD before ordering needles; changing shaft OD after ordering bearings forces a bearing re-spec",
    },
    functionalRisk: {
      riskLevel: "Medium",
      primaryRisks: ["Needle bearing surface finish drives bearing life and smooth rotation", "Shaft-to-carrier press fit depth must be consistent across all four positions"],
      validationRequired: ["OD inspection on all four shafts before assembly", "Needle bearing assembly torque check on each planet position"],
      clearToBuild: true,
      clearToBuildNotes: "Inspect all four before assembly — do not build with only partial set",
    },
    manufacturingRiskSignals: [
      {
        signal: "Grinding required for needle bearing surface — same supplier hand-off issue as bore shaft",
        category: "Process",
        severity: "Flag",
        mitigation: "Qualify grinding supplier early; consider specifying harder shaft material with tighter turned tolerance to potentially eliminate grind step",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 35, high: 60 },
      confidence: "High",
      costDriver: "CNC + grinding × 4 pieces",
      notes: "Per-unit cost; ×4 in assembly",
    },
    prototypeProcess: {
      recommendedProcess: "CNC turning (4140) + cylindrical grinding",
      alternativeProcesses: ["Precision turned only if tolerance stack allows — verify with bearing supplier"],
      processNotes: "Batch all four in same run to ensure dimensional consistency across planet positions",
      leadTimeProfile: "8–12 business days, batch of 4",
    },
    specGuidance: {
      criticalDimensions: ["Needle bearing OD diameter with tight tolerance (g6 or better)", "Press-fit diameter into carrier", "Shoulder length for planet gear axial retention"],
      relaxableDimensions: ["Non-bearing OD", "End chamfer sizes"],
      requiredDrawingCallouts: ["Bearing surface finish Ra 0.4", "OD tolerance to needle bearing spec", "Press fit diameter relative to carrier bore"],
    },
    assemblyFeedback: {
      complexityScore: 5,
      fitIssueRisk: "Medium",
      assemblyRecommendations: ["Press shafts into carrier before installing planet gears", "Verify needle bearing axial float on each planet post-assembly"],
      assemblyNotes: "Install before planet gears; press force should be measured and recorded for all four positions",
    },
  },

  "430-002817": {
    dfm: {
      geometryIssues: ["OD/ID co-axiality required — sleeve must run true on planet shaft", "×4 quantity — same batch consistency requirement as planet shaft"],
      recommendations: ["Turn OD and bore in single chucking to maintain concentricity", "Specify co-axiality on drawing relative to bore datum"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 8,
      primaryLeadTimeDriver: "CNC turning with tight OD/ID co-axiality",
      iterationComplexity: "Medium",
      changeImpactRadius: "Sleeve OD is the needle bearing running surface — any OD change requires bearing re-spec",
      iterationRecommendation: "Freeze sleeve OD with planet shaft OD; these two should be specified together to match needle bearing inner",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["OD surface finish on bearing running surface is critical for bearing life", "If sleeve is a slip fit vs press fit on shaft, it may rotate under load"],
      validationRequired: ["OD inspection on all four sleeves", "Rotation check at assembly — sleeve should not slip on shaft"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "Steel sleeve on steel shaft — galling risk if tolerances are tight without surface treatment",
        category: "Tolerance",
        severity: "Watch",
        mitigation: "Specify light oil on assembly; consider sleeve material change to bronze at production if galling is observed",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 15, high: 30 },
      confidence: "High",
      costDriver: "CNC turning with co-axiality requirement × 4",
      notes: "Per-unit cost; ×4 in assembly",
    },
    prototypeProcess: {
      recommendedProcess: "CNC turning (4140 or 52100)",
      alternativeProcesses: ["Bronze sleeve if galling risk is flagged in build notes"],
      processNotes: "Turn OD and ID in single chucking to hold co-axiality; do not re-chuck",
      leadTimeProfile: "5–8 business days, batch of 4",
    },
    specGuidance: {
      criticalDimensions: ["OD (needle bearing running surface)", "ID (fit on planet shaft)", "OD/ID co-axiality"],
      relaxableDimensions: ["End face finish", "External chamfer sizes"],
      requiredDrawingCallouts: ["OD surface finish Ra 0.4", "Co-axiality tolerance (OD relative to ID)", "OD tolerance matched to bearing inner spec"],
    },
    assemblyFeedback: {
      complexityScore: 3,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Verify sleeve does not rotate on shaft during planet installation", "Apply light oil to OD before needle bearing assembly"],
      assemblyNotes: "Install on planet shaft before pressing into carrier; ensure sleeve rotates with shaft, not relative to it",
    },
  },

  // ─── Geartrain (remaining) ───────────────────────────────────────────────────

  "430-002836": {
    dfm: {
      geometryIssues: ["External spur gear — simpler than internal ring gears but still requires gear hobbing or milling", "Heat treat distortion on small-OD gear is difficult to control"],
      recommendations: ["Specify tight hardness band to minimize distortion variation", "Check runout on pitch circle after heat treat — grind if needed"],
      riskLevel: "Medium",
      notes: "External gear is more accessible for hobbing than internal ring gear — faster and cheaper at prototype.",
    },
    iterationProfile: {
      leadTimeDays: 18,
      primaryLeadTimeDriver: "Gear hobbing + heat treat + runout inspection",
      iterationComplexity: "High",
      changeImpactRadius: "Any tooth form change cascades to all four planet gears and the two ring gears — mesh quality changes throughout",
      iterationRecommendation: "Freeze module, pressure angle, and tooth count early; these define the entire geartrain; do not iterate tooth geometry without mesh analysis",
    },
    functionalRisk: {
      riskLevel: "High",
      primaryRisks: ["Sun gear mesh with all four planets simultaneously — any runout error affects all mesh positions", "Heat treat distortion shifts tooth geometry after inspection", "Hardness band mismatch vs ring gear may affect wear"],
      validationRequired: ["Runout check post heat treat", "Contact pattern test with one planet before assembly", "Hardness verification"],
      clearToBuild: true,
      clearToBuildNotes: "Must pass runout and hardness check before inserting into carrier",
    },
    manufacturingRiskSignals: [
      {
        signal: "Gear hobbing at volume — separate supplier from housing CNC; creates scheduling dependency",
        category: "Sourcing",
        severity: "Flag",
        mitigation: "Qualify single shop capable of both gear and shaft machining to reduce coordination overhead at pilot",
      },
      {
        signal: "Heat treat distortion on small OD gear is hard to control — scrap risk",
        category: "Process",
        severity: "Flag",
        mitigation: "Specify tight hardness range; consider case-hardening + grind strategy at production",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 130, high: 220 },
      confidence: "Medium",
      costDriver: "Gear hobbing + heat treat + CMM inspection",
    },
    prototypeProcess: {
      recommendedProcess: "Gear hobbing from 4340 billet + through-hardening",
      alternativeProcesses: ["CNC profile milling if hobbing lead time exceeds 2 weeks (lower quality)"],
      processNotes: "Profile milling acceptable for early geometry check, not for NVH or wear validation",
      leadTimeProfile: "3–4 weeks including heat treat and inspection",
    },
    specGuidance: {
      criticalDimensions: ["Module and pressure angle (must match planet gears)", "Pitch circle runout", "Tooth width", "Bore diameter for shaft interface"],
      relaxableDimensions: ["Tooth surface roughness beyond basic callout", "Keyway depth at prototype"],
      requiredDrawingCallouts: ["AGMA gear class", "Heat treat hardness range", "Runout on pitch circle (post heat treat)", "Bore tolerance for shaft interface"],
    },
    assemblyFeedback: {
      complexityScore: 7,
      fitIssueRisk: "High",
      assemblyRecommendations: ["Verify contact pattern with single planet before full assembly", "Mark sun gear orientation for NVH repeatability testing"],
      assemblyNotes: "Install with all four planets simultaneously; do not install without mesh pattern check",
    },
  },

  "430-002837": {
    dfm: {
      geometryIssues: ["External spur gear requiring hobbing — ×4 quantity amplifies any setup deviation", "Heat treat of four identical gears must be consistent — batch uniformity risk"],
      recommendations: ["Process all four in same heat treat batch to ensure hardness consistency", "CMM check one gear from each batch; reject entire batch if out of spec"],
      riskLevel: "Medium",
      notes: "×4 quantity means all four must be within spec — one bad part can block build or require full re-run.",
    },
    iterationProfile: {
      leadTimeDays: 18,
      primaryLeadTimeDriver: "Gear hobbing + heat treat (batch of 4) + inspection",
      iterationComplexity: "High",
      changeImpactRadius: "Planet gears mesh with both sun and ring gears — any tooth change affects all three mesh interfaces",
      iterationRecommendation: "Co-specify planet gears with sun gear and ring gears from day 1 — these cannot be iterated independently",
    },
    functionalRisk: {
      riskLevel: "High",
      primaryRisks: ["One under-spec planet gear degrades all four mesh interfaces simultaneously", "Heat treat batch variation across four gears may cause uneven load distribution", "Shaft interface fit determines axial float and needle bearing loading"],
      validationRequired: ["Hardness check on all four from same batch", "Runout check on each gear post heat treat", "Loaded mesh pattern test after assembly"],
      clearToBuild: true,
      clearToBuildNotes: "All four must pass inspection before build — do not proceed with partial set",
    },
    manufacturingRiskSignals: [
      {
        signal: "×4 quantity of gear-cut parts — at volume, powder metal near-net form is the only economical option",
        category: "Process",
        severity: "Block",
        mitigation: "Confirm powder metal tooth form feasibility and tooling investment before pilot build",
      },
      {
        signal: "Batch heat treat variation risk — one bad gear grounds the entire build",
        category: "Material",
        severity: "Flag",
        mitigation: "Specify hardness range on drawing; 100% hardness check at prototype volume",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 120, high: 200 },
      confidence: "Medium",
      costDriver: "Gear hobbing + heat treat + inspection × 4",
      notes: "Per-unit cost; ×4 in assembly",
    },
    prototypeProcess: {
      recommendedProcess: "Gear hobbing from 4340 billet + through-hardening (batch of 4)",
      alternativeProcesses: ["CNC profile milling if hobbing not available — flag as approximate"],
      processNotes: "Process all four in same batch; do not mix batches in same assembly",
      leadTimeProfile: "3–4 weeks, batch of 4",
    },
    specGuidance: {
      criticalDimensions: ["Module and pressure angle (must match sun and ring gears)", "Shaft bore diameter", "Tooth width", "Runout on pitch circle"],
      relaxableDimensions: ["Non-functional OD features", "Keyway if not load-bearing at prototype"],
      requiredDrawingCallouts: ["AGMA gear class", "Heat treat hardness range", "Runout tolerance on pitch circle", "Shaft interface bore tolerance"],
    },
    assemblyFeedback: {
      complexityScore: 7,
      fitIssueRisk: "High",
      assemblyRecommendations: ["Install all four in one operation; do not partially assemble", "Verify axial float of each planet post-installation before closing housing"],
      assemblyNotes: "Check backlash on all four positions — use feeler gauge method before gear housing is sealed",
    },
  },

  "430-002838": {
    dfm: {
      geometryIssues: ["Internal gear cutting — same specialist supplier constraint as output ring gear", "Static ring — no output torque load, but must maintain concentricity with housing bore"],
      recommendations: ["Machine housing interference fit bore and internal gear in same setup if possible", "Specify runout of internal gear relative to OD datum — this is the housing reference"],
      riskLevel: "High",
      notes: "Static ring gear — functional consequence of poor gear quality is lower than output ring gear, but still drives mesh quality.",
    },
    iterationProfile: {
      leadTimeDays: 21,
      primaryLeadTimeDriver: "Internal gear cutting + heat treat + inspection — same supplier as output ring gear",
      iterationComplexity: "High",
      changeImpactRadius: "Any tooth form change on static ring affects planet mesh; must be co-specified with planet gears",
      iterationRecommendation: "Order static and output ring gears together — same tooth form, same supplier, same heat treat batch if possible",
    },
    functionalRisk: {
      riskLevel: "High",
      primaryRisks: ["Internal gear concentricity with OD housing fit affects planet mesh quality", "Heat treat distortion of internal feature harder to correct than external gear"],
      validationRequired: ["Internal gear runout relative to OD datum", "Contact pattern check against planet gear"],
      clearToBuild: true,
      clearToBuildNotes: "Inspect with output ring gear before assembly — confirm tooth form match",
    },
    manufacturingRiskSignals: [
      {
        signal: "Gear cutting at prototype — specialist supplier dependency same as output ring gear",
        category: "Sourcing",
        severity: "Flag",
        mitigation: "Qualify same supplier for both ring gears; order together to reduce per-part overhead",
      },
      {
        signal: "Through-hardening of internal gear — same heat treat distortion risk as output ring gear",
        category: "Process",
        severity: "Flag",
        mitigation: "Same heat treat batch as output ring gear if tooth form matches",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 380, high: 550 },
      confidence: "Medium",
      costDriver: "Internal gear cutting + heat treat + CMM inspection",
      notes: "Batch with output ring gear (430-002839) to reduce per-part overhead",
    },
    prototypeProcess: {
      recommendedProcess: "Internal gear cutting from 4340 billet + through-hardening",
      alternativeProcesses: ["Wire EDM for tooth form — same alternative as output ring gear"],
      processNotes: "Process together with output ring gear if tooth form is identical or compatible",
      leadTimeProfile: "3–4 weeks including heat treat and inspection",
    },
    specGuidance: {
      criticalDimensions: ["Tooth form (must match planet gear module and pressure angle)", "Internal gear runout relative to OD housing fit datum", "OD housing interference fit diameter"],
      relaxableDimensions: ["Non-mating external surfaces", "Weight relief pockets if not load-bearing"],
      requiredDrawingCallouts: ["AGMA gear class", "Heat treat hardness band", "Runout of pitch circle relative to OD datum"],
    },
    assemblyFeedback: {
      complexityScore: 8,
      fitIssueRisk: "High",
      assemblyRecommendations: ["Press into housing before geartrain installation", "Verify internal gear runout after pressing — distortion from press can affect mesh"],
      assemblyNotes: "Static ring gear is pressed or loctited into housing — this operation must be completed before planet carrier installation",
    },
  },

  // ─── Cable Management (remaining 3D printed parts) ──────────────────────────

  "432-001479": {
    dfm: {
      geometryIssues: ["Snap-fit hooks may not resolve cleanly at standard FDM layer height", "Thin walls near cable routing cutouts risk delamination under flex"],
      recommendations: ["Increase snap-fit hook thickness by 0.3mm", "Add minimum 1.5mm wall thickness around all cutouts", "Print at 0.15mm layer height for better snap feature definition"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 2,
      primaryLeadTimeDriver: "FDM print time",
      iterationComplexity: "Low",
      changeImpactRadius: "Snap interface to housing is the only external interface — other changes are free",
      iterationRecommendation: "Print and test snap engagement before committing drawing — FDM allows fast cycle",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Snap-fit failure under cable routing stress", "Cover may not seat flush if housing interface has dimensional deviation"],
      validationRequired: ["Snap engagement force test", "Flush seating check against housing"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "FDM ABS not scalable; snap-fit geometry may need redesign for injection molding draft angles",
        category: "Process",
        severity: "Flag",
        mitigation: "Design with injection molding DFM in mind now — add 1–2° draft, nominal wall, no deep undercuts",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 8, high: 28 },
      confidence: "High",
      costDriver: "FDM print time + post-processing",
      notes: "In-house FDM preferred; service bureau for 5+ units",
    },
    prototypeProcess: {
      recommendedProcess: "FDM (ABS or PETG)",
      alternativeProcesses: ["SLA for better snap-fit surface definition"],
      processNotes: "PETG preferred over ABS for better layer adhesion and snap-fit durability",
      leadTimeProfile: "1–2 days in-house",
    },
    specGuidance: {
      criticalDimensions: ["Snap-fit hook depth and engagement length", "Housing interface clearance"],
      relaxableDimensions: ["External cosmetic surfaces", "Label text if any"],
      requiredDrawingCallouts: ["Snap-fit engagement depth", "Housing interface dimensions"],
    },
    assemblyFeedback: {
      complexityScore: 1,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Test snap engagement before final assembly", "Route cables before snapping cover in place"],
      assemblyNotes: "Last part to install in cable routing sequence — ensures cables are captured",
    },
  },

  "432-001480": {
    dfm: {
      geometryIssues: ["Grip geometry has undercuts that require support material on FDM", "Support removal may mar grip surface"],
      recommendations: ["Orient print to minimize supports on grip interface surface", "Use dissolvable supports if available, or design out undercuts"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 2,
      primaryLeadTimeDriver: "FDM print time + support removal",
      iterationComplexity: "Low",
      changeImpactRadius: "Grip only interfaces with cable and housing cutout — changes don't propagate",
      iterationRecommendation: "Iterate freely; print 2–3 variants to find best grip geometry before freezing",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Cable pull-out force under strain relief may exceed grip retention force", "FDM layer delamination at grip under repeated flex"],
      validationRequired: ["Cable pull-out test at max expected strain"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "FDM not scalable — injection mold redesign needed at volume",
        category: "Process",
        severity: "Flag",
        mitigation: "Design for injection molding: add draft angles, nominal wall thickness, no undercuts",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 6, high: 20 },
      confidence: "High",
      costDriver: "FDM print + support removal",
      notes: "Very fast to iterate; multiple variants can be tested same day",
    },
    prototypeProcess: {
      recommendedProcess: "FDM (PETG or ABS)",
      alternativeProcesses: ["SLA if grip surface finish matters for cable seating"],
      processNotes: "PETG preferred for better layer adhesion at grip",
      leadTimeProfile: "1–2 days in-house",
    },
    specGuidance: {
      criticalDimensions: ["Cable pass-through diameter", "Housing cutout interface dimensions"],
      relaxableDimensions: ["External grip form beyond functional interface"],
      requiredDrawingCallouts: ["Cable diameter clearance", "Housing cutout engagement geometry"],
    },
    assemblyFeedback: {
      complexityScore: 1,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Insert cable before pressing grip into housing cutout", "Confirm cable is not pinched after installation"],
      assemblyNotes: "Simple install; validate cable routing is not kinked or pinched after installation",
    },
  },

  "432-001482": {
    dfm: {
      geometryIssues: ["Mounting tabs to housing may have positional variation from FDM print shrinkage", "FDM layer orientation affects cantilever strength of mounting tabs"],
      recommendations: ["Orient part with mounting tabs parallel to print bed for best layer adhesion", "Oversize holes by 0.2mm to accommodate FDM print variation"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 2,
      primaryLeadTimeDriver: "FDM print time",
      iterationComplexity: "Low",
      changeImpactRadius: "Mounting hole pattern interfaces with housing — hole changes require housing drawing update",
      iterationRecommendation: "Freeze mounting hole pattern to match housing; all other features can iterate freely",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Mounting tab failure under vibration or cable tension", "Positional variation may cause misalignment with clamp (432-001483)"],
      validationRequired: ["Mounting tab pull-out force test", "Alignment check with cable relief clamp"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "FDM not scalable at volume — injection mold at pilot",
        category: "Process",
        severity: "Flag",
        mitigation: "Design with injection mold draft and gate location in mind",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 8, high: 22 },
      confidence: "High",
      costDriver: "FDM print time",
    },
    prototypeProcess: {
      recommendedProcess: "FDM (PETG or ABS)",
      alternativeProcesses: ["SLA for better dimensional accuracy on mounting tabs"],
      processNotes: "Print with 3+ perimeters for mounting tab strength",
      leadTimeProfile: "1–2 days in-house",
    },
    specGuidance: {
      criticalDimensions: ["Mounting hole positions relative to housing datum", "Channel width for cable bundle"],
      relaxableDimensions: ["External form beyond cable channel and mounting interface"],
      requiredDrawingCallouts: ["Mounting hole positions and clearance diameter", "Cable channel width tolerance"],
    },
    assemblyFeedback: {
      complexityScore: 2,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Route cable bundle before installing clamp", "Verify alignment with 432-001483 before fastening"],
      assemblyNotes: "Install as mount-clamp pair with 432-001483; route cable, place mount, then apply clamp",
    },
  },

  "432-001483": {
    dfm: {
      geometryIssues: ["Clamping feature geometry requires tight dimensional accuracy to exert correct clamping force", "FDM clamping parts may creep under sustained load at elevated temperature"],
      recommendations: ["Print at 100% infill in clamping region", "Evaluate PETG or PC-ABS for better creep resistance if thermal environment is a concern"],
      riskLevel: "Low",
    },
    iterationProfile: {
      leadTimeDays: 2,
      primaryLeadTimeDriver: "FDM print time",
      iterationComplexity: "Low",
      changeImpactRadius: "Interfaces with cable relief mount (432-001482) — changes must be mirrored in mount",
      iterationRecommendation: "Iterate clamp together with mount as a pair; changes to one require re-printing both",
    },
    functionalRisk: {
      riskLevel: "Low",
      primaryRisks: ["Clamping force insufficient to retain cable under vibration", "FDM creep under sustained cable tension at motor temperature"],
      validationRequired: ["Cable retention force test under vibration", "Short thermal soak test if near motor"],
      clearToBuild: true,
    },
    manufacturingRiskSignals: [
      {
        signal: "FDM clamping part — not recommended for production; stamped or CNC metal clamp at volume",
        category: "Process",
        severity: "Flag",
        mitigation: "Redesign as stamped metal clamp for pilot; validates both function and production process",
      },
    ],
    costAwareness: {
      estimatedUnitCostRange: { low: 6, high: 20 },
      confidence: "High",
      costDriver: "FDM print time + post-processing",
    },
    prototypeProcess: {
      recommendedProcess: "FDM (PETG or PC-ABS for creep resistance)",
      alternativeProcesses: ["Machined aluminum clamp if thermal environment is confirmed to be aggressive"],
      processNotes: "Use PC-ABS if motor temperature exceeds 60°C at cable exit location",
      leadTimeProfile: "1–2 days in-house",
    },
    specGuidance: {
      criticalDimensions: ["Clamping gap when fastened", "Fastener hole positions relative to mount"],
      relaxableDimensions: ["External form beyond clamping and fastening features"],
      requiredDrawingCallouts: ["Clamping gap tolerance", "Hole positions relative to mount datum"],
    },
    assemblyFeedback: {
      complexityScore: 2,
      fitIssueRisk: "Low",
      assemblyRecommendations: ["Install as pair with mount; do not over-torque fasteners — FDM boss will crack", "Check cable is not pinched at clamp closure"],
      assemblyNotes: "Install last in cable routing sequence; do a final cable routing audit before closing clamp",
    },
  },
};

// ─── Subsystem-level prototype record ────────────────────────────────────────
// Parallel to the Subsystem interface in SubsystemAnalysis.tsx.
// Replaces cost-weight and cost-driver framing with iteration/complexity framing.

export interface PrototypeSubsystem {
  /** Matches Subsystem.id in SubsystemAnalysis.tsx. */
  id: string;

  /** Matches Subsystem.name. */
  name: string;

  /**
   * Prototype complexity score (1–10).
   * Maps to Subsystem.costWeight in production — same scale,
   * but reflects iteration difficulty rather than BOM cost contribution.
   */
  complexityScore: number;

  /**
   * Signals that drive prototype complexity or iteration friction for this subsystem.
   * Maps to Subsystem.primaryDrivers (which are cost drivers in production).
   */
  complexitySignals: string[];

  /**
   * Recommended path to simplify this subsystem at prototype.
   * Maps to Subsystem.recommendedLever in production.
   */
  simplificationTarget: string;

  /** Highest iteration risk level across parts in this subsystem. */
  iterationRisk: IterationRisk;

  /**
   * Part numbers within this subsystem that are on the critical path for
   * the next build — parts with longest lead time or highest functional risk.
   */
  criticalPathParts: string[];
}

export const PROTOTYPE_SUBSYSTEMS: PrototypeSubsystem[] = [
  {
    id: "housing-structure",
    name: "Housing / Structure",
    complexityScore: 9,
    complexitySignals: [
      "Multi-setup CNC — high iteration lead time",
      "All interfaces reference housing datums — changes propagate everywhere",
      "Bearing bore tolerances require CMM verification",
    ],
    simplificationTarget: "Freeze interface geometry early; iterate non-critical features only after first build validation",
    iterationRisk: "High",
    criticalPathParts: ["430-002808", "430-002809"],
  },
  {
    id: "geartrain",
    name: "Geartrain",
    complexityScore: 10,
    complexitySignals: [
      "Internal gear cutting requires specialist supplier",
      "Heat treat + distortion adds validation overhead",
      "NVH and backlash can only be assessed at system level",
    ],
    simplificationTarget: "Lock tooth geometry before first build; test mesh quality in isolation before full system assembly",
    iterationRisk: "High",
    criticalPathParts: ["430-002839", "430-002836", "430-002837", "430-002838"],
  },
  {
    id: "cable-management",
    name: "Cable Management",
    complexityScore: 3,
    complexitySignals: [
      "FDM parts can be iterated in 1–2 days",
      "Form and fit validation needed; functional risk is low",
    ],
    simplificationTarget: "Iterate freely at prototype; design for injection molding early to avoid rework at pilot",
    iterationRisk: "Low",
    criticalPathParts: [],
  },
  {
    id: "retention",
    name: "Retention",
    complexityScore: 4,
    complexitySignals: [
      "Flatness and hole position requirements add inspection overhead",
      "Small-batch sheet metal or machined parts have MOQ sensitivity",
    ],
    simplificationTarget: "Simplify hole pattern where possible; consider stamping validation early",
    iterationRisk: "Low",
    criticalPathParts: [],
  },
  {
    id: "shafting",
    name: "Shafting",
    complexityScore: 5,
    complexitySignals: [
      "Tight runout and journal tolerances require grinding",
      "Heat treat (if required) adds cycle time",
    ],
    simplificationTarget: "Relax non-critical runout; standardize diameters to reduce supplier setups",
    iterationRisk: "Medium",
    criticalPathParts: ["430-002814"],
  },
  {
    id: "purchased-ots",
    name: "Purchased / OTS",
    complexityScore: 2,
    complexitySignals: [
      "Lead time dominated by distributor stock levels",
      "Crossed roller bearing (410-000310) has long lead time and high unit cost",
    ],
    simplificationTarget: "Pre-order long-lead bearings early; confirm alternates before committing to assembly timeline",
    iterationRisk: "Low",
    criticalPathParts: ["410-000310"],
  },
];

// ─── Prototype simplification record ─────────────────────────────────────────
// Parallel to the Intervention interface in CostInterventions.tsx.
// Replaces cost-savings framing with iteration-impact framing.
// Keyed by rank; same pattern as INTERVENTIONS array in production.

export interface PrototypeSimplification {
  /** Same rank ordering concept as Intervention.rank. */
  rank: number;

  /** Must exist in CANONICAL_BOM_845_000112. */
  partNumber: string;
  partName: string;
  subsystem: string | null;

  /** Current prototype process (parallel to Intervention.currentManufacturing). */
  currentPrototypeProcess: string;

  /** What is making this part hard to iterate (parallel to primaryCostDriver). */
  primaryIterationFriction: string;

  /**
   * Recommended simplification at prototype.
   * Maps to Intervention.recommendedIntervention.
   */
  simplificationPath: string;

  /**
   * Qualitative description of iteration impact.
   * Maps to Intervention.estimatedSavings — uses time/effort language instead of cost.
   */
  iterationImpact: string;

  /** Numeric lead-time reduction estimate (days). */
  leadTimeSavingsDays: number;

  /** Maps to Intervention.engineeringDifficulty. */
  engineeringDifficulty: Difficulty;

  /** Risk of applying this simplification. Maps to Intervention.riskLevel. */
  iterationRisk: IterationRisk;

  /** Confidence in the recommendation. Maps to Intervention.confidenceLevel. */
  confidenceLevel: "Low" | "Medium" | "High";
}

export const PROTOTYPE_SIMPLIFICATIONS: PrototypeSimplification[] = [
  {
    rank: 1,
    partNumber: "430-002839",
    partName: "RS320 Ring Gear – Output",
    subsystem: "Geartrain",
    currentPrototypeProcess: "Internal gear cutting + heat treat + inspection",
    primaryIterationFriction: "3–4 week lead time; specialist supplier required; heat treat adds risk",
    simplificationPath: "Wire EDM tooth form for prototype validation; parallelize with production gear-cutting quote",
    iterationImpact: "Reduce lead time from 21 days to 7–10 days",
    leadTimeSavingsDays: 11,
    engineeringDifficulty: "Medium",
    iterationRisk: "Medium",
    confidenceLevel: "Medium",
  },
  {
    rank: 2,
    partNumber: "432-001540",
    partName: "RS320 Output Grommet",
    subsystem: "Cable Management",
    currentPrototypeProcess: "FDM (ABS)",
    primaryIterationFriction: "Post-processing and fit iteration add a day per cycle",
    simplificationPath: "Standardize on PETG for better surface finish; pre-print 3 variants and test in parallel",
    iterationImpact: "Reduce fit iteration cycles from 3 to 1",
    leadTimeSavingsDays: 4,
    engineeringDifficulty: "Low",
    iterationRisk: "Low",
    confidenceLevel: "High",
  },
  {
    rank: 3,
    partNumber: "430-002808",
    partName: "RS320 Housing",
    subsystem: "Housing / Structure",
    currentPrototypeProcess: "CNC billet machining (multiple setups)",
    primaryIterationFriction: "14-day lead time; any interface change restarts the cycle",
    simplificationPath: "Freeze all interface features before machining; use modular fixturing to reduce setup re-runs",
    iterationImpact: "Eliminate re-machining cycles from interface changes",
    leadTimeSavingsDays: 14,
    engineeringDifficulty: "Low",
    iterationRisk: "Low",
    confidenceLevel: "High",
  },
  {
    rank: 4,
    partNumber: "430-002836",
    partName: "RS320 Sun Gear",
    subsystem: "Geartrain",
    currentPrototypeProcess: "Gear hobbing from 4340 billet + through-hardening",
    primaryIterationFriction: "3–4 week lead time; specialist supplier; tooth form co-specified with planet gears",
    simplificationPath: "Qualify a single gear-cutting shop that can run sun gear, planet gears, and ring gears together; batch order to reduce per-run lead time",
    iterationImpact: "Reduce per-run lead time by batching all four gear types; eliminates supplier coordination overhead",
    leadTimeSavingsDays: 7,
    engineeringDifficulty: "Medium",
    iterationRisk: "Medium",
    confidenceLevel: "Medium",
  },
  {
    rank: 5,
    partNumber: "430-002814",
    partName: "RS320 Bore Shaft",
    subsystem: "Shafting",
    currentPrototypeProcess: "CNC turning + separate cylindrical grinding step",
    primaryIterationFriction: "Grinding is a separate supplier step adding 3–5 days; scheduling dependency on grinding shop",
    simplificationPath: "Qualify a single CNC supplier with in-house grinding capability to eliminate hand-off; specify profile tolerance approach to reduce grinding dependency",
    iterationImpact: "Reduce lead time by 3–5 days; remove supplier hand-off from critical path",
    leadTimeSavingsDays: 4,
    engineeringDifficulty: "Low",
    iterationRisk: "Low",
    confidenceLevel: "High",
  },
  {
    rank: 6,
    partNumber: "432-001479",
    partName: "RS320 Cable Cover (Cable Management cluster)",
    subsystem: "Cable Management",
    currentPrototypeProcess: "FDM one-at-a-time iteration cycles",
    primaryIterationFriction: "Single sequential prints add a day per iteration cycle; snap-fit geometry takes 2–3 cycles to converge",
    simplificationPath: "Print 3 snap-fit geometry variants simultaneously and test in parallel; freeze interface geometry after single evaluation round",
    iterationImpact: "Collapse 3 sequential iteration cycles into 1 parallel evaluation day",
    leadTimeSavingsDays: 4,
    engineeringDifficulty: "Low",
    iterationRisk: "Low",
    confidenceLevel: "High",
  },
  {
    rank: 7,
    partNumber: "430-002809",
    partName: "RS320 Rotor Frame",
    subsystem: "Housing / Structure",
    currentPrototypeProcess: "CNC billet machining with bore concentricity verification",
    primaryIterationFriction: "Bore concentricity must be CMM-verified before assembly; any re-work adds a week",
    simplificationPath: "Freeze bore concentricity datums and tolerance callouts before ordering; include CMM requirement explicitly in PO to avoid separate inspection trip",
    iterationImpact: "Avoid a round-trip CMM inspection visit that adds 3–5 days to build readiness",
    leadTimeSavingsDays: 4,
    engineeringDifficulty: "Low",
    iterationRisk: "Low",
    confidenceLevel: "Medium",
  },
];

// ─── Prototype DFM opportunity ────────────────────────────────────────────────
// Parallel to DFMRow in DFMOpportunities.tsx.
// Focuses on prototype fabrication friction, not production DFM.

export interface PrototypeDFMFlag {
  /** Must exist in CANONICAL_BOM_845_000112. */
  partNumber: string;
  partName: string;

  /** Geometry or feature signal that hurts prototype fabrication. Maps to DFMRow.geometrySignal. */
  geometrySignal: string;

  /**
   * Recommended change to improve prototype fabrication.
   * Maps to DFMRow.recommendedChange.
   */
  prototypeRecommendation: string;

  /**
   * What the engineer gains from making this change at prototype.
   * Maps to DFMRow.benefit — uses iteration language, not cost language.
   */
  iterationGain: string;

  /** Risk of making this change. Maps to DFMRow.risk. */
  risk: IterationRisk;
}

export const PROTOTYPE_DFM_FLAGS: PrototypeDFMFlag[] = [
  {
    partNumber: "430-002808",
    partName: "Housing",
    geometrySignal: "Deep internal pockets",
    prototypeRecommendation: "Increase pocket radii to reduce tool changes",
    iterationGain: "Faster machining, fewer setups",
    risk: "Low",
  },
  {
    partNumber: "430-002811",
    partName: "Output Hub",
    geometrySignal: "Small internal radii at torque features",
    prototypeRecommendation: "Increase corner radii at non-functional features",
    iterationGain: "Reduce tool changes and machining cycle time",
    risk: "Low",
  },
  {
    partNumber: "430-002810",
    partName: "Planet Carrier",
    geometrySignal: "Deep pocket milling + precision hole pattern in same setup",
    prototypeRecommendation: "Machine planet shaft holes in single fixture setup",
    iterationGain: "Eliminate datum shift risk; reduce inspection overhead",
    risk: "Medium",
  },
  {
    partNumber: "430-002839",
    partName: "Ring Gear – Output",
    geometrySignal: "Internal gear geometry requires specialist machine",
    prototypeRecommendation: "Qualify wire EDM as prototype alternative to gear cutting",
    iterationGain: "Cut lead time from 21 to 7–10 days; remove specialist supplier dependency",
    risk: "Medium",
  },
  {
    partNumber: "430-002809",
    partName: "Rotor Frame",
    geometrySignal: "Bore-to-bore concentricity across housing length requires dedicated setup",
    prototypeRecommendation: "Use mandrel boring fixture; machine both bores in single setup",
    iterationGain: "Eliminates re-chucking error; reduces CMM inspection overhead",
    risk: "Low",
  },
  {
    partNumber: "430-002836",
    partName: "Sun Gear",
    geometrySignal: "Hobbed gear tooth form requires specialist gear-cutting supplier",
    prototypeRecommendation: "Co-order sun gear and planet gears at same shop to reduce per-part overhead",
    iterationGain: "Batch ordering cuts per-gear lead time by 5–7 days",
    risk: "Low",
  },
  {
    partNumber: "430-002837",
    partName: "Planet Gear (×4)",
    geometrySignal: "×4 quantity — any gear defect requires full batch re-run",
    prototypeRecommendation: "Process all four in same heat treat batch; 100% inspection before accepting",
    iterationGain: "Prevents partial-set build failures and mid-build discovery of batch issues",
    risk: "Medium",
  },
  {
    partNumber: "430-002816",
    partName: "Planet Shaft (×4)",
    geometrySignal: "Needle bearing OD requires cylindrical grinding — separate supplier step",
    prototypeRecommendation: "Qualify CNC supplier with in-house grinding to eliminate hand-off",
    iterationGain: "Remove 3–5 day grinding hand-off from critical path; reduce risk of dimensional mismatch between shops",
    risk: "Low",
  },
  {
    partNumber: "430-002814",
    partName: "Bore Shaft",
    geometrySignal: "Journal runout tolerance requires grinding as separate op from turning",
    prototypeRecommendation: "Specify profile tolerance on drawing to allow single-supplier finish; or qualify CNC+grind shop",
    iterationGain: "Eliminates supplier hand-off; reduces lead time by 3–5 days",
    risk: "Low",
  },
];

// ─── Assembly-level prototype record ─────────────────────────────────────────
// No direct production equivalent — specific to prototype mode.
// Tracks the overall build readiness and iteration objectives for the assembly.

export interface BuildBlocker {
  /** Description of what is blocking or conditioning the build. */
  description: string;

  /** Which part or subsystem this blocker is associated with. */
  partNumber?: string;
  subsystem?: string;

  /** Whether this item must be resolved before build starts. */
  isHardBlocker: boolean;

  /** Recommended resolution action. */
  resolution: string;
}

export interface PrototypeAssemblyRecord {
  /** Matches assembly identifier (e.g. "845-000112"). */
  assemblyId: string;

  /** Name of the assembly. */
  assemblyName: string;

  /** Current build readiness status. */
  buildReadiness: BuildReadinessStatus;

  /**
   * Items that must be resolved (hard blockers) or should be resolved
   * (conditions) before build starts.
   */
  blockers: BuildBlocker[];

  /**
   * What this build iteration is intended to prove or answer.
   * These are the engineering questions the build must answer.
   */
  iterationObjectives: string[];

  /**
   * Part numbers on the critical path for build readiness.
   * Typically the parts with the longest lead times or highest functional risk.
   */
  criticalPathParts: string[];

  /** Estimated calendar days to build and do initial validation once all parts are in hand. */
  estimatedBuildDays: number;

  /** Open engineering questions that will remain after this build. */
  openQuestions: string[];

  /**
   * Target date for next build start (ISO 8601 date string, optional).
   * Used to drive "Clear to Build" timing in the prototype dashboard.
   */
  nextBuildTargetDate?: string;
}

export const PROTOTYPE_ASSEMBLY: PrototypeAssemblyRecord = {
  assemblyId: "845-000112",
  assemblyName: "RS320-02 Assembly",
  buildReadiness: "Conditional",
  blockers: [
    {
      description: "Ring gear (430-002839) lead time is 3–4 weeks; order must be placed before other parts are ready",
      partNumber: "430-002839",
      isHardBlocker: true,
      resolution: "Place gear cutting PO immediately; qualify wire EDM as parallel backup",
    },
    {
      description: "Planet carrier (430-002810) CMM inspection plan not yet confirmed with supplier",
      partNumber: "430-002810",
      isHardBlocker: false,
      resolution: "Confirm CMM capability with CNC supplier before releasing drawing",
    },
    {
      description: "Crossed roller bearing (410-000310) has 4–6 week distributor lead time",
      partNumber: "410-000310",
      isHardBlocker: true,
      resolution: "Pre-order bearing before drawings are finalized; confirm alternate supplier",
    },
  ],
  iterationObjectives: [
    "Validate gear mesh quality (backlash, contact pattern) under no-load and loaded conditions",
    "Confirm housing bearing bore positions hold assembly center distance",
    "Validate cable routing and strain relief at output port",
    "Measure system-level NVH at target RPM",
    "Assess output shaft runout after final assembly",
  ],
  criticalPathParts: ["430-002839", "410-000310", "430-002808"],
  estimatedBuildDays: 3,
  openQuestions: [
    "Will 7075-T6 on carrier and output provide adequate strength, or can we test 6061-T6 in parallel?",
    "What is the actual backlash target — does the current tolerance stack meet it?",
    "Is FDM ABS acceptable for cable grommet in the thermal environment near the motor?",
  ],
  nextBuildTargetDate: "2026-05-12",
};

// ─── Order-by date utility ────────────────────────────────────────────────────
// Computes the date by which a part must be ordered to arrive before the build
// target date, accounting for the part lead time and the build duration buffer.
//
//   orderByDate = nextBuildTargetDate − leadTimeDays − estimatedBuildDays
//
// Returns null if PROTOTYPE_ASSEMBLY has no nextBuildTargetDate.

export interface OrderByResult {
  orderByDate: Date;
  /** Positive = days remaining, 0 = order today, negative = overdue. */
  daysUntilDeadline: number;
  isOverdue: boolean;
}

export function computeOrderByDate(
  leadTimeDays: number,
  nextBuildTargetDate: string | null | undefined = PROTOTYPE_ASSEMBLY.nextBuildTargetDate,
  estimatedBuildDays: number = PROTOTYPE_ASSEMBLY.estimatedBuildDays,
): OrderByResult | null {
  if (!nextBuildTargetDate) return null;
  const target = new Date(nextBuildTargetDate);
  const orderByDate = new Date(
    target.getTime() -
      (leadTimeDays + estimatedBuildDays) * 86_400_000,
  );
  // Normalize both to midnight for day-level arithmetic
  orderByDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDeadline = Math.round(
    (orderByDate.getTime() - today.getTime()) / 86_400_000,
  );
  return { orderByDate, daysUntilDeadline, isOverdue: daysUntilDeadline < 0 };
}

// ─── Prototype summary ────────────────────────────────────────────────────────
// Aggregates the most critical prototype signals into a single derived object.
// Answers the 10-second engineering question: "What matters most right now?"
// All logic lives here; consumers receive a plain data object.

export interface PrototypeSummaryData {
  /** Assembly-level build readiness status. */
  buildReadiness: BuildReadinessStatus;

  /** Calendar days until nextBuildTargetDate (negative = past due). Null if not set. */
  daysToNextBuild: number | null;

  /** Number of hard blockers (isHardBlocker === true) in PROTOTYPE_ASSEMBLY.blockers. */
  hardBlockerCount: number;

  /** The hard blocker with the longest lead time — most urgent ordering action. */
  topBlocker: {
    description: string;
    partNumber?: string;
    resolution: string;
    /** Lead time in days from PROTOTYPE_PART_DATA, if the part has an entry. */
    leadTimeDays?: number;
  } | null;

  /** Rank-1 entry from PROTOTYPE_SIMPLIFICATIONS — biggest iteration speed win. */
  topSimplification: {
    partNumber: string;
    partName: string;
    simplificationPath: string;
    leadTimeSavingsDays: number;
    subsystem: string | null;
  } | null;

  /** Part with the highest functional risk level across all PROTOTYPE_PART_DATA entries. */
  topFunctionalRisk: {
    partNumber: string;
    /** Primary risk text (first item in primaryRisks). */
    primaryRisk: string;
    riskLevel: FunctionalRisk;
    /** Number of required validations — gives a sense of open work. */
    validationCount: number;
    clearToBuild: boolean;
  } | null;

  /** The first Block-severity manufacturingRiskSignal found — most critical scale risk. */
  topProductionRisk: {
    partNumber: string;
    signal: string;
    category: ManufacturingRiskSignal["category"];
    mitigation: string;
  } | null;
}

/** Risk-level to numeric score for sorting. Exported so consumers don't redefine it. */
export const FUNCTIONAL_RISK_RANK: Record<FunctionalRisk, number> = {
  Critical: 4,
  High:     3,
  Medium:   2,
  Low:      1,
};

/**
 * Derives the prototype summary from static data constants.
 * Pure function — safe to call inside a component.
 * Pass `targetDate` and `estimatedBuildDays` from BuildTargetContext to make results reactive.
 */
export function computePrototypeSummary(
  targetDate: string | null | undefined = PROTOTYPE_ASSEMBLY.nextBuildTargetDate,
  estimatedBuildDays: number = PROTOTYPE_ASSEMBLY.estimatedBuildDays,
): PrototypeSummaryData {
  // ── daysToNextBuild ─────────────────────────────────────────────────────────
  let daysToNextBuild: number | null = null;
  if (targetDate) {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysToNextBuild = Math.round(
      (target.getTime() - today.getTime()) / 86_400_000,
    );
  }
  void estimatedBuildDays; // available for future use in topBlocker lead time sort

  // ── topBlocker — hard blocker with longest known lead time ──────────────────
  const hardBlockers = PROTOTYPE_ASSEMBLY.blockers.filter((b) => b.isHardBlocker);
  const topBlockerRaw = [...hardBlockers].sort((a, b) => {
    const ltA = a.partNumber != null ? (PROTOTYPE_PART_DATA[a.partNumber]?.iterationProfile.leadTimeDays ?? 0) : 0;
    const ltB = b.partNumber != null ? (PROTOTYPE_PART_DATA[b.partNumber]?.iterationProfile.leadTimeDays ?? 0) : 0;
    return ltB - ltA;
  })[0] ?? null;

  const topBlocker: PrototypeSummaryData["topBlocker"] = topBlockerRaw
    ? {
        description: topBlockerRaw.description,
        partNumber:  topBlockerRaw.partNumber,
        resolution:  topBlockerRaw.resolution,
        leadTimeDays: topBlockerRaw.partNumber != null
          ? PROTOTYPE_PART_DATA[topBlockerRaw.partNumber]?.iterationProfile.leadTimeDays
          : undefined,
      }
    : null;

  // ── topSimplification — rank-1 simplification ───────────────────────────────
  const s0 = PROTOTYPE_SIMPLIFICATIONS[0] ?? null;
  const topSimplification: PrototypeSummaryData["topSimplification"] = s0
    ? {
        partNumber:          s0.partNumber,
        partName:            s0.partName,
        simplificationPath:  s0.simplificationPath,
        leadTimeSavingsDays: s0.leadTimeSavingsDays,
        subsystem:           s0.subsystem,
      }
    : null;

  // ── topFunctionalRisk — highest risk level, then most validation items ───────
  const topFRParts = getTopFunctionalRiskParts(1);
  const topFREntry = topFRParts[0] ?? null;

  const topFunctionalRisk: PrototypeSummaryData["topFunctionalRisk"] = topFREntry
    ? {
        partNumber:      topFREntry.partNumber,
        primaryRisk:     topFREntry.record.functionalRisk.primaryRisks[0] ?? "",
        riskLevel:       topFREntry.record.functionalRisk.riskLevel,
        validationCount: topFREntry.record.functionalRisk.validationRequired.length,
        clearToBuild:    topFREntry.record.functionalRisk.clearToBuild,
      }
    : null;

  // ── topProductionRisk — first Block-severity manufacturingRiskSignal ─────────
  let topPRSignal: (ManufacturingRiskSignal & { partNumber: string }) | null = null;
  for (const [pn, record] of Object.entries(PROTOTYPE_PART_DATA)) {
    if (topPRSignal) break;
    const block = record.manufacturingRiskSignals.find((sig) => sig.severity === "Block");
    if (block) topPRSignal = { ...block, partNumber: pn };
  }

  const topProductionRisk: PrototypeSummaryData["topProductionRisk"] = topPRSignal
    ? {
        partNumber: topPRSignal.partNumber,
        signal:     topPRSignal.signal,
        category:   topPRSignal.category,
        mitigation: topPRSignal.mitigation,
      }
    : null;

  return {
    buildReadiness:   PROTOTYPE_ASSEMBLY.buildReadiness,
    daysToNextBuild,
    hardBlockerCount: hardBlockers.length,
    topBlocker,
    topSimplification,
    topFunctionalRisk,
    topProductionRisk,
  };
}

// ─── Prototype helpers ────────────────────────────────────────────────────────
// Stable derived sets — computed once at module load so no consumer needs to
// re-derive them from raw PROTOTYPE_ASSEMBLY data.

/** Set of part numbers on the assembly critical path. Use instead of `new Set(PROTOTYPE_ASSEMBLY.criticalPathParts)`. */
export const CRITICAL_PATH_SET: ReadonlySet<string> = new Set(PROTOTYPE_ASSEMBLY.criticalPathParts);

/** Whether `partNumber` is on the assembly critical path. */
export function isOnCriticalPath(partNumber: string): boolean {
  return CRITICAL_PATH_SET.has(partNumber);
}

/** Lead time in days from PROTOTYPE_PART_DATA, or null if the part has no prototype record. */
export function getPartLeadTime(partNumber: string): number | null {
  return PROTOTYPE_PART_DATA[partNumber]?.iterationProfile.leadTimeDays ?? null;
}

/** Order-by deadline for a part by part number. Returns null if no build target date or no lead time data.
 * Pass `targetDate` and `buildDays` from BuildTargetContext to make results reactive.
 */
export function getPartOrderBy(partNumber: string, targetDate?: string | null, buildDays?: number): OrderByResult | null {
  const lt = getPartLeadTime(partNumber);
  return lt != null ? computeOrderByDate(lt, targetDate, buildDays) : null;
}

/** Whether a part's order deadline has already passed. */
export function isPartOverdue(partNumber: string, targetDate?: string | null, buildDays?: number): boolean {
  return getPartOrderBy(partNumber, targetDate, buildDays)?.isOverdue ?? false;
}

/** Part name from the canonical BOM. Falls back to `partNumber` if not found. */
export function getBomPartName(partNumber: string): string {
  return CANONICAL_BOM_845_000112.find((r) => r.partNumber === partNumber)?.name ?? partNumber;
}

// ─── Build checklist ──────────────────────────────────────────────────────────
// Business logic for the Pre-Build Checklist: groups all Make parts (plus
// hard-blocker Buy parts) into blocked / conditional / ready categories.
// Moved from BuildTimingSection.tsx so it can be reused and tested independently.

export interface ChecklistEntry {
  partNumber: string;
  /** Part name from the canonical BOM with "RS320 " prefix stripped. */
  name: string;
  subsystem: string;
  status: "blocked" | "conditional" | "ready";
  /** Number of functional validation steps required before build. */
  validationCount: number;
  clearToBuildNotes?: string;
  blocker?: BuildBlocker;
}

export interface BuildChecklistResult {
  blocked:     ChecklistEntry[];
  conditional: ChecklistEntry[];
  ready:       ChecklistEntry[];
}

/**
 * Aggregates clearToBuild status across all Make parts plus hard-blocker Buy parts.
 * Categorises each as "blocked" (hard blocker), "conditional" (soft blocker or
 * clearToBuildNotes set), or "ready".
 * Pure function — safe to call at module level.
 */
export function computeBuildChecklist(
  targetDate?: string | null,
  buildDays?: number,
): BuildChecklistResult {
  const hardBlockerMap = new Map<string, BuildBlocker>();
  const softBlockerMap = new Map<string, BuildBlocker>();
  for (const b of PROTOTYPE_ASSEMBLY.blockers) {
    if (!b.partNumber) continue;
    if (b.isHardBlocker) hardBlockerMap.set(b.partNumber, b);
    else softBlockerMap.set(b.partNumber, b);
  }

  // Make parts that have prototype data
  const makeParts = CANONICAL_BOM_845_000112.filter(
    (row) => row.makeBuy === "Make" && PROTOTYPE_PART_DATA[row.partNumber],
  );
  // Buy parts referenced as hard blockers (e.g. crossed roller bearing)
  const extraBuyParts = CANONICAL_BOM_845_000112.filter(
    (row) => row.makeBuy === "Buy" && hardBlockerMap.has(row.partNumber),
  );

  const entries: ChecklistEntry[] = [...makeParts, ...extraBuyParts].map((row) => {
    const pd = PROTOTYPE_PART_DATA[row.partNumber];
    const validationCount = pd?.functionalRisk.validationRequired.length ?? 0;
    const notes = pd?.functionalRisk.clearToBuildNotes;
    const name = row.name.replace(/^RS320 /i, "");

    // Compute order-by urgency to dynamically promote status
    const orderBy = getPartOrderBy(row.partNumber, targetDate, buildDays);
    const isOverdue = orderBy?.isOverdue ?? false;
    const daysLeft = orderBy?.daysUntilDeadline ?? null;
    const isUrgent = daysLeft != null && daysLeft <= 7 && !isOverdue;

    if (hardBlockerMap.has(row.partNumber) || isOverdue) {
      const blocker = hardBlockerMap.get(row.partNumber) ?? {
        description: isOverdue
          ? `Order deadline passed — ${Math.abs(daysLeft!)}d overdue`
          : "Ordering deadline has passed",
        resolution: "Order immediately to avoid build delay",
        isHardBlocker: true,
        partNumber: row.partNumber,
      };
      return { partNumber: row.partNumber, name, subsystem: row.subsystem, status: "blocked", validationCount, blocker };
    }
    if (softBlockerMap.has(row.partNumber) || notes || isUrgent) {
      const blocker = softBlockerMap.get(row.partNumber) ?? (isUrgent ? {
        description: `Must order within ${daysLeft}d`,
        resolution: "Order now to stay on schedule",
        isHardBlocker: false,
        partNumber: row.partNumber,
      } : undefined);
      return { partNumber: row.partNumber, name, subsystem: row.subsystem, status: "conditional", validationCount, clearToBuildNotes: notes, blocker };
    }
    return { partNumber: row.partNumber, name, subsystem: row.subsystem, status: "ready", validationCount };
  });

  return {
    blocked:     entries.filter((e) => e.status === "blocked"),
    conditional: entries.filter((e) => e.status === "conditional"),
    ready:       entries.filter((e) => e.status === "ready"),
  };
}

// ─── Functional risk helpers ──────────────────────────────────────────────────

/**
 * Returns the top `n` parts sorted by functional risk level descending.
 * Tie-break: more validationRequired items first.
 */
export function getTopFunctionalRiskParts(n: number = 3): Array<{ partNumber: string; record: PrototypePartRecord }> {
  return Object.entries(PROTOTYPE_PART_DATA)
    .sort((a, b) => {
      const d =
        (FUNCTIONAL_RISK_RANK[b[1].functionalRisk.riskLevel] ?? 0) -
        (FUNCTIONAL_RISK_RANK[a[1].functionalRisk.riskLevel] ?? 0);
      if (d !== 0) return d;
      return b[1].functionalRisk.validationRequired.length - a[1].functionalRisk.validationRequired.length;
    })
    .slice(0, n)
    .map(([partNumber, record]) => ({ partNumber, record }));
}

// ─── Production risk signal aggregation ──────────────────────────────────────

export interface ProductionRiskSignalRow extends ManufacturingRiskSignal {
  partNumber: string;
  /** Part name from the canonical BOM. Falls back to partNumber if not found. */
  partName: string;
}

/**
 * Aggregates all manufacturingRiskSignals across PROTOTYPE_PART_DATA.
 * Returns a flat array sorted Block → Flag → Watch.
 */
export function getAllProductionRiskSignals(): ProductionRiskSignalRow[] {
  const SEV_ORDER = { Block: 0, Flag: 1, Watch: 2 } as const;
  const rows: ProductionRiskSignalRow[] = [];
  for (const [pn, record] of Object.entries(PROTOTYPE_PART_DATA)) {
    const partName = getBomPartName(pn);
    for (const sig of record.manufacturingRiskSignals) {
      rows.push({ ...sig, partNumber: pn, partName });
    }
  }
  return rows.sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3));
}
