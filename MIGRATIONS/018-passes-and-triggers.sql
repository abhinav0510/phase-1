-- ============================================================================
-- Phase 2 · 018 · Passing on a deal, revisit triggers, investor notifications
-- ============================================================================
--
-- 1. investor_passes: an investor passes on a deal in the portal and says why
--    (a reason category plus their own words). Shown to the investor and to
--    Sidana's team; NEVER to founders.
-- 2. investor_deal_triggers: "tell me again when this startup reaches ...":
--    monthly revenue, annual revenue or monthly growth. Checked by the app
--    against the figures founders upload. NEVER shown to founders.
-- 3. investor_notifications: in-portal notices to an investor (a trigger was
--    met). `emailed_at` is for an optional n8n email sender later.
--
-- PURELY ADDITIVE. RLS on, no anon/authenticated policy (service role only).
-- Needs 012 (investor_thesis gains excluded_sectors, excluded_stages,
-- min_revenue_inr_l there). Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.investor_passes (
  id               bigint generated always as identity primary key,
  investor_id      bigint not null,
  startup_id       bigint not null,
  reason_category  text   not null check (reason_category in (
                     'sector', 'stage', 'cheque', 'traction', 'valuation', 'team', 'market', 'conflict', 'other')),
  reason_text      text   check (reason_text is null or char_length(reason_text) <= 1000),
  thesis_changes   jsonb  not null default '{}'::jsonb,   -- what the investor chose to change in their thesis
  passed_by        uuid,
  created_at       timestamptz not null default now(),
  unique (investor_id, startup_id)
);

create table if not exists public.investor_deal_triggers (
  id           bigint generated always as identity primary key,
  investor_id  bigint not null,
  startup_id   bigint not null,
  metric       text   not null check (metric in ('mrr_l', 'arr_cr', 'growth_pct')),
  threshold    numeric not null check (threshold > 0),
  created_at   timestamptz not null default now(),
  fired_at     timestamptz,                      -- when the target was first met
  fired_value  numeric,
  cancelled_at timestamptz,
  unique (investor_id, startup_id, metric)
);

create index if not exists investor_deal_triggers_startup_idx
  on public.investor_deal_triggers (startup_id) where fired_at is null and cancelled_at is null;

create table if not exists public.investor_notifications (
  id           bigint generated always as identity primary key,
  investor_id  bigint not null,
  startup_id   bigint,
  kind         text   not null default 'trigger_met',
  title        text   not null,
  body         text   not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  emailed_at   timestamptz
);

create index if not exists investor_notifications_unread_idx
  on public.investor_notifications (investor_id) where read_at is null;

alter table public.investor_passes        enable row level security;
alter table public.investor_deal_triggers enable row level security;
alter table public.investor_notifications enable row level security;
