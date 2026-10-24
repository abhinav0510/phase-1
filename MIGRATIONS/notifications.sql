-- ============================================================================
-- Sidana Platform — Notifications
--   1. Admin email broadcasts to startups (contacts mirror + send log)
--   2. In-app announcements (popup on every dashboard) + per-user dismissals
-- ============================================================================
--
-- PURELY ADDITIVE. Creates six NEW tables only. Does not touch, read, alter or
-- delete any existing table, row or policy. No foreign keys to existing tables,
-- so nothing here can block or change the SYNC-BOOK / deal workflows.
--
-- Writers:
--   * startup_contacts / contact_sync_runs  <- n8n "SYNC-CONTACTS" (service role)
--   * email_broadcasts / _recipients        <- the app (service role) + n8n
--                                              "ADMIN-BROADCAST" status updates
--   * announcements / announcement_dismissals <- the app (service role)
-- All reads come from the app's server code with the service role, scoped in
-- application code. RLS is enabled with NO anon/authenticated policy, so no
-- browser client can read or write these tables directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Founder contact emails, mirrored from the Google Sheet "Founders Info" tab
-- and linked to platform startups (public.startups.id).
-- ---------------------------------------------------------------------------
create table if not exists public.startup_contacts (
  id            bigint generated always as identity primary key,
  startup_id    bigint not null,
  email         text   not null,
  founder_name  text,
  sheet_name    text,                          -- startup name as written in the sheet
  source        text   not null default 'founders_info',
  synced_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create unique index if not exists startup_contacts_startup_email_key
  on public.startup_contacts (startup_id, email);
create index if not exists startup_contacts_startup_idx
  on public.startup_contacts (startup_id);

-- One row per contacts sync, so admins can see freshness + unmatched sheet rows.
create table if not exists public.contact_sync_runs (
  id                bigint generated always as identity primary key,
  ran_at            timestamptz not null default now(),
  trigger           text,                      -- 'schedule' | 'manual'
  rows_read         integer not null default 0,
  matched_startups  integer not null default 0,
  emails            integer not null default 0,
  unmatched         jsonb   not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------------
-- Email broadcasts sent from the admin panel (one row per send action) and
-- their recipients (one row per startup / custom address = one Gmail message).
-- ---------------------------------------------------------------------------
create table if not exists public.email_broadcasts (
  id               bigint generated always as identity primary key,
  subject          text not null,
  body             text not null,              -- message as the admin wrote it
  audience         text not null
                   check (audience in ('all', 'selected', 'custom', 'test')),
  recipient_count  integer not null default 0,
  sent_count       integer not null default 0,
  failed_count     integer not null default 0,
  status           text not null default 'queued'
                   check (status in ('queued', 'sending', 'sent', 'partial', 'failed')),
  sent_by          uuid,                       -- auth user id of the admin
  sent_by_email    text,
  error            text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index if not exists email_broadcasts_created_idx
  on public.email_broadcasts (created_at desc);

create table if not exists public.email_broadcast_recipients (
  id             bigint generated always as identity primary key,
  broadcast_id   bigint not null
                 references public.email_broadcasts (id) on delete cascade,
  startup_id     bigint,                       -- null for custom addresses
  startup_name   text,
  emails         text not null,                -- comma-joined To: addresses
  status         text not null default 'pending'
                 check (status in ('pending', 'sent', 'failed')),
  error          text,
  gmail_id       text,
  sent_at        timestamptz
);
create index if not exists email_broadcast_recipients_broadcast_idx
  on public.email_broadcast_recipients (broadcast_id);

-- ---------------------------------------------------------------------------
-- In-app announcements (software updates, changes, maintenance notices).
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id                bigint generated always as identity primary key,
  title             text not null,
  body              text not null,
  kind              text not null default 'update'
                    check (kind in ('update', 'change', 'maintenance', 'info')),
  audience          text not null default 'all'
                    check (audience in ('all', 'founders', 'team')),
  is_active         boolean not null default true,
  publish_at        timestamptz not null default now(),
  expires_at        timestamptz,
  created_by        uuid,
  created_by_email  text,
  created_at        timestamptz not null default now()
);
create index if not exists announcements_active_idx
  on public.announcements (is_active, publish_at desc);

-- A user has seen/dismissed an announcement (so the popup shows it once).
create table if not exists public.announcement_dismissals (
  announcement_id  bigint not null
                   references public.announcements (id) on delete cascade,
  user_id          uuid   not null,            -- auth user id
  dismissed_at     timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: service role only (defence in depth).
-- ---------------------------------------------------------------------------
alter table public.startup_contacts            enable row level security;
alter table public.contact_sync_runs           enable row level security;
alter table public.email_broadcasts            enable row level security;
alter table public.email_broadcast_recipients  enable row level security;
alter table public.announcements               enable row level security;
alter table public.announcement_dismissals     enable row level security;

revoke all on public.startup_contacts            from anon, authenticated;
revoke all on public.contact_sync_runs           from anon, authenticated;
revoke all on public.email_broadcasts            from anon, authenticated;
revoke all on public.email_broadcast_recipients  from anon, authenticated;
revoke all on public.announcements               from anon, authenticated;
revoke all on public.announcement_dismissals     from anon, authenticated;

grant all on public.startup_contacts            to service_role;
grant all on public.contact_sync_runs           to service_role;
grant all on public.email_broadcasts            to service_role;
grant all on public.email_broadcast_recipients  to service_role;
grant all on public.announcements               to service_role;
grant all on public.announcement_dismissals     to service_role;

-- Make the new tables visible to the REST API immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Rollback (removes the feature entirely):
--   drop table if exists public.announcement_dismissals, public.announcements,
--     public.email_broadcast_recipients, public.email_broadcasts,
--     public.contact_sync_runs, public.startup_contacts;
-- ============================================================================
