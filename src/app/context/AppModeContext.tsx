import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppMode = "prototype" | "production";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppModeContext = createContext<AppModeContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) return { mode: "prototype", setMode: () => { /* no-op outside provider */ } };
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "appMode";

function readStoredMode(): AppMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "production" ? "production" : "prototype";
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(readStoredMode);

  const setMode = (next: AppMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  );
}
