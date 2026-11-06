# Sidana Platform — Phase 1: Project handoff

A single-document overview of what this project is, how it is built, what has
been shipped, and what is still planned. Written to onboard a fresh Claude Code
session (e.g. on a new machine) and to give a human the same picture. Read this
first, then the code.

_Last updated: 2026-10-26._

---

## 1. What this is

**Sidana Platform Phase 1** is the founder- and team-facing web platform for
**Sidana Ventures**, an investment / fundraising-advisory firm. Sidana builds a
startup's investment memo, matches it to investors whose thesis fits, runs the
outreach and the meetings, and reports to the founder every week.

A lot of the actual work (matching, outreach emails, follow-ups, reply tracking)
runs as **n8n automation over a Google Sheet** (the "Pilot sheet"). This web
platform is the **portal layer on top**: it gives founders a dashboard and their
own data, and gives the Sidana team an admin panel. The platform **reads** from
Supabase, which is kept in sync with the sheet by n8n; it is careful **never to
overwrite** the agents' sheet or core records without human review.

---

## 2. Tech stack & environment

- **Next.js 15** (App Router, React 19, server components + server actions).
- **Supabase** (Postgres + Auth). Access from the app is via a **service-role**
  client on the server only, filtered in application code by the verified
  session. The service-role key is server-only and never shipped to the browser.
- **Tailwind CSS 3**, **lucide-react** icons, **recharts** for charts,
  **framer-motion** on the marketing site, **zod** for input validation.
- **n8n cloud** (`sidanaventures.app.n8n.cloud`) for all automation.
- **Google Sheets** as the agents' operational datastore.
- Local dev is on **Windows** (PowerShell + Git Bash). Node 24.
- Dev server: `npm run dev` (this project has been run on **port 3007**:
  `npm run dev -- -p 3007`). There is intentionally no `.claude/launch.json`.
- Project root on the current machine: `C:\Users\abhis\Desktop\phase 1`.

### Scripts (`package.json`)
- `npm run dev` / `build` / `start` / `lint` / `typecheck`
- `provision:founders`, `provision:admins` — create portal logins
- `backfill:weekly` — backfill weekly report rows (`-- --apply` to write)
- `migrate:mustreset`, `reset:founders` — password tooling

### Where secrets live (all git-ignored — never commit or print these)
- `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_BOOTSTRAP_PASSWORD`.
- `*.local.csv` — credential/seed CSVs.
- n8n credentials and webhook secrets live inside n8n, not in the repo.

---

## 3. Key external resources

