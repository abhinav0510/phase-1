-- ============================================================================
-- Sidana Platform — Founders' financial figures from the Excel template
--   Founders download the financials template on the Financials page, fill in
--   monthly revenue / MRR / expenses, past years and projections, and upload it.
--   The app checks every row and saves the figures here; they draw the charts on
--   the founder's Financials page and show on the admin startup page. The file
--   itself is kept in the private 'startup-mis' bucket (MIGRATIONS/startup-mis.sql).
--   Amounts are in ₹ lakh. A new upload replaces that startup's figures.
-- ============================================================================
--
-- PURELY ADDITIVE. Creates TWO new tables. Does not touch, read, alter or delete
-- any existing table, row or policy — public.startups and the Pilot sheet are
-- never written by this feature. No foreign key to public.startups.
--
-- Writer: the app's server code (service role), for the founder's OWN startup_id
-- taken from the verified session, never from client input.
-- RLS is enabled with NO anon/authenticated policy, so no browser client can
-- read or write these tables directly.
--
-- Needs MIGRATIONS/startup-mis.sql (the upload keeps the file there).
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

create table if not exists public.startup_financial_months (
  startup_id      bigint not null,          -- public.startups.id
  month           text   not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- YYYY-MM
  revenue_inr_l   numeric,
  mrr_inr_l       numeric,
  expenses_inr_l  numeric,
  updated_at      timestamptz not null default now(),
  primary key (startup_id, month)
);

create table if not exists public.startup_financial_years (
  startup_id     bigint  not null,         -- public.startups.id
  fy_start       integer not null,         -- 2025 for FY 2025-26
  kind           text    not null check (kind in ('actual', 'projected')),
  revenue_inr_l  numeric not null,
  updated_at     timestamptz not null default now(),
  primary key (startup_id, fy_start, kind)
);

alter table public.startup_financial_months enable row level security;
alter table public.startup_financial_years enable row level security;
revoke all on public.startup_financial_months from anon, authenticated;
revoke all on public.startup_financial_years from anon, authenticated;
grant all on public.startup_financial_months to service_role;
grant all on public.startup_financial_years to service_role;

-- Make the new tables visible to the REST API immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Rollback (removes the feature; uploaded files stay in 'startup-mis'):
--   drop table if exists public.startup_financial_months;
--   drop table if exists public.startup_financial_years;
-- ============================================================================
