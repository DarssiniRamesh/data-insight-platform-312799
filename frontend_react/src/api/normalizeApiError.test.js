import { normalizeApiError } from "./normalizeApiError";

test("normalizes workflow-style gate failure error", () => {
  const normalized = normalizeApiError({
    httpStatus: 422,
    body: {
      error: {
        code: "FreshnessCheckFailed",
        http_status: 422,
        message: "Freshness gate failed",
        correlation_id: "abc",
        occurred_at_utc: "2026-01-01T00:00:00Z",
        details: {
          stage: "validate",
          failing_gates: [{ gate_id: "freshness", gate_name: "Freshness", status: "FAIL", severity: "BLOCK" }],
          evidence_refs: [{ artifact_type: "QualityReport", artifact_id: "qr_1" }]
        }
      }
    }
  });

  expect(normalized.httpStatus).toBe(422);
  expect(normalized.code).toBe("FreshnessCheckFailed");
  expect(normalized.stage).toBe("validate");
  expect(normalized.failingGates.length).toBe(1);
  expect(normalized.evidenceRefs.length).toBe(1);
});

test("normalizes rfc7807-like error", () => {
  const normalized = normalizeApiError({
    httpStatus: 403,
    body: { title: "Forbidden", status: 403, code: "PolicyDenied", detail: "Denied." }
  });

  expect(normalized.httpStatus).toBe(403);
  expect(normalized.code).toBe("PolicyDenied");
  expect(normalized.message).toBe("Denied.");
});
