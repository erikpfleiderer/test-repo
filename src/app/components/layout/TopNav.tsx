import { useNavigate, useLocation } from "react-router";
import { List, Upload, Cpu, Search, Bell, ChevronDown } from "lucide-react";
import { useAppMode, type AppMode } from "../../context/AppModeContext";

const navItems = [
  { label: "BOM Analysis",  icon: List,   path: "/bom-analysis" },
  { label: "Upload Files",  icon: Upload, path: "/upload" },
];

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useAppMode();

  const modes: { value: AppMode; label: string }[] = [
    { value: "prototype", label: "Prototype" },
    { value: "production", label: "Production" },
  ];

  return (
    <header className="h-14 bg-surface-card border-b border-border flex items-center px-4 gap-6 z-50 shrink-0">
      {/* Brand */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none mr-2"
        onClick={() => navigate("/bom-analysis")}
      >
        <div className="w-7 h-7 rounded-md bg-brand-800 flex items-center justify-center">
          <Cpu size={14} className="text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-2xs tracking-widest uppercase text-text-muted">FICTIV</span>
          <span className="text-base font-semibold text-brand-900">Compass</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Nav Items */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/bom-analysis" && location.pathname.startsWith("/part/")) ||
            (item.path === "/upload" && location.pathname === "/");
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-base transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-800 font-medium"
                  : "text-text-muted hover:bg-surface-subtle hover:text-brand-800 font-normal"
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode selector */}
      <div className="flex items-center rounded-md p-1 gap-1 bg-surface-subtle border border-border">
        {modes.map(({ value, label }) => {
          const isActive = mode === value;
          const glyph = value === "production"
            ? <span className="text-2xs font-bold" style={{ color: isActive ? "#059669" : undefined }}>P</span>
            : <span className="text-2xs font-bold" style={{ color: isActive ? undefined : "#94A3B8" }}>β</span>;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              title={label}
              aria-label={`Switch to ${label} mode`}
              aria-pressed={isActive}
              className={`px-3 py-1 rounded text-base transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-400 ${
                isActive
                  ? "bg-surface-card shadow-sm font-semibold"
                  : "font-normal text-text-subtle hover:text-text-secondary"
              }`}
              style={
                isActive
                  ? {
                      color: value === "production" ? "#059669" : undefined,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: value === "production" ? "#D1FAE5" : "#DBEAFE",
                    }
                  : undefined
              }
            >
              <span className="hidden min-[900px]:inline">{label}</span>
              <span className="inline min-[900px]:hidden">{glyph}</span>
            </button>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="hidden min-[900px]:flex items-center gap-2 px-3 py-2 rounded-md bg-surface-muted border border-border text-text-subtle text-base hover:border-border-strong transition-colors">
          <Search size={13} />
          <span>Search...</span>
          <kbd className="ml-2 px-1 py-0.5 rounded text-2xs bg-border text-text-muted">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-subtle transition-colors">
          <Bell size={16} />
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-surface-subtle transition-colors">
          <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-white text-2xs font-semibold">
            ME
          </div>
          <ChevronDown size={13} className="hidden min-[900px]:block text-text-subtle" />
        </button>
      </div>
    </header>
  );
}
