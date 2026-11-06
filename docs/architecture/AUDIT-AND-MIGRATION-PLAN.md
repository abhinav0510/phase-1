# Architecture audit and migration plan

Audit date: 31 October 2026. Audited commit: `93bde3d`, which differs from `main` (`d670cd5`) only in `.github/dependabot.yml`.

**Status: awaiting approval. No application code has been changed.**

> **Do not commit this file while finding S1 is unfixed.** The repository is public, and S1 describes a live security problem.

## 1. Summary

The app works and its tests pass, but it has no backend layers. Pages and Server Actions call the database directly or through three large data files. There is also one serious security bug that should be fixed before any refactoring.

| Baseline check | Result |
|---|---|
| Type check | Passes |
| Lint | No warnings or errors |
| Unit tests | 99 of 99 pass |
| Browser tests, production server mode, fake services | 192 of 192 pass |
| Attempts to reach a real service during tests | None |

## 2. Critical findings

### S1. Founders can read admin page data (high severity)

**Cause:** 11 admin pages have no access check of their own and rely on `src/app/admin/layout.tsx`. Next.js renders a layout and its page at the same time, so the page's data is already in the response when the layout's redirect runs.

**Reproduced locally against the fake services, signed in as a founder:**

| Request | Status | Other startups' data in the response body |
|---|---|---|
| `/admin/startups/102` | 307 to `/dashboard` | Yes, including the other startup's name and test secret |
| `/admin/startups` | 307 | Yes |
| `/admin` | 307 | Yes |
| `/admin/users` | 307 | Yes, including a team email address |
| `/admin/investors` | 307 | Yes: investor names |
| `/admin/meetings` | 307 | Yes: investor names |
| `/admin/notifications`, `/announcements`, `/settings`, which have page-level checks | 307 | No |
| Any admin page while signed out | 307 | No: the middleware blocks it first |

A browser follows the redirect and shows nothing wrong, which is why the existing test passes: it only checks the final address. A script reading the response body sees the data.

Investor contact details from the fake data did not appear in the pages tested. `/admin/matches`, `/documents`, `/reports` and `/profiles` showed no marked data, but the fake data set is small, so they should be treated as affected. `/admin/profiles/[id]` wasn't probed.

**Production:** not tested, because that was out of scope. The same code is deployed, so assume it's affected. Exposure requires a valid founder login.

**Pages to fix:** `admin/page`, `documents`, `investors`, `matches`, `meetings`, `profiles`, `profiles/[id]`, `reports`, `startups`, `startups/[id]`, `users`.

**Fix:** add `await requireAdmin()` to each page, and a test that reads the response body rather than the final address. The refactor then moves this check into the service layer, so a page can't forget it.

### S2. Local testing can touch production

`.env.local` holds the same values that were copied to the production server, so `npm run dev` connects to real Supabase and real n8n. Saving a profile or sending a broadcast locally would change real data or send real email.

**Fix:** add `npm run dev:mock`, which runs the app against the fake services with demo logins. Use it for all testing of this refactor.

## 3. Inventory

### Size
138 TypeScript files and about 14,700 lines in `src`. 42 client components.

### Pages (30)
- **Public and sign-in:** `/`, `/login`, `/teamonly`, `/forgot-password`, `/reset-password`, `/force-reset`
- **Founder:** `/dashboard`, `/business-details`, `/complete-profile`, `/financials`, `/funding`, `/meetings`, `/pitch-deck`, `/profile`, `/settings`, `/weekly-reports`
- **Admin:** `/admin`, `/admin/announcements`, `/admin/documents`, `/admin/investors`, `/admin/matches`, `/admin/meetings`, `/admin/notifications`, `/admin/notifications/[id]`, `/admin/profiles`, `/admin/profiles/[id]`, `/admin/reports`, `/admin/settings`, `/admin/startups`, `/admin/startups/[id]`, `/admin/users`

There is no `/team` route. The team uses `/teamonly` to sign in and `/admin` to work.

### HTTP routes (3)
| Route | Method | Access check |
|---|---|---|
| `/api/health` | GET | Public. `?deep=1` also tests Supabase |
| `/api/founder/logo` | GET | Session, own startup only |
| `/auth/signout` | POST | Signs out the current session |

### Server Actions (15)
| File | Actions | Access check |
|---|---|---|
| `(founder)/complete-profile/actions.ts` | `saveProfile` | `requireFounder` |
| `(founder)/profile/actions.ts` | `uploadLogo`, `removeLogo` | `requireFounder` |
| `actions/announcements.ts` | `dismissAnnouncements` | `getSessionUser` |
| `admin/announcements/actions.ts` | `createAnnouncement`, `setAnnouncementActive`, `deleteAnnouncement` | `requireAdmin` |
| `admin/notifications/actions.ts` | `sendBroadcast`, `sendTestEmail`, `syncContactsNow` | `requireAdmin` |
| `admin/profiles/actions.ts` | `reviewProfile` | `requireAdmin` |
| `admin/users/actions.ts` | `resetUserPassword` | `requireAdmin` |
| `force-reset/actions.ts` | `completeForcedReset` | `auth.getUser` |
| `login/actions.ts` | `signInTeam`, `signInFounder` | Password check |

