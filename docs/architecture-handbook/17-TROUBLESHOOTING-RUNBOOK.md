# Troubleshooting runbook

Start with what users see, and follow the table. **Commands here only read, unless marked.** Server commands run from `/srv/sidana`.

## First three checks

```bash
curl -s https://svdealflow.io/api/health
```

```bash
curl -s 'https://svdealflow.io/api/health?deep=1'
```

```bash
./scripts/dc.sh ps
```

## Site problems

| Symptom | Likely cause | Check | Fix |
|---|---|---|---|
| Browser can't connect | VPS down, DNS changed, firewall | `dig +short svdealflow.io`, hPanel status | Restart through hPanel if down (admin). Restore DNS if wrong |
| "We'll be back in a moment" | App restarting or crashed | `./scripts/dc.sh ps`, `./scripts/dc.sh logs --tail 100 app` | If mid-release, wait. Otherwise read the logs |
| App keeps restarting | Missing setting or a crash | Look for `Missing required settings` in the logs | Fix `app.env`, then **(changes state)** `./scripts/dc.sh up -d --force-recreate app` |
| "We couldn't load this page" | Failed database read | `?deep=1`, app logs | If Supabase is down, wait. Otherwise use the reference shown to find the log entry |
| `?deep=1` returns 503 | App can't reach Supabase | Supabase status page, app logs | Wait, or fix the URL or key in `app.env` |
| Certificate warning | Expired, or renewal failed | `./scripts/dc.sh exec -T certbot certbot certificates`, `./scripts/dc.sh logs --tail 50 certbot` | Port 80 must be open. Fix the cause, and it renews within 12 hours |
| 429 errors | Rate limit | nginx logs | Usually wait. For a shared office IP, consider changing limits in `nginx.conf` through a release |
| Page unstyled after a deploy | An old tab open across a release | Hard refresh | Reload |
| "Failed to find Server Action" | Old tab after a release | Reload | Reload |
| Disk nearly full | Old images or logs | `df -h /`, `docker system df` | **(changes state)** Remove unused images, with care |

## Sign-in problems

| Symptom | Likely cause | Check |
|---|---|---|
| "Invalid email / Login ID or password" | Wrong details, or an email not in `startup_contacts` | Is it the email on file? Has `SYNC-CONTACTS` run? |
| Sent to `/force-reset` | `must_reset` is set | Expected on first login |
| "This account has been deactivated" | `app_users.active` is false | Team decision |
| "isn't linked to a startup" | `app_users.startup_id` is empty | Provisioning |
| Reset email never arrives | Supabase email setup | Supabase Auth logs and settings |
| Reset link goes to the wrong site or fails | Supabase Redirect URLs | Must include `https://svdealflow.io/reset-password`. **Not verified** |
| Sign-in form does nothing, or logs show a Server Action origin error | `X-Forwarded-Host` lost | [`proxy.conf`](../../deploy/nginx/snippets/proxy.conf) |

## Data problems

| Symptom | Likely cause | Check |
|---|---|---|
| A founder's save doesn't appear | Read cache or failed save | Reload after 60 seconds, then app logs |
| Data is old, such as meetings | An n8n sync stopped | n8n executions for `CAL-SYNC`, `SYNC-BOOK` or `MAIL-HISTORY` |
| Weekly reports are missing | `Weekly Founder Update` is off, or a week was quiet | Workflow state in n8n |
| Admin page shows blanks or zeros | A failed read shows as empty, a known gap | Reload, then app logs |
| Deck doesn't show | Missing link or a Drive permission | `startup_decks`, `SYNC-DECKS` |
| Logo fails | `startup-branding.sql` not applied, or file too large | Supabase bucket, 2 MB limit |

## Email and n8n problems

| Symptom | Likely cause | Check |
|---|---|---|
| Admin email fails, "The workflow must be active" or similar | `ADMIN-BROADCAST` is off. **This is its state today** | n8n workflow, `email_broadcasts.error` |
| "is not configured" | Setting missing | Names in `app.env` |
| "n8n did not respond in time" | Slow or down | n8n executions |
| Sync now fails | `SYNC-CONTACTS` | n8n executions |

**Don't re-run a workflow to test it.** It can send real emails.

## Release problems

| Symptom | Likely cause | What to do |
|---|---|---|
| No Deploy run after merging | CI failed or is still running, or `DEPLOY_ENABLED` is off | Actions tab |
| Deploy waits forever | Waiting for approval | Review deployments |
| Deploy shows as skipped | CI failed | Fix CI |
| CI: "Server scripts are executable" fails | Lost the executable flag | `git update-index --chmod=+x <file>` |
| Image pull fails on the server | Registry login or a missing tag | Run logs |
| `deploy.sh` rolled back | New version unhealthy | Run logs include the app's last 50 lines |
| "Check the live site" fails after a good release | Site issue, or HTTPS not set up | Read which check failed. Nothing rolled back, so decide whether to [roll back](15-DEPLOYMENT-AND-ROLLBACK.md#how-to-roll-back) |
| Permission denied over SSH | Key missing, or fail2ban | `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`. Admin checks fail2ban |
| Vercel check fails but CI passes | Vercel's own build | Vercel's logs. It doesn't affect the VPS |

## Local development problems

| Symptom | Fix |
|---|---|
| Port 3000 or 4330 in use | Stop the other process, or use `PORT=3001 npm run dev` |
| `next` shows `.env.local` loaded | Expected. Fake values still win |
| Tests time out at start | First build is slow; close other servers on 3100 and 4329 |
| `net-guard: blocked connection` | Code tried to reach the internet. Expected from Next.js's version check to `registry.npmjs.org`. Anything else is worth a look |
| Boundary test fails | Move the import, or the code, to the right folder |
| Docker build works, but the page is unstyled | Check `content` in `tailwind.config.ts` |

## Check database rules

This read-only query, run by an admin in the Supabase SQL Editor, lists each table's RLS state and policies. It answers the biggest open security question.

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_on,
       coalesce(string_agg(p.policyname || ' [' || p.cmd || ' ' || array_to_string(p.roles, ',') || ']', '; '), 'no policies') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;
```

**What to look for:** core tables should have RLS on, and any policy for `authenticated` should limit rows to the user's own startup.

## Escalation

| Problem | Who | How |
|---|---|---|
| VPS down or panel access | VPS account owner | hPanel. Owner to be confirmed |
| Supabase outage | Supabase status page | Project owner |
| n8n | n8n status, workflow owner | n8n executions |
| Suspected leak | GitHub admin at once | Replace the secret first, investigate after |

## After an incident

Note what happened, how it was noticed, what fixed it and what would catch it sooner. Add a test or an alert, and update this page.
