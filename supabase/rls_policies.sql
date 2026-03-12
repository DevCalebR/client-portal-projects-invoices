-- Supabase Row Level Security policies for the Client Portal SaaS.
--
-- Assumptions:
-- 1. Supabase Auth is configured to trust Clerk as a Third-Party Auth provider.
-- 2. Clerk session tokens include organization claims.
-- 3. These helpers support both Clerk token formats:
--    - org_id / org_role
--    - o.id / o.rol
--
-- Important:
-- The Express + Prisma backend remains the primary authorization layer for this app.
-- These policies harden any direct Supabase access paths and future Supabase client usage.

create schema if not exists app;

grant usage on schema app to anon, authenticated;

create or replace function app.clerk_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(auth.jwt() ->> 'user_id', '')
  );
$$;

create or replace function app.clerk_org_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'org_id', ''),
    nullif(auth.jwt() -> 'o' ->> 'id', '')
  );
$$;

create or replace function app.clerk_org_role()
returns text
language sql
stable
as $$
  select lower(
    replace(
      coalesce(
        nullif(auth.jwt() ->> 'org_role', ''),
        nullif(auth.jwt() -> 'o' ->> 'rol', ''),
        ''
      ),
      'org:',
      ''
    )
  );
$$;

create or replace function app.current_user_row_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id
  from "User" u
  where u."clerkUserId" = app.clerk_user_id()
  limit 1;
$$;

create or replace function app.current_organization_row_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.id
  from "Organization" o
  where o."clerkOrganizationId" = app.clerk_org_id()
  limit 1;
$$;

create or replace function app.current_member_row_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select om.id
  from "OrganizationMember" om
  join "User" u on u.id = om."userId"
  join "Organization" o on o.id = om."organizationId"
  where u."clerkUserId" = app.clerk_user_id()
    and o."clerkOrganizationId" = app.clerk_org_id()
  limit 1;
$$;

create or replace function app.is_internal_role()
returns boolean
language sql
stable
as $$
  select app.clerk_org_role() in ('admin', 'manager');
$$;

create or replace function app.is_admin_role()
returns boolean
language sql
stable
as $$
  select app.clerk_org_role() = 'admin';
$$;

create or replace function app.can_access_client(target_client_id text, target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Client" c
    where c.id = target_client_id
      and c."organizationId" = target_organization_id
      and c."organizationId" = app.current_organization_row_id()
      and (
        app.is_internal_role()
        or c."memberId" = app.current_member_row_id()
      )
  );
$$;

create or replace function app.can_access_invoice(target_invoice_id text, target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Invoice" i
    join "Client" c on c.id = i."clientId"
    where i.id = target_invoice_id
      and i."organizationId" = target_organization_id
      and i."organizationId" = app.current_organization_row_id()
      and (
        app.is_internal_role()
        or c."memberId" = app.current_member_row_id()
      )
  );
$$;

grant execute on all functions in schema app to anon, authenticated;

alter table "Organization" enable row level security;
alter table "User" enable row level security;
alter table "OrganizationMember" enable row level security;
alter table "Client" enable row level security;
alter table "Project" enable row level security;
alter table "Invoice" enable row level security;
alter table "InvoiceItem" enable row level security;
alter table "Payment" enable row level security;
alter table "ActivityEvent" enable row level security;
alter table "Notification" enable row level security;

drop policy if exists organization_select on "Organization";
drop policy if exists organization_insert on "Organization";
drop policy if exists organization_update on "Organization";
drop policy if exists organization_delete on "Organization";

create policy organization_select
on "Organization"
for select
to authenticated
using ("clerkOrganizationId" = app.clerk_org_id());

create policy organization_insert
on "Organization"
for insert
to authenticated
with check (
  "clerkOrganizationId" = app.clerk_org_id()
  and "ownerUserId" = app.current_user_row_id()
);

create policy organization_update
on "Organization"
for update
to authenticated
using (
  id = app.current_organization_row_id()
  and app.is_admin_role()
)
with check (
  id = app.current_organization_row_id()
  and app.is_admin_role()
);

