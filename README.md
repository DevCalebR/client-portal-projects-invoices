# Client Portal — Projects & Invoices

Client Portal is a React + TypeScript client portal SPA for managing projects and invoices across admin and client roles. This repository has been audited and hardened for deployment as a static demo application, with stronger validation, session handling, error boundaries, notifications, activity history, and cleaner deployment/docs coverage.

## Feature list

- Admin dashboard with project/invoice overview, quick actions, and recent activity
- Client dashboard scoped to the signed-in client
- Role-based route protection and client/admin navigation
- Project create/edit/delete workflows
- Invoice create/edit/delete workflows with line item calculations
- Session persistence with expiration and cross-tab sync
- Runtime environment configuration via Vite env vars
- Activity history tracking for project/invoice mutations
- Empty states, inline form errors, destructive-action confirmation, and success/error notifications

## Tech stack

- Vite
- React 19
- TypeScript
- React Router 7
- React Hook Form
- Zod
- localStorage-backed demo persistence

## Architecture summary

- `src/context/AuthContext.tsx`: local auth/session handling, hashed seeded credentials, session timeout
- `src/context/DataContext.tsx`: project/invoice/activity state, persistence, mutation validation
- `src/data/seed.ts`: seeded demo users/projects/invoices/activity
- `src/data/storage.ts`: localStorage helpers with schema validation support
- `src/config/env.ts`: runtime env parsing and defaults
- `src/components/AppErrorBoundary.tsx`: global error fallback
- `src/context/FeedbackContext.tsx`: transient notification layer

There is no backend, database, or API layer in this repository. This version is production-hardened for a static demo deployment, not for storing real customer data.

## Demo accounts

Demo helpers are available only when `VITE_ENABLE_DEMO_MODE=true`.

- Admin: `admin@example.com` / `admin123`
- Client: `client@example.com` / `client123`
- Additional seeded client: `noah@lakeside.co` / `client456`

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/login](http://localhost:5173/login).

## Verification scripts

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment variables

Copy `.env.example` to `.env` and set:

- `VITE_APP_NAME`
- `VITE_APP_SUBTITLE`
- `VITE_SUPPORT_EMAIL`
- `VITE_ENABLE_DEMO_MODE`
- `VITE_SESSION_TIMEOUT_MINUTES`

All variables are public Vite variables and are safe to expose to the browser. Do not place secrets in `VITE_*` variables.

## Production setup guide

### Static deployment

This app deploys as a static SPA.

- Netlify uses [netlify.toml](./netlify.toml) for SPA redirects.
- Vercel uses [vercel.json](./vercel.json) for SPA rewrites.
- Build output is written to `dist/`.

### What you must configure

1. Set the environment variables from `.env.example` in your hosting platform.
2. Decide whether demo mode should remain enabled.
3. Set a real support email for branded deployments.
4. Choose a session timeout policy.

### What this repository does not yet provide

For a real SaaS rollout, you still need:

1. Server-backed authentication
2. Database-backed persistence
3. Backend authorization enforcement
4. Real audit logging/monitoring
5. Payment/email/provider integrations if required

## Deployment

### Netlify

1. Connect the repo.
2. Set build command to `npm run build`.
3. Set publish directory to `dist`.
4. Add the environment variables from `.env.example`.

### Vercel

1. Import the repo.
2. Set build command to `npm run build` if Vercel does not infer it.
3. Set output directory to `dist`.
4. Add the environment variables from `.env.example`.

## Audit documentation

- Full audit report: [docs/AUDIT_REPORT.md](./docs/AUDIT_REPORT.md)

## Recommended next improvements

1. Move auth and data to a server-backed API.
2. Add automated end-to-end tests for login, CRUD, and authorization.
3. Add remote error monitoring and analytics.
4. Add payment delivery, PDF generation, and notification providers if invoices become real.
