// ─── NAV CONFIG — mode-aware navigation structure ─────────────────────────────
//
// Sidebar shows only the two primary destinations: Upload + BOM Analysis.
// All other analysis pages remain routable via direct URL but are not in the
// primary sidebar nav.
// ─────────────────────────────────────────────────────────────────────────────

import {
  List,
  Upload,
  TrendingDown,
  Microscope,
  type LucideIcon,
} from "lucide-react";

import type { AppMode } from "./modeConfig";

// ── Sidebar nav ───────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

export const MODE_NAV_ITEMS: Record<AppMode, NavItem[]> = {
  prototype: [
    { label: "Upload Files",        icon: Upload,       path: "/upload" },
    { label: "BOM Analysis",        icon: List,         path: "/bom-analysis" },
    { label: "DFM Opportunities",   icon: Microscope,   path: "/dfm-opportunities" },
  ],
  production: [
    { label: "Upload Files",        icon: Upload,       path: "/upload" },
    { label: "BOM Analysis",        icon: List,         path: "/bom-analysis" },
    { label: "Cost Interventions",  icon: TrendingDown, path: "/cost-interventions" },
  ],
};

// ── Overview quick-nav cards (retained for type-compatibility; cleared) ────────

export interface QuickNavCard {
  label: string;
  desc: string;
  path: string;
  color: string;
  /** Key into the statusMap computed in Overview.tsx. */
  statusKey: string;
}

export const MODE_QUICK_NAV: Record<AppMode, QuickNavCard[]> = {
  prototype: [],
  production: [],
};
