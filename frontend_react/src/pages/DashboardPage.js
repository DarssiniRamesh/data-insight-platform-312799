import React from "react";

/**
 * Approvals / Publishing dashboard (workflow hub).
 * TODO(DPR-V2-FR-010..015): list drafts and show status badges and gate failures.
 * TODO(DPR-V2-NFR-050): long-running status visibility (validation polling).
 */
export function DashboardPage() {
  return (
    <div className="page">
      <h1 className="page__title">Dashboard</h1>
      <p className="page__subtitle">
        Approvals & publishing hub. This is scaffolding (UI + routing baseline).
      </p>

      <div className="card">
        <div className="kv">
          <div className="kv__k">Planned route</div>
          <div className="kv__v">
            <code>/dashboard</code>
          </div>

          <div className="kv__k">Next step</div>
          <div className="kv__v">
            Wire list of drafts (backend may expose drafts listing in implementation; if not, use existing backend endpoints).
          </div>
        </div>
      </div>
    </div>
  );
}
