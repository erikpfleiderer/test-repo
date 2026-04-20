import { useState, useMemo, Fragment } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  X,
  Filter,
  List,
  LayoutGrid,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { SEVERITY_SIGNAL_STYLE } from "../ui/badgeStyles";
import {
  getAllProductionRiskSignals,
  type ProductionRiskSignalRow,
} from "../../data/prototypeData";
import { CANONICAL_BOM_845_000112 } from "../../data/canonicalBom";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number>  = { Block: 0, Flag: 1, Watch: 2 };
const SEV_WEIGHT: Record<string, number> = { Block: 3, Flag: 2, Watch: 1 };

const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Material:  { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  Process:   { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  Tolerance: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  Assembly:  { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  Sourcing:  { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
};

const CATEGORIES = ["All", "Material", "Process", "Tolerance", "Assembly", "Sourcing"] as const;

const SUBSYSTEM_BY_PART = new Map(
  CANONICAL_BOM_845_000112.map((r) => [r.partNumber, r.subsystem]),
);

const SHORT_SUB: Record<string, string> = {
  "Housing / Structure": "Housing",
  "Purchased / OTS":     "OTS",
};
const fmtSub = (s: string) => SHORT_SUB[s] ?? s;

type SortKey  = "severity" | "part" | "category";
type SortDir  = "asc" | "desc";
type SevFilter = "All" | "Block" | "Flag" | "Watch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-20 flex flex-col items-center gap-3">
      <Search size={24} color="#CBD5E1" />
      <p
        className="text-[13px] text-[#94A3B8]"
        style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        No signals match your current filters
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductionReadiness() {
  const navigate = useNavigate();

  const [searchQuery,    setSearchQuery]    = useState("");
  const [severityFilter, setSeverityFilter] = useState<SevFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sortBy,         setSortBy]         = useState<SortKey>("severity");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [groupByPart,    setGroupByPart]    = useState(false);
  const [expandedRows,   setExpandedRows]   = useState<Set<string>>(new Set());

  const allSignals = useMemo(() => getAllProductionRiskSignals(), []);

  const blockCount = useMemo(() => allSignals.filter((s) => s.severity === "Block").length, [allSignals]);
  const flagCount  = useMemo(() => allSignals.filter((s) => s.severity === "Flag").length,  [allSignals]);
  const watchCount = useMemo(() => allSignals.filter((s) => s.severity === "Watch").length, [allSignals]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allSignals.filter((s) => {
      if (severityFilter !== "All" && s.severity !== severityFilter) return false;
      if (categoryFilter !== "All" && s.category !== categoryFilter) return false;
      if (q) {
        const hay = `${s.signal} ${s.partName} ${s.partNumber} ${s.mitigation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSignals, severityFilter, categoryFilter, searchQuery]);

  // ── Sorting (flat view) ────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === "severity") {
        const d = (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3);
        return d !== 0 ? d * dir : a.partName.localeCompare(b.partName);
      }
      if (sortBy === "part")     return a.partName.localeCompare(b.partName) * dir;
      if (sortBy === "category") {
        const d = a.category.localeCompare(b.category);
        return d !== 0 ? d * dir : (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3);
      }
      return 0;
    });
  }, [filtered, sortBy, sortDir]);

  // ── Grouped view ───────────────────────────────────────────────────────────

  type PartGroup = {
    partNumber: string;
    partName: string;
    subsystem: string;
    signals: ProductionRiskSignalRow[];
    score: number;
    worstSeverity: "Block" | "Flag" | "Watch";
  };

  const groupedByPart = useMemo((): PartGroup[] => {
    const map = new Map<string, PartGroup>();
    for (const s of filtered) {
      let e = map.get(s.partNumber);
      if (!e) {
        e = {
          partNumber: s.partNumber,
          partName:   s.partName,
          subsystem:  SUBSYSTEM_BY_PART.get(s.partNumber) ?? "—",
          signals:    [],
          score:      0,
          worstSeverity: "Watch",
        };
        map.set(s.partNumber, e);
      }
      e.signals.push(s);
      e.score += SEV_WEIGHT[s.severity] ?? 0;
      if ((SEV_ORDER[s.severity] ?? 3) < (SEV_ORDER[e.worstSeverity] ?? 3)) {
        e.worstSeverity = s.severity as "Block" | "Flag" | "Watch";
      }
    }
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [filtered]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const SortIndicator = ({ col }: { col: SortKey }) =>
    sortBy === col
      ? (sortDir === "asc"
          ? <ChevronUp size={11} color="#1B3A5C" />
          : <ChevronDown size={11} color="#1B3A5C" />)
      : <ChevronsUpDown size={11} color="#CBD5E1" />;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >

      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-5 shrink-0 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">Dashboard</span>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">Production Readiness</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>
              Production Readiness Scorecard
            </h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Design decisions that will prevent scaling — resolve before transitioning to pilot
            </p>
          </div>

          {/* Severity summary — also act as filter toggles */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {(["Block", "Flag", "Watch"] as const).map((sev) => {
              const count = sev === "Block" ? blockCount : sev === "Flag" ? flagCount : watchCount;
              const st    = SEVERITY_SIGNAL_STYLE[sev];
              const active = severityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(active ? "All" : sev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all"
                  style={{
                    background:  active ? st.bg    : "#F8FAFC",
                    borderColor: active ? st.border : "#E2E8F0",
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: active ? st.dot : "#CBD5E1" }}
                  />
                  <span
                    className="text-[14px]"
                    style={{ color: active ? st.text : "#1E293B", fontWeight: 700, lineHeight: 1 }}
                  >
                    {count}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: active ? st.text : "#94A3B8", fontWeight: 500 }}
                  >
                    {sev}
                  </span>
                </button>
              );
            })}
            <div className="w-px h-6 bg-[#E2E8F0]" />
            <span
              className="text-[12px] text-[#94A3B8]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {allSignals.length} total
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter / view control bar ── */}
      <div
        className="px-6 py-3 shrink-0 border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap"
        style={{ background: "#FAFBFD" }}
      >
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signals, parts, mitigations…"
            className="h-8 pl-8 pr-8 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD] focus:ring-2 focus:ring-[#3B82F6]/20 w-64"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X size={12} color="#94A3B8" />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-[#E2E8F0] shrink-0" />

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5">
          <Filter size={12} color="#94A3B8" className="shrink-0" />
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            const cs     = cat !== "All" ? CATEGORY_STYLE[cat] : null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-2.5 py-1 rounded-md text-[11px] border transition-all"
                style={{
                  background:  active && cs ? cs.bg     : active ? "#0F2035" : "#F8FAFC",
                  color:       active && cs ? cs.text   : active ? "white"   : "#64748B",
                  borderColor: active && cs ? cs.border : active ? "#0F2035" : "#E2E8F0",
                  fontWeight:  active ? 600 : 400,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* View toggle + result count (pushed right) */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setGroupByPart(false)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] transition-all"
            style={{
              background:  !groupByPart ? "#0F2035" : "#F8FAFC",
              color:       !groupByPart ? "white"   : "#64748B",
              borderColor: !groupByPart ? "#0F2035" : "#E2E8F0",
            }}
          >
            <List size={13} />
            <span style={{ fontWeight: 500 }}>All signals</span>
          </button>
          <button
            onClick={() => setGroupByPart(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] transition-all"
            style={{
              background:  groupByPart ? "#0F2035" : "#F8FAFC",
              color:       groupByPart ? "white"   : "#64748B",
              borderColor: groupByPart ? "#0F2035" : "#E2E8F0",
            }}
          >
            <LayoutGrid size={13} />
            <span style={{ fontWeight: 500 }}>By part</span>
          </button>
          <div className="w-px h-5 bg-[#E2E8F0]" />
          <span className="text-[11px] text-[#94A3B8]">
            {filtered.length} of {allSignals.length} signals
          </span>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-5">

        {groupByPart ? (

          /* ════════════════════════════════════════
             GROUPED BY PART VIEW
             ════════════════════════════════════════ */
          <div className="space-y-3">
            {groupedByPart.length === 0 ? (
              <EmptyState />
            ) : (
              groupedByPart.map((group) => {
                const groupId = `g-${group.partNumber}`;
                const isOpen  = expandedRows.has(groupId);
                const st      = SEVERITY_SIGNAL_STYLE[group.worstSeverity];

                return (
                  <div
                    key={group.partNumber}
                    className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
                  >
                    {/* ── Part header row ── */}
                    <button
                      onClick={() => toggleRow(groupId)}
                      className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-[#FAFBFD] transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: st.bg, border: `1px solid ${st.border}` }}
                      >
                        <ShieldAlert size={13} color={st.text} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[13px] text-[#0F2035]"
                            style={{ fontWeight: 600 }}
                          >
                            {group.partName.replace(/^RS320 /, "")}
                          </span>
                          <span
                            className="text-[10px] text-[#94A3B8]"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {group.partNumber}
                          </span>
                          {group.subsystem !== "—" && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                              style={{ fontWeight: 500 }}
                            >
                              {fmtSub(group.subsystem)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#94A3B8]">
                          {group.signals.length} signal{group.signals.length !== 1 ? "s" : ""}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded border text-[11px]"
                          style={{
                            background:  st.bg,
                            color:       st.text,
                            borderColor: st.border,
                            fontWeight:  700,
                          }}
                        >
                          {group.worstSeverity}
                        </span>
                        {isOpen
                          ? <ChevronUp   size={14} color="#94A3B8" />
                          : <ChevronDown size={14} color="#94A3B8" />}
                      </div>
                    </button>

                    {/* ── Signal rows (accordion) ── */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[#F1F5F9] divide-y divide-[#F1F5F9]">
                            {group.signals.map((sig, i) => {
                              const rowId  = `${groupId}-${i}`;
                              const rowOpen = expandedRows.has(rowId);
                              const ss = SEVERITY_SIGNAL_STYLE[sig.severity];
                              const cs = CATEGORY_STYLE[sig.category];
                              return (
                                <div key={rowId}>
                                  <button
                                    onClick={() => toggleRow(rowId)}
                                    className="w-full px-5 py-3 flex items-start gap-3 text-left hover:bg-[#FAFBFD] transition-colors"
                                  >
                                    {/* Severity letter chip */}
                                    <span
                                      className="px-1.5 py-0.5 rounded border text-[10px] shrink-0 mt-0.5"
                                      style={{
                                        background:  ss.bg,
                                        color:       ss.text,
                                        borderColor: ss.border,
                                        fontWeight:  700,
                                        fontFamily:  "'IBM Plex Mono', monospace",
                                      }}
                                    >
                                      {sig.severity[0]}
                                    </span>
                                    {/* Category chip */}
                                    {cs && (
                                      <span
                                        className="px-1.5 py-0.5 rounded border text-[10px] shrink-0 mt-0.5"
                                        style={{
                                          background:  cs.bg,
                                          color:       cs.text,
                                          borderColor: cs.border,
                                          fontWeight:  500,
                                          whiteSpace:  "nowrap",
                                        }}
                                      >
                                        {sig.category}
                                      </span>
                                    )}
                                    {/* Signal text */}
                                    <span
                                      className="flex-1 text-[12px] text-[#475569] leading-snug"
                                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                                    >
                                      {sig.signal}
                                    </span>
                                    {rowOpen
                                      ? <ChevronUp   size={13} color="#94A3B8" className="shrink-0 mt-0.5" />
                                      : <ChevronDown size={13} color="#94A3B8" className="shrink-0 mt-0.5" />}
                                  </button>

                                  {/* Mitigation (accordion) */}
                                  <AnimatePresence initial={false}>
                                    {rowOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.14 }}
                                        className="overflow-hidden"
                                      >
                                        <div
                                          className="mx-5 mb-3 px-4 py-3 rounded-lg flex items-start gap-2"
                                          style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
                                        >
                                          <ArrowRight size={12} color="#059669" className="shrink-0 mt-0.5" />
                                          <div>
                                            <p
                                              className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1"
                                              style={{ fontWeight: 500 }}
                                            >
                                              Mitigation Path
                                            </p>
                                            <p
                                              className="text-[12px] text-[#166534] leading-snug"
                                              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                                            >
                                              {sig.mitigation}
                                            </p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

        ) : (

          /* ════════════════════════════════════════
             FLAT SORTABLE TABLE VIEW (default)
             ════════════════════════════════════════ */
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full" style={{ borderCollapse: "collapse", tableLayout: "auto" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>

                  {/* Severity — sortable */}
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:bg-[#F1F5F9] transition-colors select-none w-[100px]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    onClick={() => handleSort("severity")}
                  >
                    <div className="flex items-center gap-1">
                      Severity
                      <SortIndicator col="severity" />
                    </div>
                  </th>

                  {/* Part — sortable */}
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:bg-[#F1F5F9] transition-colors select-none w-[180px]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    onClick={() => handleSort("part")}
                  >
                    <div className="flex items-center gap-1">
                      Part
                      <SortIndicator col="part" />
                    </div>
                  </th>

                  {/* Part # — not sortable */}
                  <th
                    className="px-3 py-3 text-left w-[118px]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    Part #
                  </th>

                  {/* Subsystem — not sortable */}
                  <th
                    className="px-3 py-3 text-left w-[108px]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    Subsystem
                  </th>

                  {/* Category — sortable */}
                  <th
                    className="px-3 py-3 text-left cursor-pointer hover:bg-[#F1F5F9] transition-colors select-none w-[102px]"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-1">
                      Category
                      <SortIndicator col="category" />
                    </div>
                  </th>

                  {/* Signal — takes remaining width */}
                  <th
                    className="px-3 py-3 text-left"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    Signal
                  </th>

                  {/* Expand icon */}
                  <th className="w-[32px]" />
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search size={24} color="#CBD5E1" />
                        <p
                          className="text-[13px] text-[#94A3B8]"
                          style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                        >
                          No signals match your filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sorted.map((sig, idx) => {
                    const rowId     = `f-${sig.partNumber}-${idx}`;
                    const isExpanded = expandedRows.has(rowId);
                    const ss  = SEVERITY_SIGNAL_STYLE[sig.severity];
                    const cs  = CATEGORY_STYLE[sig.category];
                    const sub = SUBSYSTEM_BY_PART.get(sig.partNumber);
                    const isEven = idx % 2 === 0;

                    return (
                      <Fragment key={rowId}>
                        {/* ── Data row ── */}
                        <tr
                          onClick={() => toggleRow(rowId)}
                          className="cursor-pointer transition-colors group"
                          style={{
                            background:   isExpanded ? "#EFF6FF" : isEven ? "#FFFFFF" : "#FAFBFD",
                            borderBottom: isExpanded ? "none" : "1px solid #F1F5F9",
                            borderLeft:   isExpanded ? "3px solid #2563EB" : "3px solid transparent",
                          }}
                        >
                          {/* Severity badge */}
                          <td className="px-3 py-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px]"
                              style={{
                                background:  ss.bg,
                                color:       ss.text,
                                borderColor: ss.border,
                                fontWeight:  700,
                                whiteSpace:  "nowrap",
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: ss.dot }}
                              />
                              {sig.severity}
                            </span>
                          </td>

                          {/* Part name */}
                          <td className="px-3 py-3">
                            <span
                              className="text-[12px] text-[#1E293B]"
                              style={{ fontWeight: 600, display: "block" }}
                            >
                              {sig.partName.replace(/^RS320 /, "")}
                            </span>
                          </td>

                          {/* Part number */}
                          <td className="px-3 py-3">
                            <span
                              className="text-[10px] text-[#94A3B8]"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              {sig.partNumber}
                            </span>
                          </td>

                          {/* Subsystem */}
                          <td className="px-3 py-3">
                            {sub && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                                style={{ fontWeight: 500, whiteSpace: "nowrap" }}
                              >
                                {fmtSub(sub)}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3">
                            {cs && (
                              <span
                                className="px-2 py-0.5 rounded border text-[11px]"
                                style={{
                                  background:  cs.bg,
                                  color:       cs.text,
                                  borderColor: cs.border,
                                  fontWeight:  500,
                                  whiteSpace:  "nowrap",
                                }}
                              >
                                {sig.category}
                              </span>
                            )}
                          </td>

                          {/* Signal text */}
                          <td className="px-3 py-3">
                            <span
                              className="text-[12px] text-[#475569] leading-snug"
                              style={{ display: "block", fontFamily: "'IBM Plex Sans', sans-serif" }}
                            >
                              {sig.signal}
                            </span>
                          </td>

                          {/* Expand chevron */}
                          <td className="px-2 py-3 text-center">
                            {isExpanded
                              ? <ChevronUp   size={13} color="#2563EB" />
                              : <ChevronDown size={13} className="text-[#CBD5E1] group-hover:text-[#475569] transition-colors" />}
                          </td>
                        </tr>

                        {/* ── Expanded mitigation sub-row ── */}
                        {isExpanded && (
                          <tr
                            style={{
                              background:   "#EFF6FF",
                              borderBottom: "1px solid #DBEAFE",
                              borderLeft:   "3px solid #2563EB",
                            }}
                          >
                            <td colSpan={7} className="px-4 pb-3 pt-0">
                              <div
                                className="flex items-start gap-3 px-4 py-3 rounded-lg"
                                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
                              >
                                <ArrowRight size={13} color="#059669" className="shrink-0 mt-0.5" />
                                <div>
                                  <p
                                    className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1"
                                    style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                                  >
                                    Mitigation Path
                                  </p>
                                  <p
                                    className="text-[12px] text-[#166534] leading-snug"
                                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                                  >
                                    {sig.mitigation}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Table footer */}
            <div
              className="px-5 py-3 border-t border-[#E2E8F0] flex items-center justify-between"
              style={{ background: "#FAFBFD" }}
            >
              <p className="text-[11px] text-[#94A3B8]">
                {filtered.length} signal{filtered.length !== 1 ? "s" : ""} shown · Assembly 845-000112 · prototype → production transition
              </p>
              <div className="flex items-center gap-4">
                {(["Block", "Flag", "Watch"] as const).map((sev) => {
                  const count = filtered.filter((s) => s.severity === sev).length;
                  if (count === 0) return null;
                  const st = SEVERITY_SIGNAL_STYLE[sev];
                  return (
                    <div key={sev} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                      <span className="text-[11px]" style={{ color: st.text, fontWeight: 700 }}>
                        {count}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">{sev}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
