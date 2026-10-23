-- PROPOSED — NOT APPLIED.
-- Phase 1 enforces per-startup isolation in application code (every founder
-- query is filtered by the verified session startup_id, and the service-role
-- client is server-only). These policies add defense-in-depth AT THE DATABASE
-- so that even a direct anon/authenticated query cannot cross startups.
--
-- Review before applying. Applying RLS to tables the n8n workflows read/write
-- with the service-role key is safe (service_role bypasses RLS), but verify no
-- workflow relies on the ANON key against these tables first.
--
-- Run in a transaction; test with a founder JWT before committing.

begin;

-- Helper: the startup_id linked to the current auth user (founder).
create or replace function public.current_startup_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select startup_id from public.app_users where id = auth.uid();
$$;

-- Helper: is the current auth user an admin/ops role?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid()
      and role in ('owner','ops','deals_desk','angel_desk')
  );
$$;

-- startups: a founder sees only their own row; admins see all.
alter table public.startups enable row level security;
create policy startups_select_own on public.startups
  for select to authenticated
  using (public.is_admin() or id = public.current_startup_id());

-- matches: a founder sees only matches for their startup.
alter table public.matches enable row level security;
create policy matches_select_own on public.matches
  for select to authenticated
  using (public.is_admin() or startup_id = public.current_startup_id());

-- meetings: scoped by startup.
alter table public.meetings enable row level security;
create policy meetings_select_own on public.meetings
  for select to authenticated
  using (public.is_admin() or startup_id = public.current_startup_id());

-- funding_rounds: scoped by startup.
alter table public.funding_rounds enable row level security;
create policy funding_select_own on public.funding_rounds
  for select to authenticated
  using (public.is_admin() or startup_id = public.current_startup_id());

-- docs: scoped by startup.
alter table public.docs enable row level security;
create policy docs_select_own on public.docs
  for select to authenticated
  using (public.is_admin() or startup_id = public.current_startup_id());

-- app_users: a user sees only their own row; admins see all.
alter table public.app_users enable row level security;
create policy app_users_select_self on public.app_users
  for select to authenticated
  using (public.is_admin() or id = auth.uid());

-- investors: admins only (founders see investors only via the matches join,
-- which is served server-side). Keep investors inaccessible to the anon role.
alter table public.investors enable row level security;
create policy investors_admin_only on public.investors
  for select to authenticated
  using (public.is_admin());

commit;
