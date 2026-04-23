// ─── Shared badge and severity style maps ─────────────────────────────────────
//
// Single source of truth for the color tokens used by badge components,
// detail panels, and table rows across both production and prototype modes.
//
// Values reference src/app/design/tokens.ts — do not introduce new hex strings
// here. If a color isn't in tokens.ts, add it there first.
//
// Usage:
//   import { DIFFICULTY_STYLE, RISK_STYLE, CONFIDENCE_STYLE } from "./badgeStyles";
//
// ─────────────────────────────────────────────────────────────────────────────

import { color } from "../../design/tokens";

export interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
}

// Low → green · Medium → amber · High → red
export const DIFFICULTY_STYLE: Record<string, BadgeStyle> = {
  Low:    { bg: color.success.bg,  text: color.success.text,  border: color.success.border  },
  Medium: { bg: color.warning.bg,  text: color.warning.text,  border: color.warning.border  },
  High:   { bg: color.danger.bg,   text: color.danger.text,   border: color.danger.border   },
};

// Same mapping as difficulty — Low risk = green, High risk = red
export const RISK_STYLE: Record<string, BadgeStyle> = {
  Low:    { bg: color.success.bg,  text: color.success.text,  border: color.success.border  },
  Medium: { bg: color.warning.bg,  text: color.warning.text,  border: color.warning.border  },
  High:   { bg: color.danger.bg,   text: color.danger.text,   border: color.danger.border   },
};

// Inverted: Low confidence = red, High confidence = green
export const CONFIDENCE_STYLE: Record<string, BadgeStyle> = {
  Low:    { bg: color.danger.bg,   text: color.danger.text,   border: color.danger.border   },
  Medium: { bg: color.warning.bg,  text: color.warning.text,  border: color.warning.border  },
  High:   { bg: color.success.bg,  text: color.success.text,  border: color.success.border  },
};

// Manufacturing risk signal severity (Block / Flag / Watch).
// "dot" is used for compact inline color indicators.
export interface SeverityStyle extends BadgeStyle {
  dot: string;
}

export const SEVERITY_SIGNAL_STYLE: Record<"Block" | "Flag" | "Watch", SeverityStyle> = {
  Block: { ...color.severity.Block },
  Flag:  { ...color.severity.Flag  },
  Watch: { ...color.severity.Watch },
};

// ─── Build readiness ──────────────────────────────────────────────────────────

/**
 * Returns `bg` (chip/badge background) and `color` (text and numeric display)
 * for a build-readiness status value of "Ready", "Conditional", or "Not Ready".
 */
export function buildReadinessStyle(status: string): { bg: string; color: string } {
  if (status === "Ready")       return { bg: color.success.bg,  color: color.success.strong  };
  if (status === "Conditional") return { bg: color.warning.bg,  color: color.warning.strong  };
  return                               { bg: color.danger.bg,   color: color.danger.strong   };
}


// ─── Iteration risk ───────────────────────────────────────────────────────────

/**
 * Returns `bg` and `color` tokens for prototype iteration risk levels
 * ("Low", "Medium", "High").
 */
export function iterationRiskStyle(risk: string): { bg: string; color: string } {
  if (risk === "High")   return { bg: "#FFF1F2", color: "#E11D48" };
  if (risk === "Medium") return { bg: "#FFFBEB", color: "#D97706" };
  return                        { bg: "#F0FDF4", color: "#16A34A" };
}
