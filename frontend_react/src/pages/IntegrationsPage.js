import React from "react";

/**
 * Integrations configuration.
 * TODO(DPR-V2-FR-030): integration hooks (Collibra + Immuta).
 * TODO(DPR-V2-FR-034): surface version/decision inputs returned by API.
 */
export function IntegrationsPage() {
  return (
    <div className="page">
      <h1 className="page__title">Integrations</h1>
      <p className="page__subtitle">
        Configure/mock Collibra and Immuta hooks. (Scaffold only)
      </p>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Collibra</div>
        <p style={{ margin: 0, color: "#6b7280" }}>
          TODO: configuration form + status indicator.
        </p>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Immuta</div>
        <p style={{ margin: 0, color: "#6b7280" }}>
          TODO: configuration form + status indicator.
        </p>
      </div>
    </div>
  );
}
