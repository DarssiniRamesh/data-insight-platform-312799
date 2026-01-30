import React, { useState } from "react";
import { v2WorkflowApi } from "../api/v2WorkflowApi";
import { GateFailureBanner } from "../components/gates/GateFailureBanner";

/**
 * Registration page (draft creation).
 * TODO(DPR-V2-FR-001, DPR-V2-FR-002): draft creation UI -> POST /v2/drafts.
 * TODO(DPR-V2-FR-010): optional Save & Submit -> POST /v2/drafts/{draft_id}/submit.
 * TODO(DPR-V2-NFR-051): actionable error feedback, including InvalidInput field errors.
 */
export function RegistrationPage() {
  const [lastDraft, setLastDraft] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function createSampleDraft() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        product_name: "Sample Data Product",
        classification: "Regulated",
        schema_ref: { schema_id: "schema-sample", schema_version: "1.0.0" },
        dataset_ref: { uri: "s3://bucket/sample.csv", format: "csv" },
        update_frequency: "daily",
        max_age_hours: 24,
        lineage: { source_system: "SampleSystem", upstream_job: "sample_job" }
      };

      const draft = await v2WorkflowApi.createDraft(payload);
      setLastDraft(draft);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">Registration</h1>
      <p className="page__subtitle">
        Create a Draft record for a data product. This is a scaffold with a sample action.
      </p>

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
        <div className="btnRow">
          <button className="btn btnPrimary" onClick={createSampleDraft} disabled={busy}>
            {busy ? "Creating…" : "Create sample draft (scaffold)"}
          </button>
        </div>

        {lastDraft ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Created draft</div>
            <div className="kv">
              <div className="kv__k">draft_id</div>
              <div className="kv__v">
                <code>{lastDraft.draft_id || lastDraft.draftId}</code>
              </div>
              <div className="kv__k">status</div>
              <div className="kv__v">
                <code>{lastDraft.status}</code>
              </div>
            </div>

            <p className="page__subtitle" style={{ marginTop: 12 }}>
              Next: navigate to <code>/datasets/{lastDraft.draft_id || lastDraft.draftId}</code>.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
