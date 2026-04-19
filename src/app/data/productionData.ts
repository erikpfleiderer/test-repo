// ─── PRODUCTION MODE — Canonical Page Data ────────────────────────────────────
//
// This file centralizes all production-mode page data that is currently defined
// locally inside individual component files. It is the production-side parallel
// to prototypeData.ts.
//
// Sources (current home → exported name here):
//   SubsystemAnalysis.tsx  SUBSYSTEMS[]         → PRODUCTION_SUBSYSTEMS
//   CostInterventions.tsx  INTERVENTIONS[]      → PRODUCTION_INTERVENTIONS
//   DFMOpportunities.tsx   DFM_DATA[]           → PRODUCTION_DFM_DATA
//   PartAnalysis.tsx       PART_DATA            → PRODUCTION_PART_DETAILS
//   BOMAnalysis.tsx        ENGINEERING_NOTES    → PRODUCTION_ENGINEERING_NOTES
//
// MIGRATION GUIDE FOR COMPONENTS:
//   1. Import the type and constant you need from this file.
//   2. Remove the local definition from the component.
//   3. Update any local type references (e.g. `Subsystem` → `ProductionSubsystem`).
//
// Until a component is migrated, both the local and exported versions coexist
// — this file is additive and does not modify any existing imports.
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── Shared rating types ──────────────────────────────────────────────────────
// | null reflects the current component convention (some fields may be unknown).

export type ProductionRating = "Low" | "Medium" | "High" | null;

// ─── Subsystem ────────────────────────────────────────────────────────────────
// Mirrors the local `Subsystem` interface in SubsystemAnalysis.tsx.

export interface ProductionSubsystem {
  /** Stable machine-readable id — matches PrototypeSubsystem.id for cross-mode lookup. */
  id: string;

  /** Display name — matches CANONICAL_BOM_845_000112 subsystem field values. */
  name: string;

  /**
   * Relative cost contribution weight (1–10).
   * Parallel to PrototypeSubsystem.complexityScore — same scale, different meaning.
   */
  costWeight: number;

  /**
   * What drives cost in this subsystem.
   * Parallel to PrototypeSubsystem.complexitySignals.
   */
  primaryDrivers: string[];

  /**
   * Recommended cost-reduction intervention path.
   * Parallel to PrototypeSubsystem.simplificationTarget.
   */
  recommendedLever: string;

  /** Accent color for subsystem display theming (hex string). */
  accentColor: string;

  /** Parts identified in this subsystem — used for quick display in cards. */
  knownParts: { number: string; name: string }[];

  /** Optional context note shown in the subsystem card. */
  note?: string;
}

