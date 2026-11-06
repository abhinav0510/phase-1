-- ============================================================================
-- Sidana Platform — Founder profile completion
--   Founders fill in the details Sidana uses for investor matchmaking from the
--   portal (/complete-profile). Their answers land HERE, in a new table, and
--   are reviewed by the team in the admin panel (/admin/profiles).
-- ============================================================================
--
-- PURELY ADDITIVE. Creates ONE new table. Does not touch, read, alter or delete
-- any existing table, row or policy — public.startups and the Pilot sheet the
-- match agents read are never written by this feature. No foreign key to
-- public.startups, so nothing here can block the SYNC-BOOK / deal workflows.
--
-- Writers: the app's server code (service role) only —
--   * founder actions write answers / status for their OWN startup_id (taken
--     from the verified session, never from client input)
--   * admin actions approve or request changes
-- RLS is enabled with NO anon/authenticated policy, so no browser client can
-- read or write this table directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

create table if not exists public.startup_profiles (
  startup_id        bigint primary key,            -- public.startups.id
  answers           jsonb  not null default '{}'::jsonb,  -- founder's working copy
  approved_answers  jsonb,                          -- last version the team approved
  status            text   not null default 'draft'
                    check (status in ('draft', 'submitted', 'approved', 'changes_requested')),
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid,                           -- auth user id of the reviewer
  reviewed_by_email text,
  review_note       text,
  updated_by        uuid,                           -- auth user id of the last editor
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists startup_profiles_status_idx
  on public.startup_profiles (status, submitted_at desc);

alter table public.startup_profiles enable row level security;
revoke all on public.startup_profiles from anon, authenticated;
grant all on public.startup_profiles to service_role;

-- Make the new table visible to the REST API immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Rollback (removes the feature entirely):
--   drop table if exists public.startup_profiles;
-- ============================================================================
