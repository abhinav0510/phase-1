-- ============================================================================
-- Sidana Platform — Phase 1
-- Weekly Reports (B1): founder-dashboard mirror of the weekly fundraising email
-- ============================================================================
--
-- PURELY ADDITIVE. This script only CREATES a brand-new table and its policies.
-- It does NOT touch, read, alter, or delete any existing table, row, or policy
-- (startups / investors / matches / meetings / app_users are untouched).
--
-- How it is used:
--   * The n8n "Weekly Founder Update" workflow gains a non-blocking branch that
--     upserts each week's report here (service-role, so it bypasses RLS).
--   * The founder dashboard reads it with the service-role client and scopes by
--     the verified startup_id in application code (same pattern as every other
--     founder query). RLS below is defence-in-depth: with no anon/authenticated
--     policy, only the service role can read/write this table.
--
-- Run ONCE in the Supabase SQL Editor (Project → SQL Editor → New query → Run).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

create table if not exists public.weekly_reports (
  id             bigint generated always as identity primary key,
  startup_id     bigint,                       -- resolved from public.startups.id
  startup_key    text not null,                -- lowercased alphanumerics of the name (join fallback)
  startup_name   text,
  week_start     date not null,                -- Monday of the reported work week
  week_end       date,                         -- Friday of the reported work week
  owner_name     text,                         -- Sidana relationship owner
  founder_name   text,
  reached         integer not null default 0,
  followups       integer not null default 0,
  passed          integer not null default 0,
  meetings        integer not null default 0,
  feedback_count  integer not null default 0,
  meeting_list    jsonb   not null default '[]'::jsonb,
  passed_list     jsonb   not null default '[]'::jsonb,
  feedback_list   jsonb   not null default '[]'::jsonb,
  subject        text,
  report_html    text,                         -- exact email HTML (live runs only)
  sent_to        text,
  source         text default 'weekly-workflow',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One report per startup per week — this is the upsert conflict target
-- (PostgREST ?on_conflict=startup_key,week_start).
create unique index if not exists weekly_reports_startup_week_key
  on public.weekly_reports (startup_key, week_start);

create index if not exists weekly_reports_startup_id_idx
  on public.weekly_reports (startup_id);

-- Keep updated_at fresh on every merge/update.
create or replace function public.weekly_reports_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists weekly_reports_touch on public.weekly_reports;
create trigger weekly_reports_touch
  before update on public.weekly_reports
  for each row execute function public.weekly_reports_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security (defence in depth).
-- No policy is granted to anon/authenticated, so those roles can read nothing
-- directly. The app and the n8n workflow both use the service role, which
-- bypasses RLS. This guarantees one startup can never read another's reports
-- via a direct client call, independent of application code.
-- ----------------------------------------------------------------------------
alter table public.weekly_reports enable row level security;

revoke all on public.weekly_reports from anon;
revoke all on public.weekly_reports from authenticated;
grant all on public.weekly_reports to service_role;

-- ============================================================================
-- Rollback (only if you ever need to remove the feature entirely):
--   drop table if exists public.weekly_reports;
--   drop function if exists public.weekly_reports_touch_updated_at();
-- ============================================================================