| Resource | Identifier |
|---|---|
| GitHub repo | `abhinav0510/phase-1` — **currently PUBLIC** (a launch blocker; make private) |
| Supabase project ref | `elwaquzawoscotlojtnv` |
| Pilot sheet (agents' datastore) | `1hTpvAl-fj8ON4MiiWVgc478QCdWVcwEe-2dI3sLiGq4` |
| Startup documents sheet | `1I3AS7bFZRzq3Drka3rMqRt9zLirZbSUFTVtnYZIbAvM` |
| n8n instance | `https://sidanaventures.app.n8n.cloud` |

Pilot sheet tabs that matter: **PIPELINE** (one row per startup×investor deal,
the outreach log), **STARTUPS** (per-startup, incl. `deck_link` col H),
**STARTUP_PROFILE** (coded matchmaking profile), **Founders Info** (founder
emails), **INVESTORS**, **ONBOARDING**, **RUN LOG**.

### n8n workflows
| Workflow | ID | Purpose |
|---|---|---|
| Weekly Founder Update | `2MG95rlJDoFNz8tJ` | Sat 10:00 IST: emails founders their weekly report AND saves a row per startup to `weekly_reports` (quiet weeks included; emails still gated at ≥3 investors reached) |
| SYNC-CONTACTS | `oTKgX3jG0Jbt7kzZ` | Hourly: mirror founder emails from "Founders Info" → `startup_contacts` |
| SYNC-DECKS | `CURnR40YSaT1H9se` | Hourly: mirror each `STARTUPS.deck_link` → `startup_decks` (bit.ly expanded to the Drive file id) |
| Deal agents + senders | (various) | Match startups↔investors, compose & send outreach/replies, track responses. The send workflows are dumb Gmail pipes; the agents compose from the STARTUPS row. |
| Guarded cell-write | `mLNKn6f1T0S7l4XQ` | Writes single cells on STARTUPS behind a secret |

---

## 4. Repository map

```
src/
  app/
    page.tsx                     Marketing homepage (navy/gold, scoped .home-v3)
    home.css, auth.css           Scoped stylesheets for site + sign-in
    layout.tsx, globals.css
    login/ teamonly/             Founder + team sign-in (AuthShell)
    forgot-password/ reset-password/ force-reset/
    (founder)/                   Founder portal (requireFounder gate)
      layout.tsx                 Shell: sidebar + topbar + announcements
      dashboard/                 CRM-style dashboard (page + _components/*)
      complete-profile/          27-field profile form + save/submit actions
      pitch-deck/                Drive-preview of the investor deck
      weekly-reports/ meetings/ funding/ financials/
      business-details/ profile/ settings/
    admin/                       Team panel (requireAdmin gate)
      page.tsx                   Admin dashboard
      startups/ investors/ matches/ meetings/ documents/
      users/ notifications/ announcements/ reports/ settings/
      profiles/                  Founder-profile review queue + approve/request
    actions/                     Shared server actions
  components/
    layout/   shell, sidebar, topbar, nav.ts (FOUNDER_NAV / ADMIN_NAV)
    ui/       card, badge, table, bar-chart, join-link, auto-refresh
    home/     marketing-site components
    site/     auth-shell
    announcements/
  lib/
    auth.ts                      getSessionUser / requireFounder / requireAdmin
    supabase/                    server + admin clients
    data/founder.ts, admin.ts    All DB reads (service role, scoped)
    profile/fields.ts            SINGLE source of the 27 profile fields
    types/db.ts                  Hand-authored types mirroring Supabase
    fonts.ts, utils.ts
MIGRATIONS/                      *.sql run MANUALLY in Supabase SQL editor
  notifications.sql, weekly-reports.sql, startup-decks.sql,
  startup-profiles.sql, PROPOSED-rls.sql (NOT yet applied)
scripts/                         provisioning + backfill node scripts
mockups/homepage-v2/             The approved homepage mockup (reference)
docs/                            Plans & this handoff (currently untracked)
```

### Conventions worth knowing
- **Migrations are additive and run by hand.** The app's key cannot create
  tables. Each `MIGRATIONS/*.sql` creates new tables only, enables RLS with
  **no** anon/authenticated policy (service-role only), and is safe to re-run.
  A new feature table → write the SQL, ask the user to run it in Supabase.
- **CSS is scoped** under a wrapper class (`.home-v3`, `.auth-v3`) so the
  marketing/auth restyle never leaks into the dashboard.
- Nav items use a string icon **key** resolved in the client sidebar, so the
  list can cross the server→client boundary.
- All founder data access is filtered by a `startupId` taken from the verified
  session, never from client input. RLS at the DB is recommended but not yet on.

---

## 5. Features shipped

### Marketing site & auth
- Navy/gold homepage (hero, sectors, how-we-help, deal-desk cards, two "Ask
  Sidana" mailto forms). Founder login, team login (`/teamonly`, unlisted),
  and the full password-reset set, all in one theme.

### Founder portal
- **Dashboard** (CRM-style): KPI tiles (ask, allocation left, matches with a
  "contacted" ring, meetings); a chevron **outreach pipeline** listing the real
  investors at each stage; **matches-by-state** donut; **weekly activity**
  grouped bars; upcoming meetings; a **recent-activity** timeline; a financial
  **snapshot** with a runway meter; a **profile-completeness** gauge + a
  "Complete your profile for the best matches" banner.
- **Complete Profile** — 27 fields in 5 sections (Company, Founders & team,
  Stage & traction, The round, Investor preferences), defined once in
  `lib/profile/fields.ts`. On-record values are pre-filled; matching-critical
  fields are tagged. Save draft / Submit for review. (In the open PR.)
- **Pitch Deck** — the exact deck investors receive, embedded from Google Drive,
  with copy-link / open buttons; synced hourly from the sheet.
- **Weekly Reports** — every week shows, quiet weeks included.
- Investors & Matches, Meetings (with Join links), My Startup, Financials,
  My Profile, Settings (change password). Announcements bell + popup. Sidebar
  quick actions + "your Sidana contact" card.

### Admin panel
- Dashboard + reports with charts. Startups, Investors, Matches, Meetings,
  Documents. Users & Access (provision founder/team logins). **Email Startups**
  (broadcast to all/selected/custom via n8n, with per-recipient status).
  **Announcements** (in-app notices). **Profile Reviews** (compare submitted
  answers vs record, approve or request changes — in the open PR, not yet
  browser-tested with a team login).

### Automation (n8n)
- Deal agents (match/outreach/follow-up/reply tracking). SYNC-CONTACTS,
  SYNC-DECKS, and the Weekly Founder Update (emails + Supabase save). See §3.

### Supabase tables added by this platform
`startup_contacts`, `contact_sync_runs`, `email_broadcasts`,
`email_broadcast_recipients`, `announcements`, `announcement_dismissals`,
`weekly_reports`, `startup_decks`, `startup_profiles`. (The agents' own
`startups`, `investors`, `matches`, `meetings`, etc. predate the platform.)

---

## 6. Git / delivery state

- **GitHub `origin/main`** includes (merged PRs): homepage v3, sign-in redesign,
  founder dashboard (#4), pitch deck (#5), weekly quiet-weeks (#6).
  > Note: the *local* `main` on the old machine was left behind origin/main.
  > On the new machine, just clone — origin is the source of truth.
- **Open PR:** `feat/profile-completion` (complete-your-profile + admin review).
  Its conflicts with main were resolved by a merge commit (`0432d02`) and pushed,
  so it should merge cleanly. **It is not merged yet.**
- **Not yet in any PR:** the **mobile navigation** drawer commit (`5c9c45f`),
  sitting on the local `feat/founder-dashboard-v2` branch. Needs its own PR cut
  from `main`. (Below `md`, founders currently cannot navigate between pages.)
- `docs/` (the storage plan + this file) is **untracked** — commit if you want
  it to travel with the repo to the new machine.

### Migrations that must be applied in Supabase for features to work
`notifications.sql`, `weekly-reports.sql`, `startup-decks.sql`,
`startup-profiles.sql` — all already applied on the live Supabase project.
`PROPOSED-rls.sql` — **not** applied (see roadmap).

---

## 7. Standing rules & constraints (carry these into every session)

1. **Do not change any agent or Supabase data** without the user's explicit
   approval. Never overwrite existing sheet values; fill only empty cells, and
   report would-be overwrites as conflicts.
2. The **service-role key stays server-only**; credential CSVs and `.env.local`
   stay git-ignored.
3. **Founder input never writes `public.startups` or the Pilot sheet** directly.
   Submissions land in their own table and are reviewed by the team.
4. Every founder query is scoped by the **verified** `startupId`.
5. **Never touch the user's browser sign-ins / sign them out.**
6. Database tables are created by the **user** running SQL in Supabase, not by
   the app. Hand them the migration; don't try to self-apply.
7. Verify in the browser before claiming something works; report failures with
   the actual output.
8. Work on a **feature branch**, open a PR, let the user merge. Commit messages
   and PR descriptions use the attribution lines the session is told to use.

---

## 8. Roadmap — what's still missing

### Launch blockers (do first)
1. **Make the GitHub repo private.**
2. **Deploy to the VPS:** domain, HTTPS, nightly backups, process restarts.
   Nothing above is live for users until this is done.
3. **Secure the weekly-report webhooks** (preview/test/resend have no secret).
4. **Apply row-level security** (`MIGRATIONS/PROPOSED-rls.sql`). Isolation
   currently relies on app code alone.
5. **Turn on n8n error alerts** — a failed Saturday run or sync is silent today.

### Finish what's in flight
6. **Merge the profile-completion PR**, then **cut a PR for the mobile-nav
   commit** (`5c9c45f`) so phones can navigate.
7. **Sync approved profiles → the match sheet** (STARTUP_PROFILE / STARTUPS),
   filling only empty cells, so founder answers actually improve matching.
   (A design-first task; mapping must be approved before anything writes.)
8. **Notify the team when a founder submits a profile.**
9. **Browser-test the admin Profile Reviews screens** with a team login.

### New features worth building
10. **Founder deck & memo uploads**, one per 14 days, fed into the mail
    campaigns. Planned in `docs/deck-and-memo-storage-plan.md` (VPS storage,
    nginx X-Accel-Redirect, restic backups, a stable `/d/{token}` link, a
    MATERIAL-SYNC webhook). Uncommitted.
11. **Founder document uploads** (MIS, financials, cap table) to replace the
    Drive links in the documents sheet.
12. **Meeting outcomes for founders** (feedback, next steps, who passed & why)
    in the portal, not only in the weekly email.
13. **Founder ↔ team messaging / requests** instead of email.
14. **"Ask Sidana" via n8n** (not `mailto:`) and a **live investor count** on
    the homepage (replacing the fixed 311).
15. **Investor portal** — an `investor` role exists in the data but has no view.
16. **Two-factor auth for team accounts** + an **audit log** of admin actions.
17. **Automated tests** — there are currently none; a few e2e tests for login,
    dashboard and profile-save would catch regressions before merge.

Suggested order: 1–5 (safe launch) → 6–7 (make shipped features useful) →
10 (deck uploads, previously requested).

---

## 9. First moves for a fresh session on a new machine

1. `git clone` the repo (origin/main is current) and `npm install`.
2. Obtain `.env.local` and any `*.local.csv` from the user (they are git-ignored,
   so they won't be in the clone). Without them, Supabase/auth won't work.
3. `npm run dev -- -p 3007`, then sign in as a founder/team user to see the app.
4. Read `lib/auth.ts`, `lib/data/founder.ts`, `lib/profile/fields.ts`,
   `components/layout/*`, and this project's `MIGRATIONS/`.
5. Re-read §7 before writing anything that touches data, n8n, or the sheet.