export const PRODUCTION_SUBSYSTEMS: ProductionSubsystem[] = [
  {
    id: "housing-structure",
    name: "Housing / Structure",
    costWeight: 10,
    primaryDrivers: [
      "Multi-setup CNC machining (datums + deep pockets)",
      "Bearing/locating bore finishing + CMM time",
      "High material removal from billet",
    ],
    recommendedLever:
      "Near-net shaping (casting/forging) + finish machining only on datums/bores",
    accentColor: "#1B3A5C",
    knownParts: [
      { number: "430-002808", name: "RS320 Housing" },
      { number: "430-002809", name: "RS320 Rotor Frame" },
      { number: "430-002810", name: "RS320 Carrier" },
      { number: "430-002811", name: "RS320 Output" },
      { number: "430-002916", name: "RS320 Axon Cap" },
    ],
  },
  {
    id: "geartrain",
    name: "Geartrain",
    costWeight: 8,
    primaryDrivers: [
      "Internal gear cutting (ring gears) and tooth finishing",
      "Heat treatment + distortion management",
      "Inspection (runout / backlash / contact pattern)",
    ],
    recommendedLever:
      "Powder metal or near-net gear manufacturing + targeted finishing/grind where needed",
    accentColor: "#2B6CB0",
    knownParts: [
      { number: "430-002836", name: "RS320 Sun Gear" },
      { number: "430-002837", name: "RS320 Planet Gear" },
      { number: "430-002838", name: "RS320 Ring Gear – Static" },
      { number: "430-002839", name: "RS320 Ring Gear – Output" },
    ],
  },
  {
    id: "cable-management",
    name: "Cable Management",
    costWeight: 6,
    primaryDrivers: [
      "3D printing unit cost + slow throughput",
      "Post-processing + iteration / fit changes",
      "Multiple variants driving overhead",
    ],
    recommendedLever:
      "Injection molding at volume + DFM updates (draft, ribs, wall thickness)",
    accentColor: "#0891B2",
    knownParts: [
      { number: "432-001479", name: "RS320 Cable Cover" },
      { number: "432-001480", name: "RS320 Cable Grip – Input" },
      { number: "432-001482", name: "RS320 Cable Relief Mount" },
      { number: "432-001483", name: "RS320 Cable Relief Clamp" },
      { number: "432-001540", name: "RS320 Output Grommet" },
    ],
  },
  {
    id: "retention",
    name: "Retention",
    costWeight: 4,
    primaryDrivers: [
      "Machining cost + deburr + finishing",
      "Flatness and hole position requirements",
      "Small-batch inefficiency",
    ],
    recommendedLever:
      "Stamping/formed sheet at volume, reduce secondary ops, simplify hole pattern where possible",
    accentColor: "#7C3AED",
    knownParts: [
      { number: "430-002812", name: "RS320 Output Clamp – Outer" },
      { number: "430-002813", name: "RS320 Output Clamp – Inner" },
    ],
  },
  {
    id: "shafting",
    name: "Shafting",
    costWeight: 4,
    primaryDrivers: [
      "Turning/grinding time",
      "Tight runout/journal tolerances",
      "Heat treat (if required) + inspection",
    ],
    recommendedLever:
      "Optimize blank + minimize precision surfaces; relax non-critical runout; standardize diameters",
    accentColor: "#059669",
    knownParts: [
      { number: "430-002814", name: "RS320 Bore Shaft" },
      { number: "430-002816", name: "RS320 Planet Shaft" },
      { number: "430-002817", name: "RS320 Planet Sleeve" },
    ],
  },
  {
    id: "purchased-ots",
    name: "Purchased / OTS",
    costWeight: 3,
    primaryDrivers: [
      "Supplier unit price, MOQ, lead time",
      "Variant count across bearings, fasteners, adhesives",
    ],
    recommendedLever:
      "Consolidate fastener variants; qualify alternate suppliers for bearings; reduce adhesive SKU count",
    accentColor: "#64748B",
    knownParts: [
      { number: "405-000001", name: "Loctite 222" },
      { number: "405-000002", name: "Loctite 243" },
      { number: "405-000008", name: "Loctite 648" },
      { number: "410-000303", name: "Needle Roller Bearing 1/4\" ID" },
      { number: "410-000310", name: "Crossed Roller Bearing 60mm ID" },
      { number: "410-000311", name: "Bearing 6207" },
      { number: "410-000313", name: "Flanged Bearing 6704ZZ" },
      { number: "410-000314", name: "Bearing R3" },
      { number: "410-000315", name: "Needle Roller Bearing 3/8\" ID" },
      { number: "410-000316", name: "Needle Roller Bearing 14mm ID" },
      { number: "410-000323", name: "Bearing 6705" },
      { number: "420-000003", name: "1.5×6 Pin 52100" },
      { number: "420-0000015", name: "2×6 Pin 52100" },
      { number: "420-000024", name: "2.5×6 Pin 52100" },
      { number: "438-000008", name: "Grease, Klubersynth GE 46-1200" },
      { number: "443-000021", name: "Magnet Ring 65mm OD" },
      { number: "443-000022", name: "Magnet Ring 45mm OD" },
      { number: "445-000499", name: "Spacer M2.5" },
      { number: "447-000120", name: "TBM2G-07608C-ANSA-10 Motor" },
      { number: "460-000001", name: "Light Pipe 2mm" },
      { number: "470-000084", name: "Retaining Ring 20mm" },
      { number: "470-000085", name: "Retaining Ring 17mm" },
      { number: "470-000086", name: "Retaining Ring 1/2\" Internal" },
      { number: "472-000059", name: "M2×0.4×4 FH Torx" },
      { number: "472-000089", name: "M3×0.5×6 FH Torx ZPS" },
      { number: "472-000121", name: "M2×0.4×6 BH Torx" },
      { number: "472-000131", name: "M2.5×0.45×5 BH Torx" },
      { number: "472-000132", name: "M2.5×0.45×6 BH Torx" },
      { number: "472-001813", name: "Screw M2.5×0.45×14 BH Torx" },
      { number: "481-000005", name: "Thermal Paste 607" },
      { number: "481-000008", name: "Thermal Epoxy TC-2810" },
      { number: "482-000005", name: "Heat Set Insert M2" },
      { number: "820-000122", name: "Axon 7 Medium" },
    ],
  },
];

