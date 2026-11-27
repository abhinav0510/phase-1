-- ============================================================================
-- Phase 2 · 013 · Investor interest in a startup (clauses 2.8, 2.12)
-- ============================================================================
--
-- One row per investor–startup pair the investor is interested in. Written by
-- the grant function (an engaged email reply, source 'email_reply') and by the
-- "I'm interested" button on a startup profile (source 'portal'). Chat between
-- an investor and a founder needs a row here AND a meeting (clause 2.8).
--
-- PURELY ADDITIVE. RLS on, no anon/authenticated policy (service role only).
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.investor_interest (
  id           bigint generated always as identity primary key,
  investor_id  bigint not null,                        -- public.investors.id
  startup_id   bigint not null,                        -- public.startups.id
  source       text   not null default 'portal'
               check (source in ('email_reply', 'portal', 'admin')),
  created_at   timestamptz not null default now(),
  unique (investor_id, startup_id)
);

create index if not exists investor_interest_startup_idx
  on public.investor_interest (startup_id);

alter table public.investor_interest enable row level security;
