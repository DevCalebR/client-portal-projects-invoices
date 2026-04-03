# Client-Facing Portfolio Brief

## What this product does
Client Portal is a multi-tenant SaaS application for agencies, consultants, and service businesses that need one place to manage clients, projects, invoices, payments, and internal team activity.

Instead of juggling spreadsheets, email threads, and separate billing tools, teams can give staff and clients a shared workspace with role-based access, organized project records, and invoice tracking.

## Business problem it solves
Small teams often outgrow lightweight tools but are not ready for a large custom ERP. This project shows how a focused SaaS product can solve that middle-market problem by combining:

- secure client access
- project visibility
- invoice and payment workflows
- subscription billing
- team notifications and activity tracking

## Who it is for
- agencies and studios
- consultants and fractional operators
- service businesses that manage recurring client work
- founders validating a B2B SaaS product

## Core user journey
1. A business signs up and creates an organization.
2. Team members are given role-based access.
3. Clients, projects, and invoices are created inside the workspace.
4. The business uses Stripe-backed billing flows to manage subscriptions and payments.
5. Staff and clients work from the same portal with organization-aware access control.

## What makes this a strong portfolio piece
- Built as a real B2B SaaS workflow instead of a toy demo
- Multi-tenant data model with organization-aware access control
- Modern production stack across frontend, backend, auth, billing, email, and monitoring
- Covers both product UX and operational concerns like billing, notifications, and tenant isolation

## Feature highlights
- Multi-tenant organization model
- Client, project, invoice, and payment management
- Role-based access with Clerk organizations
- Stripe subscription and invoice checkout flows
- Email delivery with Resend
- Monitoring with Sentry
- Supabase Postgres + Prisma data layer

## Stack
- React + Vite + TypeScript
- Express API
- Prisma + Supabase Postgres
- Clerk
- Stripe
- Resend
- Sentry
- Vercel

## Suggested screenshots for portfolio use
Add 3 to 5 screenshots near the top of the main README or in `/docs/screenshots`:

1. dashboard overview
2. client detail or project workspace
3. invoice creation or invoice list
4. billing/settings page
5. team or notification flow

## Best way to pitch this on Upwork
"Built a multi-tenant client portal for service businesses with secure client access, project tracking, invoicing, subscription billing, and organization-based permissions."

## Notes
This file is written for clients and recruiters. The technical implementation details and local setup remain in `README.md`.
