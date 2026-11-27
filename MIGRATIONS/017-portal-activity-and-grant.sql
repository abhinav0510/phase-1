-- ============================================================================
-- Phase 2 · 017 · Portal activity log + automatic access grant (2.11, 2.12)
-- ============================================================================
--
-- 1. portal_activity: every action in the investor portal and the new founder
--    features (sign-in, thesis edit, interest, meeting booked, chat message,
--    access granted). Read by admins (clause 2.11). Chat text is never logged.
--
-- 2. grant_portal_access_from_pipeline(): called by one extra node at the end
--    of the n8n workflow SYNC-PIPELINE (every 5 minutes). Opens portal access
--    for an investor when (Sidana, 14 Nov):
--      (a) Reply Detection classified their reply "Documents Requested", or
--      (b) a meeting is fixed: "Positive / Meeting", or CAL-SYNC brought in a
--          public.meetings row for that investor and startup.
--    Interested / Reviewing, Questions, Pass, Not Relevant, Referral,
--    Out of Office and Other never open access on their own.
--    Idempotent: an investor who already has a row (granted or revoked) is
--    left alone, so a revoke by an admin sticks.
--
-- 3. portal_engaged_unresolved: engaged replies whose investor or startup
--    could not be identified, for admins to grant by hand.
--
-- READS (never writes) the agent tables pipeline_deals, mail_log, meetings,
-- investors and startups. Before running, confirm these pipeline_deals columns
-- exist with these names: deal_id, startup, investor, thread_id,
-- investor_response. Needs 011, 013 and 016 (portal_norm) first.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.portal_activity (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  actor_user_id  uuid,                                 -- null for the system
  actor_label    text,                                 -- "Rhea Kapoor · Northbridge Capital", "system"
  portal         text not null check (portal in ('investor', 'founder', 'admin', 'system')),
  action         text not null,                        -- signed_in, thesis_changed, interest_added, ...
  investor_id    bigint,
  startup_id     bigint,
  meta           jsonb not null default '{}'::jsonb
);

create index if not exists portal_activity_at_idx       on public.portal_activity (at desc);
create index if not exists portal_activity_investor_idx on public.portal_activity (investor_id, at desc);
create index if not exists portal_activity_startup_idx  on public.portal_activity (startup_id, at desc);

alter table public.portal_activity enable row level security;

-- Every engaged reply or fixed meeting, with the investor and startup resolved
-- where possible. Thread join to mail_log first (resolve_mail() has set ids
-- there), then an exact normalised name match that must be unique.
create or replace view public.portal_engagements as
with engaged as (
  select pd.deal_id::text           as deal_id,
         pd.thread_id::text         as thread_id,
         pd.startup::text           as startup_name,
         pd.investor::text          as investor_name,
         case when pd.investor_response ilike 'documents requested%' then 'documents'
              else 'meeting' end    as via
    from public.pipeline_deals pd
   where pd.investor_response ilike 'documents requested%'
      or pd.investor_response ilike 'positive%meeting%'
)
select e.deal_id,
       e.thread_id,
       e.startup_name,
       e.investor_name,
       e.via,
       coalesce(ml.investor_id, inv.id) as investor_id,
       coalesce(ml.startup_id,  st.id)  as startup_id
  from engaged e
  left join lateral (
    select m.investor_id, m.startup_id
      from public.mail_log m
     where e.thread_id is not null
       and m.thread_id::text = e.thread_id
       and m.investor_id is not null
       and m.startup_id is not null
     order by m.sent_at desc nulls last
     limit 1
  ) ml on true
  left join lateral (
    select min(i.id) as id
      from public.investors i
     where public.portal_norm(i.name) = public.portal_norm(e.investor_name)
       and public.portal_norm(e.investor_name) <> ''
    having count(*) = 1
  ) inv on true
  left join lateral (
    select min(s.id) as id
      from public.startups s
     where public.portal_norm(s.name) = public.portal_norm(e.startup_name)
       and public.portal_norm(e.startup_name) <> ''
    having count(*) = 1
  ) st on true;

create or replace view public.portal_engaged_unresolved as
select e.*
  from public.portal_engagements e
 where (e.investor_id is null or e.startup_id is null)
   and not exists (
     select 1 from public.investor_portal_access a
      where a.investor_id = e.investor_id
   );

-- Views are exposed by PostgREST: keep them server-only.
revoke all on public.portal_engagements        from anon, authenticated;
revoke all on public.portal_engaged_unresolved from anon, authenticated;

create or replace function public.grant_portal_access_from_pipeline()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  granted integer := 0;
  added   integer;
begin
  for r in
    select distinct on (x.investor_id) x.*
      from (
        select e.investor_id, e.startup_id, e.deal_id, e.via, 1 as pri
          from portal_engagements e
         where e.investor_id is not null and e.startup_id is not null
        union all
        -- A meeting fixed without a categorised reply (CAL-SYNC row).
        select m.investor_id, m.startup_id, null, 'meeting', 2
          from meetings m
         where m.investor_id is not null
           and m.startup_id is not null
           and coalesce(m.notes, '') !~* 'cancel'
      ) x
      join investors i on i.id = x.investor_id
     where coalesce(i.do_not_contact, false) = false
       and coalesce(i.status::text, '') <> 'do_not_contact'
     order by x.investor_id, x.pri
  loop
    insert into investor_portal_access (investor_id, granted_via, deal_id, startup_id, granted_by)
    values (r.investor_id, r.via, r.deal_id, r.startup_id, 'system')
    on conflict (investor_id) do nothing;
    get diagnostics added = row_count;

    if added > 0 then
      granted := granted + 1;
      insert into portal_activity (portal, actor_label, action, investor_id, startup_id, meta)
      values ('system', 'system', 'access_granted', r.investor_id, r.startup_id,
              jsonb_build_object('via', r.via, 'deal_id', r.deal_id));
    end if;
  end loop;

  -- Interest for EVERY engaged or met pair, not just the one that opened access,
  -- so an investor who met three founders can open and chat with all three.
  insert into investor_interest (investor_id, startup_id, source)
  select distinct x.investor_id, x.startup_id, 'email_reply'
    from (
      select e.investor_id, e.startup_id
        from portal_engagements e
       where e.investor_id is not null and e.startup_id is not null
      union
      select m.investor_id, m.startup_id
        from meetings m
       where m.investor_id is not null
         and m.startup_id is not null
         and coalesce(m.notes, '') !~* 'cancel'
    ) x
    join investors i on i.id = x.investor_id
   where coalesce(i.do_not_contact, false) = false
     and coalesce(i.status::text, '') <> 'do_not_contact'
     -- This runs every 5 minutes: never undo an investor's own choice in the portal.
     and not exists (
       select 1 from portal_activity pa
        where pa.investor_id = x.investor_id
          and pa.startup_id  = x.startup_id
          and pa.action in ('interest_removed', 'deal_passed'))
  on conflict (investor_id, startup_id) do nothing;

  return granted;
end;
$$;

revoke execute on function public.grant_portal_access_from_pipeline() from public, anon, authenticated;
grant  execute on function public.grant_portal_access_from_pipeline() to service_role;
