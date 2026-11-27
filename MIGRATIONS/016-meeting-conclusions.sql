-- ============================================================================
-- Phase 2 · 016 · Fireflies meeting conclusions (clauses 2.9, 2.10, 2.11)
-- ============================================================================
--
-- A copy of the summary fields of each Fireflies call, written by the new n8n
-- workflow FF-CONCLUSIONS-SYNC from the n8n data table `fireflies_transcripts`
-- (which the app can't read). The full transcript is never copied.
-- link_meeting_conclusions() ties each record to its row in public.meetings.
--
-- PURELY ADDITIVE: one new table and two functions. public.meetings,
-- public.startups and public.investors are only READ by the function.
-- RLS on, no anon/authenticated policy; the functions run for the service role only.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Lower-case letters and digits only, so "Peak XV Partners" = "peakxvpartners".
-- Shared by 014 and 015.
create or replace function public.portal_norm(t text)
returns text
language sql
immutable
as $$ select regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]', '', 'g') $$;

create table if not exists public.meeting_conclusions (
  ff_id           text primary key,                    -- Fireflies transcript id
  meeting_id      bigint,                              -- public.meetings.id once linked
  meeting_date    timestamptz,
  title           text,
  attendees       text,
  startup_guess   text,
  investor_guess  text,
  overview        text,                                -- the conclusion shown in both portals
  action_items    text,                                -- admins only
  ff_url          text,
  synced_at       timestamptz not null default now(),
  linked_by       text check (linked_by in ('auto', 'admin'))
);

create index if not exists meeting_conclusions_meeting_idx
  on public.meeting_conclusions (meeting_id);
create index if not exists meeting_conclusions_unlinked_idx
  on public.meeting_conclusions (meeting_date) where meeting_id is null;

alter table public.meeting_conclusions enable row level security;

-- Links unlinked conclusions to meetings. Called by FF-CONCLUSIONS-SYNC after
-- each upsert. Never overwrites a link (auto or admin) that is already set.
--   (a) meetings.fireflies_id = ff_id
--   (b) else the meeting closest in time within 3 hours whose startup or
--       investor name matches startup_guess / investor_guess
-- Returns how many conclusions were linked.
create or replace function public.link_meeting_conclusions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  by_id   integer;
  by_name integer;
begin
  update meeting_conclusions c
     set meeting_id = m.id, linked_by = 'auto'
    from meetings m
   where c.meeting_id is null
     and m.fireflies_id is not null
     and m.fireflies_id = c.ff_id;
  get diagnostics by_id = row_count;

  with candidates as (
    select distinct on (c.ff_id) c.ff_id, m.id as meeting_id
      from meeting_conclusions c
      join meetings m
        on m.scheduled_at between c.meeting_date - interval '3 hours'
                              and c.meeting_date + interval '3 hours'
      left join startups  s on s.id = m.startup_id
      left join investors i on i.id = m.investor_id
     where c.meeting_id is null
       and c.meeting_date is not null
       and (
         (portal_norm(c.startup_guess) <> ''
          and portal_norm(coalesce(m.startup_name, s.name)) <> ''
          and (portal_norm(coalesce(m.startup_name, s.name)) like '%' || portal_norm(c.startup_guess) || '%'
               or portal_norm(c.startup_guess) like '%' || portal_norm(coalesce(m.startup_name, s.name)) || '%'))
         or
         (portal_norm(c.investor_guess) <> ''
          and portal_norm(coalesce(m.investor_name, i.name)) <> ''
          and (portal_norm(coalesce(m.investor_name, i.name)) like '%' || portal_norm(c.investor_guess) || '%'
               or portal_norm(c.investor_guess) like '%' || portal_norm(coalesce(m.investor_name, i.name)) || '%'))
       )
     order by c.ff_id, abs(extract(epoch from (m.scheduled_at - c.meeting_date)))
  )
  update meeting_conclusions c
     set meeting_id = x.meeting_id, linked_by = 'auto'
    from candidates x
   where c.ff_id = x.ff_id
     and c.meeting_id is null;
  get diagnostics by_name = row_count;

  return by_id + by_name;
end;
$$;

-- Only the server (service role) may run these.
revoke execute on function public.link_meeting_conclusions() from public, anon, authenticated;
grant  execute on function public.link_meeting_conclusions() to service_role;
