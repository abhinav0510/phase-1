-- ============================================================================
-- Phase 2 · 019 · Startup match profile for the investor portal (clause 2.4)
-- ============================================================================
--
-- A read-only copy of the agents' STARTUP_PROFILE tab (Pilot sheet): each
-- startup's sector codes, stage code, business model and round, in the same
-- codes the INVESTORS tab uses. The portal matches investors to startups on
-- these codes; the free-text startups.sector ("HealthTech | AI Diagnostics")
-- can't be compared with investors' codes ("HEALTHTECH_DIGITAL").
--
-- Filled by the n8n workflow SYNC-MATCH-PROFILE (hourly, sheet → here), which
-- links each row to public.startups by name the way SYNC-DECKS does (exact,
-- unique prefix, unique one-letter typo). Nothing else writes it, and no
-- existing table is changed.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.startup_match_profile (
  startup_name    text primary key,                   -- STARTUP_PROFILE column A, as written
  startup_id      bigint,                             -- public.startups.id, matched by name in n8n (null if no unique match)
  active         boolean not null default true,      -- column B "Yes"/"No"
  confirmed       text,                               -- AUTO / PENDING / ...
  sector_codes    text[] not null default '{}',       -- e.g. {HRTECH, AI_APPLIED_ENTERPRISE}
  business_model  text,                               -- e.g. B2B_SAAS
  stage_code      text,                               -- PRE_SEED .. SERIES_C_PLUS
  raise_cr        numeric,
  arr_cr          numeric,
  geography       text,
  synced_at       timestamptz not null default now()
);

alter table public.startup_match_profile enable row level security;
revoke all on public.startup_match_profile from anon, authenticated;
