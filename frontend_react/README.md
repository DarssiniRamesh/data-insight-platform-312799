# Data Product Publishing Workflow (React V2 Scaffold)

This React app is the initial scaffolding for the **V2 GxP-aligned Data Product Publishing workflow** UI (Draft → Validation → Approval → Publish).

It implements:
- React Router routing and page shells
- Shared layout (sidebar + top bar + environment badge)
- API client structure aligned to `kavia-docs/data-product-publishing-workflow-openapi-v2.yaml`
- Central error normalization with baseline handling for:
  - `422 FreshnessCheckFailed`
  - `422 GateComplianceFailed`
  - `400 / 403 / 409 / 500` classes
- TanStack React Query scaffolding (query client + provider)
- Jest + React Testing Library baseline tests

## Routes (V2 plan)

- `/` → redirects to `/dashboard`
- `/register` → Registration (Draft creation)
- `/dashboard` → Approvals / Publishing dashboard (hub)
- `/datasets/:draftId` → Dataset detail
- `/datasets/:draftId/policies` → Access Policies editor
- `/integrations` → Integrations (Collibra/Immuta)
- `/audit` → Audit log viewer
- `*` → Not found

## Backend API configuration

The backend is expected to run on port **3001**.

Create React App environment variable:

- `REACT_APP_API_BASE_URL` (default: `http://localhost:3001`)

Copy the example:

```bash
cp .env.example .env.local
```

## Run locally

From this folder:

```bash
npm start
```

App runs on http://localhost:3000

## Tests

```bash
CI=true npm test
```

## Notes / TODOs (Traceability)

Each page includes TODO comments referencing requirement IDs (e.g., `DPR-V2-FR-010..015`) from the V2 plan to support future traceability and TDD.
