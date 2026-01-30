import React from "react";

/**
 * Displays gate failure details for HTTP 422 errors.
 * Intended to support negative testing scenarios and actionable feedback (DPR-V2-NFR-051).
 */
export function GateFailureBanner({ error }) {
  if (!error) return null;

  const isGateFailure =
    error.httpStatus === 422 &&
    (error.code === "FreshnessCheckFailed" || error.code === "GateComplianceFailed");

  if (!isGateFailure) return null;

  return (
    <div className="alert alert--error" role="alert" aria-live="polite">
      <div className="alert__title">Gate failure: {error.code}</div>
      <p className="alert__body">
        {error.message} {error.stage ? <span>Stage: <strong>{error.stage}</strong>.</span> : null}
      </p>

      {Array.isArray(error.failingGates) && error.failingGates.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Failing gates</div>
          <div className="card" style={{ padding: 12 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {error.failingGates.map((g, idx) => (
                <li key={`${g.gate_id || g.gateId || "gate"}-${idx}`} style={{ marginBottom: 8 }}>
                  <div>
                    <strong>{g.gate_name || g.gateName || g.gate_id || g.gateId}</strong>{" "}
                    <span style={{ color: "#6b7280" }}>
                      ({g.severity || "BLOCK"} / {g.status || "FAIL"})
                    </span>
                  </div>
                  {g.message ? <div style={{ color: "#6b7280" }}>{g.message}</div> : null}
                  {g.metric && g.metric.name ? (
                    <div style={{ color: "#6b7280" }}>
                      Metric: <code>{g.metric.name}</code>{" "}
                      {g.metric.comparator ? <span>{g.metric.comparator}</span> : null}{" "}
                      {typeof g.metric.expected !== "undefined" ? (
                        <span>expected {String(g.metric.expected)}</span>
                      ) : null}
                      {typeof g.metric.observed !== "undefined" ? (
                        <span>, observed {String(g.metric.observed)}</span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {Array.isArray(error.evidenceRefs) && error.evidenceRefs.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Evidence references</div>
          <div className="card" style={{ padding: 12 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {error.evidenceRefs.map((e, idx) => (
                <li key={`${e.artifact_id || e.artifactId || "evidence"}-${idx}`}>
                  <span>
                    {e.artifact_type || e.artifactType}: <code>{e.artifact_id || e.artifactId}</code>
                  </span>
                  {e.hash_sha256 || e.hashSha256 ? (
                    <span style={{ color: "#6b7280" }}> (sha256: {(e.hash_sha256 || e.hashSha256).slice(0, 12)}…)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {error.correlationId ? (
        <p className="alert__body" style={{ marginTop: 10 }}>
          Correlation ID: <code>{error.correlationId}</code>
        </p>
      ) : null}
    </div>
  );
}
