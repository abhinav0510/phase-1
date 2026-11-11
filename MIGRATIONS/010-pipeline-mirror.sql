-- ============================================================================
-- Sidana Platform — PIPELINE mirror (deal sharing panel)
--   The Pilot sheet's PIPELINE tab is the source of truth for which deals were
--   shared with which investors and how they responded. n8n "SYNC-PIPELINE"
--   copies it here so the admin panel's Deal sharing page and "Deals shared
--   today" card count exactly what the sheet (and the daily report) count.
--   One row per PIPELINE row, keyed by its deal_id (D00001, …). Investor email
--   addresses are NOT copied, only their company domains (for meeting matching).
-- ============================================================================
--
-- PURELY ADDITIVE. Creates TWO new tables. Does not touch, read, alter or delete
-- any existing table, row or policy. The sheet is never written by this feature.
--
-- Writer: n8n "SYNC-PIPELINE" (service role). Each run upserts every row with
--   the run's start time in synced_at, deletes rows older than that (rows removed
--   from the sheet), then records the run in pipeline_sync_runs.
-- Reader: the app's server code (service role), admin pages only.
-- RLS is enabled with NO anon/authenticated policy, so no browser client can
-- read or write these tables directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

create table if not exists public.pipeline_deals (
  deal_id            text primary key,          -- PIPELINE column A, e.g. D00001
  row_no             integer not null,          -- sheet row number, for reference
  startup            text,
  owner              text,
  investor           text,
  investor_domains   text[] not null default '{}',  -- company domains of email/cc, no addresses
  match_type         text,
  deal_shared        text,                      -- 'Yes' when the deal was shared
  date_shared        text,                      -- as written in the sheet (YYYY-MM-DD, IST day)
  channel            text,
  thread_id          text,
  fu1_date           text,
  fu2_date           text,
  fu3_date           text,
  last_contact       text,
  next_action        text,
  investor_response  text,
  pass_reason        text,
  meeting_scheduled  text,
  meeting_date       text,
  meetings_held      text,
  meeting_outcome    text,
  deal_status        text,
  pause              text,
  current_stage      text,
  synced_at          timestamptz not null default now()
);

create index if not exists pipeline_deals_date_idx on public.pipeline_deals (date_shared);
create index if not exists pipeline_deals_startup_idx on public.pipeline_deals (startup);

create table if not exists public.pipeline_sync_runs (
  id            bigserial primary key,
  started_at    timestamptz not null,           -- equals synced_at on every row this run wrote
  finished_at   timestamptz not null default now(),
  rows_read     integer not null,               -- data rows in the sheet with a deal_id
  rows_written  integer not null,
  rows_removed  integer not null default 0,
  ok            boolean not null,
  error         text
);

create index if not exists pipeline_sync_runs_started_idx on public.pipeline_sync_runs (started_at desc);

alter table public.pipeline_deals enable row level security;
alter table public.pipeline_sync_runs enable row level security;
revoke all on public.pipeline_deals from anon, authenticated;
revoke all on public.pipeline_sync_runs from anon, authenticated;
grant all on public.pipeline_deals to service_role;
grant all on public.pipeline_sync_runs to service_role;
grant usage, select on sequence public.pipeline_sync_runs_id_seq to service_role;

-- Make the new tables visible to the REST API immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Rollback (removes the feature entirely):
--   drop table if exists public.pipeline_deals;
--   drop table if exists public.pipeline_sync_runs;
-- ============================================================================
