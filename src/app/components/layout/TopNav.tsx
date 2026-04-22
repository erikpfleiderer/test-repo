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
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center px-4 gap-6 z-50 shrink-0">
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 cursor-pointer select-none mr-2"
        onClick={() => navigate("/bom-analysis")}
      >
        <div className="w-7 h-7 rounded-md bg-[#1B3A5C] flex items-center justify-center">
          <Cpu size={14} className="text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[11px] tracking-widest uppercase text-[#64748B]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>FICTIV</span>
          <span className="text-[13px] text-[#0F2035]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>Compass</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-[#E2E8F0]" />

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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-[#EFF4FA] text-[#1B3A5C]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1B3A5C]"
              }`}
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: isActive ? 500 : 400 }}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode selector — full labels ≥900px, icon-only pills below */}
      <div
        className="flex items-center rounded-md p-0.5 gap-0.5"
        style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}
      >
        {modes.map(({ value, label }) => {
          const isActive = mode === value;
          const Icon = value === "production"
            ? () => <span className="text-[10px] font-bold" style={{ color: isActive ? "#059669" : "#94A3B8" }}>P</span>
            : () => <span className="text-[10px] font-bold" style={{ color: isActive ? "#1B3A5C" : "#94A3B8" }}>β</span>;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              title={label}
              aria-label={`Switch to ${label} mode`}
              aria-pressed={isActive}
              className="px-3 py-1 rounded text-[12px] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-400"
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: isActive ? 600 : 400,
                background: isActive ? "#fff" : "transparent",
                color: isActive
                  ? value === "production" ? "#059669" : "#1B3A5C"
                  : "#94A3B8",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                border: isActive
                  ? `1px solid ${value === "production" ? "#D1FAE5" : "#DBEAFE"}`
                  : "1px solid transparent",
              }}
            >
              {/* Full label on wide screens, abbreviated on narrow */}
              <span className="hidden min-[900px]:inline">{label}</span>
              <span className="inline min-[900px]:hidden">
                <Icon />
              </span>
            </button>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search — hidden below 900px to save space */}
        <button
          className="hidden min-[900px]:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] text-[13px] hover:border-[#CBD5E1] transition-colors"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <Search size={13} />
          <span>Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[#E2E8F0] text-[#64748B]">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
          <Bell size={16} />
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-[#F1F5F9] transition-colors">
          <div className="w-7 h-7 rounded-full bg-[#1B3A5C] flex items-center justify-center text-white text-[11px]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
            ME
          </div>
          <ChevronDown size={13} className="hidden min-[900px]:block text-[#94A3B8]" />
        </button>
      </div>
    </header>
  );
}