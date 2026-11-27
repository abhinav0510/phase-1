-- ============================================================================
-- Phase 2 · 014 · Meetings booked from the investor portal (clauses 2.5, 2.7, 2.8)
-- ============================================================================
--
-- One row per Google Meet an investor schedules on a startup profile. The
-- calendar event itself is created by the n8n webhook PORTAL-MEET-CREATE on a
-- team calendar that CAL-SYNC already reads, so the same call later also
-- arrives in public.meetings. ical_uid / meet_link / calendar_event_id let the
-- app count it once. The app never writes public.meetings.
--
-- PURELY ADDITIVE. RLS on, no anon/authenticated policy (service role only).
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.portal_meetings (
  id                 bigint generated always as identity primary key,
  investor_id        bigint not null,
  startup_id         bigint not null,
  scheduled_at       timestamptz not null,
  duration_min       integer not null default 30 check (duration_min between 15 and 180),
  meet_link          text,
  calendar_event_id  text,
  ical_uid           text,
  status             text not null default 'scheduled'
                     check (status in ('scheduled', 'cancelled')),
  created_by         uuid,                             -- auth user who booked it
  created_at         timestamptz not null default now()
);

create index if not exists portal_meetings_pair_idx
  on public.portal_meetings (investor_id, startup_id);
create index if not exists portal_meetings_startup_idx
  on public.portal_meetings (startup_id);
create unique index if not exists portal_meetings_ical_uid_key
  on public.portal_meetings (ical_uid) where ical_uid is not null;

alter table public.portal_meetings enable row level security;