### Data access
- **Database calls by file:** `lib/data/admin.ts` 21, `lib/data/founder.ts` 17, `lib/data/notifications.ts` 10, Server Actions 22, `lib/auth.ts` 1.
- **Tables used by the app (18):** `startups`, `startup_profiles`, `startup_branding`, `startup_contacts`, `startup_decks`, `meetings`, `matches`, `investors`, `funding_rounds`, `weekly_reports`, `mail_log`, `docs`, `app_users`, `announcements`, `announcement_dismissals`, `email_broadcasts`, `email_broadcast_recipients`, `contact_sync_runs`.
- **Service-role client:** imported by 15 files, all server-side. No client component imports it.
- **Direct Supabase calls from the browser:** `forgot-password`, `reset-password` and `settings/change-password`, all for login recovery and password changes.

### Authentication flow
1. `middleware.ts` refreshes the session and sends signed-out visitors to `/login`.
2. `lib/auth.ts` provides `getSessionUser`, `requireUser`, `requireAdmin` and `requireFounder`.
3. Founder pages each call `requireFounder`, and their reads filter by the verified `startupId`.
4. Admin roles are `owner`, `ops`, `deals_desk` and `angel_desk`.
5. A `must_reset` flag forces a password change at `/force-reset`.

### Integrations
| Integration | What exists in the app |
|---|---|
| **Supabase** | Browser, server and service-role clients in `lib/supabase`, with shared timeouts and retries |
| **n8n** | `lib/n8n.ts`, used for broadcasts and contact sync. `scripts/backfill-weekly-reports.mjs` also has a hard-coded webhook address |
| **Google Sheets** | **No app code.** The sheet is only reached through n8n. The app only reads what n8n mirrors into Supabase |
| **Google Drive** | Embed and image links only |

