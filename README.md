# Sidana Platform — Phase 1

Founder dashboard + Admin/Operations panel built on Sidana Ventures' **existing**
Supabase deal-flow database and n8n cloud workflows. Next.js 15 (App Router) +
TypeScript + Tailwind + Supabase Auth.

> Scope was adapted to the **real data** (a VC deal-flow CRM), not the
> accelerator concept in the original brief. See `INVENTORY-AND-MAPPING.md` for
> the full schema inventory and feature→data mapping.

## What was built

### Shared foundation
- Supabase clients: browser (anon, RLS), server (cookie-bound, RLS), **service-role (server-only, `server-only` guarded)**.
- Auth: Supabase email/password, `middleware.ts` session refresh + route protection, role-aware redirects (`src/lib/auth.ts`).
- Typed DB layer mirroring the live schema (`src/lib/types/db.ts`).
- Reusable UI: navy sidebar, top bar, cards, stat cards, status badges, tables, bar charts, empty states.

### Admin / Operations panel (`/admin/*`) — for owner/ops/deals_desk/angel_desk
| Route | Shows (live data) |
|---|---|
| `/admin` | KPIs (73 startups, 310 investors, 3,360 matches, 1,141 meetings), status & bucket charts, recent startups, upcoming meetings |
| `/admin/startups` | Directory: search, status/bucket/sector filters, sort, pagination |
| `/admin/startups/[id]` | Full startup profile, financials, investor matches (w/ names), meetings, funding, docs |
| `/admin/investors` | Directory: search, status/type filters, pagination |
| `/admin/matches` | Match-state distribution + totals |
| `/admin/meetings` | Upcoming / past / all, paginated |
| `/admin/documents` | Pending-doc verification queue (empty until docs are logged) |
| `/admin/users` | app_users + founder-provisioning status |
| `/admin/reports` | Status, bucket, investor-type, match-state charts |
| `/admin/settings` | Account + security |

### Founder portal (`/dashboard`, `/business-details`, …) — for role `founder`
Every query is filtered server-side by the **verified** session `startup_id`, so a
founder can only ever see their own startup. Pages: dashboard (ask, allocation,
matches, meetings, profile completion), My Startup, Financials, Investors &
Matches, Meetings, My Profile, Settings (self-serve password change).

## Auth & access model
- `app_users.id` (uuid) = the Supabase Auth user id; `role` + `startup_id`/`investor_id` drive access.
- **Founders** sign in with a **Login ID** (their startup id) → mapped to a synthetic
  email `s<id>@founders.sidana.local`. Initial password is a one-time activation
  code (`SID-<id>-<NAME4>`). The account carries a `must_reset` flag (stored in
  **`app_metadata`**, writable only by the service role); `requireFounder`
  redirects any such founder to **`/force-reset`** and blocks the whole portal until
  they set their own password, which clears the flag **server-side**. Admins are
  gated the same way via `requireAdmin`.
- **Team/admins** sign in with email + password; the Phase-1 bootstrap password is
  read from the `ADMIN_BOOTSTRAP_PASSWORD` env var (in git-ignored `.env.local`,
  never committed) and should be rotated after admins reset.
- Authorization is enforced **server-side** (role checks + startup_id filtering).
  Database-level RLS is provided as a reviewed, **not-yet-applied** migration
  (`MIGRATIONS/PROPOSED-rls.sql`) for defense-in-depth.

## Public website (Sidana Labs)
The root `/` is the public marketing site — a premium investment-banking landing
page with a real-time 3D hero (React Three Fiber: dotted globe, an animated glass
skyline of setback towers with twinkling gold windows and a spire that rises in on
load, gold orbit rings) and Framer Motion scroll/hover animations. Tower layout and
scale live in `TOWERS` / `SKYLINE_SCALE` in `src/components/site/hero-scene.tsx`.

| Route | Who | Linked from the site? |
|---|---|---|
| `/` | Public | — |
| `/login` | Founders (Login ID + password) | **Yes** — the nav "Login" button and footer |
| `/teamonly` | Sidana team / admins (email + password) | **No** — unlisted; team uses the URL directly |

