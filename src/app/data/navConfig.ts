// ─── NAV CONFIG — mode-aware navigation structure ─────────────────────────────
//
// Single source of truth for which pages appear in the sidebar and Overview
// quick-nav cards per mode.
//
// Prototype mode exposes iteration-focused pages (lead time, build readiness,
// DFM friction) and omits production-only workflows like material cost
// optimization and manufacturing-stage transitions.
//
// Production mode exposes the full cost engineering surface.
//
// ── Adding a new nav item ──────────────────────────────────────────────────
//   1. Import the lucide icon here.
//   2. Add a NavItem entry to the appropriate MODE_NAV_ITEMS branch.
//   3. Add a QuickNavCard entry to MODE_QUICK_NAV if it should appear on
//      Overview. statusKey must match a key in the statusMap computed inside
//      Overview.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LayoutDashboard,
  Zap,
  List,
  Layers,
  Wrench,
  Gem,
  ArrowLeftRight,
  Box,
  Upload,
  ShieldAlert,
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
    { label: "Upload Files",       icon: Upload,          path: "/upload" },
    { label: "Overview",           icon: LayoutDashboard, path: "/overview" },
    { label: "Iteration Planning",     icon: Zap,          path: "/cost-interventions" },
    { label: "BOM Analysis",            icon: List,         path: "/bom-analysis" },
    { label: "Prod. Readiness",         icon: ShieldAlert,  path: "/production-readiness" },
    { label: "Subsystem Analysis",      icon: Layers,       path: "/subsystem-analysis" },
    { label: "DFM Opportunities",       icon: Wrench,       path: "/dfm-opportunities" },
  ],
  production: [
    { label: "Upload Files",            icon: Upload,          path: "/upload" },
    { label: "Overview",                icon: LayoutDashboard, path: "/overview" },
    { label: "Cost Interventions",      icon: Zap,             path: "/cost-interventions" },
    { label: "BOM Analysis",            icon: List,            path: "/bom-analysis" },
    { label: "Geometry Analysis",       icon: Box,             path: "/geometry-analysis" },
    { label: "Subsystem Analysis",      icon: Layers,          path: "/subsystem-analysis" },
    { label: "DFM Opportunities",       icon: Wrench,          path: "/dfm-opportunities" },
    { label: "Material Optimization",   icon: Gem,             path: "/material-optimization" },
    { label: "Manufacturing Transition",icon: ArrowLeftRight,  path: "/manufacturing-transition" },
  ],
};

// ── Overview quick-nav cards ──────────────────────────────────────────────────
//
// `statusKey` is looked up against a Record<string, string> computed inside
// Overview.tsx. This keeps dynamic count strings out of static config while
// still centralizing label/desc/path/color here.

export interface QuickNavCard {
  label: string;
  desc: string;
  path: string;
  color: string;
  /** Key into the statusMap computed in Overview.tsx. */
  statusKey: string;
}

export const MODE_QUICK_NAV: Record<AppMode, QuickNavCard[]> = {
  prototype: [
    {
      label: "Iteration Planning",
      desc: "Ranked simplification paths by iteration impact",
      path: "/cost-interventions",
      color: "#3B82F6",
      statusKey: "interventions",
    },
    {
      label: "BOM Analysis",
      desc: "Bill of materials structure and part detail",
      path: "/bom-analysis",
      color: "#8B5CF6",
      statusKey: "bom",
    },
    {
      label: "Subsystem Analysis",
      desc: "Per-subsystem complexity and iteration risk",
      path: "/subsystem-analysis",
      color: "#0891B2",
      statusKey: "subsystems",
    },
    {
      label: "DFM Opportunities",
      desc: "Prototype fabrication friction flags",
      path: "/dfm-opportunities",
      color: "#D97706",
      statusKey: "dfm",
    },
  ],
  production: [
    {
      label: "Cost Interventions",
      desc: "Ranked list of cost reduction opportunities",
      path: "/cost-interventions",
      color: "#3B82F6",
      statusKey: "interventions",
    },
    {
      label: "BOM Analysis",
      desc: "Bill of materials cost breakdown",
      path: "/bom-analysis",
      color: "#8B5CF6",
      statusKey: "bom",
    },
    {
      label: "Subsystem Analysis",
      desc: "Per-subsystem cost and part detail",
      path: "/subsystem-analysis",
      color: "#0891B2",
      statusKey: "subsystems",
    },
    {
      label: "DFM Opportunities",
      desc: "Design for manufacturability flags",
      path: "/dfm-opportunities",
      color: "#D97706",
      statusKey: "dfm",
    },
    {
      label: "Material Optimization",
      desc: "Material substitution recommendations",
      path: "/material-optimization",
      color: "#059669",
      statusKey: "materials",
    },
    {
      label: "Manufacturing Transition",
      desc: "Process change impact analysis",
      path: "/manufacturing-transition",
      color: "#DC2626",
      statusKey: "transition",
    },
  ],
};
