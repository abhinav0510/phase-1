-- ============================================================================
-- Phase 2 · 012 · Investor thesis edited in the portal (clauses 2.4, 2.6)
-- ============================================================================
--
-- The investor's own edits to their thesis. Until an investor edits it, the
-- portal reads the thesis synced from the INVESTORS tab (public.investors).
-- The portal never writes public.investors or the Pilot sheet: SYNC-BOOK would
-- overwrite it within the hour, and the agents own the sheet.
--
-- PURELY ADDITIVE. RLS on, no anon/authenticated policy (service role only).
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.investor_thesis (
  investor_id    bigint primary key,                   -- public.investors.id
  sectors        text[]  not null default '{}',
  stages         text[]  not null default '{}',
  cheque_min_cr  numeric check (cheque_min_cr is null or cheque_min_cr >= 0),
  cheque_max_cr  numeric check (cheque_max_cr is null or cheque_max_cr >= 0),
  -- Learned from pass reasons (the investor ticks each change): sectors and stages
  -- to leave out, and the least annual revenue (₹ lakh) a startup should have.
  excluded_sectors  text[]  not null default '{}',
  excluded_stages   text[]  not null default '{}',
  min_revenue_inr_l numeric check (min_revenue_inr_l is null or min_revenue_inr_l >= 0),
  updated_at     timestamptz not null default now(),
  updated_by     uuid,                                 -- auth user who made the last edit
  constraint investor_thesis_cheque_range check (
    cheque_min_cr is null or cheque_max_cr is null or cheque_min_cr <= cheque_max_cr
  )
);

alter table public.investor_thesis enable row level security;
