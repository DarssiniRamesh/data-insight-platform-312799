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
 * Backend contract (CreateDraftRequest) expects:
 * Required fields:
 * - product_name (string)
 * - classification (enum): "Public" | "Internal" | "Confidential" | "Regulated"
 * - schema_ref: { schema_id: string, schema_version: string }
 * - dataset_ref: { uri: string, format?: string }
 *
 * Optional fields:
 * - version (string, defaults backend-side)
 * - update_frequency
 * - max_age_hours
 * - lineage
 * - metadata { standards[], tags[], sourceSystems[], retentionDays }
 *
 * UI behavior:
 * - Client-side required validation for the required fields above.
 * - 201 -> navigate to Dataset Detail and show toast
 * - 400 -> inline validation errors (best-effort mapping)
 * - 409 -> DuplicateResource banner
 * - other -> normalized error display
 * - Gate-aware messaging via GateFailureBanner for 422.
 */

const CLASSIFICATION_OPTIONS = ["Public", "Internal", "Confidential", "Regulated"];

// PUBLIC_INTERFACE
export function RegistrationPage() {
  /** Draft registration form: creates a draft via POST /v2/drafts with rich error handling. */
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState({
    productName: "",
    classification: "Internal",

    schemaId: "",
    schemaVersion: "",

    datasetUri: "",
    datasetFormat: "",

    // Optional CreateDraftRequest fields
    version: "",

    // Optional metadata (keep from existing UI)
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
  }, [values.retentionDays, values.sourceSystemsCsv, values.standardsCsv, values.tagsCsv]);

  function setField(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function validateClientSide() {
    const next = {};

    if (!values.productName.trim()) next.productName = "Product name is required.";

    if (!CLASSIFICATION_OPTIONS.includes(values.classification)) {
      next.classification = "Classification must be one of: Public, Internal, Confidential, Regulated.";
    }

    if (!values.schemaId.trim()) next.schemaId = "Schema ID is required.";
    if (!values.schemaVersion.trim()) next.schemaVersion = "Schema version is required.";

    if (!values.datasetUri.trim()) next.datasetUri = "Dataset URI is required.";

    // Optional numeric validation
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
    /**
     * Backend normalizer supports `fieldErrors` (array) under workflow envelope.
     * We defensively handle shapes:
     * - [{ field: "product_name", message: "..." }]
     * - [{ field: "schema_ref.schema_id", message: "..." }]
     * - [{ loc: ["body","product_name"], msg: "..."}] (pydantic-ish)
     */
    const next = {};
    const errs = Array.isArray(error?.fieldErrors) ? error.fieldErrors : [];

    for (const e of errs) {
      const field = e?.field || (Array.isArray(e?.loc) ? e.loc.slice(1).join(".") : null);
      const msg = e?.message || e?.msg || "Invalid value.";
      if (!field) continue;

      // Map server fields to UI fields.
      if (field === "product_name") next.productName = msg;
      else if (field === "classification") next.classification = msg;
      else if (field === "schema_ref" || field.startsWith("schema_ref.")) {
        if (field.endsWith("schema_id")) next.schemaId = msg;
        else if (field.endsWith("schema_version")) next.schemaVersion = msg;
        else next.schemaId = msg;
      } else if (field === "dataset_ref" || field.startsWith("dataset_ref.")) {
        if (field.endsWith("uri")) next.datasetUri = msg;
        else if (field.endsWith("format")) next.datasetFormat = msg;
        else next.datasetUri = msg;
      } else if (field === "version") next.version = msg;
      else if (field === "metadata" || field.startsWith("metadata.")) {
        if (field.includes("retentionDays") || field.includes("retention_days")) next.retentionDays = msg;
        else if (field.includes("standards")) next.standardsCsv = msg;
        else if (field.includes("tags")) next.tagsCsv = msg;
        else if (field.includes("sourceSystems") || field.includes("source_systems")) next.sourceSystemsCsv = msg;
      } else if (field === "name") {
        // Back-compat: some backends/users may still send name in errors; map to productName.
        next.productName = msg;
      } else {
        next[field] = msg;
      }
    }

    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setApiError(null);

    const ok = validateClientSide();
    if (!ok) return;

    // CreateDraftRequest mapping (authoritative schema from user_input_ref).
    const payload = {
      product_name: values.productName.trim(),
      classification: values.classification,
      schema_ref: {
        schema_id: values.schemaId.trim(),
        schema_version: values.schemaVersion.trim()
      },
      dataset_ref: {
        uri: values.datasetUri.trim(),
        ...(values.datasetFormat.trim() ? { format: values.datasetFormat.trim() } : {})
      },

      ...(values.version.trim() ? { version: values.version.trim() } : {}),

      ...(parsed.standards.length > 0 ||
      parsed.tags.length > 0 ||
      parsed.sourceSystems.length > 0 ||
      parsed.retentionDays !== null
        ? {
            metadata: {
              standards: parsed.standards,
              tags: parsed.tags,
              sourceSystems: parsed.sourceSystems,
              retentionDays: parsed.retentionDays
            }
          }
        : {})
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
            A draft with this identity already exists. Update identifying fields and try again.
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
              <label className="field__label" htmlFor="productName">
                Product name <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="productName"
                className="input"
                value={values.productName}
                onChange={(e) => setField("productName", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.productName)}
                aria-describedby={mergedErrors.productName ? "productName-error" : "productName-hint"}
                placeholder="e.g., adverse_events_agg_v1"
              />
              <div id="productName-hint" className="field__hint">
                Backend field: <code>product_name</code>.
              </div>
              {mergedErrors.productName ? (
                <div id="productName-error" className="fieldError">
                  {mergedErrors.productName}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="classification">
                Classification <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <select
                id="classification"
                className="input"
                value={values.classification}
                onChange={(e) => setField("classification", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.classification)}
                aria-describedby={mergedErrors.classification ? "classification-error" : "classification-hint"}
              >
                {CLASSIFICATION_OPTIONS.map((opt) => (
                  <option value={opt} key={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div id="classification-hint" className="field__hint">
                Must be one of: Public, Internal, Confidential, Regulated.
              </div>
              {mergedErrors.classification ? (
                <div id="classification-error" className="fieldError">
                  {mergedErrors.classification}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="schemaId">
                Schema ID <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="schemaId"
                className="input"
                value={values.schemaId}
                onChange={(e) => setField("schemaId", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.schemaId)}
                aria-describedby={mergedErrors.schemaId ? "schemaId-error" : "schemaId-hint"}
                placeholder="e.g., adverse-events-schema"
              />
              <div id="schemaId-hint" className="field__hint">
                Backend field: <code>schema_ref.schema_id</code>.
              </div>
              {mergedErrors.schemaId ? (
                <div id="schemaId-error" className="fieldError">
                  {mergedErrors.schemaId}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="schemaVersion">
                Schema version <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="schemaVersion"
                className="input"
                value={values.schemaVersion}
                onChange={(e) => setField("schemaVersion", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.schemaVersion)}
                aria-describedby={mergedErrors.schemaVersion ? "schemaVersion-error" : "schemaVersion-hint"}
                placeholder="e.g., 1.0.0"
              />
              <div id="schemaVersion-hint" className="field__hint">
                Backend field: <code>schema_ref.schema_version</code>.
              </div>
              {mergedErrors.schemaVersion ? (
                <div id="schemaVersion-error" className="fieldError">
                  {mergedErrors.schemaVersion}
                </div>
              ) : null}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field__label" htmlFor="datasetUri">
                Dataset URI <span aria-hidden="true" style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                id="datasetUri"
                className="input"
                value={values.datasetUri}
                onChange={(e) => setField("datasetUri", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.datasetUri)}
                aria-describedby={mergedErrors.datasetUri ? "datasetUri-error" : "datasetUri-hint"}
                placeholder="e.g., s3://bucket/adverse_events/"
              />
              <div id="datasetUri-hint" className="field__hint">
                Backend field: <code>dataset_ref.uri</code>.
              </div>
              {mergedErrors.datasetUri ? (
                <div id="datasetUri-error" className="fieldError">
                  {mergedErrors.datasetUri}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="datasetFormat">
                Dataset format
              </label>
              <input
                id="datasetFormat"
                className="input"
                value={values.datasetFormat}
                onChange={(e) => setField("datasetFormat", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.datasetFormat)}
                aria-describedby={mergedErrors.datasetFormat ? "datasetFormat-error" : "datasetFormat-hint"}
                placeholder="e.g., parquet (optional)"
              />
              <div id="datasetFormat-hint" className="field__hint">
                Optional. Backend field: <code>dataset_ref.format</code>.
              </div>
              {mergedErrors.datasetFormat ? (
                <div id="datasetFormat-error" className="fieldError">
                  {mergedErrors.datasetFormat}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="version">
                Version
              </label>
              <input
                id="version"
                className="input"
                value={values.version}
                onChange={(e) => setField("version", e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(mergedErrors.version)}
                aria-describedby={mergedErrors.version ? "version-error" : "version-hint"}
                placeholder='e.g., 1.0.0 (optional; backend defaults to "v1.0")'
              />
              <div id="version-hint" className="field__hint">
                Optional. Backend field: <code>version</code>.
              </div>
              {mergedErrors.version ? (
                <div id="version-error" className="fieldError">
                  {mergedErrors.version}
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
                placeholder="e.g., ICH E2B(R3), IDMP"
              />
              <div id="standards-hint" className="field__hint">
                Optional. Comma-separated list (metadata.standards).
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
                placeholder="e.g., safety, pv, agg"
              />
              <div id="tags-hint" className="field__hint">
                Optional. Comma-separated list (metadata.tags).
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
                placeholder="e.g., safety-db"
              />
              <div id="sources-hint" className="field__hint">
                Optional. Comma-separated list (metadata.sourceSystems).
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
                placeholder="e.g., 730"
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
                  productName: "",
                  classification: "Internal",
                  schemaId: "",
                  schemaVersion: "",
                  datasetUri: "",
                  datasetFormat: "",
                  version: "",
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

`````

Explanation: Update Registration page tests to match new required fields and ensure createDraft is called with CreateDraftRequest-shaped payload.
````write file="data-insight-platform-312799/frontend_react/src/pages/RegistrationPage.test.js"
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { RegistrationPage } from "./RegistrationPage";
import { ToastProvider } from "../components/feedback/Toast";
import { v2WorkflowApi } from "../api/v2WorkflowApi";

jest.mock("../api/v2WorkflowApi", () => ({
  v2WorkflowApi: {
    createDraft: jest.fn()
  }
}));

function renderWithProviders(ui, { initialEntries = ["/register"] } = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/register" element={ui} />
            <Route path="/datasets/:draftId" element={<div>Dataset detail page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

test("client-side required validations block submit", async () => {
  const user = userEvent.setup();
  renderWithProviders(<RegistrationPage />);

  await user.click(screen.getByTestId("submit-btn"));

  expect(await screen.findByText(/Product name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/Schema ID is required/i)).toBeInTheDocument();
  expect(screen.getByText(/Schema version is required/i)).toBeInTheDocument();
  expect(screen.getByText(/Dataset URI is required/i)).toBeInTheDocument();

  expect(v2WorkflowApi.createDraft).not.toHaveBeenCalled();
});

test("successful submit calls POST /v2/drafts with CreateDraftRequest payload and navigates to dataset detail + shows toast", async () => {
  const user = userEvent.setup();
  v2WorkflowApi.createDraft.mockResolvedValueOnce({ draft_id: "d_123", status: "DRAFT" });

  renderWithProviders(<RegistrationPage />);

  await user.type(screen.getByLabelText(/^Product name/i), "adverse_events_agg_v1");
  await user.selectOptions(screen.getByLabelText(/^Classification/i), "Internal");
  await user.type(screen.getByLabelText(/^Schema ID/i), "adverse-events-schema");
  await user.type(screen.getByLabelText(/^Schema version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Dataset URI/i), "s3://bucket/adverse_events/");
  await user.type(screen.getByLabelText(/^Dataset format/i), "parquet");

  await user.type(screen.getByLabelText(/^Version$/i), "1.0.0");
  await user.type(screen.getByLabelText(/Standards/i), "ICH E2B(R3), IDMP");
  await user.type(screen.getByLabelText(/^Tags/i), "safety, pv, agg");
  await user.type(screen.getByLabelText(/Source systems/i), "safety-db");
  await user.type(screen.getByLabelText(/Retention days/i), "730");

  await user.click(screen.getByTestId("submit-btn"));

  await waitFor(() => expect(v2WorkflowApi.createDraft).toHaveBeenCalledTimes(1));

  expect(v2WorkflowApi.createDraft).toHaveBeenCalledWith({
    product_name: "adverse_events_agg_v1",
    classification: "Internal",
    schema_ref: {
      schema_id: "adverse-events-schema",
      schema_version: "1.0.0"
    },
    dataset_ref: {
      uri: "s3://bucket/adverse_events/",
      format: "parquet"
    },
    version: "1.0.0",
    metadata: {
      standards: ["ICH E2B(R3)", "IDMP"],
      tags: ["safety", "pv", "agg"],
      sourceSystems: ["safety-db"],
      retentionDays: 730
    }
  });

  // Navigated route content
  expect(await screen.findByText(/Dataset detail page/i)).toBeInTheDocument();

  // Toast content
  expect(await screen.findByText(/Draft created/i)).toBeInTheDocument();
  expect(screen.getByText(/Draft ID: d_123/i)).toBeInTheDocument();
});

test("400 error shows inline validation errors (product_name mapping)", async () => {
  const user = userEvent.setup();
  v2WorkflowApi.createDraft.mockRejectedValueOnce({
    name: "NormalizedApiError",
    httpStatus: 400,
    code: "InvalidInput",
    message: "Invalid input.",
    fieldErrors: [{ field: "product_name", message: "Product name contains invalid characters." }]
  });

  renderWithProviders(<RegistrationPage />);

  await user.type(screen.getByLabelText(/^Product name/i), "!!!");
  await user.type(screen.getByLabelText(/^Schema ID/i), "schema-x");
  await user.type(screen.getByLabelText(/^Schema version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Dataset URI/i), "s3://bucket/path/");

  await user.click(screen.getByTestId("submit-btn"));

  expect(await screen.findByText(/invalid characters/i)).toBeInTheDocument();
});

test("409 shows duplicate banner", async () => {
  const user = userEvent.setup();
  v2WorkflowApi.createDraft.mockRejectedValueOnce({
    name: "NormalizedApiError",
    httpStatus: 409,
    code: "DuplicateResource",
    message: "Duplicate."
  });

  renderWithProviders(<RegistrationPage />);

  await user.type(screen.getByLabelText(/^Product name/i), "adverse_events_agg_v1");
  await user.type(screen.getByLabelText(/^Schema ID/i), "adverse-events-schema");
  await user.type(screen.getByLabelText(/^Schema version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Dataset URI/i), "s3://bucket/adverse_events/");

  await user.click(screen.getByTestId("submit-btn"));

  expect(await screen.findByTestId("duplicate-banner")).toBeInTheDocument();
  expect(screen.getByText(/Duplicate resource/i)).toBeInTheDocument();
});

test("non-4xx/non-422 error shows normalized generic error banner", async () => {
  const user = userEvent.setup();
  v2WorkflowApi.createDraft.mockRejectedValueOnce({
    name: "NormalizedApiError",
    httpStatus: 500,
    code: "InternalError",
    message: "Something failed.",
    correlationId: "corr_1"
  });

  renderWithProviders(<RegistrationPage />);

  await user.type(screen.getByLabelText(/^Product name/i), "adverse_events_agg_v1");
  await user.type(screen.getByLabelText(/^Schema ID/i), "adverse-events-schema");
  await user.type(screen.getByLabelText(/^Schema version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Dataset URI/i), "s3://bucket/adverse_events/");

  await user.click(screen.getByTestId("submit-btn"));

  expect(await screen.findByTestId("generic-error")).toBeInTheDocument();
  expect(screen.getByText(/Request failed/i)).toBeInTheDocument();
  expect(screen.getByText(/Something failed/i)).toBeInTheDocument();
  expect(screen.getByText(/corr_1/i)).toBeInTheDocument();
});

