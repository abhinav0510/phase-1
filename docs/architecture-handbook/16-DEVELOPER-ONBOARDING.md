# Developer onboarding

## Before you touch anything

1. **`npm run dev` is safe.** It uses fake data.
2. **`.env.local` holds live keys, if you're given one.** The `provision:*`, `reset:*`, `migrate:*` and `backfill:*` scripts and `npm run start` use it for real.
3. **Merging to `main` starts a release,** which then waits for approval.
4. **The repository is public.** Never commit a secret.
5. **Never test by calling an n8n webhook.** It could send real emails.
6. **Never change Supabase data or Google Sheets without approval.**

## Reading order

| Day | Read |
|---|---|
| Morning | [Overview](00-EXECUTIVE-OVERVIEW.md), [system architecture](01-SYSTEM-ARCHITECTURE.md), this page |
| Afternoon | [Frontend](02-FRONTEND-ARCHITECTURE.md), [backend](03-BACKEND-ARCHITECTURE.md), [testing](14-TESTING-AND-QUALITY-ASSURANCE.md) |
| Later | [Security](12-AUTHENTICATION-AND-SECURITY.md), [CI/CD](07-GITHUB-ACTIONS-AND-CICD.md), and [glossary](18-TECHNICAL-GLOSSARY.md) as needed |

## Setup

**You need:** Node 24 (see [`.nvmrc`](../../.nvmrc)), Git and Chrome. You don't need Docker, except to test the image yourself.

```bash
git clone https://github.com/abhinav0510/phase-1.git
```

```bash
cd phase-1 && npm ci
```

```bash
npm run dev
```

Open `http://localhost:3000`. You don't need `.env.local` for this.

| Sign in as | Page | Details |
|---|---|---|
| Founder | `/login` | Login ID `101`, password `demo-password-1` |
| Team | `/teamonly` | `team@sidana.test`, password `demo-password-1` |

These are fake accounts on the fake services. Data resets each time you restart.

Confirm your setup:

```bash
npm run test:unit
```

## Where does my code go?

| You're adding | Put it in |
|---|---|
| A page | `src/app/<path>/page.tsx`. Start with `await requireFounder()` or `await requireAdmin()` |
| A shared UI piece | `src/client/components/<area>/` |
| An interactive part | A separate file starting with `"use client"` |
| A save or other change | `actions.ts` beside the page. Check the user first |
| A database read | `src/server/data/`, until repositories exist |
| An outside service call | `src/server/integrations/` |
| A setting | Update `.env.example` and `deploy/app.env.example` |
| Types | `src/shared/types/db.ts` |
| Helpers for browser and server | `src/shared/lib/` |
| A table | A new file in `MIGRATIONS/`, to be run by a person in Supabase, and in `tests/mock/seed.mjs` |
| An HTTP endpoint | `src/app/api/<path>/route.ts`, with its own access check |

**Boundaries, enforced by a test:**
- `src/client` can't import `src/server`.
- `src/shared` can't import either.
- `src/server` can't import `src/client` or `src/app`.

## Your first change

```bash
git fetch origin
```

```bash
git switch -c feat/my-first-change origin/main
```

1. Make your change and check it with `npm run dev`.
2. Add or update a test.
3. Run the checks:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

4. Commit and push, naming each file:

```bash
git add src/app/login/page.tsx
```

```bash
git commit -m "Clarify the sign-in error message"
```

```bash
git push -u origin feat/my-first-change
```

5. Open a pull request, and describe what changed and how you tested it.
6. Wait for CI and review before merging.

## Things that trip people up

| Mistake | Instead |
|---|---|
| Checking access only in a layout | Check in each page; layouts don't protect page data |
| Reading `startupId` from the browser | Use the one from `requireFounder()` |
| Importing `createAdminClient` in a client component | Do that work on the server |
| Returning empty on a failed read | Throw, so failure doesn't look like "no data" |
| Adding `NEXT_PUBLIC_` to a secret | That sends it to the browser |
| Assuming merged means live | Check `version` at `/api/health` |
| Absolute redirects from `request.nextUrl` | Use the helper in `middleware.ts`, which knows the public address |
| New Tailwind folders | Add them to `content` in `tailwind.config.ts` |
| `git add .` | Name files, because `docs/` and `PROJECT-HANDOFF.md` are deliberately uncommitted |
| Scripts without the executable flag | This Mac's git setting can drop it. CI catches this. Use `git update-index --chmod=+x <file>` |

## Who owns what

Owners **need admin confirmation**. Known so far:

| Area | Contact |
|---|---|
| Client | Rakesh Sidana, per the project notes |
| GitHub | `abhinav0510` |
| VPS Hostinger account | A separate account, owner to be confirmed |
| Supabase, n8n | To be confirmed |

## Current state of the architecture

This codebase is mid-migration. `src/server/data` is temporary, and there are no controllers, services or repositories yet. Before starting a large feature, read the plan in [`AUDIT-AND-MIGRATION-PLAN.md`](../architecture/AUDIT-AND-MIGRATION-PLAN.md), so you don't build on something about to move.
