import { motion } from "motion/react";
import {
  ChevronRight,
  ArrowRight,
  Wrench,
  Settings,
  CheckCircle2,
  Factory,
  Layers,
  Zap,
  FlaskConical,
  BarChart3,
  Info,
  Hammer,
} from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface PhaseItem {
  label: string;
  icon: React.ElementType;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  lightBg: string;
  lightBorder: string;
  items: PhaseItem[];
}

const PHASES: Phase[] = [
  {
    id: "prototype",
    name: "Prototype",
    description: "Current state — development & validation processes",
    accentColor: "#2B6CB0",
    lightBg: "#EFF6FF",
    lightBorder: "#BFDBFE",
    items: [
      { label: "CNC billet machining", icon: Settings },
      { label: "3D printed cable components", icon: Layers },
    ],
  },
  {
    id: "pilot",
    name: "Pilot",
    description: "Transition — near-net-shape blanks, reduced machining",
    accentColor: "#6D28D9",
    lightBg: "#FAF5FF",
    lightBorder: "#DDD6FE",
    items: [
      { label: "Forged blanks", icon: Wrench },
      { label: "Bridge tooling", icon: Hammer },
    ],
  },
  {
    id: "production",
    name: "Production",
    description: "Target state — high-volume optimised processes",
    accentColor: "#059669",
    lightBg: "#F0FDF4",
    lightBorder: "#BBF7D0",
    items: [
      { label: "Die cast housing", icon: Factory },
      { label: "Powder metal gears", icon: Zap },
      { label: "Injection molded cable components", icon: FlaskConical },
    ],
  },
];

// ─── Phase column ──────────────────────────────────────────────────────────────

function PhaseColumn({
  phase,
  delay,
  isLast,
}: {
  phase: Phase;
  delay: number;
  isLast: boolean;
}) {
  return (
    <div className="flex items-stretch gap-0">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut", delay }}
        className="flex-1 flex flex-col rounded-xl border overflow-hidden"
        style={{
          background: phase.lightBg,
          borderColor: phase.lightBorder,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {/* Phase header */}
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: phase.lightBorder, background: "rgba(255,255,255,0.7)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: phase.accentColor }}
            />
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: phase.accentColor, fontWeight: 600 }}
            >
              {phase.name}
            </span>
          </div>
          <p className="text-[12px] text-[#64748B] leading-snug">
            {phase.description}
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {phase.items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.24, delay: delay + 0.1 + i * 0.06 }}
              className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3.5"
              style={{ borderColor: phase.lightBorder }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${phase.accentColor}18` }}
              >
                <item.icon size={15} color={phase.accentColor} />
              </div>
              <span
                className="text-[13px] text-[#1E293B]"
                style={{ fontWeight: 500 }}
              >
                {item.label}
              </span>
            </motion.div>
          ))}

          {/* Item count pill at bottom */}
          <div className="mt-auto pt-2">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md"
              style={{
                background: `${phase.accentColor}14`,
                color: phase.accentColor,
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={11} />
              {phase.items.length} process{phase.items.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Connector arrow */}
      {!isLast && (
        <div className="flex items-center px-4 shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: delay + 0.15 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[#CBD5E1] to-transparent" />
            <ArrowRight size={18} color="#94A3B8" />
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[#CBD5E1] to-transparent" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ManufacturingTransition() {
  const { mode } = useAppMode();
  const totalItems = PHASES.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
            Dashboard
          </span>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">
            Manufacturing Transition
          </span>
        </div>
        <h1
          className="text-[#0F2035]"
          style={{ fontWeight: 600 }}
        >
          Manufacturing Transition Roadmap
        </h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          {mode === "prototype"
            ? `Process evolution roadmap for Assembly 845-000112 · ${PHASES.length} phases · ${totalItems} processes mapped`
            : `Process transition pathway for Assembly 845-000112 · ${PHASES.length} phases · ${totalItems} processes mapped`}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PHASES.map((phase) => (
            <div
              key={phase.id}
              className="bg-white rounded-xl border border-[#E2E8F0] px-5 py-4 flex items-center gap-4"
            >
              <div
                className="w-1.5 h-10 rounded-full shrink-0"
                style={{ background: phase.accentColor }}
              />
              <div>
                <p
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: "#94A3B8", fontWeight: 500 }}
                >
                  {phase.name}
                </p>
                <p
                  className="text-[22px] leading-tight mt-0.5"
                  style={{ color: phase.accentColor, fontWeight: 700 }}
                >
                  {phase.items.length}
                </p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">
                  process{phase.items.length !== 1 ? "es" : ""} mapped
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Roadmap */}
        <div className="flex items-stretch gap-0">
          {PHASES.map((phase, i) => (
            <PhaseColumn
              key={phase.id}
              phase={phase}
              delay={0.06 + i * 0.1}
              isLast={i === PHASES.length - 1}
            />
          ))}
        </div>

        {/* Timeline baseline bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 bg-white rounded-xl border border-[#E2E8F0] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} color="#1B3A5C" />
              <span
                className="text-[12px] text-[#0F2035]"
                style={{ fontWeight: 600 }}
              >
                Transition Progress Indicator
              </span>
            </div>
            <span className="text-[11px] text-[#94A3B8]">Assembly 845-000112</span>
          </div>

          {/* Phase bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {PHASES.map((phase, i) => {
              const weight = phase.items.length / totalItems;
              return (
                <motion.div
                  key={phase.id}
                  className="h-full rounded-sm"
                  style={{ background: phase.accentColor, flex: weight }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.45 + i * 0.08, ease: "easeOut" }}
                />
              );
            })}
          </div>

          <div className="flex justify-between mt-2">
            {PHASES.map((phase) => (
              <div key={phase.id} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ background: phase.accentColor }}
                />
                <span className="text-[11px] text-[#64748B]">
                  {phase.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footnote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-dashed border-[#CBD5E1] p-3"
        >
          <Info size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#94A3B8]">Timeline, costs, and sequence dependencies will be detailed as the program plan matures. Processes shown reflect the engineering recommendation derived from intervention analysis.</p>
        </motion.div>
      </div>
    </div>
  );
}