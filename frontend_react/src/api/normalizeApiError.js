/**
 * Normalized API error adapter.
 * Supports:
 * 1) Workflow error envelope: { error: { code, http_status, message, occurred_at_utc, details } }
 * 2) RFC7807-like error: { title, status, code, detail, type, ... }
 */

// PUBLIC_INTERFACE
export function normalizeApiError({ httpStatus, body }) {
  /** Normalizes unknown backend error shape into a predictable structure for UI. */

  // Workflow envelope
  const workflowError = body && typeof body === "object" && body.error ? body.error : null;

  if (workflowError && typeof workflowError === "object") {
    const details = workflowError.details && typeof workflowError.details === "object" ? workflowError.details : {};

    return {
      name: "NormalizedApiError",
      httpStatus: workflowError.http_status || httpStatus || 0,
      code: workflowError.code || "UnknownError",
      message: workflowError.message || "Request failed.",
      correlationId: workflowError.correlation_id,
      occurredAtUtc: workflowError.occurred_at_utc,

      // Gate failure fields (422) used by GateFailureBanner / similar UIs
      stage: details.stage,
      failingGates: Array.isArray(details.failing_gates) ? details.failing_gates : [],
      evidenceRefs: Array.isArray(details.evidence_refs) ? details.evidence_refs : [],

      // Optional validation details
      fieldErrors: Array.isArray(details.field_errors) ? details.field_errors : [],

      raw: body
    };
  }

  // RFC7807-like
  if (body && typeof body === "object") {
    const status = body.status || httpStatus || 0;
    return {
      name: "NormalizedApiError",
      httpStatus: status,
      code: body.code || body.title || "UnknownError",
      message: body.detail || body.message || body.title || "Request failed.",
      correlationId: body.correlation_id || body.correlationId,
      occurredAtUtc: body.occurred_at_utc || body.occurredAtUtc,
      stage: body.stage,
      failingGates: body.failing_gates || body.failingGates || [],
      evidenceRefs: body.evidence_refs || body.evidenceRefs || [],
      fieldErrors: body.field_errors || body.fieldErrors || [],
      raw: body
    };
  }

  // Fallback
  return {
    name: "NormalizedApiError",
    httpStatus: httpStatus || 0,
    code: "UnknownError",
    message: "Request failed.",
    raw: body
  };
}
