-- ============================================================================
-- Sidana Platform — Profile details provided by the Sidana team
--   The team's spreadsheet of startup details (pitch, description, website,
--   sector, team...) is loaded here by `npm run import:prefill`. Complete
--   Profile shows these values in questions the founder hasn't answered yet,
--   marked as filled in by the team. They only become the founder's answers
--   when the founder saves or submits the form, which then goes through the
--   normal review.
-- ============================================================================
--
-- PURELY ADDITIVE. Creates ONE new table. Does not touch, read, alter or delete
-- any existing table, row or policy — public.startups, public.startup_profiles
-- and the Pilot sheet are never written by this feature. No foreign key to
-- public.startups (same pattern as startup_profiles).
--
-- Writer: the import script (service role), run by hand.
-- Reader: the app's server code (service role), scoped by the founder's own
--         startup_id from the verified session.
-- RLS is enabled with NO anon/authenticated policy, so no browser client can
-- read or write this table directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

create table if not exists public.startup_profile_prefill (
  startup_id   bigint primary key,                    -- public.startups.id
  answers      jsonb  not null default '{}'::jsonb,   -- same keys as startup_profiles.answers
  source       text,                                  -- e.g. the spreadsheet's file name
  imported_at  timestamptz not null default now()
);

alter table public.startup_profile_prefill enable row level security;
revoke all on public.startup_profile_prefill from anon, authenticated;
grant all on public.startup_profile_prefill to service_role;

-- Make the new table visible to the REST API immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Rollback (removes the feature entirely; founders' own answers are untouched):
--   drop table if exists public.startup_profile_prefill;
-- ============================================================================
