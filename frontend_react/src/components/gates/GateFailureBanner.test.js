import { render, screen } from "@testing-library/react";
import { GateFailureBanner } from "./GateFailureBanner";

test("renders gate failure code and stage", () => {
  render(
    <GateFailureBanner
      error={{
        httpStatus: 422,
        code: "GateComplianceFailed",
        message: "One or more gates failed.",
        stage: "validate",
        failingGates: [{ gate_id: "schema", gate_name: "Schema gate", status: "FAIL", severity: "BLOCK" }],
        evidenceRefs: []
      }}
    />
  );

  expect(screen.getByText(/Gate failure: GateComplianceFailed/i)).toBeInTheDocument();
  expect(screen.getByText(/Stage:/i)).toBeInTheDocument();
  expect(screen.getByText(/Schema gate/i)).toBeInTheDocument();
});
