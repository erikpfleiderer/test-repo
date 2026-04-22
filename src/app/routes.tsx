import { createHashRouter, Navigate } from "react-router";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { EmptyPage } from "./components/pages/EmptyPage";
import { UploadAnalysis } from "./components/pages/UploadAnalysis";
import { PartAnalysis } from "./components/pages/PartAnalysis";
import { BOMAnalysis } from "./components/pages/BOMAnalysis";
import { CostInterventions } from "./components/pages/CostInterventions";
import { DFMOpportunities } from "./components/pages/DFMOpportunities";
import { FileText, Download } from "lucide-react";

export const router = createHashRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true,                      element: <Navigate to="/bom-analysis" replace /> },
      // Legacy routes — all redirect to BOM Analysis (except cost-interventions)
      { path: "overview",                 element: <Navigate to="/bom-analysis" replace /> },
      { path: "production-readiness",     element: <Navigate to="/bom-analysis" replace /> },
      { path: "subsystem-analysis",       element: <Navigate to="/bom-analysis" replace /> },
      { path: "dfm-opportunities",        Component: DFMOpportunities },
      { path: "geometry-analysis",        element: <Navigate to="/bom-analysis" replace /> },
      { path: "material-optimization",    element: <Navigate to="/bom-analysis" replace /> },
      { path: "manufacturing-transition", element: <Navigate to="/bom-analysis" replace /> },
      // Active routes
      { path: "upload",                   Component: UploadAnalysis },
      { path: "analysis",                 Component: UploadAnalysis },
      { path: "bom-analysis",             Component: BOMAnalysis },
      { path: "cost-interventions",       Component: CostInterventions },
      { path: "part/:partNumber",         Component: PartAnalysis },
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
