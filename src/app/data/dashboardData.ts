// ─── DASHBOARD DATA CONTRACT ──────────────────────────────────────────────────
//
// This file is the single top-level data contract for the Compass dashboard.
// It defines:
//   - AssemblySummary  — shared identity/BOM metadata for both modes
//   - ProductionDashboardData — production mode branch
//   - PrototypeDashboardData  — prototype mode branch
//   - DashboardData           — discriminated union (mode-selectable)
//   - useDashboardData()      — React hook that returns the correct branch
//
// ── How to consume in a component ────────────────────────────────────────────
//
//   const data = useDashboardData();
//
//   if (data.mode === "production") {
//     // TypeScript narrows to ProductionDashboardData
//     data.interventions   // ProductionIntervention[]
//     data.dfmFlags        // ProductionDFMRow[]
//     data.partDetails     // Record<string, ProductionPartDetail>
//   } else {
//     // TypeScript narrows to PrototypeDashboardData
//     data.simplifications // PrototypeSimplification[]
//     data.dfmFlags        // PrototypeDFMFlag[]
//     data.partDetails     // Record<string, PrototypePartRecord>
//   }
//
//   // These are always safe on either branch:
//   data.assembly          // AssemblySummary
//   data.subsystems        // ProductionSubsystem[] | PrototypeSubsystem[]
//
// ── Files in the data layer ───────────────────────────────────────────────────
//
//   canonicalBom.ts    — Part identity (partNumber, name, qty, subsystem, makeBuy)
//   costData.ts        — Production unit costs, intervention cost models, rollup utils
//   productionData.ts  — Production page data (subsystems, interventions, DFM, parts)
//   prototypeData.ts   — Prototype page data (subsystems, simplifications, DFM, parts)
//   dashboardData.ts   — THIS FILE — unified contract + useDashboardData() hook
//
// ─────────────────────────────────────────────────────────────────────────────

import { useAppMode } from "../context/AppModeContext";
import {
  CANONICAL_BOM_845_000112,
  MAKE_PARTS,
  OTS_PARTS,
} from "./canonicalBom";
import {
  PRODUCTION_SUBSYSTEMS,
  PRODUCTION_INTERVENTIONS,
  PRODUCTION_DFM_DATA,
  PRODUCTION_PART_DETAILS,
  PRODUCTION_ENGINEERING_NOTES,
  type ProductionSubsystem,
  type ProductionIntervention,
  type ProductionDFMRow,
  type ProductionPartDetail,
  type EngineeringNote,
} from "./productionData";
import {
  PROTOTYPE_SUBSYSTEMS,
  PROTOTYPE_SIMPLIFICATIONS,
  PROTOTYPE_DFM_FLAGS,
  PROTOTYPE_PART_DATA,
  PROTOTYPE_ASSEMBLY,
  type PrototypeSubsystem,
  type PrototypeSimplification,
  type PrototypeDFMFlag,
  type PrototypePartRecord,
  type PrototypeAssemblyRecord,
} from "./prototypeData";

// Re-export everything so consumers can import all data layer types from one place.
export type {
  ProductionSubsystem,
  ProductionIntervention,
  ProductionDFMRow,
  ProductionPartDetail,
  EngineeringNote,
  PrototypeSubsystem,
  PrototypeSimplification,
  PrototypeDFMFlag,
  PrototypePartRecord,
  PrototypeAssemblyRecord,
};

// ─── Shared assembly summary ──────────────────────────────────────────────────
// Common identity and BOM metadata. Same shape in both modes.

export interface AssemblySummary {
  /** Top-level assembly number. */
  assemblyId: string;

  /** Human-readable assembly name. */
  assemblyName: string;

  /** Total line count in CANONICAL_BOM_845_000112. */
  totalPartCount: number;

  /** Count of Make (custom-fabricated) parts. */
  makePartCount: number;

  /** Count of Buy (purchased / OTS) parts. */
  buyPartCount: number;
}

const ASSEMBLY_SUMMARY: AssemblySummary = {
  assemblyId: "845-000112",
  assemblyName: "RS320-02 Assembly",
  totalPartCount: CANONICAL_BOM_845_000112.length,
  makePartCount: MAKE_PARTS.length,
  buyPartCount: OTS_PARTS.length,
};

// ─── Production dashboard data ────────────────────────────────────────────────

export interface ProductionDashboardData {
  readonly mode: "production";

  /**
   * Shared assembly identity and BOM metadata.
   * Available on both branches — always safe to read without narrowing.
   */
  assembly: AssemblySummary;

  /**
   * Subsystem cost breakdown.
   * Parallel field on prototype branch: PrototypeDashboardData.subsystems (PrototypeSubsystem[]).
   */
  subsystems: ProductionSubsystem[];