- Components: `src/components/site/*` (nav, hero, hero-scene, services-strip, principles, sections).
- Auth pages (`/login`, `/teamonly`, `/force-reset`) share `src/components/site/auth-shell.tsx`: a cinematic CSS-built backdrop (angled slabs, glowing gold light-slit, reflective floor, drifting fog), brand chrome, and a glass card with icon fields, a password eye toggle, and staggered entrance animations.
- Copy, contact email, nav links and the login path live in `src/components/site/site-config.ts`.
- The Contact buttons are `mailto:` links to `SITE.contactEmail` (currently investors@sidanaventures.com — change it there).
- The Portfolio section lists focus **sectors only**; private startup names from the database are never shown publicly.
- Fonts: Cormorant Garamond (editorial serif) + Inter (sans) via `next/font`.
- Theme: the whole public experience is **light mode** — near-white / cool-mist surfaces (`paper` tokens), navy `ink` text and primary buttons, gold reduced to a bronze accent (`gold-dim`) for eyebrows, rules and icons, navy hairlines and a navy footer. The 3D skyline sits inside a **navy stage panel** in the hero so its glass/gold materials read on the light page. The sign-in pages (`/login`, `/teamonly`, `/force-reset`) share the same palette via the cool-light "atrium" `auth-shell` (stone-grey slabs, gold light-slit accent, white card with bronze hairline, navy buttons).

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (passes)
npm run typecheck  # tsc --noEmit (passes)
```
`.env.local` holds the Supabase URL, anon key, and service-role key (git-ignored;
service-role is server-only, never shipped to the browser).

## Account provisioning (manual — not run automatically)
These write ONLY to Supabase **Auth** + add rows to `app_users`. They never
modify or delete existing startups/investors/meetings/matches.
```bash
npm run provision:admins            # dry run: report admin auth status
npm run provision:admins -- --apply # set ADMIN_BOOTSTRAP_PASSWORD on the 3 existing owners
npm run provision:founders -- --dry-run  # preview founder accounts to create
npm run provision:founders          # create 1 Auth user + app_users row per startup
npm run migrate:mustreset -- --apply # move must_reset flags into app_metadata (one-time)
```
`provision:founders` writes credentials to `founder-credentials.local.csv` (git-ignored).

> Security note: activation passwords are deterministic and **guessable** by design
> (one-time codes). Treat Login IDs + activation codes as non-secret and rely on the
> forced reset; for a hardened rollout, generate random activation passwords instead.

## n8n
157 existing workflows inventoried (read webhooks, guarded per-mailbox send
webhooks, deal-agent tools, scheduled engines). None were modified. Server-side
integration points for notifications/sends (e.g. `DB-READ`, `REPLY-SEND-*`) are
identified in `INVENTORY-AND-MAPPING.md` and can be wired as a follow-up.

## Verified
- ✅ `npm run build` — all 21 routes compile, lint + types clean.
- ✅ `npm run typecheck` — clean.
- ✅ Live data reachable: counts (73/310/3,360/1,141) and the matches→investors
  embed return real records (e.g. Accel, Blinc Invest).
- ✅ App boots; `/login` renders with no console errors.
- ✅ End-to-end UI: admin login → dashboard/startups/detail; founder login (#15) scoped to own startup; forced first-login reset gate (`/force-reset`) blocks the portal until password is changed.

- **Meeting Join links:** admin (`/admin/meetings`, startup detail) and founder (`/meetings` upcoming, dashboard) show a **Join** button linking to each meeting's `meet_link` (opens in a new tab). 1,080 of 1,142 meetings have Google Meet links.

- **Password recovery:** `/forgot-password` (enter team email → Supabase reset email) and `/reset-password` (set a new password from the emailed link) are built, linked from `/teamonly`. Email-based recovery works for **team/admin** accounts only; founders use a synthetic Login-ID email, so founder recovery stays admin-mediated (they contact Sidana). **Requires** Supabase Auth email/SMTP to be configured and the site URL added to the Auth redirect allow-list.

## Not done / flagged follow-ups (no silent omissions)
- **Logged-in UI not yet exercised** — requires provisioning an account (above), which writes to Supabase Auth and awaits your go-ahead.
- **Write actions** (admin verification decisions, internal notes, founder profile edits) are intentionally read-only in Phase 1 to honor "don't change existing Supabase data." They need either writes to existing columns or new additive tables — both pending approval.
- **Documents/Storage** — no Storage bucket is exposed; signed-URL file viewing is a flagged integration point.
- **RLS** — proposed, not applied (`MIGRATIONS/PROPOSED-rls.sql`).
- **n8n notifications** — inventoried and mapped; not yet wired to UI actions.
- **Investor-role portal** — the role exists in the enum but was out of the chosen Phase-1 scope (founder + admin).
