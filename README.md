# Client Portal SaaS

Client Portal is a multi-tenant SaaS client portal built with React, Vite, TypeScript, an Express API, Prisma, Clerk, Stripe, Resend, and Sentry. The database layer is now Supabase Postgres, with Prisma using Supabase connection strings and a checked-in Supabase RLS policy file for tenant-aware access control.

## Architecture summary

- Frontend: React 19 + Vite + TypeScript
- Backend: Express under [`server/`](/Users/caleb/Client Portal — Projects & Invoices /server)
- Database: Supabase Postgres + Prisma under [`prisma/`](/Users/caleb/Client Portal — Projects & Invoices /prisma)
- Auth: Clerk users + Clerk organizations
- Billing: Stripe subscriptions and invoice checkout
- Email: Resend
- Monitoring: Sentry
- Deployment: Vercel

## Multi-tenant data model

Organization isolation is enforced primarily through `organizationId` columns on tenant-scoped records:

- `OrganizationMember`
- `Client`
- `Project`
- `Invoice`
- `InvoiceItem`
- `Payment`
- `ActivityEvent`
- `Notification`

`User` intentionally does not have a single `organizationId`, because a Clerk user can belong to multiple organizations. Tenant scoping for users is enforced through `OrganizationMember`.

Current roles:

- `ADMIN`
- `MANAGER`
- `CLIENT`

## Prisma schema and Supabase datasource

Prisma now uses the standard Supabase split:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

- `DATABASE_URL`: pooled runtime connection string
- `DIRECT_DATABASE_URL`: direct connection for migrations and Prisma CLI commands

This lives in [`prisma/schema.prisma`](/Users/caleb/Client Portal — Projects & Invoices /prisma/schema.prisma).

## Supabase setup

### 1. Create the Supabase project