// ─── Intervention ─────────────────────────────────────────────────────────────
// Mirrors the local `Intervention` interface in CostInterventions.tsx.
// The production parallel of PrototypeSimplification in prototypeData.ts.

export interface ProductionIntervention {
  rank: number;

  /** Must exist in CANONICAL_BOM_845_000112. */
  partNumber: string;
  partName: string;

  /** Matches a ProductionSubsystem.name value, or null. */
  subsystem: string | null;

  currentMaterial: string | null;
  currentManufacturing: string | null;
  primaryCostDriver: string | null;

  /**
   * Recommended cost-reduction manufacturing change.
   * Parallel to PrototypeSimplification.simplificationPath.
   */
  recommendedIntervention: string;

  /**
   * Human-readable savings range (e.g. "70–80%").
   * Parallel to PrototypeSimplification.iterationImpact.
   */
  estimatedSavings: string;

  /** Numeric lower bound for savings percentage — used for bar chart width. */
  savingsMin: number;

  /** Numeric upper bound for savings percentage. */
  savingsMax: number;

  engineeringDifficulty: ProductionRating;
  riskLevel: ProductionRating;
  confidenceLevel: ProductionRating;
}

export const PRODUCTION_INTERVENTIONS: ProductionIntervention[] = [
  {
    rank: 1,
    partNumber: "430-002839",
    partName: "RS320 Ring Gear – Output",
    subsystem: "Geartrain",
    currentMaterial: "Steel 4340",
    currentManufacturing: "CNC machining",
    primaryCostDriver: "Internal gear cutting · heat treat distortion · CMM inspection",
    recommendedIntervention: "Powder metal",
    estimatedSavings: "70–80%",
    savingsMin: 70,
    savingsMax: 80,
    engineeringDifficulty: "Medium",
    riskLevel: "Medium",
    confidenceLevel: "High",
  },
  {
    rank: 2,
    partNumber: "430-002808",
    partName: "RS320 Housing",
    subsystem: "Housing / Structure",
    currentMaterial: "Aluminum 6061-T6",
    currentManufacturing: "CNC machining",
    primaryCostDriver: "High material removal · multiple setups · bearing bore finishing",
    recommendedIntervention: "Die casting",
    estimatedSavings: "45%",
    savingsMin: 45,
    savingsMax: 45,
    engineeringDifficulty: "Medium",
    riskLevel: "Low",
    confidenceLevel: "High",
  },
  {
    rank: 3,
    partNumber: "430-002811",
    partName: "RS320 Output",
    subsystem: "Housing / Structure",
    currentMaterial: "Aluminum 7075-T6",
    currentManufacturing: "CNC machining",
    primaryCostDriver: "Complex geometry · 7075 material premium",
    recommendedIntervention: "Material substitution (7075 → 6061)",
    estimatedSavings: "25%",
    savingsMin: 25,
    savingsMax: 25,
    engineeringDifficulty: "Low",
    riskLevel: "Low",
    confidenceLevel: "Medium",
  },
  {
    rank: 4,
    partNumber: "432-001540",
    partName: "RS320 Output Grommet",
    subsystem: "Cable Management",
    currentMaterial: "ABS",
    currentManufacturing: "3D printed - FDM",
    primaryCostDriver: "3D print unit cost · Slow throughput · Post-processing",
    recommendedIntervention: "Injection molded plastic",
    estimatedSavings: "90%",
    savingsMin: 90,
    savingsMax: 90,
    engineeringDifficulty: "Low",
    riskLevel: "Low",
    confidenceLevel: "High",
  },
  {
    rank: 5,
    partNumber: "430-002810",
    partName: "RS320 Carrier",
    subsystem: "Housing / Structure",
    currentMaterial: "Aluminum 7075-T6",
    currentManufacturing: "CNC machining",
    primaryCostDriver: "Pocket milling · precision hole pattern · multi-axis setup",
    recommendedIntervention: "Forged blank + finish machining",
    estimatedSavings: "35%",
    savingsMin: 35,
    savingsMax: 35,
    engineeringDifficulty: "Medium",
    riskLevel: "Medium",
    confidenceLevel: "Medium",
  },
];