create policy organization_delete
on "Organization"
for delete
to authenticated
using (
  id = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists user_select on "User";
drop policy if exists user_insert on "User";
drop policy if exists user_update on "User";
drop policy if exists user_delete on "User";

create policy user_select
on "User"
for select
to authenticated
using (
  "clerkUserId" = app.clerk_user_id()
  or exists (
    select 1
    from "OrganizationMember" om
    where om."userId" = "User".id
      and om."organizationId" = app.current_organization_row_id()
  )
);

create policy user_insert
on "User"
for insert
to authenticated
with check ("clerkUserId" = app.clerk_user_id());

create policy user_update
on "User"
for update
to authenticated
using (
  "clerkUserId" = app.clerk_user_id()
)
with check (
  "clerkUserId" = app.clerk_user_id()
);

create policy user_delete
on "User"
for delete
to authenticated
using (
  app.is_admin_role()
  and exists (
    select 1
    from "OrganizationMember" om
    where om."userId" = "User".id
      and om."organizationId" = app.current_organization_row_id()
  )
);

drop policy if exists organization_member_select on "OrganizationMember";
drop policy if exists organization_member_insert on "OrganizationMember";
drop policy if exists organization_member_update on "OrganizationMember";
drop policy if exists organization_member_delete on "OrganizationMember";

create policy organization_member_select
on "OrganizationMember"
for select
to authenticated
using ("organizationId" = app.current_organization_row_id());

create policy organization_member_insert
on "OrganizationMember"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

create policy organization_member_update
on "OrganizationMember"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

create policy organization_member_delete
on "OrganizationMember"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists client_select on "Client";
drop policy if exists client_insert on "Client";
drop policy if exists client_update on "Client";
drop policy if exists client_delete on "Client";

create policy client_select
on "Client"
for select
to authenticated
using (app.can_access_client(id, "organizationId"));

create policy client_insert
on "Client"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy client_update
on "Client"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy client_delete
on "Client"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists project_select on "Project";
drop policy if exists project_insert on "Project";
drop policy if exists project_update on "Project";
drop policy if exists project_delete on "Project";

create policy project_select
on "Project"
for select
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and (
    app.is_internal_role()
    or app.can_access_client("clientId", "organizationId")
  )
);

create policy project_insert
on "Project"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
  and app.can_access_client("clientId", "organizationId")
);

create policy project_update
on "Project"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
  and app.can_access_client("clientId", "organizationId")
);

create policy project_delete
on "Project"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists invoice_select on "Invoice";
drop policy if exists invoice_insert on "Invoice";
drop policy if exists invoice_update on "Invoice";
drop policy if exists invoice_delete on "Invoice";

create policy invoice_select
on "Invoice"
for select
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and (
    app.is_internal_role()
    or app.can_access_client("clientId", "organizationId")
  )
);

create policy invoice_insert
on "Invoice"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
  and app.can_access_client("clientId", "organizationId")
);

create policy invoice_update
on "Invoice"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
  and app.can_access_client("clientId", "organizationId")
);

create policy invoice_delete
on "Invoice"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists invoice_item_select on "InvoiceItem";
drop policy if exists invoice_item_insert on "InvoiceItem";
drop policy if exists invoice_item_update on "InvoiceItem";
drop policy if exists invoice_item_delete on "InvoiceItem";

create policy invoice_item_select
on "InvoiceItem"
for select
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.can_access_invoice("invoiceId", "organizationId")
);

create policy invoice_item_insert
on "InvoiceItem"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
  and app.can_access_invoice("invoiceId", "organizationId")
);

create policy invoice_item_update
on "InvoiceItem"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
  and app.can_access_invoice("invoiceId", "organizationId")
);

create policy invoice_item_delete
on "InvoiceItem"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists payment_select on "Payment";
drop policy if exists payment_insert on "Payment";
drop policy if exists payment_update on "Payment";
drop policy if exists payment_delete on "Payment";

create policy payment_select
on "Payment"
for select
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and (
    app.is_internal_role()
    or (
      "invoiceId" is not null
      and app.can_access_invoice("invoiceId", "organizationId")
    )
  )
);

create policy payment_insert
on "Payment"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy payment_update
on "Payment"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy payment_delete
on "Payment"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists activity_event_select on "ActivityEvent";
drop policy if exists activity_event_insert on "ActivityEvent";
drop policy if exists activity_event_update on "ActivityEvent";
drop policy if exists activity_event_delete on "ActivityEvent";

create policy activity_event_select
on "ActivityEvent"
for select
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and (
    app.is_internal_role()
    or (
      "clientId" is not null
      and app.can_access_client("clientId", "organizationId")
    )
    or (
      "invoiceId" is not null
      and app.can_access_invoice("invoiceId", "organizationId")
    )
  )
);

create policy activity_event_insert
on "ActivityEvent"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy activity_event_update
on "ActivityEvent"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy activity_event_delete
on "ActivityEvent"
for delete
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and app.is_admin_role()
);

drop policy if exists notification_select on "Notification";
drop policy if exists notification_insert on "Notification";
drop policy if exists notification_update on "Notification";
drop policy if exists notification_delete on "Notification";

create policy notification_select
on "Notification"
for select
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and "userId" = app.current_user_row_id()
);

create policy notification_insert
on "Notification"
for insert
to authenticated
with check (
  "organizationId" = app.current_organization_row_id()
  and app.is_internal_role()
);

create policy notification_update
on "Notification"
for update
to authenticated
using (
  "organizationId" = app.current_organization_row_id()
  and "userId" = app.current_user_row_id()
)
with check (
  "organizationId" = app.current_organization_row_id()
  and "userId" = app.current_user_row_id()
);

create policy notification_delete
on "Notification"
for delete
to authenticated
using (
  (
    "organizationId" = app.current_organization_row_id()
    and "userId" = app.current_user_row_id()
  )
  or (
    "organizationId" = app.current_organization_row_id()
    and app.is_admin_role()
  )
);
