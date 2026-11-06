# Executive overview

## What this system is

Sidana Ventures helps startups raise funding. This project is the web portal on top of that work:

- **Founders** sign in to see their raise: matches, meetings, weekly reports and their profile.
- **The Sidana team** signs in to an admin panel to review profiles and manage announcements and emails.
- **n8n automations** run the deal work in the background: email, Google Sheets, calendars and matching. They mirror results into the database the portal reads.

## The system in one table

| Part | Technology | Where it runs | Evidence |
|---|---|---|---|
| Web app | Next.js 15.5.28, React 19, TypeScript | Docker on a Hostinger VPS | Observed |
| Front door | nginx 1.30.6 | Docker on the same VPS | Observed |
| HTTPS certificates | Let's Encrypt through certbot | Docker on the same VPS | Observed |
| Database and logins | Supabase (PostgreSQL, Auth, Storage) | Supabase's cloud | Config |
| Automation | n8n, 46 of 163 workflows active | n8n's cloud | Observed |
| Source code and CI/CD | GitHub and GitHub Actions | GitHub | Observed |
| Container images | GitHub Container Registry | GitHub | Config |
| Previous host | Vercel, still responding | Vercel | Observed |

Live address: `https://svdealflow.io`.

## Status on 31 October 2026

| Item | Status |
|---|---|
| Version running in production | `0b9d15e`, which includes the admin access fix, the folder restructure and `npm run dev` safety (Observed) |
| Latest `main` | `0b9d15e`, the same version |
| Latest release | Deploy run `41218891489` succeeded, including the live site check |
| Local checkout used for this study | `refactor/architecture` at `594dc84`. Its files match `main`; only the merge commit differs |

## What is built, and what is only planned

| Built | Planned, not built |
|---|---|
| `src/client`, `src/server` and `src/shared` folders | Controllers, services and repositories |
| Server Components and Server Actions | Most `app/api` routes and a frontend API client |
| One health route, `/api/health` | `/api/health/live`, `/ready` and `/dependencies` |
| Access checks on every page | Authorization inside a service layer |
| Fake services for tests and local development | Structured logs, request IDs and metrics |

## Biggest gaps

Details are in the [authentication and security](12-AUTHENTICATION-AND-SECURITY.md) and [monitoring](13-HEALTH-LOGGING-AND-MONITORING.md) documents.

1. **Founder access through Supabase directly is unverified.** A signed-in founder holds a Supabase token, so database rules matter. The rules on the live database haven't been confirmed.
2. **No database backups are running.** The script exists, but there's no schedule, no settings file and no saved backups on the server.
3. **No alerts.** Nothing notifies anyone if the site goes down, as far as could be found.
4. **`main` has no branch protection.** A direct push is possible, although production still needs a passing CI run and an approval.
5. **One server.** If the VPS dies, the portal is down until it's rebuilt.
6. **Automatic rollback has never run for real.** The code is in place, but no release has needed it.
7. **Vercel is still live** on the same database, giving a second public address to manage.
8. **Two workflows the app depends on are off.** `ADMIN-BROADCAST` and `Weekly Founder Update` are inactive, so admin emails to startups fail and new weekly reports aren't produced.
