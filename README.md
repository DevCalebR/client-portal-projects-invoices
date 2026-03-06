# Client Portal — Projects & Invoices

A portfolio-ready React + TypeScript SaaS-style demo that showcases:

- local authentication flow with session persistence
- role-based route protection and role-specific navigation
- project and invoice CRUD-style workflows
- validated forms with line-item calculations
- dashboard + searchable/filterable list views
- resilient loading, empty, and error states

## What the app does

This app simulates a freelance client portal:

- **admin** users can manage all projects/invoices and create/edit/delete records
- **client** users can view only their own assigned projects and invoices

The entire experience is local-first and intentionally production-style in structure while staying easy to run and understand.

## Tech stack

- Vite
- React
- TypeScript
- React Router
- React Hook Form
- Zod
- localStorage-based persistence

## Demo accounts

Use one of these accounts from the login page:

- Admin: `admin@example.com` / `admin123`
- Client: `client@example.com` / `client123`
- Additional seeded client: `noah@lakeside.co` / `client456`

### Role behavior at a glance

- Admin dashboard shows global cards and unfiltered lists.
- Client dashboard filters to the signed-in client only.
- Admin can create/edit/delete projects and invoices.
- Client can open/view details and read-only lists for their scope.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173/login` and sign in with a seeded account.

## Useful routes

- `/login`
- `/dashboard`
- `/projects`
- `/projects/:id`
- `/projects/new`
- `/projects/:id/edit`
- `/invoices`
- `/invoices/:id`
- `/invoices/new`
- `/invoices/:id/edit`
- `/settings`

## Project structure

```text
src/
  ├─ App.tsx
  ├─ main.tsx
  ├─ index.css
  ├─ context/
  │  ├─ AuthContext.tsx        Mock auth + session handling
  │  └─ DataContext.tsx        Local project/invoice data providers
  ├─ components/
  │  ├─ AppLayout.tsx          Protected shell + navigation
  │  ├─ EmptyState.tsx         Reusable empty state component
  │  ├─ ProtectedRoute.tsx     Role and auth guard
  │  └─ StatusBadge.tsx        Consistent status chips
  ├─ data/
  │  ├─ seed.ts                Seed users/projects/invoices
  │  └─ storage.ts             localStorage key helpers
  ├─ pages/
  │  ├─ DashboardPage.tsx
  │  ├─ LoginPage.tsx
  │  ├─ NotFoundPage.tsx
  │  ├─ ProjectDetailPage.tsx
  │  ├─ ProjectFormPage.tsx
  │  ├─ ProjectsPage.tsx
  │  ├─ InvoiceDetailPage.tsx
  │  ├─ InvoiceFormPage.tsx
  │  ├─ InvoicesPage.tsx
  │  └─ SettingsPage.tsx
  ├─ types/
  │  └─ entities.ts
  └─ utils/
     └─ format.ts
```

## Auth and persistence model

- Auth data is bootstrapped from `seed.ts` and stored in localStorage under stable keys.
- Session is saved at `cpp:session:v1` with a timestamp.
- Project and invoice collections are read/written through storage helpers in `src/data/storage.ts`.
- Seed data is retained when local data keys are missing and can be restored from Settings.

This pattern keeps the project realistic and easy to swap to API calls later without changing UI contracts.

## Scripts

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

## Testing

There is no automated test suite included in this version. The repo is intentionally kept lightweight for portfolio review, and behavior validation is handled via:

- route/auth role validation during interactive use
- lint + typecheck + build validation

If you want to add tests, lightweight candidates are:

- `ProjectFormPage` validation rules (required fields, due date checks)
- invoice line-item total calculations

## Design polish focus

- client names are shown instead of raw IDs on list and detail views
- clearer role-specific copy on dashboard/list pages
- search + status filters with clear actions
- stronger project/invoice validation feedback
- removed Vite scaffolding leftovers (`src/App.css`, old SVG assets)

## Local architecture notes

- Data layer and auth are split (`DataContext`, `AuthContext`) for easy future API swap.
- Forms are schema-validated with Zod + React Hook Form for realistic quality signals.
- Route guards are centralized (`ProtectedRoute`) for consistent RBAC behavior.

## Future upgrade ideas

- Replace localStorage with JWT/session-backed auth
- Add backend-backed APIs for projects/invoices
- Add invoice PDF export and email trigger flow
- Add automated tests with Playwright/Vitest for critical flows
