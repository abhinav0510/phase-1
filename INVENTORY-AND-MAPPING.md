# Sidana Platform — Phase 1: Environment Inventory & Feature→Data Mapping

_Generated 2026-10-21 by inspecting the live Supabase project and n8n cloud instance. Read-only. No agent, workflow, table, or row was modified._

## 1. Integration status

| System | Status | Notes |
|---|---|---|
| Supabase (`elwaquzawoscotlojtnv`) | ✅ Reachable | Inspected via REST OpenAPI + service_role. 30 tables/views. |
| n8n cloud | ✅ Reachable | 157 workflows (was transiently erroring earlier). |
| Existing Next.js codebase / Ops Console | ❌ Not available to this session | Working dir is `C:\WINDOWS\system32`; no Sidana repo mounted. Build will be a fresh Next.js app. |

## 2. What Sidana actually is (from the data)

**This is a VC fund's internal deal-flow / fundraising CRM — not a startup-accelerator platform.**
Sidana Ventures raises capital for portfolio **startups** by matching them to **investors**, running outreach from several mailboxes, booking meetings, and tracking replies/shares.

## 3. Supabase schema (source of truth for the dashboard)

Core tables (with current row counts):

| Table | Rows | Purpose |
|---|---|---|
| `app_users` | 3 | **Auth bridge.** `id`(uuid=auth user), `email`, `role`, `startup_id`, `investor_id`, `active`. All 3 current users = `owner` (Sidana internal). |
| `startups` | 73 | Portfolio startups: sector, stage, status, bucket, ask amount, allocation left, revenue/burn/runway, score, mandate dates. |
| `investors` | 310 | Investor universe: type, status, sectors, stage/cheque prefs, criteria, contact. |
| `matches` | 3,360 | Startup↔investor matches: type, state, score, fit flags, priority. |
| `meetings` | 1,141 | Startup↔investor meetings: scheduled_at, held, fireflies_id, meet_link. |
| `shares` | 16,095 | Outreach/share records. |
| `replies` | 382 | Investor replies. |
| `funding_rounds` | 0 | Empty (schema exists). |
| `docs` | 0 | Empty (schema exists) — doc requests/classification. |
| `outreach` | 0 | Empty (schema exists). |
| `mail_log` | — | Mail history (written by MAIL-HISTORY workflow). |

Plus analytics **views**: `v_startup_board`, `v_startup_funnel`, `v_investor_cohorts`, `v_owed_replies`, `v_recent_replies`, `v_silent_startups`, `v_today`, `v_upcoming_meetings`, `v_changes_7d`, and key views. These are ready-made for dashboard widgets.

### Key enums
- `app_users.role`: **owner, ops, deals_desk, angel_desk, founder, investor** ← the model already anticipates founder & investor logins.
- `startups.status`: live, a1_ready, a2_waiting, term_sheet, closed, silent, blocked, mandate_closed
- `startups.bucket`: HOT10, A, B, C, UNASSIGNED
- `investors.type`: angel, angel_network, syndicate, micro_vc, seed_fund, institutional_vc, family_office, other
- `investors.status`: active, engaged, pending, paused, passed_all, do_not_contact
- `matches.state`: queued, sent, paused, tracker_only, not_queued

## 4. n8n workflow inventory (157 total, reusable for notifications/actions)

Categories observed:
- **Read webhooks:** `DB-READ` (read-only Supabase), `SHEET-READ`, `CAL-READ`, `GMAIL-SEARCH`, `PIPE-READ`.
- **Guarded send webhooks (per mailbox):** `REPLY-SEND-MB2..6`, `NEW-SEND-MB*`, `ONB-FU-SEND-MB5`, `INTERNAL-SEND` — read-before-write guarded email sends.
- **Agent tools (deal agents):** work queue, follow-up diary, read/write "the book", book a meeting (CAL-CREATE), heartbeat.
- **Scheduled:** `ENGINE-DAILY` (match engine), `MAIL-HISTORY`, `Weekly Founder Update`, `TASK-HEARTBEAT`.
- Note: a parallel data "book" also lives in **Google Sheets** (STARTUPS, STARTUP_PROFILE, INVESTOR_CRITERIA, PIPELINE, FOLLOWUP_DIARY). Supabase is treated as the dashboard's source of truth per your instruction.

## 5. Feature→data mapping vs. the master build prompt

The master prompt describes a **startup-accelerator** (programs, applications, onboarding, resources, verification). Mapping each against the real schema:

| Master-prompt feature | Real data source | Status |
|---|---|---|
| Startup profile / business details | `startups` (73 rows) | ✅ Available |
| Financials (revenue, burn, runway, ask, allocation) | `startups` fields, `funding_rounds` | ✅ Fields exist (`funding_rounds` empty) |
| Funding & investor matches | `matches` (3,360), `investors` (310) | ✅ Rich data |
| Meetings | `meetings` (1,141) | ✅ Rich data |
| Documents / verification | `docs` (schema only, 0 rows) | ⚠️ Schema exists, no data |
| Dashboard KPIs / funnel / trends | views (`v_startup_funnel`, `v_startup_board`, …) | ✅ Ready-made |
| Auth & roles | `app_users` + Supabase Auth | ✅ Model exists (only `owner` users so far) |
| Messages / communications | n8n send webhooks + `mail_log`/`replies` | ⚠️ Partial (email via n8n, no in-app thread table) |
| **Programs** | — | ❌ No table/data |
| **Applications** | — | ❌ No table/data |
| **Onboarding progress** | — | ❌ No table (completion can be computed from `startups` fields) |
| **Resources library** | — | ❌ No table/data |
| **Audit logs** | — | ❌ No table (`ai_log`/`ai_runs` exist for AI actions) |

## 6. The decision needed (see chat)

The prompt's accelerator features (programs/applications/resources) have **no backing data or schema** here. Building them literally = empty screens. The high-value Phase 1 over the *real* data is a **Founder dashboard + Admin/Ops panel** over startups/investors/matches/meetings/funding/docs, using the existing views and reusing n8n webhooks for actions. Final scope is your call.