// ─── DFM row ──────────────────────────────────────────────────────────────────
// Mirrors the local `DFMRow` interface in DFMOpportunities.tsx.
// The production parallel of PrototypeDFMFlag in prototypeData.ts.

export interface ProductionDFMRow {
  /** Must exist in CANONICAL_BOM_845_000112. */
  partNumber: string;

  /** Short display name — may differ from canonical full name. */
  partName: string;

  /** What geometry or feature creates the DFM issue. */
  geometrySignal: string;

  /**
   * Recommended manufacturing change to address the signal.
   * Parallel to PrototypeDFMFlag.prototypeRecommendation.
   */
  recommendedChange: string;

  /**
   * Benefit of making the change at production volume.
   * Parallel to PrototypeDFMFlag.iterationGain.
   */
  benefit: string;

  risk: "Low" | "Medium" | "High";
}

export const PRODUCTION_DFM_DATA: ProductionDFMRow[] = [
  {
    partNumber: "430-002808",
    partName: "Housing",
    geometrySignal: "Deep internal pockets",
    recommendedChange: "Increase pocket radii",
    benefit: "Reduce machining time",
    risk: "Low",
  },
  {
    partNumber: "430-002811",
    partName: "Output Hub",
    geometrySignal: "Small internal radii",
    recommendedChange: "Increase corner radii",
    benefit: "Reduce tool changes",
    risk: "Low",
  },
  {
    partNumber: "430-002810",
    partName: "Planet Carrier",
    geometrySignal: "Deep pocket milling",
    recommendedChange: "Reduce pocket depth",
    benefit: "Improve machinability",
    risk: "Medium",
  },
  {
    partNumber: "430-002839",
    partName: "Ring Gear",
    geometrySignal: "Internal gear geometry",
    recommendedChange: "Powder metal manufacturing",
    benefit: "Remove gear cutting",
    risk: "Medium",
  },
];

// ─── Part detail ──────────────────────────────────────────────────────────────
// Mirrors the local `PartDetail` interface in PartAnalysis.tsx.
// Full engineering deep-dive per part — shown in the Part Analysis detail view.

export interface ProductionPartManufacturing {
  material: string | null;
  materialNote?: string;
  process: string | null;
  /** 0–100 score; null if not assessed. */
  geometryComplexityScore: number | null;
}

export interface ProductionPartDetail {
  /** Must exist in CANONICAL_BOM_845_000112. */
  partNumber: string;
  partName: string;
  subsystem: string | null;
  designIntent: string | null;

  currentManufacturing: ProductionPartManufacturing;

  /**
   * What drives this part's cost at production volume.
   * Parallel to PrototypePartRecord.dfm.geometryIssues in prototype.
   */
  costDrivers: string[];

  /**
   * Recommended production manufacturing intervention.
   * Parallel to PrototypePartRecord.prototypeProcess.recommendedProcess.
   */
  recommendedIntervention: string;

  /**
   * Drawing or design changes required to enable the intervention.
   * Parallel to PrototypePartRecord.specGuidance.
   */
  requiredDesignChanges: string[];

