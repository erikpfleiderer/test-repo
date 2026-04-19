import { useNavigate, useLocation } from "react-router";
import { ChevronRight } from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";
import { MODE_NAV_ITEMS } from "../../data/navConfig";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useAppMode();
  const navItems = MODE_NAV_ITEMS[mode];

  return (
    <aside
      className="w-56 shrink-0 h-full flex flex-col"
      style={{ background: "#0F2035", fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Assembly context */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest text-[#4A7FA5]">
            Active Assembly
          </span>
          <ChevronRight size={10} className="text-[#4A7FA5]" />
        </div>
        <p className="text-[12px] text-white/90" style={{ fontWeight: 500 }}>RS320-02 Assembly</p>
        <p className="text-[11px] text-[#4A7FA5] mt-0.5">845-000112</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-left transition-all ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-[#7FA8C9] hover:bg-white/5 hover:text-white/80"
              }`}
              style={{ fontWeight: isActive ? 500 : 400 }}
            >
              <Icon
                size={14}
                className={isActive ? "text-[#4DB6E5]" : "text-[#4A6F8A]"}
              />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-[#4DB6E5]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-[11px] text-[#4A7FA5]">Analysis ready</span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-[#2B5472]">
            <span className="text-[#4A7FA5]">Assembly:</span> 845-000112
          </p>
          <p className="text-[10px] text-[#2B5472]">
            <span className="text-[#4A7FA5]">Dataset:</span> v1 (BOM + STEP + drawings)
          </p>
          <p className="text-[10px] text-[#2B5472]">
            <span className="text-[#4A7FA5]">Last updated:</span> Mar 5, 2026
          </p>
        </div>
      </div>
    </aside>
  );
}