1. Go to [Supabase](https://supabase.com/dashboard/projects).
2. Click `New project`.
3. Choose the organization, project name, region, and a strong database password.
4. Wait for the database to provision.

### 2. Get the database connection strings

1. Open the project in the Supabase dashboard.
2. Click `Connect` in the top bar.
3. Open the database connection details.
4. Copy:
   - the `Transaction pooler` connection string for `DATABASE_URL`
   - the `Direct connection` string for `DIRECT_DATABASE_URL`

Recommended mapping:

- `DATABASE_URL` = transaction pooler string on port `6543` with `?pgbouncer=true&connection_limit=1`
- `DIRECT_DATABASE_URL` = direct Postgres string on port `5432`

### 3. Get the Supabase project URL and keys

1. In Supabase, open `Project Settings`.
2. Open `Data API`.
3. Copy:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` or `publishable` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY`

The current app does not use the Supabase JS client in production code, but these variables are documented and exposed for future Supabase client/admin integrations and for consistent deployment configuration.

### 4. Configure Clerk as a Supabase Third-Party Auth provider

1. In Supabase, open `Authentication`.
2. Open `Sign In / Providers`.
3. Open `Third-Party Auth`.
4. Add `Clerk`.
5. Follow the Supabase/Clerk provider prompts to trust Clerk-issued JWTs for your project.

This is what allows Supabase RLS policies to evaluate Clerk claims from `auth.jwt()`.

## Clerk setup

### Required Clerk configuration

1. Create or open your Clerk application in the [Clerk dashboard](https://dashboard.clerk.com/).
2. Enable Organizations.
3. Configure organization roles:
   - `org:admin`
   - `org:manager`
   - `org:client`
4. Copy:
   - `Secret key` -> `CLERK_SECRET_KEY`
   - `Publishable key` -> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Recommended frontend auth routes:

- sign in: `/sign-in`
- sign up: `/sign-up`
- post sign-up onboarding: `/onboarding`

## Environment variables

The full list is in [`.env.example`](/Users/caleb/Client Portal — Projects & Invoices /.env.example).

Required for Supabase/Clerk setup:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Still required by the rest of the app:

- `APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_AGENCY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SENTRY_DSN`
- `VITE_SENTRY_DSN`
- `VITE_APP_NAME`
- `VITE_APP_SUBTITLE`
- `VITE_API_BASE_URL`
- `VITE_SUPPORT_EMAIL`

## Supabase RLS security model

The checked-in policy file is:

- [`supabase/rls_policies.sql`](/Users/caleb/Client Portal — Projects & Invoices /supabase/rls_policies.sql)

It enables RLS on tenant-sensitive tables and uses Clerk JWT claims to scope access. The helpers accept both Clerk claim formats:

- `org_id` / `org_role`
- `o.id` / `o.rol`

Policy coverage includes:

- `Organization`
- `User`
- `OrganizationMember`
- `Client`
- `Project`
- `Invoice`
- `InvoiceItem`
- `Payment`
- `ActivityEvent`
- `Notification`

Important limitation:

- Supabase RLS protects Supabase-authenticated access paths.
- This application’s runtime data path is still Express + Prisma over Postgres.
- Because Prisma uses direct database connections instead of Supabase’s PostgREST layer, backend organization filtering remains mandatory.
- The backend already enforces this with Clerk-backed request context and explicit `organizationId` filtering in API queries.

## Migrations and database commands

Install dependencies:

```bash
npm install
```

Copy the env file:

```bash
cp .env.example .env
```

Generate Prisma client:

```bash
npm run db:generate
```

Run local development migrations:

```bash
npm run db:migrate
```

Run production/deployment migrations:

```bash
npm run db:deploy
```

Seed development data:

```bash
npm run db:seed
```

Apply the Supabase RLS SQL:

```bash
psql "$DIRECT_DATABASE_URL" -f supabase/rls_policies.sql
```

You can also paste the file into the Supabase SQL Editor and run it there.

## Local development

Start the full stack:

```bash
npm run dev
```

This runs:

- Express API on `http://127.0.0.1:8787`
- Vite frontend on `http://localhost:5173`

Vite is configured to proxy `/api` and `/health` to the local API.

## Backend tenant enforcement

Clerk middleware resolves the signed-in user and active Clerk organization, then the server syncs those into the internal database in [`server/lib/auth.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/lib/auth.ts).

Routes enforce tenant ownership by filtering on `context.organization.id`, for example in:

- [`server/routes/clients.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/routes/clients.ts)
- [`server/routes/projects.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/routes/projects.ts)
- [`server/routes/invoices.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/routes/invoices.ts)
- [`server/routes/payments.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/routes/payments.ts)
- [`server/routes/notifications.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/routes/notifications.ts)
- [`server/routes/activity.ts`](/Users/caleb/Client Portal — Projects & Invoices /server/routes/activity.ts)

This repository now also validates update flows so `clientId` and `projectId` cannot be switched across organizations during invoice/project edits.

## Stripe, Resend, and Sentry

Stripe:

- create Starter, Professional, and Agency recurring prices
- set the three `STRIPE_PRICE_*` vars
- create a webhook for `https://YOUR_DOMAIN/api/payments/webhook`

Resend:

- create an API key
- verify a sender/domain
- set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

Sentry:

- create backend and frontend projects
- set `SENTRY_DSN` and `VITE_SENTRY_DSN`

## Verification

Run before deployment:

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel deployment

1. Import the repository into Vercel.
2. Set all variables from [`.env.example`](/Users/caleb/Client Portal — Projects & Invoices /.env.example).
3. Make sure `APP_URL` and `NEXT_PUBLIC_APP_URL` match the production domain.
4. Run `npm run db:deploy` against the production Supabase database.
5. Apply [`supabase/rls_policies.sql`](/Users/caleb/Client Portal — Projects & Invoices /supabase/rls_policies.sql) to the production database.
6. Confirm Stripe’s webhook endpoint points at `/api/payments/webhook`.

## Reference files

- Prisma schema: [`prisma/schema.prisma`](/Users/caleb/Client Portal — Projects & Invoices /prisma/schema.prisma)
- RLS policies: [`supabase/rls_policies.sql`](/Users/caleb/Client Portal — Projects & Invoices /supabase/rls_policies.sql)
- Supabase-compatible env template: [`.env.example`](/Users/caleb/Client Portal — Projects & Invoices /.env.example)
