import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { RegistrationPage } from "../pages/RegistrationPage";
import { AccessPoliciesPage } from "../pages/AccessPoliciesPage";
import { IntegrationsPage } from "../pages/IntegrationsPage";
import { AuditLogPage } from "../pages/AuditLogPage";
import { DatasetDetailPage } from "../pages/DatasetDetailPage";
import { NotFoundPage } from "../pages/NotFoundPage";

/**
 * Router definition intentionally explicit and stable to support deterministic E2E tests.
 * Matches the V2 implementation plan under kavia-docs/CodeWiki/Specs/FeatureSpecs/react-v2-implementation-plan.md.
 */
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "register", element: <RegistrationPage /> },
      { path: "datasets/:draftId", element: <DatasetDetailPage /> },
      { path: "datasets/:draftId/policies", element: <AccessPoliciesPage /> },
      { path: "integrations", element: <IntegrationsPage /> },
      { path: "audit", element: <AuditLogPage /> }
    ]
  },
  { path: "*", element: <NotFoundPage /> }
]);
