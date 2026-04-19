import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  PART_COST_DATA,
  INTERVENTION_COST_DATA,
  computeProjectedUnitCost,
} from "../data/costData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostModelContextValue {
  /** Annual production volume — used to compute annualSavingsPotential */
  expectedAnnualVolume: number;
  setExpectedAnnualVolume: (v: number) => void;

  /** Set of intervention partNumbers that the user has toggled on */
  selectedInterventions: Set<string>;
  toggleIntervention: (partNumber: string) => void;
  isInterventionSelected: (partNumber: string) => boolean;

  /** User-edited unit cost overrides — keyed by partNumber */
  costOverrides: Record<string, number>;
  setCostOverride: (partNumber: string, value: number) => void;
  clearCostOverride: (partNumber: string) => void;
  /** Returns the effective unit cost: override → base → null */
  getEffectiveUnitCost: (partNumber: string) => number | null;

  // ── Computed rollups ──────────────────────────────────────────────────────
  /** Sum of qty × effectiveUnitCost for all costed, non-excluded parts */
  currentBomCost: number;
  /** Sum of qty × projectedUnitCost for all costed, non-excluded parts */
  projectedBomCost: number;
  /** (currentBomCost - projectedBomCost) × expectedAnnualVolume */
  annualSavingsPotential: number;
  /** Projected BOM cost assuming ALL available interventions are applied */
  fullProjectedBomCost: number;
  /** Annual savings assuming ALL available interventions are applied */
  fullAnnualSavingsPotential: number;
  /** True if any non-excluded part has no unit cost and no override */
  hasMissingCosts: boolean;

  // ── Per-part helper ───────────────────────────────────────────────────────
  /** Returns projected unit cost for a part given current intervention selections and overrides */
  getProjectedUnitCost: (partNumber: string) => number | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CostModelContext = createContext<CostModelContextValue | null>(null);

// ─── Safe fallback (used when previewed outside a provider) ──────────────────

function buildFallback(): CostModelContextValue {
  // Compute real BOM totals so isolated previews show meaningful numbers
  let current = 0;
  let projected = 0;
  const allInterventions = new Set(Object.keys(INTERVENTION_COST_DATA));
  for (const [pn, rec] of Object.entries(PART_COST_DATA)) {
    if (rec.excludeFromRollup) continue;
    const u = rec.unitCostCurrent;
    if (u == null) continue;
    current += rec.qty * u;
    const p = computeProjectedUnitCost(pn, allInterventions, {}) ?? u;
    projected += rec.qty * p;
  }
  const vol = 5_000;
  return {
    expectedAnnualVolume: vol,
    setExpectedAnnualVolume: (_v: number) => { /* no-op outside provider */ },
    selectedInterventions: new Set<string>(),
    toggleIntervention: (_pn: string) => { /* no-op */ },
    isInterventionSelected: (_pn: string) => false,
    costOverrides: {},
    setCostOverride: (_pn: string, _v: number) => { /* no-op */ },
    clearCostOverride: (_pn: string) => { /* no-op */ },
    getEffectiveUnitCost: (pn: string) => PART_COST_DATA[pn]?.unitCostCurrent ?? null,
    currentBomCost: current,
    projectedBomCost: current,
    annualSavingsPotential: 0,
    fullProjectedBomCost: projected,
    fullAnnualSavingsPotential: (current - projected) * vol,
    hasMissingCosts: false,
    getProjectedUnitCost: (pn: string) =>
      computeProjectedUnitCost(pn, allInterventions, {}),
  };
}

export function useCostModel(): CostModelContextValue {
  const ctx = useContext(CostModelContext);
  // Return a computed fallback when rendered outside a provider (e.g. Figma isolated preview)
  if (!ctx) return buildFallback();
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CostModelProvider({ children }: { children: ReactNode }) {
  const [expectedAnnualVolume, setExpectedAnnualVolume] = useState(5_000);
  const [selectedInterventions, setSelectedInterventions] = useState<Set<string>>(new Set());
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});

  const toggleIntervention = (partNumber: string) => {
    setSelectedInterventions((prev) => {
      const next = new Set(prev);
      if (next.has(partNumber)) next.delete(partNumber);
      else next.add(partNumber);
      return next;
    });
  };

  const setCostOverride = (partNumber: string, value: number) => {
    setCostOverrides((prev) => ({ ...prev, [partNumber]: value }));
  };

  const clearCostOverride = (partNumber: string) => {
    setCostOverrides((prev) => {
      const next = { ...prev };
      delete next[partNumber];
      return next;
    });
  };

  const isInterventionSelected = (pn: string) => selectedInterventions.has(pn);

  const getEffectiveUnitCost = (partNumber: string): number | null => {
    if (partNumber in costOverrides) return costOverrides[partNumber];
    const rec = PART_COST_DATA[partNumber];
    return rec?.unitCostCurrent ?? null;
  };

  const getProjectedUnitCost = (partNumber: string): number | null =>
    computeProjectedUnitCost(partNumber, selectedInterventions, costOverrides);

  // Derived: BOM rollups (excludes parts flagged excludeFromRollup)
  const { currentBomCost, projectedBomCost, hasMissingCosts } = useMemo(() => {
    let current  = 0;
    let projected = 0;
    let missing  = false;

    for (const [pn, rec] of Object.entries(PART_COST_DATA)) {
      if (rec.excludeFromRollup) continue;

      const effectiveUnit = costOverrides[pn] ?? rec.unitCostCurrent;

      if (effectiveUnit == null) {
        missing = true;
        continue;
      }

      const projUnit =
        computeProjectedUnitCost(pn, selectedInterventions, costOverrides) ?? effectiveUnit;

      current   += rec.qty * effectiveUnit;
      projected += rec.qty * projUnit;
    }

    return { currentBomCost: current, projectedBomCost: projected, hasMissingCosts: missing };
  }, [selectedInterventions, costOverrides]);

  // Derived: BOM rollup assuming ALL interventions applied (for Overview display)
  const fullProjectedBomCost = useMemo(() => {
    const allInterventions = new Set(Object.keys(INTERVENTION_COST_DATA));
    let projected = 0;
    for (const [pn, rec] of Object.entries(PART_COST_DATA)) {
      if (rec.excludeFromRollup) continue;
      const effectiveUnit = costOverrides[pn] ?? rec.unitCostCurrent;
      if (effectiveUnit == null) continue;
      const projUnit =
        computeProjectedUnitCost(pn, allInterventions, costOverrides) ?? effectiveUnit;
      projected += rec.qty * projUnit;
    }
    return projected;
  }, [costOverrides]);

  // Verify INTERVENTION_COST_DATA is imported (used in computeProjectedUnitCost; suppresses lint)
  void INTERVENTION_COST_DATA;

  const annualSavingsPotential = (currentBomCost - projectedBomCost) * expectedAnnualVolume;
  const fullAnnualSavingsPotential = (currentBomCost - fullProjectedBomCost) * expectedAnnualVolume;

  return (
    <CostModelContext.Provider
      value={{
        expectedAnnualVolume,
        setExpectedAnnualVolume,
        selectedInterventions,
        toggleIntervention,
        isInterventionSelected,
        costOverrides,
        setCostOverride,
        clearCostOverride,
        getEffectiveUnitCost,
        currentBomCost,
        projectedBomCost,
        annualSavingsPotential,
        fullProjectedBomCost,
        fullAnnualSavingsPotential,
        hasMissingCosts,
        getProjectedUnitCost,
      }}
    >
      {children}
    </CostModelContext.Provider>
  );
}