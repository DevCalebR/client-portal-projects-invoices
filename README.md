# Client Portal SaaS

Client Portal is now a real multi-tenant SaaS foundation built on the existing React + Vite frontend. The app keeps the current portal UI, but data now flows through a backend API, Prisma/PostgreSQL persistence, Clerk authentication, Stripe billing, Resend email delivery, and Sentry monitoring.

## Architecture overview

- Frontend: React 19 + Vite + TypeScript SPA with route-level code splitting.
- API: Express application under [`server/`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/server) mounted locally via `tsx` and deployed on Vercel through [`api/index.ts`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/api/index.ts).
- Database: PostgreSQL with Prisma schema/migrations under [`prisma/`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/prisma).
- Authentication: Clerk user auth + Clerk organizations, synced into internal `User`, `Organization`, and `OrganizationMember` tables.
- Billing: Stripe Checkout for subscriptions and invoice payments, plus Stripe customer portal and webhook handling.
- Email: Resend transactional email service for invoices, payments, project updates, and team invitations.
- Monitoring: Sentry for frontend runtime errors and backend API exceptions.

## Multi-tenant model

Every core record is organization-scoped. The database enforces tenant boundaries through `organizationId` relations across:

- `Organization`
- `OrganizationMember`
- `Client`
- `Project`
- `Invoice`
- `InvoiceItem`
- `Payment`
- `ActivityEvent`
- `Notification`

Supported roles:

- `ADMIN`: full workspace access, billing, invites, destructive actions
- `MANAGER`: internal operational access without subscription admin privileges
- `CLIENT`: scoped access to their own client profile, projects, invoices, and invoice payments

## API surface

Auth

- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/organizations/invitations`

Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

Invoices

- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `PATCH /api/invoices/:id`
- `DELETE /api/invoices/:id`

Clients

- `GET /api/clients`
- `POST /api/clients`
- `PATCH /api/clients/:id`

Payments

- `POST /api/payments/create-checkout`
- `POST /api/payments/customer-portal`
- `POST /api/payments/webhook`

Notifications and activity

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/activity`

All API routes enforce authentication. Organization scoping and role checks are enforced in the server layer, not just in the UI.

## Project structure

```text
src/                 React frontend
server/              Express API, auth, billing, email, monitoring
api/index.ts         Vercel serverless entrypoint
prisma/              Prisma schema, migration, seed script
vercel.json          SPA + API rewrite rules for Vercel
vite.config.ts       Frontend build and local API proxy configuration
```

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- A Clerk application with organizations enabled
- A Stripe account with three recurring prices
- A Resend account and verified sender
- A Sentry project for browser and server DSNs

### Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the env template and fill in the required values.

```bash
cp .env.example .env
```

3. Create the PostgreSQL database referenced by `DATABASE_URL`.

4. Apply the initial migration.

```bash
npm run db:deploy
```

For local iterative development you can also use:

```bash
npm run db:migrate
```

5. Seed development data.

```bash
npm run db:seed
```

6. Start the full stack locally.

```bash
npm run dev
```

This runs:

- the Express API on `http://127.0.0.1:8787`
- the Vite frontend on `http://localhost:5173`

The frontend proxies `/api` and `/health` to the local API automatically.

## Clerk configuration

Configure Clerk with:

- User authentication enabled
- Organizations enabled
- Organization roles matching:
  - `org:admin`
  - `org:manager`
  - `org:client`
- Redirects pointing to:
  - sign in: `/sign-in`
  - sign up: `/sign-up`
  - post sign-up onboarding: `/onboarding`

The backend syncs Clerk users and organizations into the Prisma models on authenticated requests.

## Stripe configuration

Create three recurring prices in Stripe:

- Starter
- Professional
- Agency

Expose the corresponding IDs through:

- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_AGENCY`

### Local webhook forwarding

Use the Stripe CLI during local development:

```bash
stripe listen --forward-to http://127.0.0.1:8787/api/payments/webhook
```

Copy the resulting signing secret into `STRIPE_WEBHOOK_SECRET`.

## Email workflows

Resend is used for:

- new invoice notifications
- invoice paid confirmations
- project update notifications
- team invitation emails
- plan change notifications

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` with a verified sender identity.

## Monitoring

Set:

- `SENTRY_DSN` for backend/API capture
- `VITE_SENTRY_DSN` for browser/runtime capture

Frontend Sentry initializes in [`src/main.tsx`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/src/main.tsx). Backend Sentry initializes in [`server/lib/sentry.ts`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/server/lib/sentry.ts).

## Verification

Run before deployment:

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment on Vercel

### What Vercel serves

- Static frontend from `dist/`
- Express API via `api/index.ts`
- Rewrites defined in [`vercel.json`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/vercel.json)

### Deployment steps

1. Import the repository into Vercel.
2. Set the build command to `npm run build` if Vercel does not infer it.
3. Set the output directory to `dist`.
4. Add every environment variable from [`.env.example`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/.env.example).
5. Point Stripe webhooks at `https://YOUR_DOMAIN/api/payments/webhook`.
6. Set `APP_URL` and `VITE_APP_URL` to the production domain.
7. Run `npm run db:deploy` against the production database during deployment or through your release pipeline.

## Production setup guide

### Required manual configuration

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Configure Clerk keys, organization roles, and redirects.
3. Configure Stripe products, prices, and webhook endpoint.
4. Configure Resend sender verification and API key.
5. Configure Sentry DSNs.
6. Add all environment variables in Vercel.

### Optional development seed linkage

The seed file accepts Clerk IDs through:

- `DEV_SEED_ADMIN_CLERK_USER_ID`
- `DEV_SEED_MANAGER_CLERK_USER_ID`
- `DEV_SEED_CLIENT_CLERK_USER_ID`
- `DEV_SEED_CLERK_ORG_ID`

These are useful if you want the seed data to line up with real Clerk test entities.

## Documentation

- Legacy audit and upgrade notes: [docs/AUDIT_REPORT.md](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/docs/AUDIT_REPORT.md)