### Environment variable names
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_BOOTSTRAP_PASSWORD`, `N8N_NOTIFY_SECRET`, `N8N_BROADCAST_WEBHOOK_URL`, `N8N_CONTACTS_SYNC_WEBHOOK_URL`, `APP_VERSION`, `REQUIRE_ENV`, `NEXT_OUTPUT`, `NEXT_DIST_DIR`, `NODE_ENV`, `NEXT_RUNTIME`. `.env.local` was not opened for this audit.

### Tests
- **Unit (8 files):** branding and utilities, dashboard model, email rendering, investor formatting, meetings, n8n, production helpers, profile fields.
- **Browser (7 files):** public pages and auth, access separation, founder pages, founder changes, admin, mobile, production behaviour.
- **Stack (1 file):** signing in through nginx, run in CI.
- **Fake services:** `tests/mock/`.

## 4. Structural problems

| Area | Problem | Where |
|---|---|---|
| Layers | No services or repositories; queries and business rules are mixed | `lib/data/*.ts` |
| Business logic in handlers | Recipient planning, sending and failure recording in one Server Action file | `admin/notifications/actions.ts` (278 lines) |
| Database calls in actions | 22 direct calls across 9 files | `app/**/actions.ts` |
| Authorization | Applied per page by hand, which is how S1 happened | `app/admin/**` |
| Silent failures | Admin reads and `getAnnouncementsForUser` still show blanks on failure | `lib/data/admin.ts`, `notifications.ts` |
| Large files | 474 lines; 486 lines; 473 lines | `dashboard/page.tsx`, `founder/ui.tsx`, `notifications/composer.tsx` |
| Duplicates | Two versions of Card, Table and BarChart | `components/ui`, `components/admin/ui` |
| Dead code | Nothing in the app reaches these 6 files | `layout/shell`, `layout/sidebar`, `layout/topbar`, `ui/bar-chart`, `ui/card`, `ui/table` |
| Mixed modules | Browser-safe and server-only code share `lib/` | `lib/` |
| Unsafe module | `lib/provisioning.ts` reads a password variable and is imported by app code | `lib/provisioning.ts` |
| Logging | Four `console` calls, no request IDs, no timings | `src` |
| Test gap | Access tests check the final address, not the response body | `tests/e2e/02-access-separation.spec.ts` |

Already sound, and to be kept: no client component imports server-only code, all 15 Server Actions check the user or password, and there is almost no `any`.

## 5. Where the requested design needs adapting

| Requested | Recommendation | Why |
|---|---|---|
| Everything through Route Handlers | Saves go through new API routes. Server Components read through services directly | Next.js advises against pages calling their own API over HTTP. It adds a network hop, makes cookies harder to pass and loses streaming |
| `src/app/team/` | Don't add | No such route exists, and adding one changes URLs |
| `integrations/google-sheets/` | Don't add | There's no code to move, and you asked for no empty folders |
| n8n in `/api/health/dependencies` | Check that it's configured, without calling it | n8n webhooks start workflows, so a health check could send real emails |
| Sheets in dependency checks | Leave out | The app has no Sheets connection to test |
| Replace `/api/health` | Keep `?deep=1` working and add the new routes | `deploy.sh`, `smoke-test.sh` and the Docker health check depend on it |
| Move sign-in to API routes | Update the nginx rate limit in the same change | The limit only covers `/login` and `/teamonly`, so moving it would silently remove the protection |
| New API routes for saves | Add an Origin check | Server Actions get this from Next.js, but Route Handlers don't |
| Metrics module | Simple in-process counters | They reset on restart, which suits a setup with no Prometheus |

## 6. Target structure

```text
src/
  app/                  Routes only: pages, layouts and thin route files. URLs don't change.
    (founder)/  admin/  api/  login/  teamonly/  ...
  client/
    components/  ui/  layout/  shared/
    features/    dashboard/  startups/  investors/  meetings/  documents/
                 profile/  notifications/  announcements/  auth/  home/
    services/    api-client.ts plus one file per area
    hooks/
    lib/
  server/
    auth/          session and role checks
    controllers/   read the request, validate, call a service, format the response
    services/      business rules and authorization
    repositories/  all database queries
    validators/    existing zod schemas
    integrations/  supabase/  n8n/
    errors/  logger/  observability/  health/  config/
  shared/
    types/  constants/  schemas/  lib/
  middleware.ts
  instrumentation.ts
```

**Save flow:** client service → `/api/...` route → controller → service → repository → Supabase.

**Read flow:** Server Component → service → repository → Supabase.

`src/server/routes/` from your structure is left out, because `app/api` already defines the routes.

### Proposed API routes

| Current action | New route |
|---|---|
| `saveProfile` | `PUT /api/founder/profile` |
| `uploadLogo`, `removeLogo` | `POST`, `DELETE /api/founder/logo` (existing `GET` unchanged) |
| `dismissAnnouncements` | `POST /api/announcements/dismissals` |
| `createAnnouncement` | `POST /api/admin/announcements` |
| `setAnnouncementActive`, `deleteAnnouncement` | `PATCH`, `DELETE /api/admin/announcements/[id]` |
| `sendBroadcast` | `POST /api/admin/broadcasts` |
| `sendTestEmail` | `POST /api/admin/broadcasts/test` |
| `syncContactsNow` | `POST /api/admin/contacts/sync` |
| `reviewProfile` | `POST /api/admin/profiles/[id]/review` |
| `resetUserPassword` | `POST /api/admin/users/[id]/reset-password` |
| `completeForcedReset` | `POST /api/auth/force-reset` |
| `signInFounder`, `signInTeam` | `POST /api/auth/login/founder`, `/team` |

`/auth/signout` and the logo `GET` keep their addresses. Password recovery stays in the browser, because Supabase's reset link depends on it, but moves behind `client/services/auth.ts`.

## 7. Migration phases

Each phase ends with the type check, lint, unit tests and all browser tests. A failure stops the work until it's fixed. Old code is removed only after its replacement passes.

| Phase | Work | Main risk |
|---|---|---|
| 0 | **Fix S1** on its own branch, with new response-body tests | Low |
| 1 | Create `refactor/architecture` from `main`; add `dev:mock` (S2) | Low |
| 2 | Add the folder structure; move shared types and utilities; split `lib` into client, server and shared | Low, mostly import paths |
| 3 | Move auth to `server/auth`, with no behaviour change | **High** |
| 4 | Add repositories and services one area at a time: founder reads, admin reads, profiles, logos, announcements, broadcasts, users. Authorization moves into services | Medium |
| 5 | Add controllers, API routes and client services, one action at a time, sign-in last, including the nginx update | **High** |
| 6 | Move components into features; split the three large files; merge duplicates; delete the 6 dead files | Medium, tests don't check appearance |
| 7 | Centralize Supabase and n8n; fix silent admin read failures | Low |
| 8 | Add health routes, structured logs with secrets removed, request IDs and timings | Low |
| 9 | Write the 14 requested documents | Low |
| 10 | Full regression run and final report | None |

**Could be left unchanged if too risky:** browser password recovery, and `home/` visuals, which have no backend logic and only need moving.

## 8. What stays untouched

No connection to the VPS, deployments, or changes to production settings, Supabase data or schema, RLS, Supabase auth settings, n8n or Google Sheets. All tests run against the fake services. Nothing is pushed until you've tested locally and approved it.

`deploy/nginx/snippets/app.conf` would change in the repo during phase 5, but only reaches production through a release you approve.

## 9. Testing limits

Tests use fake services, so they can't prove real RLS behaviour, real email delivery or real Google Drive embeds. They also don't check appearance, so phase 6 needs your own visual check through `dev:mock`.
