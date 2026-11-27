-- ============================================================================
-- Demo investor for client testing of the investor portal (27 Nov 2026)
-- ============================================================================
-- Creates "SV Demo Investor (test)" and lets am9256898@gmail.com sign in to the
-- investor portal as it, with Google.
--
-- Run ONCE in the Supabase SQL Editor (production), AFTER migrations 011-019.
-- Safe to re-run: every step checks before inserting.
--
-- Why this is safe:
--   * SYNC-BOOK only upserts investors BY NAME from the Pilot sheet and never
--     deletes, so a Supabase-only row is left alone.
--   * The investor has NO email on its row and is NOT in the Pilot sheet, so
--     ENGINE-DAILY and the outreach agents never email it.
--   * The Gmail address is only a portal login (login_emails), not a contact.
--
-- To remove later: run the "UNDO" block at the bottom.
-- ============================================================================

begin;

-- 1. The investor record.
insert into public.investors (name, contact_person, email, cc_email, type, status, do_not_contact, source, notes)
select 'SV Demo Investor (test)', 'Client test', null, null, 'other', 'active', false, 'demo',
       'Demo account for client testing of the investor portal. Not a real investor. Not in the Pilot sheet.'
where not exists (select 1 from public.investors where name = 'SV Demo Investor (test)');

-- 2. A broad thesis so Matches shows startups: any sector, pre-seed to Series A, any cheque.
insert into public.investor_thesis (investor_id, sectors, stages, cheque_min_cr, cheque_max_cr)
select id, array['ANY'], array['PRE_SEED','SEED','TRACTION','PRE_SERIES_A','SERIES_A'], null, null
from public.investors where name = 'SV Demo Investor (test)'
on conflict (investor_id) do nothing;

-- 3. Portal access, with the client's Google address as the login email.
insert into public.investor_portal_access (investor_id, granted_via, invite_status, login_emails, granted_by)
select id, 'admin', 'sent', array['am9256898@gmail.com'], 'admin (demo account)'
from public.investors where name = 'SV Demo Investor (test)'
on conflict (investor_id) do update
  set login_emails = (select array(select distinct unnest(investor_portal_access.login_emails || array['am9256898@gmail.com']))),
      revoked_at = null, revoked_by = null;

commit;

-- Check: one row, not revoked, with the Gmail address.
select i.id, i.name, a.granted_via, a.login_emails, a.revoked_at, t.sectors, t.stages
from public.investors i
join public.investor_portal_access a on a.investor_id = i.id
left join public.investor_thesis t on t.investor_id = i.id
where i.name = 'SV Demo Investor (test)';

-- ---------------------------------------------------------------------------
-- UNDO (run only when testing is over):
-- update public.investor_portal_access set revoked_at = now(), revoked_by = 'admin (demo over)'
--   where investor_id = (select id from public.investors where name = 'SV Demo Investor (test)');
-- ---------------------------------------------------------------------------
