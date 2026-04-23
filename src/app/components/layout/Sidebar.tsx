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
    <aside className="w-56 shrink-0 h-full flex flex-col bg-brand-900">
      {/* Assembly context */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs uppercase tracking-widest text-brand-500">
            Active Assembly
          </span>
          <ChevronRight size={10} className="text-brand-500" />
        </div>
        <p className="text-sm text-white/90 font-medium">RS320-02 Assembly</p>
        <p className="text-xs text-brand-500 mt-0.5">845-000112</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/bom-analysis" && location.pathname.startsWith("/part/"));
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-base text-left transition-all ${
                isActive
                  ? "bg-white/10 text-white font-semibold"
                  : "text-brand-500 hover:bg-white/5 hover:text-white/80 font-normal"
              }`}
            >
              <Icon
                size={14}
                style={{ color: isActive ? "#4DB6E5" : "#4A6F8A" }}
              />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-brand-500">Analysis ready</span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-2xs text-brand-950/60">
            <span className="text-brand-500">Assembly:</span> 845-000112
          </p>
          <p className="text-2xs text-brand-950/60">
            <span className="text-brand-500">Dataset:</span> v1 (BOM + STEP + drawings)
          </p>
          <p className="text-2xs text-brand-950/60">
            <span className="text-brand-500">Last updated:</span> Mar 5, 2026
          </p>
        </div>
      </div>
    </aside>
  );
}
