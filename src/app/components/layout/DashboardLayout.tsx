import { Outlet } from "react-router";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { CostModelProvider } from "../../context/CostModelContext";
import { AppModeProvider } from "../../context/AppModeContext";
import { BuildTargetProvider } from "../../context/BuildTargetContext";

export function DashboardLayout() {
  return (
    <AppModeProvider>
    <BuildTargetProvider>
    <CostModelProvider>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#F0F4F8" }}
      >
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </CostModelProvider>
    </BuildTargetProvider>
    </AppModeProvider>
  );
}