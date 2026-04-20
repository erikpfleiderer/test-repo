import { createHashRouter, Navigate } from "react-router";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Overview } from "./components/pages/Overview";
import { EmptyPage } from "./components/pages/EmptyPage";
import { UploadAnalysis } from "./components/pages/UploadAnalysis";
import { CostInterventions } from "./components/pages/CostInterventions";
import { PartAnalysis } from "./components/pages/PartAnalysis";
import { SubsystemAnalysis } from "./components/pages/SubsystemAnalysis";
import { DFMOpportunities } from "./components/pages/DFMOpportunities";
import { MaterialOptimization } from "./components/pages/MaterialOptimization";
import { ManufacturingTransition } from "./components/pages/ManufacturingTransition";
import { BOMAnalysis } from "./components/pages/BOMAnalysis";
import { GeometryAnalysis } from "./components/pages/GeometryAnalysis";
import { ProductionReadiness } from "./components/pages/ProductionReadiness";
import { FileText, Download } from "lucide-react";

export const router = createHashRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, element: <Navigate to="/upload" replace /> },
      { path: "overview", Component: Overview },
      { path: "upload", Component: UploadAnalysis },
      { path: "analysis", Component: UploadAnalysis },
      { path: "cost-interventions", Component: CostInterventions },
      { path: "part/:partNumber", Component: PartAnalysis },
      { path: "subsystem-analysis", Component: SubsystemAnalysis },
      { path: "dfm-opportunities", Component: DFMOpportunities },
      { path: "material-optimization", Component: MaterialOptimization },
      { path: "manufacturing-transition", Component: ManufacturingTransition },
      { path: "bom-analysis", Component: BOMAnalysis },
      { path: "geometry-analysis",    Component: GeometryAnalysis },
      { path: "production-readiness", Component: ProductionReadiness },
      {
        path: "reports",
        element: (
          <EmptyPage
            title="Reports"
            description="Generate and download engineering cost intelligence reports"
            icon={FileText}
            color="#0891B2"
          />
        ),
      },
      {
        path: "export",
        element: (
          <EmptyPage
            title="Export"
            description="Export analysis data, charts, and findings to external formats"
            icon={Download}
            color="#059669"
          />
        ),
      },
    ],
  },
]);