  /** Impact of the intervention on downstream assembly. */
  assemblyImpact: string | null;

  /** Human-readable savings estimate string. */
  estimatedSavings: string;

  /**
   * Numeric savings midpoint (0–100).
   * Used for visual indicators in the UI.
   */
  savingsValue: number;

  /**
   * Validation steps required before the intervention is production-ready.
   * Parallel to PrototypePartRecord.functionalRisk.validationRequired.
   */
  validationRequired: string[];

  engineeringDifficulty: ProductionRating;
  riskLevel: ProductionRating;
  confidenceLevel: ProductionRating;
}

export const PRODUCTION_PART_DETAILS: Record<string, ProductionPartDetail> = {
  "430-002808": {
    partNumber: "430-002808",
    partName: "RS320 Housing",
    subsystem: "Housing / Structure",
    designIntent:
      "Structural housing aligning bearings and maintaining gear center distance.",
    currentManufacturing: {
      material: "Aluminum 6061-T6",
      process: "CNC billet machining",
      geometryComplexityScore: 78,
    },
    costDrivers: [
      "Deep pocket machining",
      "Multiple setups",
      "High material removal",
    ],
    recommendedIntervention: "Die casting",
    requiredDesignChanges: [
      "Add draft (1–3°) to die-pulled surfaces to enable die release",
      "Increase internal fillets and root radii to improve metal flow and reduce stress concentrations",
      "Normalize wall thickness to eliminate heavy sections and abrupt thickness transitions",
      "Define secondary machining datums and tolerances for critical features such as bore and mounting faces",
    ],
    assemblyImpact:
      "Assembly sequence likely stays the same, but may require more finish machining on CTQ features and updated fit/shim strategy if cast variation changes housing-to-internal component alignment.",
    estimatedSavings: "45%",
    savingsValue: 45,
    validationRequired: [
      "Bearing bore position and concentricity validation after machining (CMM inspection)",
      "Gear backlash test",
      "Housing stiffness / deflection validation under bearing and gear loads",
    ],
    engineeringDifficulty: "Medium",
    riskLevel: "Low",
    confidenceLevel: "High",
  },
  "430-002839": {
    partNumber: "430-002839",
    partName: "RS320 Ring Gear – Output",
    subsystem: "Geartrain",
    designIntent:
      "Internal ring gear for planetary reduction; preserves tooth geometry/backlash for NVH and life. Primary torque path component.",
    currentManufacturing: {
      material: "Steel 4340",
      process: "Gear cutting",
      geometryComplexityScore: 95,
    },
    costDrivers: [
      "Internal gear cutting",
      "Heat treatment + distortion management",
      "Inspection (runout/backlash/contact pattern)",
    ],
    recommendedIntervention: "Powder metal",
    requiredDesignChanges: [
      "Confirm tooth form feasibility for PM (module/DP, root fillet, tip relief allowances)",
      "Add/adjust stock allowance if selective finishing is required",
      "Define datum strategy for post-sinter finishing and inspection",
      "Update drawing tolerances: keep gear tooth tolerances tight, relax non-mating faces",
    ],
    assemblyImpact:
      "Must maintain backlash/contact pattern. No assembly sequence change, but may require updated shim/selection strategy if distortion differs.",
    estimatedSavings: "70–80%",
    savingsValue: 75,
    validationRequired: [
      "Contact pattern and backlash measurement across tolerance stack",
      "NVH / acoustic test under load",
      "Endurance life testing + wear inspection",
      "Dimensional stability after heat treat / sinter (as applicable)",
    ],
    engineeringDifficulty: "Medium",
    riskLevel: "Medium",
    confidenceLevel: "High",
  },
  "430-002811": {
    partNumber: "430-002811",
    partName: "RS320 Output",
    subsystem: "Housing / Structure",
    designIntent: "Output transmitting torque to external shaft.",
    currentManufacturing: {
      material: "Aluminum 7075-T6",
      process: "CNC machining",
      geometryComplexityScore: 73,
    },
    costDrivers: ["Complex geometry", "Material cost", "Machining time"],
    recommendedIntervention: "Material substitution (7075 → 6061)",
    requiredDesignChanges: [
      "If material change 7075→6061: increase fillet radii at stress risers, verify minimum wall thickness at torque features",
      "Localize tight tolerances to bearing fits and mating datums only",
      "Remove non-functional chamfers/edge breaks where possible",
    ],
    assemblyImpact:
      "No change to assembly sequence if interfaces unchanged. Verify runout/bearing fit and torque interface remains within spec.",
    estimatedSavings: "25%",
    savingsValue: 25,
    validationRequired: [
      "FEA (torque + bearing loads) comparing 7075 vs 6061",
      "Runout measurement at bearing journals",
      "Torque-to-yield / slip test at torque interface",
    ],
    engineeringDifficulty: "Low",
    riskLevel: "Low",
    confidenceLevel: "Medium",
  },
  "432-001540": {
    partNumber: "432-001540",
    partName: "RS320 Output Grommet",
    subsystem: "Cable Management",
    designIntent:
      "Cable routing and strain relief; prevents abrasion and maintains bend radius through housing pass-through.",
    currentManufacturing: {
      material: "ABS",
      materialNote:
        "Candidate materials at volume: PA6/PA66, TPE overmold, or glass-filled nylon depending on stiffness and environmental needs.",
      process: "3D printed (FDM)",
      geometryComplexityScore: null,
    },
    costDrivers: [
      "3D print unit cost",
      "Slow throughput",
      "Post-processing/fit iteration",
    ],
    recommendedIntervention: "Injection molded plastic",
    requiredDesignChanges: [
      "Add 1–3° draft on all pull faces",
      "Target 2–3 mm nominal wall thickness with ribs instead of thick walls",
      "Add fillets at rib roots, avoid sharp internal corners",
      "Define parting line + gating location away from sealing/critical surfaces",
      "Add consistent snap/fastener features if currently relying on friction fit",
    ],
    assemblyImpact:
      "Should be drop-in if envelope and attachment preserved. May improve consistency; verify cable routing clearance and insertion force.",
    estimatedSavings: "90%",
    savingsValue: 90,
    validationRequired: [
      "Cable pull/strain relief test",
      "Thermal/UV/environmental conditioning (if outdoor)",
      "Fit check with housing + harness",
    ],
    engineeringDifficulty: "Low",
    riskLevel: "Low",
    confidenceLevel: "High",
  },
  "430-002810": {
    partNumber: "430-002810",
    partName: "RS320 Carrier",
    subsystem: "Housing / Structure",
    designIntent: "Planet carrier transmitting torque between gears.",
    currentManufacturing: {
      material: "Aluminum 7075-T6",
      process: "CNC machining",
      geometryComplexityScore: 34,
    },
    costDrivers: ["Pocket milling", "Precision hole pattern", "Multi-axis setup"],
    recommendedIntervention: "Forged blank",
    requiredDesignChanges: [],
    assemblyImpact: null,
    estimatedSavings: "35%",
    savingsValue: 35,
    validationRequired: [],
    engineeringDifficulty: "Medium",
    riskLevel: "Medium",
    confidenceLevel: "Medium",
  },
  "430-002837": {
    partNumber: "430-002837",
    partName: "RS320 Planet Gear",
    subsystem: "Geartrain",
    designIntent:
      "Planet gear transmitting torque between sun and ring gear in the planetary reduction stage; tooth form and runout are critical for backlash, NVH, and service life.",
    currentManufacturing: {
      material: "Steel 4340",
      process: "Gear cutting + heat treat + inspection",
      geometryComplexityScore: 82,
    },
    costDrivers: [
      "Gear cutting",
      "Heat treatment + distortion management",
      "Inspection (runout/backlash/contact pattern)",
    ],
    recommendedIntervention:
      "Investment casting / near-net gears (if volume supports) or optimised heat treat/finishing strategy",
    requiredDesignChanges: [
      "Confirm tooth form feasibility for IC (module/DP, root fillet, tip relief allowances)",
      "Add stock allowance if selective tooth finishing is required post heat treat",
      "Define datum strategy for post heat treat finishing and inspection",
      "Update drawing tolerances: keep gear tolerances tight, relax non-mating faces",
    ],
    assemblyImpact:
      "Must maintain backlash/contact pattern across tolerance stack. No assembly sequence change anticipated; verify mesh geometry with ring gear if process changes.",
    estimatedSavings: "50–65%",
    savingsValue: 57,
    validationRequired: [
      "Contact pattern and backlash measurement across tolerance stack",
      "NVH / acoustic test under load",
      "Endurance life testing + wear inspection",
      "Dimensional stability after heat treat (as applicable)",
    ],
    engineeringDifficulty: "Medium",
    riskLevel: "Medium",
    confidenceLevel: "Medium",
  },
  "430-002836": {
    partNumber: "430-002836",
    partName: "RS320 Sun Gear",
    subsystem: "Geartrain",
    designIntent:
      "Sun gear driving the planetary gear set; as the input element, tooth geometry, runout, and case hardness depth directly impact system efficiency and NVH.",
    currentManufacturing: {
      material: "Steel 4340",
      process: "Gear cutting + heat treat + inspection",
      geometryComplexityScore: 74,
    },
    costDrivers: [
      "Gear cutting",
      "Heat treatment + distortion management",
      "Inspection (runout/contact pattern)",
    ],
    recommendedIntervention:
      "Investment casting / near-net gears (if volume supports) or optimised heat treat/finishing strategy",
    requiredDesignChanges: [
      "Confirm tooth form feasibility for IC (module/DP, root fillet, tip relief allowances)",
      "Add stock allowance if selective tooth finishing is required post heat treat",
      "Define datum strategy for post heat treat finishing and inspection",
      "Update drawing tolerances: keep gear tolerances tight, relax non-mating faces",
    ],
    assemblyImpact:
      "Must maintain backlash/contact pattern. Mesh geometry must be re-verified if process changes; no assembly sequence change anticipated.",
    estimatedSavings: "40–55%",
    savingsValue: 47,
    validationRequired: [
      "Contact pattern and backlash measurement across tolerance stack",
      "NVH / acoustic test under load",
      "Endurance life testing + wear inspection",
      "Dimensional stability after heat treat (as applicable)",
    ],
    engineeringDifficulty: "Medium",
    riskLevel: "Medium",
    confidenceLevel: "Medium",
  },
};

