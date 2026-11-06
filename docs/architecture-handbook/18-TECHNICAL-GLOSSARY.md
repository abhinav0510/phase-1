# Technical glossary

Each term is explained with where it appears in this project.

## Code and frameworks

| Term | Meaning | Here |
|---|---|---|
| **App Router** | Next.js's folder-based routing | `src/app` |
| **Client Component** | A component that runs in the browser | Files starting with `"use client"` |
| **Controller, service, repository** | Layers: request handling, business rules, database queries | Planned, not built |
| **Layout** | Shared UI around pages | `admin/layout.tsx` |
| **Middleware** | Code that runs before each request reaches a page | `src/middleware.ts` |
| **Next.js** | A React framework for pages and server code | The app |
| **Route Handler** | A plain HTTP endpoint in Next.js | `api/health/route.ts` |
| **Server Action** | A server function that a form calls directly. It's a public POST, so it needs its own checks | `actions.ts` files |
| **Server Component** | A component that runs on the server and can read data | Most `page.tsx` files |
| **Standalone build** | A Next.js output with only what's needed to run | Used in the image |
| **TypeScript** | JavaScript with types | All source code |
| **Zod** | A library that validates input | Admin actions |

## Data and auth

| Term | Meaning | Here |
|---|---|---|
| **Anon key** | A public Supabase key that's limited by RLS | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Authentication** | Proving who you are | Sign-in |
| **Authorization** | What you're allowed to do | `requireAdmin` |
| **Cache** | A saved copy, to avoid repeating work | 60-second founder reads |
| **Foreign key** | A database link between tables | `broadcast_id` |
| **Migration** | SQL that changes the database structure | `MIGRATIONS/` |
| **PostgreSQL** | The database engine | Inside Supabase |
| **PostgREST** | A REST API generated from a database | How the app queries Supabase |
| **RLS (Row Level Security)** | Database rules for which rows a user can read | Supabase |
| **Service-role key** | A full-access key that bypasses RLS. Server only | `SUPABASE_SERVICE_ROLE_KEY` |
| **Session** | Proof you've signed in, stored in cookies | Supabase Auth |
| **Supabase** | Hosted database, logins and file storage | Data layer |
| **Upsert** | Insert, or update if it already exists | `saveProfile` |

## Git and delivery

| Term | Meaning | Here |
|---|---|---|
| **Approval gate** | A person must approve before a release | `production` environment |
| **Artifact** | A file saved from a CI run | Failed test results |
| **Branch** | A separate line of work | `feat/pitch-deck` |
| **Branch protection** | Rules that limit changes to a branch | **Not set on `main`** |
| **CD** | Automatically releasing tested code | `deploy.yml` |
| **CI** | Automatically testing each change | `ci.yml` |
| **Commit** | A saved snapshot | `594dc84` |
| **Dependabot** | A GitHub bot that proposes dependency updates | PRs 11 to 16 |
| **Draft PR** | A pull request marked not ready | Was used for PR 19 |
| **GHCR** | GitHub Container Registry, which stores images | `ghcr.io/abhinav0510/phase-1` |
| **GitHub Actions** | GitHub's automation service | `.github/workflows` |
| **Gitleaks** | A tool that scans for committed secrets | Secret scan job |
| **Merge** | Combining one branch into another | Pull requests |
| **Pull request (PR)** | A proposal to merge, with checks and review | PR 18 |
| **Rollback** | Going back to an earlier version | `deploy.sh`, or a manual run |
| **Runner** | A temporary machine that runs workflows | `ubuntu-24.04` |
| **SHA** | A commit's unique ID, also used as the image tag | `049c111...` |
| **Smoke test** | A quick check that the basics work | `smoke-test.sh` |
| **Workflow** | An automated process in GitHub or n8n | `CI`, `SYNC-BOOK` |

## Servers and containers

| Term | Meaning | Here |
|---|---|---|
| **Bind mount** | A host folder shown inside a container | `/srv/sidana/nginx` |
| **Container** | A running, isolated copy of an image | `sidana-app-1` |
| **Docker** | Software that runs containers | On the VPS |
| **Docker Compose** | Describes and runs several containers | `docker-compose.yml` |
| **Docker network** | A private network between containers | `sidana_default` |
| **Health check** | A regular "are you OK?" test | `/api/health` |
| **Image** | A ready-to-run package | Tagged by SHA |
| **Multi-stage build** | Building in steps, keeping only the result | `Dockerfile` |
| **Reverse proxy** | A server that passes requests to another server | nginx |
| **Root** | The all-powerful Linux user | Not used by the app |
| **SSH** | Encrypted remote access to a server | Port 22 |
| **Swap** | Disk space used as spare memory | 2 GB |
| **Tmpfs** | A temporary disk in memory | App cache |
| **VPS** | A rented virtual server | Hostinger KVM 2 |
| **Volume** | Storage that outlives a container | `sidana_certs` |

## Networking and web

| Term | Meaning | Here |
|---|---|---|
| **A record** | A DNS entry from a name to an IPv4 address | `svdealflow.io` |
| **ACME challenge** | How Let's Encrypt confirms you control a domain | `/.well-known/acme-challenge/` |
| **Certificate** | Proof of a domain's identity for HTTPS | Let's Encrypt |
| **Certbot** | A tool that gets and renews certificates | `sidana-certbot-1` |
| **CNAME** | A DNS alias to another name | `www` |
| **CSP** | Browser rules for what a page may load | `next.config.mjs` |
| **DNS** | Turns names into addresses | Hostinger |
| **fail2ban** | Blocks repeated failed logins | On the VPS |
| **Firewall** | Controls which connections are allowed | ufw |
| **HSTS** | Tells browsers to always use HTTPS | One year |
| **HTTPS, TLS** | Encrypted web traffic | Port 443 |
| **nginx** | A web server and reverse proxy | Front door |
| **Port** | A numbered door on a machine | 22, 80, 443, 3000 |
| **Port mapping** | Forwarding a host port into a container | `443:443` |
| **Rate limit** | Caps how many requests are allowed | nginx |
| **Upstream** | The server a proxy forwards to | `app:3000` |

## Project terms

| Term | Meaning |
|---|---|
| **The book** | The team's startups and investors data |
| **Deal agents** | n8n automations that handle deal emails and matching |
| **Fake services, mock** | The local stand-in for Supabase and n8n |
| **n8n** | The automation platform |
| **Net guard** | Code that blocks the app from reaching outside hosts during tests |
| **Pilot sheet** | The main Google Sheet used by the team and agents |
| **Quiet week** | A week with little activity, saved but hidden from founders |
