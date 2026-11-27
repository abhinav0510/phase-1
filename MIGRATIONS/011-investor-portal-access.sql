-- ============================================================================
-- Phase 2 · 011 · Investor portal access (clauses 2.1, 2.12)
-- ============================================================================
--
-- One row per investor who may sign in to the investor portal. Access is opened
-- only when an investor's reply asks for a document or a meeting is fixed
-- (grant_portal_access_from_pipeline() in 015), or by an admin. A pass never
-- opens access.
--
-- PURELY ADDITIVE: creates one new table. No foreign keys to agent-synced
-- tables (investors, startups), so nothing here can block SYNC-BOOK.
--
-- Writers: the grant function (after SYNC-PIPELINE), the n8n reply tools
-- (invite_status / invite_sent_at), the app's admin pages (grant, revoke,
-- extra login emails) and the Google sign-in callback (first_signin_at).
-- RLS is on with no anon/authenticated policy: only the service role reads it.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.investor_portal_access (
  investor_id      bigint primary key,                 -- public.investors.id
  granted_via      text   not null
                   check (granted_via in ('documents', 'meeting', 'reply', 'admin', 'backfill')),
  deal_id          text,                               -- pipeline_deals.deal_id that opened access
  startup_id       bigint,                             -- the startup in that thread (lands the investor there)
  invite_status    text   not null default 'pending'
                   check (invite_status in ('pending', 'sent')),
  invite_sent_at   timestamptz,
  login_emails     text[] not null default '{}',       -- extra Google emails an admin allowed (lower-case)
  granted_at       timestamptz not null default now(),
  granted_by       text,                               -- 'system' or the admin's email
  first_signin_at  timestamptz,
  revoked_at       timestamptz,                        -- set by an admin; the row stays so the grant never re-fires
  revoked_by       text
);

create index if not exists investor_portal_access_pending_idx
  on public.investor_portal_access (invite_status) where revoked_at is null;
create index if not exists investor_portal_access_login_emails_idx
  on public.investor_portal_access using gin (login_emails);

alter table public.investor_portal_access enable row level security;