// ─── Engineering notes (BOM Analysis) ────────────────────────────────────────
// Mirrors the local `EngineeringNote` interface in BOMAnalysis.tsx.
// Provides material, process, design intent, and cost driver context for
// every Make part — shown in the BOM Analysis detail panel.

export interface EngineeringNote {
  material: string;
  manufacturingProcess: string;
  designIntent: string;
  /** Primary cost drivers for this part at production volume. */
  costDrivers: string[];
}

export const PRODUCTION_ENGINEERING_NOTES: Record<string, EngineeringNote> = {
  "430-002808": { material: "Aluminum 6061-T6",  manufacturingProcess: "CNC billet machining (candidate for casting/forging)",      designIntent: "Structural housing aligning bearings and maintaining gear center distance.",          costDrivers: ["Deep pocket machining", "Multiple CNC setups", "High material removal"] },
  "430-002809": { material: "Aluminum 6061-T6",  manufacturingProcess: "CNC billet machining (candidate for casting/forging)",      designIntent: "Rotor frame; maintains concentricity with gear housing.",                            costDrivers: ["CNC billet machining", "Multiple setups", "Bore concentricity requirements"] },
  "430-002810": { material: "Aluminum 7075-T6",  manufacturingProcess: "CNC billet machining (candidate for casting/forging)",      designIntent: "Planet carrier transmitting torque between gears.",                                  costDrivers: ["Pocket milling", "Precision hole pattern", "Multi-axis setup"] },
  "430-002811": { material: "Aluminum 7075-T6",  manufacturingProcess: "CNC billet machining (candidate for casting/forging)",      designIntent: "Output transmitting torque to external shaft.",                                      costDrivers: ["Complex geometry", "7075 material premium", "Machining time"] },
  "430-002812": { material: "Stainless Steel 304", manufacturingProcess: "CNC machined",                                           designIntent: "Outer clamp half securing output shaft interface.",                                  costDrivers: ["Machining", "Flatness requirement", "Small-batch inefficiency"] },
  "430-002813": { material: "Stainless Steel 304", manufacturingProcess: "Sheet metal laser cut",                                  designIntent: "Inner clamp half for output shaft.",                                                 costDrivers: ["Laser cut + deburr", "Hole position tolerance", "Small-batch inefficiency"] },
  "430-002814": { material: "Steel 4140",         manufacturingProcess: "Turned shaft + grinding",                                 designIntent: "Central bore shaft providing axial reference for gear stack.",                         costDrivers: ["Runout tolerance", "Surface finish requirement", "Grinding"] },
  "430-002816": { material: "Steel 4140",         manufacturingProcess: "Turned shaft + grinding",                                 designIntent: "Planet shaft supporting planet gear rotation; precision diameter for needle bearing.", costDrivers: ["Needle bearing diameter tolerance", "Surface finish", "Heat treat"] },
  "430-002817": { material: "Steel 4140",         manufacturingProcess: "Turned sleeve",                                           designIntent: "Planet sleeve providing bearing running surface on planet shaft.",                     costDrivers: ["OD/ID tolerance", "Surface finish"] },
  "430-002836": { material: "Steel 4340",         manufacturingProcess: "Gear cutting + heat treat + inspection",                  designIntent: "Sun gear driving planetary gear system.",                                             costDrivers: ["Gear machining", "Heat treatment", "CMM inspection"] },
  "430-002837": { material: "Steel 4340",         manufacturingProcess: "Gear cutting + heat treat + inspection",                  designIntent: "Planet gear transmitting torque between sun and ring gear.",                          costDrivers: ["Gear cutting", "Heat treatment", "×4 quantity"] },
  "430-002838": { material: "Steel 4340",         manufacturingProcess: "Gear cutting + heat treat + inspection",                  designIntent: "Static ring gear fixed to housing; reacts against planet gear rotation.",               costDrivers: ["Internal gear cutting", "Inspection", "Heat treatment"] },
  "430-002839": { material: "Steel 4340",         manufacturingProcess: "Gear cutting + heat treat + inspection",                  designIntent: "Output ring gear transmitting torque in planetary gearbox.",                          costDrivers: ["Internal gear cutting", "Inspection", "Heat treatment"] },
  "430-002916": { material: "Aluminum 6061-T6",  manufacturingProcess: "CNC billet machining",                                    designIntent: "Cap for Axon motor interface; sealing and cable management.",                         costDrivers: ["Machining", "Sealing interface"] },
  "432-001479": { material: "ABS / Nylon",        manufacturingProcess: "3D printed (candidate for injection molding)",            designIntent: "Cable cover protecting cable routing at assembly exit.",                             costDrivers: ["3D print unit cost", "Post-processing"] },
  "432-001480": { material: "ABS / Nylon",        manufacturingProcess: "3D printed (candidate for injection molding)",            designIntent: "Cable grip at input connector; strain relief and routing.",                          costDrivers: ["3D print unit cost", "Fit iteration"] },
  "432-001482": { material: "ABS / Nylon",        manufacturingProcess: "3D printed (candidate for injection molding)",            designIntent: "Cable relief mount; mounts strain relief clamp to housing.",                         costDrivers: ["3D print unit cost", "Post-processing"] },
  "432-001483": { material: "ABS / Nylon",        manufacturingProcess: "3D printed (candidate for injection molding)",            designIntent: "Cable relief clamp; secures cable bundle at exit.",                                 costDrivers: ["3D print unit cost", "Post-processing"] },
  "432-001540": { material: "ABS",                manufacturingProcess: "3D printed (candidate for injection molding)",            designIntent: "Output grommet; cable routing/strain relief at output port.",                        costDrivers: ["3D print unit cost", "Low throughput", "Post-processing / fit iteration"] },
};
