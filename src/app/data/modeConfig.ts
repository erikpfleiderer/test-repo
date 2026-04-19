// ─── MODE_CONFIG — mode-specific UI vocabulary ────────────────────────────────
//
// Single source of truth for all user-facing label strings that differ between
// production and prototype modes. Components read `const cfg = MODE_CONFIG[mode]`
// at the top and reference `cfg.fieldName` instead of scattering inline ternaries.
//
// ── Adding a new mode ─────────────────────────────────────────────────────────
//   1. Extend `AppMode` with the new key.
//   2. Add a matching entry to MODE_CONFIG — TypeScript will surface any missing
//      fields.
//   3. Add the new data branch to DashboardData (see dashboardData.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type AppMode = "production" | "prototype";

export interface ModeConfig {
  // ── Page identity ──────────────────────────────────────────────────────────
  /** H1 and breadcrumb title for the cost/iteration page. */
  pageTitle: string;

  // ── Navigation / breadcrumbs ───────────────────────────────────────────────
  /** Page breadcrumb and cross-link label. */
  interventionsNavLabel: string;
  /** Short noun used in count cards and inline descriptions. */
  interventionsShortLabel: string;
  /** Lowercase noun for prose copy, e.g. "8 interventions identified". */
  interventionsNoun: string;

  // ── Action / intervention ──────────────────────────────────────────────────
  /** Section heading and column header for the recommended action. */
  actionLabel: string;
  /** Impact hero label (savings or lead-time reduction). */
  impactLabel: string;

  // ── Assessment ────────────────────────────────────────────────────────────
  /** Risk assessment row label in detail panels. */
  riskLabel: string;
  /** Risk column header in the DFM table (shorter form). */
  dfmRiskLabel: string;

  // ── Part / process ────────────────────────────────────────────────────────
  /** Table column header for the current material or prototype process. */
  currentProcessLabel: string;

  // ── Subsystem ─────────────────────────────────────────────────────────────
  /** Section header label above the numeric weight/score in subsystem cards. */
  weightScoreLabel: string;
  /** Summary-strip card label for the highest-scoring subsystem. */
  highestWeightLabel: string;
  /** Section header for the driver / signal list in subsystem cards. */
  driversLabel: string;
  /** Section header for the recommended lever or simplification target. */
  leverLabel: string;
  /** Summary-strip card label for the lever count. */
  leverCountLabel: string;
  /** Summary-strip card sub-label beneath the lever count. */
  leverCountSub: string;

  // ── DFM ───────────────────────────────────────────────────────────────────
  /** DFM table column header for the benefit / iteration gain column. */
  dfmBenefitLabel: string;

  // ── Table column shorthands ───────────────────────────────────────────────
  /** Short singular column header for the intervention/simplification column. */
  interventionColumnLabel: string;
  /** Short impact column header used in compact table views. */
  impactColumnLabel: string;
  /** Sub-label beneath the row count in the summary strip (explains sort order). */
  summaryCountSub: string;

  // ── Overview ──────────────────────────────────────────────────────────────
  /** Overview page header subtitle. */
  overviewSubtitle: string;
  /** Stat card label for the top opportunity. */
  topOpportunityLabel: string;
  /** Stat card label for primary cost / complexity drivers. */
  driversCardLabel: string;
  /** Subsystem chart section heading. */
  chartTitle: string;
  /** Subsystem chart section sub-heading. */
  chartSubtitle: string;
}

export const MODE_CONFIG: Record<AppMode, ModeConfig> = {
  production: {
    pageTitle:               "Cost Interventions",
    interventionsNavLabel:   "Cost Interventions",
    interventionsShortLabel: "Interventions",
    interventionsNoun:       "interventions",
    actionLabel:             "Recommended Intervention",
    impactLabel:             "Estimated Savings",
    riskLabel:               "Risk Level",
    dfmRiskLabel:            "Risk",
    currentProcessLabel:     "Current Material",
    weightScoreLabel:        "Cost Weight",
    highestWeightLabel:      "Highest Cost Weight",
    driversLabel:            "Primary Drivers",
    leverLabel:              "Recommended Lever",
    leverCountLabel:         "Levers Available",
    leverCountSub:           "recommended interventions",
    dfmBenefitLabel:         "Benefit",
    interventionColumnLabel:  "Intervention",
    impactColumnLabel:        "Savings",
    summaryCountSub:          "ranked by savings potential",
    overviewSubtitle:        "Cost intelligence summary for the active assembly",
    topOpportunityLabel:     "Top Saving Opportunity",
    driversCardLabel:        "Primary Cost Drivers",
    chartTitle:              "Subsystem Cost Distribution",
    chartSubtitle:           "Relative cost weighting by subsystem",
  },
  prototype: {
    pageTitle:               "Iteration Planning",
    interventionsNavLabel:   "Simplifications",
    interventionsShortLabel: "Simplifications",
    interventionsNoun:       "simplification paths",
    actionLabel:             "Simplification Path",
    impactLabel:             "Iteration Impact",
    riskLabel:               "Iteration Risk",
    dfmRiskLabel:            "Iteration Risk",
    currentProcessLabel:     "Current Process",
    weightScoreLabel:        "Complexity Score",
    highestWeightLabel:      "Highest Complexity Score",
    driversLabel:            "Complexity Signals",
    leverLabel:              "Simplification Target",
    leverCountLabel:         "Simplification Targets",
    leverCountSub:           "simplification paths identified",
    dfmBenefitLabel:         "Iteration Gain",
    interventionColumnLabel:  "Simplification",
    impactColumnLabel:        "Iteration Impact",
    summaryCountSub:          "prioritized by build impact",
    overviewSubtitle:        "Iteration readiness summary for the active assembly",
    topOpportunityLabel:     "Top Simplification Opportunity",
    driversCardLabel:        "Complexity Drivers",
    chartTitle:              "Subsystem Complexity Distribution",
    chartSubtitle:           "Relative complexity score by subsystem",
  },
} as const;
