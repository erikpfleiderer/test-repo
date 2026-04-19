// ─── Types ────────────────────────────────────────────────────────────────────

export type CostConfidence = "High" | "Medium" | "Low";

export type CostImpactModel =
  | { type: "absolute"; unitCostAfter: number }
  | { type: "multiplier"; multiplier: number };

export interface PartCostRecord {
  qty: number;
  unitCostCurrent: number | null;
  unitCostConfidence: CostConfidence;
  costNotes: string;
  /**
   * When true this line is excluded from BOM cost rollups.
   * Used for documentation/MFG resource items (e.g. 600-000019).
   */
  excludeFromRollup?: boolean;
}

export interface InterventionCostRecord {
  appliesToPartNumbers: string[];
  costImpactModel: CostImpactModel;
}

// ─── Part cost data ───────────────────────────────────────────────────────────
// All entries must reference valid CANONICAL_BOM_845_000112 part numbers.
// Qty mirrors canonical BOM qty for rollup accuracy.
// OTS prices are distributor-based engineering estimates at ~1 000 unit volume.

export const PART_COST_DATA: Record<string, PartCostRecord> = {

  // ── Adhesives ────────────────────────────────────────────────────────────────
  "405-000001": { qty: 1, unitCostCurrent:  8.00, unitCostConfidence: "Medium", costNotes: "Loctite 222 threadlocker; per-assembly dispensed volume estimate" },
  "405-000002": { qty: 1, unitCostCurrent:  8.00, unitCostConfidence: "Medium", costNotes: "Loctite 243 threadlocker; per-assembly dispensed volume estimate" },
  "405-000008": { qty: 1, unitCostCurrent: 12.00, unitCostConfidence: "Medium", costNotes: "Loctite 648 retaining compound; per-assembly dispensed volume estimate" },

  // ── Bearings ─────────────────────────────────────────────────────────────────
  "410-000303": { qty: 4, unitCostCurrent:  3.50, unitCostConfidence: "Medium", costNotes: "Needle roller bearing 1/4\" ID; ×4 in assembly" },
  "410-000310": { qty: 1, unitCostCurrent: 185.00, unitCostConfidence: "Medium", costNotes: "Crossed roller bearing 60mm ID; premium precision bearing; price sensitive to MOQ" },
  "410-000311": { qty: 1, unitCostCurrent:  6.50, unitCostConfidence: "High",   costNotes: "6207 deep groove ball bearing; standard catalog" },
  "410-000313": { qty: 2, unitCostCurrent:  5.00, unitCostConfidence: "High",   costNotes: "Flanged 6704ZZ bearing; ×2 in assembly" },
  "410-000314": { qty: 4, unitCostCurrent:  2.50, unitCostConfidence: "High",   costNotes: "R3 bearing; ×4 in assembly" },
  "410-000315": { qty: 4, unitCostCurrent:  4.50, unitCostConfidence: "Medium", costNotes: "Needle roller bearing 3/8\" ID; ×4 in assembly" },
  "410-000316": { qty: 1, unitCostCurrent:  5.50, unitCostConfidence: "Medium", costNotes: "Needle roller bearing cage 14mm ID; cage-only version" },
  "410-000323": { qty: 1, unitCostCurrent:  6.00, unitCostConfidence: "High",   costNotes: "6705 deep groove ball bearing; standard catalog" },

  // ── Pins ─────────────────────────────────────────────────────────────────────
  "420-000003":  { qty: 1, unitCostCurrent:  0.50, unitCostConfidence: "High", costNotes: "1.5×6 pin 52100 steel; commodity dowel pin" },
  "420-0000015": { qty: 3, unitCostCurrent:  0.60, unitCostConfidence: "High", costNotes: "2×6 pin 52100 steel; ×3 in assembly" },
  "420-000024":  { qty: 3, unitCostCurrent:  0.70, unitCostConfidence: "High", costNotes: "2.5×6 pin 52100 steel; ×3 in assembly" },

  // ── Housing / Structure (Machined) ───────────────────────────────────────────
  "430-002808": { qty: 1, unitCostCurrent: 485,  unitCostConfidence: "High",   costNotes: "CNC billet; primary cost driver is high material removal from Al 6061 billet" },
  "430-002809": { qty: 1, unitCostCurrent: 320,  unitCostConfidence: "Medium", costNotes: "Rotor frame; multiple setups; bore concentricity requirement" },
  "430-002810": { qty: 1, unitCostCurrent: 275,  unitCostConfidence: "High",   costNotes: "Carrier; pocket milling and precision hole pattern; 7075 material premium" },
  "430-002811": { qty: 1, unitCostCurrent: 195,  unitCostConfidence: "High",   costNotes: "Output; complex geometry; 7075-T6 material cost premium" },
  "430-002916": { qty: 1, unitCostCurrent:  85,  unitCostConfidence: "Medium", costNotes: "Axon cap; simple turned/milled part; sealing interface" },

  // ── Retention ────────────────────────────────────────────────────────────────
  "430-002812": { qty: 1, unitCostCurrent:  28,  unitCostConfidence: "High",   costNotes: "Output clamp outer; CNC machined; small-batch inefficiency" },
  "430-002813": { qty: 1, unitCostCurrent:  22,  unitCostConfidence: "High",   costNotes: "Output clamp inner; sheet metal laser cut + deburr; small-batch inefficiency" },

  // ── Shafting ─────────────────────────────────────────────────────────────────
  "430-002814": { qty: 1, unitCostCurrent:  75,  unitCostConfidence: "High",   costNotes: "Bore shaft; runout tolerance; surface finish requirement; grinding" },
  "430-002816": { qty: 4, unitCostCurrent:  45,  unitCostConfidence: "High",   costNotes: "Planet shaft; needle bearing diameter tolerance; surface finish; ×4 in assembly" },
  "430-002817": { qty: 4, unitCostCurrent:  28,  unitCostConfidence: "Medium", costNotes: "Planet sleeve; OD/ID tolerance; ×4 in assembly" },

  // ── Geartrain ────────────────────────────────────────────────────────────────
  "430-002836": { qty: 1, unitCostCurrent: 185,  unitCostConfidence: "High",   costNotes: "Sun gear; gear machining; heat treatment; CMM inspection" },
  "430-002837": { qty: 4, unitCostCurrent: 165,  unitCostConfidence: "High",   costNotes: "Planet gear; gear cutting + heat treat; ×4 quantity in assembly" },
  "430-002838": { qty: 1, unitCostCurrent: 480,  unitCostConfidence: "High",   costNotes: "Ring gear static; internal gear cutting; heat treat + inspection" },
  "430-002839": { qty: 1, unitCostCurrent: 540,  unitCostConfidence: "High",   costNotes: "Ring gear output; highest per-unit cost; internal gear cutting + heat treat + inspection" },

  // ── Cable Management (3D Printed) ────────────────────────────────────────────
  "432-001479": { qty: 1, unitCostCurrent:  24,  unitCostConfidence: "Medium", costNotes: "Cable cover; 3D print unit cost; post-processing iteration" },
  "432-001480": { qty: 1, unitCostCurrent:  18,  unitCostConfidence: "Medium", costNotes: "Cable grip input; 3D print; snap-fit iteration cost" },
  "432-001482": { qty: 1, unitCostCurrent:  22,  unitCostConfidence: "Medium", costNotes: "Cable relief mount; 3D print; post-processing" },
  "432-001483": { qty: 1, unitCostCurrent:  18,  unitCostConfidence: "Medium", costNotes: "Cable relief clamp; 3D print; post-processing" },
  "432-001540": { qty: 1, unitCostCurrent:  38,  unitCostConfidence: "High",   costNotes: "Output grommet; 3D print unit cost drives price; post-processing / fit iteration" },

  // ── Grease ───────────────────────────────────────────────────────────────────
  "438-000008": { qty: 1, unitCostCurrent:  9.00, unitCostConfidence: "Medium", costNotes: "Klubersynth GE 46-1200; per-assembly dispensed volume estimate" },

  // ── Magnets ──────────────────────────────────────────────────────────────────
  "443-000021": { qty: 1, unitCostCurrent: 18.00, unitCostConfidence: "Medium", costNotes: "Dual track ring magnet 65mm OD; iCMU encoder component" },
  "443-000022": { qty: 1, unitCostCurrent: 15.00, unitCostConfidence: "Medium", costNotes: "Dual track ring magnet 45mm OD; iCMU encoder component, smaller OD" },

  // ── Spacer ───────────────────────────────────────────────────────────────────
  "445-000499": { qty: 1, unitCostCurrent:  0.80, unitCostConfidence: "High",   costNotes: "Simple aluminum spacer M2.5" },

  // ── Motor / Sensor ───────────────────────────────────────────────────────────
  "447-000120": { qty: 1, unitCostCurrent: 12.00, unitCostConfidence: "Low",    costNotes: "TBM2G-07608C-ANSA-10; likely encoder sensor IC / interface component" },

  // ── Light Pipe ───────────────────────────────────────────────────────────────
  "460-000001": { qty: 1, unitCostCurrent:  0.45, unitCostConfidence: "High",   costNotes: "Standard 2mm polycarbonate light pipe" },

  // ── Retaining Rings ──────────────────────────────────────────────────────────
  "470-000084": { qty: 1, unitCostCurrent:  0.55, unitCostConfidence: "High",   costNotes: "20mm inverted external retaining ring" },
  "470-000085": { qty: 1, unitCostCurrent:  0.50, unitCostConfidence: "High",   costNotes: "17mm inverted external retaining ring" },
  "470-000086": { qty: 4, unitCostCurrent:  0.45, unitCostConfidence: "High",   costNotes: "1/2\" internal retaining ring; ×4 in assembly" },

  // ── Fasteners ────────────────────────────────────────────────────────────────
  "472-000059": { qty:  4, unitCostCurrent: 0.09, unitCostConfidence: "High",   costNotes: "M2×0.4×4 FH Torx 8.8; ×4 in assembly" },
  "472-000089": { qty:  4, unitCostCurrent: 0.10, unitCostConfidence: "High",   costNotes: "M3×0.5×6 FH Torx ZPS 8.8; ×4 in assembly" },
  "472-000121": { qty:  2, unitCostCurrent: 0.08, unitCostConfidence: "High",   costNotes: "M2×0.4×6 BH Torx 8.8; ×2 in assembly" },
  "472-000131": { qty: 11, unitCostCurrent: 0.07, unitCostConfidence: "High",   costNotes: "M2.5×0.45×5 BH Torx 8.8; ×11 in assembly" },
  "472-000132": { qty: 28, unitCostCurrent: 0.08, unitCostConfidence: "High",   costNotes: "M2.5×0.45×6 BH Torx 8.8; ×28 in assembly" },
  "472-001813": { qty:  4, unitCostCurrent: 0.12, unitCostConfidence: "High",   costNotes: "M2.5×0.45×14 BH Torx 8.8; longer screw, ×4 in assembly" },

  // ── Thermal ──────────────────────────────────────────────────────────────────
  "481-000005": { qty: 1, unitCostCurrent:  6.00, unitCostConfidence: "Medium", costNotes: "Thermal gap filler putty 607; per-assembly usage cost" },
  "481-000008": { qty: 1, unitCostCurrent:  8.00, unitCostConfidence: "Medium", costNotes: "High-strength thermal epoxy TC-2810; per-assembly usage cost" },

  // ── Threaded Inserts ─────────────────────────────────────────────────────────
  "482-000005": { qty: 2, unitCostCurrent:  0.45, unitCostConfidence: "High",   costNotes: "Heat-set M2 threaded insert 18-8 SST; ×2 in assembly" },

  // ── Manufacturing Resource ── EXCLUDED from cost rollup ──────────────────────
  "600-000019": { qty: 1, unitCostCurrent: null,  unitCostConfidence: "Low",    costNotes: "MFG resource package — documentation only; excluded from cost totals", excludeFromRollup: true },

  // ── Actuator Module ──────────────────────────────────────────────────────────
  "820-000122": { qty: 1, unitCostCurrent: 120.00, unitCostConfidence: "Low",   costNotes: "Axon 7 Medium actuator; major purchased component; price sensitive to volume/supplier" },
};

