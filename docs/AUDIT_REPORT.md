# SaaS Upgrade Audit Report

## Legacy state

The repository started as a frontend-only React + Vite demo with:

- localStorage persistence
- simulated authentication
- no server runtime
- no database
- no tenant isolation
- no billing, email, or backend monitoring

That architecture was not suitable for a production SaaS product because authorization, persistence, and data integrity were enforced only in the browser.

## Current architecture

- React + Vite + TypeScript frontend preserved and converted to API-backed persistence
- Express backend added under [`server/`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/server)
- PostgreSQL + Prisma data layer added under [`prisma/schema.prisma`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/prisma/schema.prisma)
- Clerk authentication and organization sync added for users, orgs, memberships, and invites
- Stripe subscription checkout, invoice checkout, billing portal, and webhook handling added
- Resend transactional email workflows added
- Sentry frontend and backend monitoring hooks added
- Vercel deployment rewrites added for SPA routes and API routes

## Major remediation completed

### Data and tenant isolation

- Replaced localStorage persistence with server API calls in [`src/context/DataContext.tsx`](/Users/caleb/Client%20Portal%20%E2%80%94%20Projects%20%26%20Invoices%20/src/context/DataContext.tsx)
- Added organization-scoped Prisma models for users, clients, projects, invoices, payments, activity, and notifications
- Added server-side role enforcement for admin, manager, and client access patterns

### Authentication and authorization

- Replaced simulated auth with Clerk in the frontend and API
- Added request-context sync to map Clerk identities into the application database
- Added protected routing and organization-aware onboarding in the React app

### Billing and payments

- Added plan-based Stripe subscription checkout
- Added invoice payment checkout sessions
- Added customer portal launch endpoint
- Added Stripe webhook processing for subscription and invoice payment state changes

### Operational hardening

- Added global frontend error boundary and Sentry browser reporting
- Added backend error serialization and Sentry server capture
- Added transactional email service wrappers with Resend
- Added Prisma migration files and deterministic seed data
- Added local dev API proxying and Vercel rewrites
- Added vendor chunk splitting to reduce the main frontend bundle

## Residual risks and next improvements

- The app does not yet include automated E2E coverage for auth, billing, and webhook flows.
- There is no background job queue for retries or delayed email/payment reconciliation.
- Stripe, Resend, Clerk, and Sentry still require manual account configuration before production rollout.
- Depending on traffic, API rate limiting and audit-log retention policies may need to be added next.
