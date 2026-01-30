import React, { useState } from "react";
import { v2WorkflowApi } from "../api/v2WorkflowApi";

/**
 * Audit log viewer.
 * TODO(DPR-V2-FR-070..074): list audit events, filter by draft/product/event type, show UTC timestamps.
 * TODO(DPR-V2-NFR-010..014): ALCOA+ expectations (presentation only; backend authoritative).
 */
export function AuditLogPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  async function loadSample() {
    setBusy(true);
    setError(null);
    try {
      const res = await v2WorkflowApi.listAuditEvents({});
      setItems(res?.items || []);
    } catch (e) {
      setError(e);
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">Audit Log</h1>
      <p className="page__subtitle">Append-only audit inspection (scaffold).</p>

      {error ? (
        <div className="alert alert--error" role="alert" aria-live="polite">
          <div className="alert__title">
            Request failed ({error.httpStatus || "?"} / {error.code || "UnknownError"})
          </div>
          <p className="alert__body">{error.message}</p>
        </div>
      ) : null}

      <div className="card">
        <div className="btnRow">
          <button className="btn btnPrimary" onClick={loadSample} disabled={busy}>
            {busy ? "Loading…" : "Load audit events (scaffold)"}
          </button>
        </div>

        {items.length === 0 ? (
          <p style={{ color: "#6b7280", marginTop: 12, marginBottom: 0 }}>
            No items loaded yet.
          </p>
        ) : (
          <pre className="codeBlock" style={{ marginTop: 12 }}>
            {JSON.stringify(items.slice(0, 20), null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
