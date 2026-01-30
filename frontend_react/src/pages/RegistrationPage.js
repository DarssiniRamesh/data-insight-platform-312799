import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { v2WorkflowApi } from "../api/v2WorkflowApi";
import { GateFailureBanner } from "../components/gates/GateFailureBanner";
import { useToast } from "../components/feedback/Toast";

/**
 * Registration page (draft creation).
 * Wires the UI to POST /v2/drafts.
 *
 * Requirements:
 * - Form fields: name, version, owner, domain, description,
 *   metadata.standards[], metadata.tags[], metadata.sourceSystems[], metadata.retentionDays
 * - Handle responses:
 *   - 201 -> navigate to Dataset Detail and show toast
 *   - 400 -> inline validation errors
 *   - 409 -> DuplicateResource banner
 *   - other -> normalized error display
 * - Gate-aware messaging via GateFailureBanner for 422.
 */

// PUBLIC_INTERFACE
export function RegistrationPage() {
  /** Draft registration form: creates a draft via POST /v2/drafts with rich error handling. */
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState({
    name: "",
    version: "",
    owner: "",
    domain: "",
    description: "",
    standardsCsv: "",
    tagsCsv: "",
    sourceSystemsCsv: "",
    retentionDays: ""
  });

  const [clientErrors, setClientErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  const mutation = useMutation({
    mutationFn: async (payload) => v2WorkflowApi.createDraft(payload),
    retry: (failureCount, error) => {
      // Explicit: disable retries for 4xx to avoid duplicate submissions.
      const status = error?.httpStatus;
      if ([400, 403, 409, 422].includes(status)) return false;
      return failureCount < 1;
    },
    onSuccess: (draft) => {
      const draftId = draft?.draft_id || draft?.draftId;
      toast.push({
        kind: "success",
        title: "Draft created",
        message: draftId ? `Draft ID: ${draftId}` : "Your draft was created successfully."
      });

      if (draftId) {
        navigate(`/datasets/${encodeURIComponent(draftId)}`);
      }
    },
    onError: (err) => {
      setApiError(err);
    }
  });

  const busy = mutation.isPending;

  const parsed = useMemo(() => {
    const parseCsv = (s) =>
      String(s || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    const retention = values.retentionDays === "" ? null : Number(values.retentionDays);

    return {
      standards: parseCsv(values.standardsCsv),
      tags: parseCsv(values.tagsCsv),
      sourceSystems: parseCsv(values.sourceSystemsCsv),
      retentionDays: retention
    };
  }, [values]);

  function setField(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function validateClientSide() {
    const next = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!values.version.trim()) next.version = "Version is required.";
    if (!values.owner.trim()) next.owner = "Owner is required.";
    if (!values.domain.trim()) next.domain = "Domain is required.";

    if (values.retentionDays !== "") {
      const n = Number(values.retentionDays);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        next.retentionDays = "Retention days must be an integer.";
      } else if (n < 0) {
        next.retentionDays = "Retention days must be 0 or greater.";
      }
    }

    setClientErrors(next);
    return Object.keys(next).length === 0;
  }

  function mapApiFieldErrors(error) {
    // Backend normalizer supports `fieldErrors` (array) under workflow envelope.
    // We defensively handle a few shapes:
    // - [{ field: "name", message: "..." }]
    // - [{ field: "metadata.tags[0]", message: "..." }]
    // - [{ loc: ["body","name"], msg: "..."}] (fastapi/pydantic-ish)
    const next = {};

    const errs = Array.isArray(error?.fieldErrors) ? error.fieldErrors : [];
    for (const e of errs) {
      const field = e?.field || (Array.isArray(e?.loc) ? e.loc.slice(1).join(".") : null);
      const msg = e?.message || e?.msg || "Invalid value.";
      if (!field) continue;

      // Map server fields to UI fields (basic mapping).
      if (field === "name" || field === "product_name") next.name = msg;
      else if (field === "version") next.version = msg;
      else if (field === "owner") next.owner = msg;
      else if (field === "domain") next.domain = msg;
      else if (field === "description") next.description = msg;
      else if (field.startsWith("metadata.retentionDays") || field === "metadata.retention_days") next.retentionDays = msg;
      else if (field.startsWith("metadata.standards")) next.standardsCsv = msg;
      else if (field.startsWith("metadata.tags")) next.tagsCsv = msg;
      else if (field.startsWith("metadata.sourceSystems") || field.startsWith("metadata.source_systems"))
        next.sourceSystemsCsv = msg;
      else next[field] = msg;
    }

    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setApiError(null);

    const ok = validateClientSide();
    if (!ok) return;

    // NOTE: The backend contract is v2; field names are expected to match the backend schema.
    // The request asked for fields (name, version, owner, domain, description, metadata.*).
    const payload = {
      name: values.name.trim(),
      version: values.version.trim(),
      owner: values.owner.trim(),
      domain: values.domain.trim(),
      description: values.description.trim() || null,
      metadata: {
        standards: parsed.standards,
        tags: parsed.tags,
        sourceSystems: parsed.sourceSystems,
        retentionDays: parsed.retentionDays
      }
    };

    try {
      await mutation.mutateAsync(payload);
    } catch (err) {
      // React Query onError already sets apiError, but mutateAsync throws; keep for clarity.
      // On 400, convert field errors to inline.
      if (err?.httpStatus === 400) {
        const mapped = mapApiFieldErrors(err);
        if (Object.keys(mapped).length > 0) setClientErrors((prev) => ({ ...prev, ...mapped }));
      }
    }
  }

  const showDuplicate = apiError?.httpStatus === 409 && (apiError?.code === "DuplicateResource" || apiError?.code);

  const showInline400 = apiError?.httpStatus === 400;
  const inline400Fields = showInline400 ? mapApiFieldErrors(apiError) : {};

  const mergedErrors = { ...clientErrors, ...inline400Fields };

  return (
    <div className="page">
      <h1 className="page__title">Registration</h1>
      <p className="page__subtitle">Create a Draft record for a data product.</p>

      <GateFailureBanner error={apiError} />

      {showDuplicate ? (
        <div className="alert alert--error inlineBanner" role="alert" aria-live="polite" data-testid="duplicate-banner">
          <div className="alert__title">Duplicate resource</div>
          <p className="alert__body">
            A draft with this identity already exists. Update the version or choose a unique name/owner/domain
            combination.
          </p>
          {apiError?.correlationId ? (
            <p className="alert__body">
              Correlation ID: <code>{apiError.correlationId}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      {apiError && apiError.httpStatus !== 422 && apiError.httpStatus !== 400 && apiError.httpStatus !== 409 ? (
        <div className="alert alert--error inlineBanner" role="alert" aria-live="polite" data-testid="generic-error">
          <div className="alert__title">
            Request failed ({apiError.httpStatus || "?"} / {apiError.code || "UnknownError"})
          </div>
          <p className="alert__body">{apiError.message}</p>
          {apiError.correlationId ? (
            <p className="alert__body">
              Correlation ID: <code>{apiError.correlationId}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <form onSubmit={onSubmit} aria-label="Registration form">
          <div className="formGrid">
            <div className="field">
              <label className="field__label" htmlFor="name">
                Name <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="name"
                className="input"
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.name)}
                aria-describedby={mergedErrors.name ? "name-error" : undefined}
                placeholder="e.g., Customer Orders"
              />
              {mergedErrors.name ? (
                <div id="name-error" className="fieldError">
                  {mergedErrors.name}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="version">
                Version <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="version"
                className="input"
                value={values.version}
                onChange={(e) => setField("version", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.version)}
                aria-describedby={mergedErrors.version ? "version-error" : undefined}
                placeholder="e.g., 1.0.0"
              />
              {mergedErrors.version ? (
                <div id="version-error" className="fieldError">
                  {mergedErrors.version}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="owner">
                Owner <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="owner"
                className="input"
                value={values.owner}
                onChange={(e) => setField("owner", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.owner)}
                aria-describedby={mergedErrors.owner ? "owner-error" : undefined}
                placeholder="e.g., data-platform@company.com"
              />
              {mergedErrors.owner ? (
                <div id="owner-error" className="fieldError">
                  {mergedErrors.owner}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="domain">
                Domain <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="domain"
                className="input"
                value={values.domain}
                onChange={(e) => setField("domain", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.domain)}
                aria-describedby={mergedErrors.domain ? "domain-error" : undefined}
                placeholder="e.g., Sales"
              />
              {mergedErrors.domain ? (
                <div id="domain-error" className="fieldError">
                  {mergedErrors.domain}
                </div>
              ) : null}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field__label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className="textarea"
                value={values.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.description)}
                aria-describedby={mergedErrors.description ? "description-error" : "description-hint"}
                placeholder="What is this dataset for? Who uses it?"
              />
              <div id="description-hint" className="field__hint">
                Optional. Keep it short and specific (intended use, key constraints).
              </div>
              {mergedErrors.description ? (
                <div id="description-error" className="fieldError">
                  {mergedErrors.description}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="standards">
                Standards
              </label>
              <input
                id="standards"
                className="input"
                value={values.standardsCsv}
                onChange={(e) => setField("standardsCsv", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.standardsCsv)}
                aria-describedby={mergedErrors.standardsCsv ? "standards-error" : "standards-hint"}
                placeholder="e.g., GxP, GDPR"
              />
              <div id="standards-hint" className="field__hint">
                Comma-separated list.
              </div>
              {mergedErrors.standardsCsv ? (
                <div id="standards-error" className="fieldError">
                  {mergedErrors.standardsCsv}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="tags">
                Tags
              </label>
              <input
                id="tags"
                className="input"
                value={values.tagsCsv}
                onChange={(e) => setField("tagsCsv", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.tagsCsv)}
                aria-describedby={mergedErrors.tagsCsv ? "tags-error" : "tags-hint"}
                placeholder="e.g., pii, finance"
              />
              <div id="tags-hint" className="field__hint">
                Comma-separated list.
              </div>
              {mergedErrors.tagsCsv ? (
                <div id="tags-error" className="fieldError">
                  {mergedErrors.tagsCsv}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="sources">
                Source systems
              </label>
              <input
                id="sources"
                className="input"
                value={values.sourceSystemsCsv}
                onChange={(e) => setField("sourceSystemsCsv", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.sourceSystemsCsv)}
                aria-describedby={mergedErrors.sourceSystemsCsv ? "sources-error" : "sources-hint"}
                placeholder="e.g., SAP, Salesforce"
              />
              <div id="sources-hint" className="field__hint">
                Comma-separated list.
              </div>
              {mergedErrors.sourceSystemsCsv ? (
                <div id="sources-error" className="fieldError">
                  {mergedErrors.sourceSystemsCsv}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="retention">
                Retention days
              </label>
              <input
                id="retention"
                className="input"
                inputMode="numeric"
                value={values.retentionDays}
                onChange={(e) => setField("retentionDays", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.retentionDays)}
                aria-describedby={mergedErrors.retentionDays ? "retention-error" : "retention-hint"}
                placeholder="e.g., 365"
              />
              <div id="retention-hint" className="field__hint">
                Optional integer. Use 0 for “no retention constraint”.
              </div>
              {mergedErrors.retentionDays ? (
                <div id="retention-error" className="fieldError">
                  {mergedErrors.retentionDays}
                </div>
              ) : null}
            </div>
          </div>

          <div className="btnRow" style={{ marginTop: 14 }}>
            <button type="submit" className="btn btnPrimary" disabled={busy} data-testid="submit-btn">
              {busy ? "Creating…" : "Create draft"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setValues({
                  name: "",
                  version: "",
                  owner: "",
                  domain: "",
                  description: "",
                  standardsCsv: "",
                  tagsCsv: "",
                  sourceSystemsCsv: "",
                  retentionDays: ""
                });
                setClientErrors({});
                setApiError(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Audit visibility (hook)</div>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Creating a draft records an audit event on the backend. Use the <code>Audit Log</code> page to inspect
          append-only events.
        </p>
      </div>
    </div>
  );
}
