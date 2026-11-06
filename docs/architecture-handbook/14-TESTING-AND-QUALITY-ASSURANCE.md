# Testing and quality assurance

## The test types

| Type | Tool | Checks | Where | Count, 31 Oct |
|---|---|---|---|---:|
| Unit | Vitest 3.2.4 | Single functions and code rules | [`tests/unit`](../../tests/unit) | 133 |
| Browser | Playwright 1.55.1, real Chrome | The whole app, as a user would use it | [`tests/e2e`](../../tests/e2e) | 200 |
| Stack | Playwright, in CI | Signing in and saving through nginx | [`tests/e2e-stack`](../../tests/e2e-stack) | 1 |

**There's no separate integration test suite.** Browser tests against the fake services serve that purpose.

### Browser test files

| File | Covers |
|---|---|
| `01-public-and-auth` | Public pages, sign-in, sign-out, password flows |
| `02-access-separation` | Roles, and one startup never seeing another's data |
| `03-founder-pages` | Every founder tab |
| `04-founder-changes` | Saving profiles and logos |
| `05-admin` | Admin pages, announcements, broadcasts, profile reviews |
| `06-mobile-and-safety` | Phone layouts, and no contact with real services |
| `07-production` | Health, headers, error pages, fonts |
| `08-admin-authorization` | Raw response bodies, for every kind of account that shouldn't see admin data |

## Running tests

Browser tests need Chrome installed.

| Command | Does |
|---|---|
| `npm test` | Unit tests, then browser tests |
| `npm run test:unit` | Unit tests |
| `npm run test:e2e` | Browser tests, normal build |
| `APP_STANDALONE=1 npm run test:e2e` | Browser tests on the same server type the image uses |
| `npm run test:e2e -- tests/e2e/08-admin-authorization.spec.ts` | One file |
| `npm run test:stack` | Stack test. Needs the stack running, so normally CI only |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## All npm scripts

From [`package.json`](../../package.json).

| Script | Does | Safe? |
|---|---|---|
| `dev` | Runs the app on fake services | **Safe** |
| `build` | Production build | Doesn't connect at run time, but reads `.env.local` |
| `start` | Runs a built app | **Uses `.env.local`, so it's live** |
| `lint`, `typecheck`, `test`, `test:unit`, `test:e2e`, `test:stack` | Checks | **Safe** |
| `provision:founders`, `provision:admins` | Creates logins | **LIVE: changes real accounts** |
| `reset:founders` | Resets founder passwords | **LIVE: changes real accounts** |
| `migrate:mustreset` | Sets the forced reset flag | **LIVE** |
| `backfill:weekly` | Fills weekly report history | **LIVE** |

## How the fake services work

[`tests/mock/server.mjs`](../../tests/mock/server.mjs) stands in for Supabase (Auth, REST, Storage) and the n8n webhooks. Data comes from [`seed.mjs`](../../tests/mock/seed.mjs), stays in memory and is gone when it stops.

**Test settings (names only):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_BOOTSTRAP_PASSWORD`, `N8N_NOTIFY_SECRET`, `N8N_BROADCAST_WEBHOOK_URL`, `N8N_CONTACTS_SYNC_WEBHOOK_URL`. These are all fake and overridden in [`run-app.mjs`](../../tests/mock/run-app.mjs), plus test-only `MOCK_PORT`, `APP_PORT`, `APP_STANDALONE` and `SKIP_BUILD`.

## How local work is kept away from production

`.env.local` holds live values. Four layers stop tests and `npm run dev` from using them:

| Layer | How | File |
|---|---|---|
| Settings override | Fake values win over `.env.local`, even though Next.js prints that it loaded the file | `run-app.mjs`, [`dev.mjs`](../../scripts/dev.mjs) |
| Server network block | Blocks any host except this machine | [`net-guard.cjs`](../../tests/mock/net-guard.cjs) |
| Browser network block | Refuses requests to real hosts during tests | [`helpers.ts`](../../tests/e2e/helpers.ts) |
| Unit test network block | Fails any fetch to a real host | [`setup-no-network.ts`](../../tests/unit/setup-no-network.ts) |

**Still live:** the scripts marked above, `npm run start`, and running `next dev` directly. Vercel previews probably use live settings too.

## CI execution

See [GitHub Actions and CI/CD](07-GITHUB-ACTIONS-AND-CICD.md). CI runs lint, types, unit tests, audit, secret scan, browser tests and the production stack on every pull request and on `main`.

## Production build validation

- The CI stack job builds the real image and tests it behind nginx, using fake services.
- The image is checked for secret files.
- The app is checked to refuse to start without its settings.

## What tests can't prove

| Gap | Why |
|---|---|
| Real database rules and constraints | The fake database doesn't enforce them |
| Real email delivery | Tests stop at the webhook |
| n8n workflow logic | Not run |
| Google Drive embeds | Blocked in tests |
| Appearance | Tests check content and layout, not design |
| The page behind the password reset link | Only requesting the link is covered |
| Performance on the real server | No load test on the VPS |

## Adding tests

| You added | Add |
|---|---|
| A function | A unit test in `tests/unit` |
| A page | A test in `tests/e2e`. Admin pages also go in the `ADMIN_PAGES` list in `08-admin-authorization.spec.ts` |
| A table | Add it to `seed.mjs` |
| A server module | `import "server-only";`, or the boundary test fails |

Never delete or weaken a test to make it pass. Find out why it failed.
