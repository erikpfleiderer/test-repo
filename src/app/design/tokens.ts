// ─── Design System Tokens ──────────────────────────────────────────────────────
//
// Single source of truth for all visual constants in the app.
//
// Usage:
//   import { color, type as typeScale, space, radius } from "./tokens";
//
// CSS / Tailwind access:
//   Colors are also registered as @theme tokens in tailwind.css, enabling:
//     bg-brand-800, text-text-muted, border-border, bg-surface-page, etc.
//
// Rule: no component may hardcode a hex string that already exists here.
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── Color palette ────────────────────────────────────────────────────────────

export const color = {
  // ── Brand / Navy ────────────────────────────────────────────────────────────
  // The primary identity color. Used for brand marks, primary CTAs, active
  // navigation states, and structural dark surfaces (Sidebar).
  brand: {
    950: "#050E1B",   // darkest navy — deep dark surfaces
    900: "#0F2035",   // sidebar background, primary text
    800: "#1B3A5C",   // primary brand color — buttons, active UI
    700: "#2B5472",   // hover states on dark surfaces
    600: "#2B6CB0",   // geartrain subsystem color, link blue
    500: "#4A7FA5",   // mid-tone brand — sidebar meta text
    400: "#4DB6E5",   // accent sky-blue — active indicators, icons on dark
    200: "#B3D9EF",   // light blue tint
    100: "#DBEAFE",   // info/link containers
    50:  "#EFF4FA",   // active state background (light theme)
  },

  // ── Neutral / Slate ──────────────────────────────────────────────────────────
  // Backgrounds, borders, and text. Aligned to Tailwind slate-*.
  neutral: {
    0:   "#FFFFFF",   // card, panel background
    50:  "#FAFBFD",   // elevated surface (panel headers, raised sections)
    100: "#F8FAFC",   // muted surface (alternating rows, subtle fills)
    150: "#F1F5F9",   // subtle interactive bg (hover, button resting)
    200: "#E2E8F0",   // default border
    300: "#CBD5E1",   // stronger border, dividers
    400: "#94A3B8",   // muted / placeholder text
    500: "#64748B",   // secondary text, labels
    600: "#475569",   // body text
    700: "#334155",   // strong body text
    800: "#1E293B",   // heading text on white
    900: "#0F172A",   // maximum contrast text
  },

  // ── Page backgrounds ─────────────────────────────────────────────────────────
  surface: {
    page:   "#F0F4F8",   // outermost page bg (light theme)
    card:   "#FFFFFF",   // card / panel bg
    raised: "#FAFBFD",   // elevated panel sections
    muted:  "#F8FAFC",   // muted fills, alternating table rows
    subtle: "#F1F5F9",   // subtle interactive resting state
    border: "#E2E8F0",   // standard border
    borderStrong: "#CBD5E1",  // prominent borders, selected states
  },

  // ── Dark surface (Sidebar + DFM page) ────────────────────────────────────────
  dark: {
    base:    "#0A1929",   // DFM page background
    raised:  "#0D1F33",   // DFM center panel bg
    surface: "#0F2035",   // Sidebar bg (= brand-900)
    border:  "rgba(255,255,255,0.10)",    // dark border (white/10)
    borderSubtle: "rgba(255,255,255,0.06)", // dark dividers
  },

  // ── Semantic colors ───────────────────────────────────────────────────────────
  // Consistent signal colors across all status badges, alerts, and indicators.

  success: {
    bg:     "#F0FDF4",
    text:   "#16A34A",
    border: "#BBF7D0",
    icon:   "#10B981",
    strong: "#059669",
  },
  warning: {
    bg:     "#FFFBEB",
    text:   "#D97706",
    border: "#FDE68A",
    icon:   "#D97706",
    strong: "#B45309",
  },
  danger: {
    bg:     "#FFF1F2",
    text:   "#E11D48",
    border: "#FECDD3",
    icon:   "#F43F5E",
    strong: "#BE123C",
  },
  info: {
    bg:     "#EFF6FF",
    text:   "#1E40AF",
    border: "#93C5FD",
    icon:   "#3B82F6",
    strong: "#1D4ED8",
  },

  // ── Alert severity (manufacturing risk signals: Block / Flag / Watch) ─────────
  severity: {
    Block: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", dot: "#E11D48" },
    Flag:  { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74", dot: "#F97316" },
    Watch: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#D97706" },
  },

  // ── Subsystem colors (BOM Analysis grouping) ──────────────────────────────────
  subsystem: {
    "Housing / Structure": { dot: "#1B3A5C", bg: "#EFF4FA", text: "#1B3A5C", border: "#BFDBFE" },
    "Geartrain":           { dot: "#2B6CB0", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
    "Cable Management":    { dot: "#0891B2", bg: "#F0F9FF", text: "#0C4A6E", border: "#BAE6FD" },
    "Retention":           { dot: "#7C3AED", bg: "#F5F3FF", text: "#4C1D95", border: "#C4B5FD" },
    "Shafting":            { dot: "#059669", bg: "#F0FDF4", text: "#065F46", border: "#BBF7D0" },
    "Purchased / OTS":     { dot: "#64748B", bg: "#F8FAFC", text: "#334155", border: "#E2E8F0" },
    "Other":               { dot: "#94A3B8", bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
  } as Record<string, { dot: string; bg: string; text: string; border: string }>,
} as const;

// ─── Typography ────────────────────────────────────────────────────────────────

export const typeScale = {
  // Font families — used in style={{ fontFamily }} when Tailwind class not available
  family: {
    sans: "'IBM Plex Sans', sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },

  // Type scale — all font sizes as used in the app.
  // Mapped to Tailwind @theme custom sizes (see tailwind.css):
  //   size.label  → text-2xs   (10px)
  //   size.meta   → text-xs    (11px — note: overridden from Tailwind default 12px)
  //   size.caption→ text-sm    (12px — note: overridden from Tailwind default 14px)
  //   size.body   → text-base  (13px — note: overridden from Tailwind default 16px)
  //   size.md     → text-md    (14px — new custom size)
  //   size.lg     → text-lg    (16px)
  //   size.xl     → text-xl    (18px)
  //   size.hero   → text-2xl   (22px)
  //   size.display→ text-3xl   (26px)
  size: {
    label:   "10px",   // micro labels, chip content, column headers
    meta:    "11px",   // secondary text, badges, timestamps
    caption: "12px",   // detail labels, table rows secondary
    body:    "13px",   // primary body text, button labels
    md:      "14px",   // card titles, tab labels
    lg:      "16px",   // section headers, emphasized body
    xl:      "18px",   // page sub-titles
    hero:    "22px",   // large numeric indicators
    display: "26px",   // dashboard hero metrics
  },

  // Font weights
  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  // Line heights
  leading: {
    tight:  1.25,
    snug:   1.375,
    normal: 1.5,
    loose:  1.625,
  },
} as const;

// ─── Spacing (8pt grid) ───────────────────────────────────────────────────────
//
// Preferred values: 8, 16, 24, 32, 40, 48, 64px
// Acceptable fine-tuning: 4px increments
// Forbidden: arbitrary values not on 4px increments (e.g. 10px, 6px)
//
// Tailwind equivalents: 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px,
//                       8=32px, 10=40px, 12=48px, 16=64px

export const space = {
  1:  "4px",    // fine-tuning only
  2:  "8px",    // compact padding (buttons, chips)
  3:  "12px",   // medium padding, gaps
  4:  "16px",   // standard section padding
  5:  "20px",   // medium section padding
  6:  "24px",   // generous section padding
  8:  "32px",   // large section spacing
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  sm:  "4px",    // chips, small badges
  md:  "6px",    // buttons, inputs
  lg:  "8px",    // cards, panels
  xl:  "12px",   // large cards
  "2xl": "16px", // modals, drawers
  full: "9999px", // pills, dot indicators
} as const;

// ─── Shadow ────────────────────────────────────────────────────────────────────

export const shadow = {
  sm:  "0 1px 2px rgba(0,0,0,0.05)",
  md:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  lg:  "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
  xl:  "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
} as const;

// ─── Component patterns ───────────────────────────────────────────────────────
//
// Tailwind class strings for standard component variants.
// Import and spread with cx() / cn() or use directly as className values.

export const component = {
  // ── Buttons ──────────────────────────────────────────────────────────────────
  button: {
    // Primary: filled brand navy — main CTAs
    primary:
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-800 text-white text-sm font-medium " +
      "hover:bg-brand-900 active:bg-brand-950 transition-colors focus-visible:outline focus-visible:outline-2 " +
      "focus-visible:outline-offset-2 focus-visible:outline-brand-800 disabled:opacity-50 disabled:pointer-events-none",

    // Secondary: outlined brand — secondary actions
    secondary:
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface-card " +
      "text-text-secondary text-sm font-medium hover:bg-surface-subtle hover:text-text-body hover:border-border-strong " +
      "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
      "focus-visible:outline-brand-800 disabled:opacity-50 disabled:pointer-events-none",

    // Ghost: no border, subtle hover — tertiary actions, icon buttons
    ghost:
      "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-text-muted text-sm " +
      "hover:bg-surface-subtle hover:text-text-body transition-colors " +
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
      "focus-visible:outline-brand-800 disabled:opacity-50 disabled:pointer-events-none",

    // Icon: square ghost button
    icon:
      "inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted " +
      "hover:bg-surface-subtle hover:text-text-body transition-colors",

    // Destructive: danger-colored primary
    destructive:
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium " +
      "hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none",
  },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  // Standard card: white bg, border, slight rounding, no shadow by default
  card: {
    base:     "bg-surface-card rounded-xl border border-border",
    elevated: "bg-surface-card rounded-xl border border-border shadow-md",
    muted:    "bg-surface-muted rounded-xl border border-border",
    dark:     "bg-dark-raised rounded-xl border border-white/10",
  },

  // ── Inputs ────────────────────────────────────────────────────────────────────
  input: {
    base:
      "h-8 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-text-body " +
      "placeholder:text-text-subtle transition-colors " +
      "hover:border-border-strong focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100",
  },

  // ── Tables ────────────────────────────────────────────────────────────────────
  table: {
    header: "bg-surface-muted border-b border-border text-label text-text-muted font-semibold uppercase tracking-wide px-4 py-2",
    row:    "border-b border-border hover:bg-surface-muted/60 transition-colors",
    rowSelected: "border-b border-border bg-brand-50",
    cell:   "px-4 py-3 text-sm text-text-body",
    cellMono: "px-4 py-3 text-sm text-text-body font-mono",
  },

  // ── Badges ────────────────────────────────────────────────────────────────────
  badge: {
    base:    "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium",
    success: "bg-success-bg text-success-text border-success-border",
    warning: "bg-warning-bg text-warning-text border-warning-border",
    danger:  "bg-danger-bg text-danger-text border-danger-border",
    info:    "bg-info-bg text-info-text border-info-border",
    neutral: "bg-surface-subtle text-text-muted border-border",
  },

  // ── States ────────────────────────────────────────────────────────────────────
  empty: {
    // Use for empty list/table states
    wrapper: "flex flex-col items-center justify-center py-16 gap-3 text-text-subtle",
    icon:    "w-10 h-10 opacity-30",
    text:    "text-sm text-center max-w-xs",
  },

  loading: {
    // Inline spinner pattern
    spinner: "animate-spin text-text-subtle",
    wrapper: "flex flex-col items-center justify-center py-16 gap-3 text-text-subtle",
  },
} as const;

// ─── Z-index scale ────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  10,
  dropdown: 20,
  sticky:  30,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────
// Standard durations and easing for motion/react animations.

export const motion = {
  duration: {
    fast:   0.12,
    normal: 0.18,
    slow:   0.25,
    enter:  0.20,
    exit:   0.15,
  },
  ease: {
    default: "easeOut" as const,
    spring:  { type: "spring", stiffness: 300, damping: 30 } as const,
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },
  slideRight: {
    initial: { opacity: 0, x: 8 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: 8 },
  },
  slideUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 8 },
  },
} as const;
