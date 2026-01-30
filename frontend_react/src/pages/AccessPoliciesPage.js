import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { v2WorkflowApi } from "../api/v2WorkflowApi";

/**
 * Access Policies editor (deny-by-default).
 * TODO(DPR-V2-FR-031, DPR-V2-FR-032): policy grant + enforcement visibility.
 * This page targets backend test-validated endpoints:
 * - POST /v2/policies/grant
 * - POST /v2/protected/operation (expects 403 PolicyDenied if no grant)
 */
export function AccessPoliciesPage() {
  const { draftId } = useParams();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  async function grantSamplePolicy() {
    setBusy(true);
    setError(null);
    setLastResponse(null);
    try {
      const res = await v2WorkflowApi.grantPolicy({
        product_id: `product_for_${draftId}`,
        role: "steward"
      });
      setLastResponse(res);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function tryProtectedOperation() {
    setBusy(true);
    setError(null);
    setLastResponse(null);
    try {
      const res = await v2WorkflowApi.protectedOperation({ draft_id: draftId }, "steward");
      setLastResponse(res);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">Access Policies</h1>
      <p className="page__subtitle">
        Draft: <code>{draftId}</code>. This scaffold is designed to make deny-by-default failures visible.
      </p>

      {error ? (
        <div className="alert alert--error" role="alert" aria-live="polite">
          <div className="alert__title">
            Request failed ({error.httpStatus || "?"} / {error.code || "UnknownError"})
          </div>
          <p className="alert__body">{error.message}</p>
          {error.correlationId ? (
            <p className="alert__body">
              Correlation ID: <code>{error.correlationId}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="btnRow">
          <button className="btn btnPrimary" onClick={grantSamplePolicy} disabled={busy}>
            {busy ? "Working…" : "Grant sample policy (scaffold)"}
          </button>
          <button className="btn" onClick={tryProtectedOperation} disabled={busy}>
            {busy ? "Working…" : "Try protected op (expect 403 w/o grant)"}
          </button>
        </div>

        {lastResponse ? (
          <pre className="codeBlock" style={{ marginTop: 12 }}>
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
