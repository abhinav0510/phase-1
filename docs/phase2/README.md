# Phase 2 · Investor portal: build notes

Built against the production build plan (Claude Docs, "Phase 2 Investor Portal: Production Build Plan").
Nothing here is committed or deployed until launch: 27 Nov 2026 (moved from 25 Nov on 25 Nov).

## What's in the app

| Clause | Where |
|---|---|
| 2.1 Google sign-in, investors only | `/investor/login`, `src/app/auth/callback/route.ts`, `requireInvestor()` in `src/server/auth/session.ts`, `src/server/auth/investor-access.ts`. Founder `/login` unchanged. Investors on Microsoft, Zoho or company mail (40 of 125 with access, checked 27 Nov) follow the "No Google account?" note on the login page (create a Google account with their existing email), or an admin links a Gmail. Email-code sign-in is the planned post-launch fix. |
| 2.4 Thesis matching | `src/shared/lib/thesis.ts` (pure rule), `src/shared/lib/sector-taxonomy.ts` (the agents' 52 sector codes, groups, stage ladder), `src/server/data/investor/matches.ts`, `/investor/matches`. Matches on the agents' codes on both sides: INVESTORS `sectors` / `sector_mode` / `stage_min`–`stage_max` / `sectors_excluded` / `models_excluded`, and each startup's STARTUP_PROFILE `sector_codes` / `stage_code` / `business_model` (copied to `startup_match_profile` by SYNC-MATCH-PROFILE). The free-text `startups.sector` is never compared. |
| 2.6 Editable thesis, live refresh | `/investor/matches` editor → `updateThesis` → `investor_thesis` (never `investors`) |
| 2.5 Startup profile + interested count | `/investor/startup/[id]`, `src/server/data/investor/profile.ts`, `engagement.ts`. Shows the founder's latest saved answers and uploaded monthly and yearly figures (MRR, ARR, both charts). A founder with no profile yet is shown from Sidana's deal-memo data (`startup_profile_prefill`, 77 startups), labelled "From Sidana's deal memo". MIS files, the statements link and founder emails are never shown. |
| **Founder data is final (26 Nov)** | One rule for founder, investor and admin pages: `resolveStartup()` in `src/shared/lib/startup-facts.ts`, loaded by `getStartup()` / `getAllFounderFacts()` in `src/server/data/startup-facts.ts`. Founder-owned: revenue (uploaded figures, else their ARR answer, else Sidana's record), raise, sector, sub-sector, stage, and their sector/stage codes (new pickers on the profile form, from the agents' code list). Sidana-owned: status, allocation, emails, meetings. Saves are live at once (no approval gate; Sidana's review is now an after-check), each changed field is logged on Admin → Activity with old and new value, and founder values go to STARTUPS + STARTUP_PROFILE through PORTAL-FOUNDER-WRITEBACK. Memo text (`memo_body`, briefs) is not rewritten: the agents still regenerate those. |
| 2.7 Google Meet | `scheduleMeeting` in `/investor/startup/[id]/actions.ts` → n8n `PORTAL-MEET-CREATE` → `portal_meetings`. Slots must be at least 2 hours ahead (`src/shared/lib/meeting-rules.ts`), so CAL-SYNC shows the meeting to the founder and admins first. |
| 2.8 Chat with the visibility rule | `src/server/data/chat.ts` (`chatAllowed`), `/investor/chats`, founder `/chats` (new nav item) |
| 2.9 / 2.10 Fireflies conclusions | `src/server/data/conclusions.ts`, `/investor/meetings`, founder `/meetings` (conclusion in a past meeting's details) |
| 2.11 Admin visibility | `/admin/chats`, `/admin/activity`, `/admin/portal-access`, conclusion column on `/admin/meetings` |
| 2.12 Access after an engaged reply | `grant_portal_access_from_pipeline()` in `MIGRATIONS/017-portal-activity-and-grant.sql` |
| 2.14 Phone width | checked in `tests/e2e/15-investor-portal.spec.ts` |
| Shared deals | `/investor/shared`: every live deal Sidana emailed the investor (from `mail_log`), with its status |
| Past deals | `/investor/past-deals`: passed (with reason), didn't close, no reply after the round ended |
| Pass with reason + revisit triggers | Pass dialog (`src/app/investor/(portal)/pass-dialog.tsx`, `deal-actions.ts`), rules in `src/shared/lib/deal-signals.ts`, checks in `src/server/data/investor/signals.ts`. Reasons and triggers are never shown to founders (enforced by a test in `architecture-boundaries.test.ts`). |
| 2.2 Live figures | Dropped (Sidana, 14 Nov). Needs written confirmation. |
| 2.3 Clean-up | Parked by Sidana. |

Investor pages live under `/investor/...` (not `/meetings`, `/chats`) so they never clash with founder routes.

## Before launch: in order

1. **Migrations 011–019** (Phase 2; renumbered 26 Nov from 009–017 to sit after `main`'s 010-pipeline-mirror). All run in Supabase 19–24 Nov under their old numbers, so nothing to re-run. Before 017, confirm `pipeline_deals` has the columns `deal_id, startup, investor, thread_id, investor_response`.
2. **Google sign-in**: done 24 Nov. Google Cloud project "Sidana Investor Portal" (External, In production, scopes openid/email/profile, no logo so no brand review), web client with redirect `https://elwaquzawoscotlojtnv.supabase.co/auth/v1/callback`; Google enabled in Supabase, sign-ups allowed. Checked: Supabase sends sign-ins to Google and Google accepts the client. Still to check: the Supabase redirect allow-list has `https://svdealflow.io/auth/callback`, `https://www.svdealflow.io/auth/callback` and `http://localhost:3007/auth/callback`, and one real investor sign-in on staging (this also proves the client secret).
3. **Env**: add `N8N_MEET_CREATE_WEBHOOK_URL`, `N8N_THESIS_WRITEBACK_WEBHOOK_URL` and `N8N_FOUNDER_WRITEBACK_WEBHOOK_URL` to `deploy/app.env` (names already in `.env.example`).
4. **n8n**: the four workflows below are built in n8n (19 Nov), **inactive**, and tested without touching live data. Turn each on only after step 1.

   | Workflow | n8n id | What it does | To go live |
   |---|---|---|---|
   | PORTAL-MEET-CREATE | `F0q9CF2l0eK55Mce` | Webhook from the portal's "Schedule a meet": creates the Calendar event with a Meet link on **Google Calendar account** (CAL-SYNC's "Cal 1"), invites founder + investor, returns `event_id, ical_uid, meet_link, start`. Secret = `N8N_NOTIFY_SECRET`. `dry: true` builds the event without creating it. | Confirm "Google Calendar account" is the dealflow calendar (or switch the node to another of CAL-SYNC's four). Activate. Set `N8N_MEET_CREATE_WEBHOOK_URL=https://sidanaventures.app.n8n.cloud/webhook/sidana-portal-meet-create-8d41c7e2a9` in `deploy/app.env`. Book one test meeting and check CAL-SYNC resolves it. |
   | FF-CONCLUSIONS-SYNC | `SPU0MqV7XNDBHkSw` | Daily 18:00 IST (after FIREFLIES-SYNC at 17:30): copies summary fields (never the transcript) from data table `fireflies_transcripts` into `meeting_conclusions`, then runs `link_meeting_conclusions()`. | Activate. One-time backfill: `POST .../webhook/sidana-ff-conclusions-sync-3a9e51c7d2` with `{secret, days: 400, limit: 2000}`. |
   | PORTAL-GRANT-ACCESS | `E0gqCqlYwhB7RZNm` | Every 5 min at :02, :07, … (two minutes after SYNC-PIPELINE): runs `grant_portal_access_from_pipeline()`. Replaces the planned extra step in SYNC-PIPELINE, so **SYNC-PIPELINE is not edited**. | Decide the first-run question (all past meetings get access) first. Activate. |
   | SYNC-MATCH-PROFILE | `5O5QL6nKfzezPyZS` | Hourly at :40: copies STARTUP_PROFILE codes (sector_codes, stage_code, business_model, raise_cr, arr_cr, active) into `startup_match_profile`, linking each row to `startups` by name like SYNC-DECKS. Aborts without writing if the sheet returns under 10 rows. Without it, Matches is empty for everyone. | Run 019. Activate, then run once by hand for the first copy. |
   | PORTAL-FOUNDER-WRITEBACK | `ESSdRLWDSIJw7Cha` | Webhook from the founder portal after a profile save or figures upload: writes the founder's own values to STARTUPS (`sector`, `stage`, `raise_inr_cr`, `revenue`) and STARTUP_PROFILE (`sector_codes`, `stage_code`, `raise_cr`, `arr_cr`), changed cells only, stamping STARTUP_PROFILE `reviewer_notes` "Portal: updated by the founder on <date>". Row found by normalised startup name; unknown or duplicated name writes nothing; no STARTUP_PROFILE row means codes aren't written (noted in the result). Secret = `N8N_NOTIFY_SECRET`; `dry: true` plans only (dry run on Outlanders 26 Nov: 4 cells + stamp, correct). Results on Admin → Activity. | Activate. Set `N8N_FOUNDER_WRITEBACK_WEBHOOK_URL=https://sidanaventures.app.n8n.cloud/webhook/sidana-portal-founder-writeback-5b2d8e14f7` in `deploy/app.env`. |
   | PORTAL-THESIS-WRITEBACK | `Ds9gP52XCW2LlA8H` | Webhook from the portal, right after an investor saves a thesis change, passes with a sector or ARR lesson, or removes a learned sector: writes only the changed cells (sector_mode, sectors_in, stage_min/max, cheque_min/max_cr, arr_min_cr, sectors_excluded) on that investor's INVESTOR_CRITERIA row, and stamps rule_notes "Portal: thesis edited by the investor on <date>". Matches the row by normalised name; an unknown or duplicated name writes nothing. Secret = `N8N_NOTIFY_SECRET`; `dry: true` plans without writing. Each result is logged on Admin → Activity ("Thesis copied to INVESTOR_CRITERIA" / "NOT copied"). | Activate. Set `N8N_THESIS_WRITEBACK_WEBHOOK_URL=https://sidanaventures.app.n8n.cloud/webhook/sidana-portal-thesis-writeback-7c3e91d4a2` in `deploy/app.env`. Unset = portal-only. |
   | PORTAL-INVITE-PARAGRAPH | `vqoN8ForLrKlDvkn` | Sub-workflow for the reply tools: adds the one-time platform paragraph when the thread's investor has a pending invite, then marks it sent. Returns the reply unchanged on any error (tested with the access table missing). | Wire into each reply tool (below), one mailbox first. |

   **Wiring a reply tool** (REPLY-SEND-MB2…MB6, the -ATT variants, the agents' reply-in-thread): two nodes, nothing else changes.
   1. Between `Webhook` and `Check`: an **Execute Workflow** node calling `vqoN8ForLrKlDvkn`, mode "run once for each item", with the webhook item plus `portal_action: 'add'`. It returns the same item with `body.html` updated and `body._portal_invite` set. The tool's existing guards in `Check` and `Build` then run as before.
   2. After `Send` (only reached when Gmail accepted a real send): an **Execute Workflow** node calling the same sub-workflow with `{ portal_action: 'mark_sent', investor_id: $('Check').first().json._portal_invite.investor_id }`, behind an IF that `_portal_invite` is set.
   Callers can put `{{PORTAL_INVITE}}` in the HTML where the paragraph should go; without it the paragraph goes at the end.
5. **Verify** one portal-booked Meet resolves in `resolve_meetings()` to the right startup and investor.

## Demo investor login (production)

"Sidana Demo Investor (internal)", `investors.id = 990001`, created 24 Nov so the team can see the live investor portal. Status `paused`, `suppressed = true`, no email on file (outreach can't reach it). Not `do_not_contact`: the portal hides all matches for do-not-contact investors. Portal access granted by admin, invite marked sent, login email set to a team member's Gmail (see or change it on Admin → Investor Access). Thesis copied from Insignia VC. Don't press Schedule a meet with it on a real startup: that invites the real founder. Revoke on Admin → Investor Access to switch it off.

First real Google sign-in tested 24 Nov on localhost against live Supabase: account created, access `first_signin_at` set, `signed_in` logged; Matches, Shared deals, Chats, Meetings and Past deals all loaded without errors.

## Additions beyond the signed scope

Chat attachments, the meeting notice in chat, Shared deals, Past deals, passing with a reason, learned thesis rules and revisit triggers were added on request after the agreement. Worth noting with Sidana.

- Revisit triggers are checked when a founder uploads figures and when the investor opens the portal; the investor sees an in-portal notice. Emailing the notice needs an n8n sender reading `investor_notifications` where `emailed_at` is null (not built).
- Thesis edits and learned rules reach the agents' INVESTOR_CRITERIA tab through PORTAL-THESIS-WRITEBACK (approved 24 Nov). Not copied: a skipped stage (no INVESTOR_CRITERIA field), and removing a learned ARR floor (the sheet may hold Sidana's own researched minimum).

## Heads-up on the first grant run

`grant_portal_access_from_pipeline()` also grants on any `meetings` row with an investor and startup (a meeting fixed by email). The first run will therefore open access for every investor who has ever had a meeting, each with `invite_status='pending'`, so their next email would carry the link. If Sidana only wants this from launch onward, mark those rows `invite_status='sent'` once after the first run.

## Still open with Sidana

- Written confirmation: 2.12 trigger wording, 2.2 dropped, 2.1 investors-only.
- Matching: which startup statuses count as "open" (`OPEN_STATUSES` in `src/shared/lib/thesis.ts`).
- 2.5: interested count = meetings (held + upcoming), not distinct investors.
- Investors whose email isn't a Google account (126 of 383): an admin adds a Google login email on `/admin/portal-access`; email OTP would need Sidana's OK.

## Tests

- Unit: `tests/unit/investor-portal.test.ts` (matching, thesis validation, email resolution, safe redirects, Meet de-duplication, chat rule, Fireflies linking, IST slots). Page guards cover `/investor/(portal)`.
- Browser: `tests/e2e/15-investor-portal.spec.ts` against the mock Supabase, which now has a mock Google sign-in and the PORTAL-MEET-CREATE webhook.
