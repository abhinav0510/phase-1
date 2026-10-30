# Running the portal in production

This folder holds everything the VPS needs. Nothing here runs until you follow the steps below.

```
Visitors ──HTTPS──▶ nginx ──▶ Next.js app (one container) ──▶ Supabase, n8n
                    │
                    ├─ HTTPS certificates (Let's Encrypt, renewed automatically)
                    ├─ Rate limits and dropping requests for unknown hosts
                    └─ "Back in a moment" page while the app restarts
```

The VPS stores no portal data. Supabase holds it all, so the app can be rebuilt at any time.

## How a release works

1. A push to `main` runs CI: lint, types, unit tests, audit, secret scan, browser tests, then the real image behind real nginx.
2. If CI passes, `deploy.yml` builds the image, publishes it to GitHub's registry and runs `scripts/deploy.sh` on the VPS.
3. `deploy.sh` starts the new version and checks that it's healthy and can reach Supabase. If not, it goes back to the previous version by itself.
4. The workflow then checks the live site from outside.

The app restarts during a release, usually within a few seconds. Visitors see the "back in a moment" page, which refreshes by itself. A form submitted in that moment has to be sent again.

## First-time setup

### 1. Decide these

- **Domain**. Point its `A` record at the VPS, and make `www` resolve to the same place. `www` redirects to the main address, and the certificate covers both.
- **Sign-in on the VPS**: a user with `sudo`, or the owner's help for step 2.

### 2. Prepare the server (once, needs sudo)

Check first that nothing else on the VPS uses ports 80 or 443 (`sudo ss -ltnp`). Then copy `deploy/scripts/bootstrap-vps.sh` over and run:

```bash
sudo ./bootstrap-vps.sh deploy
```

Ask the VPS owner to take a Hostinger snapshot first.

### 3. Create a key for GitHub to deploy with

On your Mac:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/sidana-github-deploy -N "" -C "github-actions-deploy"
```

Add `~/.ssh/sidana-github-deploy.pub` to `/home/deploy/.ssh/authorized_keys` on the VPS.

### 4. Add the settings on the VPS

In `/srv/sidana`, create these from the `.example` files in this folder, then run `chmod 600 app.env`:

| File | Holds |
|---|---|
| `.env` | Domain, email for certificate notices, image name |
| `app.env` | Supabase keys and n8n settings. **Secret.** |
| `backup.env` | Database connection for backups. **Secret.** Optional. |

### 5. Add the settings on GitHub

Repository **Settings → Environments → New environment**, name it `production`.

| Type | Name | Value |
|---|---|---|
| Secret | `VPS_HOST` | The VPS address |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | The contents of `~/.ssh/sidana-github-deploy` |
| Secret | `VPS_KNOWN_HOSTS` | The output of `ssh-keyscan <vps address>`, after checking it against the host key on the server |
| Variable | `PROD_URL` | `https://your-domain` |
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | Same as `app.env` |
| Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `app.env`. This key is public by design. |
| Variable | `VPS_PORT` | Only if SSH isn't on port 22 |

Then add the repository variable `DEPLOY_ENABLED` = `true` under **Settings → Secrets and variables → Actions**. Until this is set, deploys are skipped.

To require approval for each release, add yourself as a required reviewer on the `production` environment.

### 6. First release

Run the **Deploy** workflow from the Actions tab. The final "Check the live site" step fails on this first run, because HTTPS isn't set up yet. The app itself is running by then.

### 7. Turn on HTTPS

`DOMAIN` and `LETSENCRYPT_EMAIL` must be set in `.env`, and DNS must already point at the VPS. Running this accepts the Let's Encrypt subscriber agreement.

```bash
/srv/sidana/scripts/init-tls.sh
```

Then run the **Deploy** workflow again. All checks should now pass.

### 8. Point Supabase and n8n at the new address

- **Supabase → Authentication → URL Configuration**: set the Site URL and add `https://your-domain/reset-password` to the Redirect URLs. Password reset emails fail without this.
- **n8n**: change any email or workflow that links to `sidanalab.vercel.app`.

### 9. Turn on the rest

- **Uptime alerts**: point a free monitor such as UptimeRobot at `https://your-domain/api/health?deep=1`.
- **Nightly backups**: fill in `backup.env`, run the script once by hand, then add it to the `deploy` user's crontab. This runs at 02:00 IST if the server clock is on UTC:

```
30 20 * * * /srv/sidana/scripts/backup-db.sh >> /srv/sidana/backups/backup.log 2>&1
```

Test a restore before relying on the backups. They don't include Supabase Storage, so founder logos aren't covered. `postgres:17-alpine` must be at least as new as the Supabase database, so check the version under Supabase → Database.

- **Password login**: once key login works, turn off SSH password login on the VPS. It's left on by `bootstrap-vps.sh` so it can't lock you out.

## Day to day

Run these from `/srv/sidana` on the VPS.

| Task | Command |
|---|---|
| See what's running | `./scripts/dc.sh ps` |
| Follow the app's logs | `./scripts/dc.sh logs -f app` |
| Follow nginx's logs | `./scripts/dc.sh logs -f nginx` |
| Restart the app | `./scripts/dc.sh restart app` |
| Check the live site | `./scripts/smoke-test.sh https://your-domain` |

**To roll back**, run the **Deploy** workflow from the Actions tab and enter the full commit SHA of the release to go back to.

**After changing `app.env`**, run `./scripts/dc.sh up -d --force-recreate app`.

**To change a `NEXT_PUBLIC_` value**, update it on GitHub and in `app.env`, then release again, because it's built into the image.

## Capacity

Run one app container. Next.js keeps its data cache and tag invalidation inside the process, so a second container would serve out-of-date data unless a shared cache is added first.

Load test of the production server, with 50 requests in flight non-stop on a developer Mac against the fake database:

| Page | Requests per second | 95% finished within | Failures | Peak memory |
|---|---|---|---|---|
| `/login` | 3,773 | 20 ms | 0 | 358 MB |
| `/dashboard`, signed in | 198 | 284 ms | 0 | 464 MB |
| `/weekly-reports`, signed in | 290 | 192 ms | 0 | 496 MB |

400 users a day at 50 page views each is about 0.25 requests per second on average, and perhaps 5 at a busy moment. That leaves a wide margin. A VPS is slower than this Mac and real Supabase adds network time, so treat these numbers as a rough guide and rerun the test on the real server if traffic grows a lot.

## Limits to know about

- Rate limits are per IP address: 10 sign-in attempts a minute with a burst of 10, and 30 requests a second with a burst of 100. A large office sharing one address could hit the sign-in limit, which is set in `nginx/nginx.conf`.
- Errors go to the container logs. Nothing alerts you to them, apart from the uptime monitor if the site goes down.
