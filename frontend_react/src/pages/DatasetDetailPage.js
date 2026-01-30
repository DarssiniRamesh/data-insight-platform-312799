import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { v2WorkflowApi } from "../api/v2WorkflowApi";
import { GateFailureBanner } from "../components/gates/GateFailureBanner";

/**
 * Dataset detail (draft-centric).
 * TODO(DPR-V2-FR-010..015): run validation + evaluate gates + show results.
 * TODO(DPR-V2-FR-040..043): approvals UX + SoD/e-sign errors (422).
 * TODO(DPR-V2-FR-050..054): publish UX + evidence package display.
 */
export function DatasetDetailPage() {
  const { draftId } = useParams();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastGateResult, setLastGateResult] = useState(null);

  const sampleEvaluatePayload = useMemo(
    () => ({
      stage: "validate",
      rule_pack_refs: [
        {
          scope: "global",
          rule_pack_id: "GXP-RULEPACK-global-baseline",
          rule_pack_version: "1.0.0"
        }
      ]
    }),
    []
  );

  async function evaluateGates() {
    setBusy(true);
    setError(null);
    setLastGateResult(null);
    try {
      const res = await v2WorkflowApi.evaluateGates(draftId, sampleEvaluatePayload);
      setLastGateResult(res);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">Dataset detail</h1>
      <p className="page__subtitle">
        Draft ID: <code>{draftId}</code>
      </p>

      <div className="btnRow" style={{ marginBottom: 12 }}>
        <button className="btn btnPrimary" onClick={evaluateGates} disabled={busy}>
          {busy ? "Evaluating…" : "Evaluate gates (scaffold)"}
        </button>
        <Link className="btn" to={`/datasets/${encodeURIComponent(draftId)}/policies`}>
          Access policies
        </Link>
      </div>

      <GateFailureBanner error={error} />
      {error && error.httpStatus !== 422 ? (
        <div className="alert alert--error" role="alert" aria-live="polite">
          <div className="alert__title">
            Request failed ({error.httpStatus || "?"} / {error.code || "UnknownError"})
          </div>
          <p className="alert__body">{error.message}</p>
        </div>
      ) : null}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Planned tabs (placeholder)</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#6b7280" }}>
          <li>Overview</li>
          <li>Validation & Gates</li>
          <li>Approvals</li>
          <li>Publish & Evidence</li>
          <li>Audit (filtered)</li>
        </ul>
      </div>

      {lastGateResult ? (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Gate evaluation result</div>
          <pre className="codeBlock">{JSON.stringify(lastGateResult, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
