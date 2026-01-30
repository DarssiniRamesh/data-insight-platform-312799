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

  expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/Version is required/i)).toBeInTheDocument();
  expect(screen.getByText(/Owner is required/i)).toBeInTheDocument();
  expect(screen.getByText(/Domain is required/i)).toBeInTheDocument();

  expect(v2WorkflowApi.createDraft).not.toHaveBeenCalled();
});

test("successful submit calls POST /v2/drafts and navigates to dataset detail + shows toast", async () => {
  const user = userEvent.setup();
  v2WorkflowApi.createDraft.mockResolvedValueOnce({ draft_id: "d_123", status: "DRAFT" });

  renderWithProviders(<RegistrationPage />);

  await user.type(screen.getByLabelText(/^Name/i), "Customer Orders");
  await user.type(screen.getByLabelText(/^Version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Owner/i), "data-owner@company.com");
  await user.type(screen.getByLabelText(/^Domain/i), "Sales");

  await user.type(screen.getByLabelText(/Standards/i), "GxP, GDPR");
  await user.type(screen.getByLabelText(/^Tags/i), "pii, finance");
  await user.type(screen.getByLabelText(/Source systems/i), "SAP");
  await user.type(screen.getByLabelText(/Retention days/i), "365");

  await user.click(screen.getByTestId("submit-btn"));

  await waitFor(() => expect(v2WorkflowApi.createDraft).toHaveBeenCalledTimes(1));

  // Navigated route content
  expect(await screen.findByText(/Dataset detail page/i)).toBeInTheDocument();

  // Toast content
  expect(await screen.findByText(/Draft created/i)).toBeInTheDocument();
  expect(screen.getByText(/Draft ID: d_123/i)).toBeInTheDocument();
});

test("400 error shows inline validation errors", async () => {
  const user = userEvent.setup();
  v2WorkflowApi.createDraft.mockRejectedValueOnce({
    name: "NormalizedApiError",
    httpStatus: 400,
    code: "InvalidInput",
    message: "Invalid input.",
    fieldErrors: [{ field: "name", message: "Name already contains invalid characters." }]
  });

  renderWithProviders(<RegistrationPage />);

  await user.type(screen.getByLabelText(/^Name/i), "!!!");
  await user.type(screen.getByLabelText(/^Version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Owner/i), "data-owner@company.com");
  await user.type(screen.getByLabelText(/^Domain/i), "Sales");

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

  await user.type(screen.getByLabelText(/^Name/i), "Customer Orders");
  await user.type(screen.getByLabelText(/^Version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Owner/i), "data-owner@company.com");
  await user.type(screen.getByLabelText(/^Domain/i), "Sales");

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

  await user.type(screen.getByLabelText(/^Name/i), "Customer Orders");
  await user.type(screen.getByLabelText(/^Version/i), "1.0.0");
  await user.type(screen.getByLabelText(/^Owner/i), "data-owner@company.com");
  await user.type(screen.getByLabelText(/^Domain/i), "Sales");

  await user.click(screen.getByTestId("submit-btn"));

  expect(await screen.findByTestId("generic-error")).toBeInTheDocument();
  expect(screen.getByText(/Request failed/i)).toBeInTheDocument();
  expect(screen.getByText(/Something failed/i)).toBeInTheDocument();
  expect(screen.getByText(/corr_1/i)).toBeInTheDocument();
});