  /**
   * Ranked list of cost-reduction interventions.
   * Prototype parallel: PrototypeDashboardData.simplifications.
   */
  interventions: ProductionIntervention[];

  /**
   * DFM opportunities at production volume.
   * Prototype parallel: PrototypeDashboardData.dfmFlags (same field name, different item type).
   */
  dfmFlags: ProductionDFMRow[];

  /**
   * Full engineering deep-dive per part (parts with an analysis page).
   * Prototype parallel: PrototypeDashboardData.partDetails (PrototypePartRecord values).
   */
  partDetails: Record<string, ProductionPartDetail>;

  /**
   * Engineering notes for every Make part — shown in BOM Analysis detail panel.
   * No direct prototype equivalent; prototype uses partDetails[pn].prototypeProcess.
   */
  bomNotes: Record<string, EngineeringNote>;
}

// ─── Prototype dashboard data ─────────────────────────────────────────────────

export interface PrototypeDashboardData {
  readonly mode: "prototype";

  /**
   * Shared assembly identity and BOM metadata.
   * Same field as on ProductionDashboardData.
   */
  assembly: AssemblySummary;

  /**
   * Assembly-level build readiness record.
   * Contains blockers, build target date, iteration objectives, critical path parts.
   * No production equivalent — production uses CostModelContext for computed rollups.
   */
  buildRecord: PrototypeAssemblyRecord;

  /**
   * Subsystem complexity breakdown.
   * Production parallel: ProductionDashboardData.subsystems (ProductionSubsystem[]).
   */
  subsystems: PrototypeSubsystem[];

  /**
   * Ranked list of iteration simplifications (lead time + friction reduction).
   * Production parallel: ProductionDashboardData.interventions.
   */
  simplifications: PrototypeSimplification[];

  /**
   * DFM flags at prototype volume — geometry signals slowing prototype fabrication.
   * Production parallel: ProductionDashboardData.dfmFlags (same field name, different item type).
   */
  dfmFlags: PrototypeDFMFlag[];

  /**
   * Full per-part prototype data (all Make parts).
   * Production parallel: ProductionDashboardData.partDetails (ProductionPartDetail values).
   */
  partDetails: Record<string, PrototypePartRecord>;
}

// ─── Discriminated union ──────────────────────────────────────────────────────
//
// Components narrow the union with:
//   if (data.mode === "production") { ... }
//   else { ... }
//
// TypeScript fully narrows the sub-types within each branch.

export type DashboardData = ProductionDashboardData | PrototypeDashboardData;

// ─── Static data objects ──────────────────────────────────────────────────────
// These are stable references — create once, reference everywhere.
// CostModelContext computed values (currentBomCost etc.) are NOT included here;
// those are reactive and should be accessed via useCostModel().

export const PRODUCTION_DASHBOARD_DATA: ProductionDashboardData = {
  mode: "production",
  assembly: ASSEMBLY_SUMMARY,
  subsystems: PRODUCTION_SUBSYSTEMS,
  interventions: PRODUCTION_INTERVENTIONS,
  dfmFlags: PRODUCTION_DFM_DATA,
  partDetails: PRODUCTION_PART_DETAILS,
  bomNotes: PRODUCTION_ENGINEERING_NOTES,
};

export const PROTOTYPE_DASHBOARD_DATA: PrototypeDashboardData = {
  mode: "prototype",
  assembly: ASSEMBLY_SUMMARY,
  buildRecord: PROTOTYPE_ASSEMBLY,
  subsystems: PROTOTYPE_SUBSYSTEMS,
  simplifications: PROTOTYPE_SIMPLIFICATIONS,
  dfmFlags: PROTOTYPE_DFM_FLAGS,
  partDetails: PROTOTYPE_PART_DATA,
};

// ─── useDashboardData ─────────────────────────────────────────────────────────
//
// Primary consumer hook. Returns the correct DashboardData branch for the
// current operating mode. TypeScript narrows automatically after `mode` check.
//
// Usage:
//   const data = useDashboardData();
//   if (data.mode === "production") { /* ProductionDashboardData */ }
//   else                            { /* PrototypeDashboardData  */ }

export function useDashboardData(): DashboardData {
  const { mode } = useAppMode();
  return mode === "production"
    ? PRODUCTION_DASHBOARD_DATA
    : PROTOTYPE_DASHBOARD_DATA;
}

// ─── Type guards ──────────────────────────────────────────────────────────────
// Utility predicates for callers that prefer imperative style over `if (mode)`.

export function isProductionData(d: DashboardData): d is ProductionDashboardData {
  return d.mode === "production";
}

export function isPrototypeData(d: DashboardData): d is PrototypeDashboardData {
  return d.mode === "prototype";
}
