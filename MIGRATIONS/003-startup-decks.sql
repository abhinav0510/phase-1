-- ============================================================================
-- Sidana Platform — Pitch deck mirror
--   The deck link the deal agents send to investors lives in the Pilot sheet
--   (STARTUPS tab, column H `deck_link`, usually a bit.ly link to a Drive file).
--   n8n "SYNC-DECKS" copies it here so the founder portal can show each founder
--   the exact deck investors receive.
-- ============================================================================
--
-- PURELY ADDITIVE. Creates ONE new table. Does not touch, read, alter or delete
-- any existing table, row or policy. No foreign key to public.startups, so
-- nothing here can block or change the SYNC-BOOK / deal workflows.
--
-- Writer: n8n "SYNC-DECKS" (service role), hourly.
-- Reader: the app's server code (service role), scoped by the founder's own
--         startup_id. RLS is enabled with NO anon/authenticated policy, so no
--         browser client can read or write this table directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

create table if not exists public.startup_decks (
  startup_id     bigint primary key,           -- public.startups.id
  sheet_name     text,                         -- startup name as written in the sheet
  deck_link      text not null,                -- exactly what goes into investor emails
  resolved_url   text,                         -- where deck_link lands (bit.ly expanded)
  drive_file_id  text,                         -- Google Drive / Slides file id, if any
  link_kind      text not null default 'external'
                 check (link_kind in ('google', 'external')),
  synced_at      timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table public.startup_decks enable row level security;
revoke all on public.startup_decks from anon, authenticated;
grant all on public.startup_decks to service_role;

-- Make the new table visible to the REST API immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Rollback (removes the feature entirely):
--   drop table if exists public.startup_decks;
-- ============================================================================
