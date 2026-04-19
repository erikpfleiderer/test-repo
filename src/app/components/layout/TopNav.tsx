import { useNavigate, useLocation } from "react-router";
import {
  FolderOpen,
  Upload,
  BarChart2,
  FileText,
  Download,
  Cpu,
  ChevronDown,
  Bell,
  Search,
} from "lucide-react";
import { useAppMode, type AppMode } from "../../context/AppModeContext";

const navItems = [
  { label: "Projects", icon: FolderOpen, path: "/overview" },
  { label: "Upload Files", icon: Upload, path: "/upload" },
  { label: "Analysis", icon: BarChart2, path: "/analysis" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Export", icon: Download, path: "/export" },
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
        onClick={() => navigate("/upload")}
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

      {/* Mode selector */}
      <div
        className="flex items-center rounded-md p-0.5 gap-0.5"
        style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}
      >
        {modes.map(({ value, label }) => {
          const isActive = mode === value;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              className="px-3 py-1 rounded text-[12px] transition-all duration-150"
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
              {label}
            </button>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] text-[13px] hover:border-[#CBD5E1] transition-colors" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
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
          <ChevronDown size={13} className="text-[#94A3B8]" />
        </button>
      </div>
    </header>
  );
}