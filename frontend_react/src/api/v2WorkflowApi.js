import { apiRequest } from "./httpClient";

/**
 * API mappings aligned to:
 * - kavia-docs/data-product-publishing-workflow-openapi-v2.yaml
 * - React V2 implementation plan
 */

// PUBLIC_INTERFACE
export const v2WorkflowApi = {
  /** V2 workflow API surface used by the React app. */

  // Drafts
  createDraft: (payload) =>
    apiRequest("/v2/drafts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  submitDraft: (draftId, payload) =>
    apiRequest(`/v2/drafts/${encodeURIComponent(draftId)}/submit`, {
      method: "POST",
      body: JSON.stringify(payload || {})
    }),

  // Validation
  runValidation: (draftId, payload) =>
    apiRequest(`/v2/drafts/${encodeURIComponent(draftId)}/validation`, {
      method: "POST",
      body: payload ? JSON.stringify(payload) : null
    }),

  getValidationRun: (validationRunId) =>
    apiRequest(`/v2/validation-runs/${encodeURIComponent(validationRunId)}`, {
      method: "GET"
    }),

  // Gates
  evaluateGates: (draftId, payload) =>
    apiRequest(`/v2/drafts/${encodeURIComponent(draftId)}/gates/evaluate`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Approval
  createApproval: (draftId, payload) =>
    apiRequest(`/v2/drafts/${encodeURIComponent(draftId)}/approvals`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Publish
  publishDraft: (draftId, payload) =>
    apiRequest(`/v2/drafts/${encodeURIComponent(draftId)}/publish`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Evidence
  getEvidencePackage: (evidencePackageId) =>
    apiRequest(`/v2/evidence-packages/${encodeURIComponent(evidencePackageId)}`, {
      method: "GET"
    }),

  // Audit
  listAuditEvents: ({ productId, draftId, eventType } = {}) => {
    const params = new URLSearchParams();
    if (productId) params.set("product_id", productId);
    if (draftId) params.set("draft_id", draftId);
    if (eventType) params.set("event_type", eventType);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/v2/audit-log${qs}`, { method: "GET" });
  },

  // Policy endpoints (per backend tests note)
  grantPolicy: (payload) =>
    apiRequest("/v2/policies/grant", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  protectedOperation: (payload, roleHeaderValue) =>
    apiRequest("/v2/protected/operation", {
      method: "POST",
      headers: roleHeaderValue ? { "X-Role": roleHeaderValue } : {},
      body: JSON.stringify(payload || {})
    })
};
