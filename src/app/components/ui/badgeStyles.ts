// ─── Shared badge and severity style maps ─────────────────────────────────────
//
// Single source of truth for the color tokens used by badge components,
// detail panels, and table rows across both production and prototype modes.
//
// Usage:
//   import { DIFFICULTY_STYLE, RISK_STYLE, CONFIDENCE_STYLE } from "./badgeStyles";
//
// ─────────────────────────────────────────────────────────────────────────────

export interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
}

// Low → green · Medium → amber · High → red
export const DIFFICULTY_STYLE: Record<string, BadgeStyle> = {
  Low:    { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  Medium: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  High:   { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
};

// Same mapping as difficulty — Low risk = green, High risk = red
export const RISK_STYLE: Record<string, BadgeStyle> = {
  Low:    { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  Medium: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  High:   { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
};

// Inverted: Low confidence = red, High confidence = green
export const CONFIDENCE_STYLE: Record<string, BadgeStyle> = {
  Low:    { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  Medium: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  High:   { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
};

// Manufacturing risk signal severity (Block / Flag / Watch).
// "dot" is used for compact inline color indicators.
export interface SeverityStyle extends BadgeStyle {
  dot: string;
}

export const SEVERITY_SIGNAL_STYLE: Record<"Block" | "Flag" | "Watch", SeverityStyle> = {
  Block: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", dot: "#E11D48" },
  Flag:  { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74", dot: "#F97316" },
  Watch: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#D97706" },
};

// ─── Build readiness ──────────────────────────────────────────────────────────

/**
 * Returns `bg` (chip/badge background) and `color` (text and numeric display)
 * for a build-readiness status value of "Ready", "Conditional", or "Not Ready".
 */
export function buildReadinessStyle(status: string): { bg: string; color: string } {
  if (status === "Ready")       return { bg: "#DCFCE7", color: "#059669" };
  if (status === "Conditional") return { bg: "#FEF3C7", color: "#D97706" };
  return                               { bg: "#FFF1F2", color: "#E11D48" };
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