// ─── Intervention cost models ─────────────────────────────────────────────────

export const INTERVENTION_COST_DATA: Record<string, InterventionCostRecord> = {
  "430-002839": {
    appliesToPartNumbers: ["430-002839"],
    costImpactModel: { type: "multiplier", multiplier: 0.25 }, // 75% savings (mid of 70–80%)
  },
  "430-002808": {
    appliesToPartNumbers: ["430-002808"],
    costImpactModel: { type: "multiplier", multiplier: 0.55 }, // 45% savings
  },
  "430-002811": {
    appliesToPartNumbers: ["430-002811"],
    costImpactModel: { type: "multiplier", multiplier: 0.75 }, // 25% savings
  },
  "432-001540": {
    appliesToPartNumbers: ["432-001540"],
    costImpactModel: { type: "multiplier", multiplier: 0.10 }, // 90% savings
  },
  "430-002810": {
    appliesToPartNumbers: ["430-002810"],
    costImpactModel: { type: "multiplier", multiplier: 0.65 }, // 35% savings
  },
};

// ─── Utility functions ────────────────────────────────────────────────────────

export function applyImpactModel(current: number, model: CostImpactModel): number {
  if (model.type === "absolute") return model.unitCostAfter;
  return current * model.multiplier;
}

export function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `$${Math.round(n / 1_000)}k`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  if (n >= 100)       return `$${Math.round(n)}`;
  if (n >= 1)         return `$${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}

export function fmtSavingsDelta(current: number, projected: number): string {
  const delta = current - projected;
  const pct   = Math.round((delta / current) * 100);
  return `${fmtCurrency(delta)} (${pct}%)`;
}

export function computeProjectedUnitCost(
  partNumber: string,
  selectedInterventions: Set<string>,
  overrides: Record<string, number> = {}
): number | null {
  const costRecord = PART_COST_DATA[partNumber];
  if (!costRecord) return null;

  const baseUnit = overrides[partNumber] ?? costRecord.unitCostCurrent;
  if (baseUnit == null) return null;

  let best = baseUnit;
  let anyApplied = false;

  for (const interventionPN of selectedInterventions) {
    const interventionData = INTERVENTION_COST_DATA[interventionPN];
    if (!interventionData) continue;
    if (!interventionData.appliesToPartNumbers.includes(partNumber)) continue;
    const candidate = applyImpactModel(baseUnit, interventionData.costImpactModel);
    if (!anyApplied || candidate < best) {
      best = candidate;
      anyApplied = true;
    }
  }

  return anyApplied ? best : baseUnit;
}
