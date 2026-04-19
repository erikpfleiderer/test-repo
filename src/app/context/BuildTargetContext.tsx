import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { PROTOTYPE_ASSEMBLY } from "../data/prototypeData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuildTargetContextValue {
  /** ISO date string "YYYY-MM-DD" — user-configurable next build target date. */
  buildTargetDate: string;
  /** How many calendar days the build itself takes once all parts are in hand. */
  estimatedBuildDays: number;
  /** User-managed set of part numbers on the critical path. */
  criticalPathParts: string[];
  setBuildTargetDate: (date: string) => void;
  setEstimatedBuildDays: (days: number) => void;
  /** Toggle a part number on/off the critical path. */
  toggleCriticalPath: (partNumber: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BuildTargetContext = createContext<BuildTargetContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBuildTarget(): BuildTargetContextValue {
  const ctx = useContext(BuildTargetContext);
  if (!ctx) {
    // Safe fallback outside provider — returns the hardcoded default values
    return {
      buildTargetDate: PROTOTYPE_ASSEMBLY.nextBuildTargetDate ?? "",
      estimatedBuildDays: PROTOTYPE_ASSEMBLY.estimatedBuildDays,
      criticalPathParts: PROTOTYPE_ASSEMBLY.criticalPathParts,
      setBuildTargetDate: () => { /* no-op outside provider */ },
      setEstimatedBuildDays: () => { /* no-op outside provider */ },
      toggleCriticalPath: () => { /* no-op outside provider */ },
    };
  }
  return ctx;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const DATE_KEY = "proto_buildTargetDate";
const DAYS_KEY = "proto_estimatedBuildDays";
const CP_KEY   = "proto_criticalPathParts";

function readStoredDate(): string {
  return (
    localStorage.getItem(DATE_KEY) ??
    PROTOTYPE_ASSEMBLY.nextBuildTargetDate ??
    ""
  );
}

function readStoredDays(): number {
  const stored = localStorage.getItem(DAYS_KEY);
  if (stored) {
    const v = parseInt(stored, 10);
    if (!isNaN(v) && v > 0) return v;
  }
  return PROTOTYPE_ASSEMBLY.estimatedBuildDays;
}

function readStoredCriticalPath(): string[] {
  const stored = localStorage.getItem(CP_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      // fall through to default
    }
  }
  return PROTOTYPE_ASSEMBLY.criticalPathParts;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BuildTargetProvider({ children }: { children: ReactNode }) {
  const [buildTargetDate, setBuildTargetDateState] = useState<string>(readStoredDate);
  const [estimatedBuildDays, setEstimatedBuildDaysState] = useState<number>(readStoredDays);
  const [criticalPathParts, setCriticalPathPartsState] = useState<string[]>(readStoredCriticalPath);

  const setBuildTargetDate = (date: string) => {
    localStorage.setItem(DATE_KEY, date);
    setBuildTargetDateState(date);
  };

  const setEstimatedBuildDays = (days: number) => {
    localStorage.setItem(DAYS_KEY, String(days));
    setEstimatedBuildDaysState(days);
  };

  const toggleCriticalPath = (partNumber: string) => {
    setCriticalPathPartsState((prev) => {
      const next = prev.includes(partNumber)
        ? prev.filter((p) => p !== partNumber)
        : [...prev, partNumber];
      localStorage.setItem(CP_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <BuildTargetContext.Provider
      value={{ buildTargetDate, estimatedBuildDays, criticalPathParts, setBuildTargetDate, setEstimatedBuildDays, toggleCriticalPath }}
    >
      {children}
    </BuildTargetContext.Provider>
  );
}
