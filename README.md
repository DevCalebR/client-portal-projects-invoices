# Client Portal — Projects & Invoices

A polished, portfolio-ready freelance-style dashboard built with **Vite + React + TypeScript**.

It demonstrates a realistic local client-portal workflow:

- Email + password authentication with persisted local sessions.
- Role-based access (admin vs client).
- Protected routes and role-aware navigation.
- Project and invoice entities with CRUD-style flows.
- Validation-heavy forms and dynamic invoice line-item totals.
- Search/filterable dashboards and list views.
- Responsive dashboard UI and loading/error/empty states.

## What it does

This app lets an admin manage projects and invoices while clients can only view assets assigned to them.

### Roles

- **admin**
  - Create, edit, delete projects
  - Create, edit, delete invoices
  - Full dashboard with all records
- **client**
  - View only assigned projects and invoices
  - Read-only detail pages
  - Client-scoped dashboard summaries

## Stack

- Vite
- React
- TypeScript
- React Router
- React Hook Form
- Zod
- LocalStorage for persistence

## Feature list

- `login` with demo credentials and local session persistence.
- Protected route wrapper with role guard behavior.
- Dashboard cards for key portfolio metrics.
- Project list/detail and create/edit forms.
- Invoice list/detail with editable line items and calculated totals.
- Reusable status badges and reusable layout components.
- Search and status filtering for Projects and Invoices.
- Seeded data + reset-to-seed action for quick demos.

## Demo accounts

Use one of these accounts to review different role flows:

- **admin**
  - Email: `admin@example.com`
  - Password: `admin123`
- **client**
  - Email: `client@example.com`
  - Password: `client123`

(Additional seeded client: `noah@lakeside.co` / `client456`)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open <http://localhost:5173> and authenticate with a demo account.

## Build and checks

```bash
npm run lint
npm run build
npm run build   # includes TypeScript type-check via Vite config
```

## Project structure

```text
src/
  ├─ App.tsx                   App shell + route wiring
  ├─ main.tsx                  Bootstrap providers + router
  ├─ index.css                 Shared visual system
  ├─ components/
  │  ├─ AppLayout.tsx          Protected dashboard shell and navigation
  │  ├─ EmptyState.tsx         Empty collection component
  │  ├─ ProtectedRoute.tsx     Auth + role guard
  │  └─ StatusBadge.tsx        Reusable status styling
  ├─ context/
  │  ├─ AuthContext.tsx        Mock auth + session persistence
  │  └─ DataContext.tsx        In-memory/localStorage projects + invoices CRUD
  ├─ data/
  │  ├─ seed.ts                Seed/demo users, projects, invoices
  │  └─ storage.ts             Storage keys + load/save helpers
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
  │  └─ entities.ts            Strongly typed domain models
  └─ utils/
     └─ format.ts              Currency/date/ID/helpers
```

## Data and auth persistence model

### Persistence approach

All data is intentionally local and easy to replace:

- **Session:** localStorage key `cpp:session:v1`
- **Users/projects/invoices:** localStorage keys with `cpp:*:v1`

If keys are missing, seeded data is written first-run and used as defaults.

### Why this is portfolio-friendly

- Demonstrates full domain modeling and role-based UI behavior.
- Shows realistic data operations and validation.
- Mirrors how SaaS portals handle guarded routes and scoped visibility.
- Keeps back-end concerns decoupled behind context/data services.

## Future upgrades

- Replace local providers with API clients (tRPC/REST/GraphQL).
- Persist to a real database with server-side auth.
- Add file attachments and invoice PDF export.
- Add activity logs and notifications.
- Replace manual password check with secure auth provider.
