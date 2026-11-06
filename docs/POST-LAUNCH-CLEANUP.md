# Post-launch cleanup plan

_Created 2026-11-06. Every change here is safe to do after launch — none affect runtime behaviour._

---

## Phase 1 — Dead code & root cleanup (30 min, zero risk)

These changes delete unused files and move non-source artifacts out of the root. Nothing imports them; nothing breaks.

### 1a. Delete dead shared UI primitives

These three files in `src/client/components/ui/` are **never imported anywhere** — only the admin copies in `admin/ui/` are used:

| Dead file | Admin equivalent (actually used) |
|---|---|
| `ui/bar-chart.tsx` | `admin/ui/bar-chart.tsx` |
| `ui/card.tsx` | `admin/ui/card.tsx` |
| `ui/table.tsx` | `admin/ui/table.tsx` |

**Action:** Delete the three files from `ui/`. Keep `ui/badge.tsx`, `ui/auto-refresh.tsx`, `ui/join-link.tsx` — those ARE used.

### 1b. Delete dead layout shell components

These three files in `src/client/components/layout/` are **never imported**:

- `layout/shell.tsx`
- `layout/sidebar.tsx`
- `layout/topbar.tsx`

The founder shell (`components/founder/shell.tsx`) and admin shell (`components/admin/shell.tsx`) are what actually render. The `layout/` folder's only live exports are `nav.ts`, `nav-icons.ts`, `page-transition.tsx`, and `signout-button.tsx`.

**Action:** Delete the three dead files. Rename `layout/` to `layout/shared/` or keep it — but the dead files go.

### 1c. Move root-level non-source files

Move these out of the project root into `docs/`:

```
INVENTORY-AND-MAPPING.md   → docs/INVENTORY-AND-MAPPING.md
PROJECT-HANDOFF.md         → docs/PROJECT-HANDOFF.md
```

The `demo-files/` and `mockups/` directories can also move into `docs/` or a top-level `assets/` if preferred. They have no build dependency.

---

## Phase 2 — Split large data files (1–2 hours, low risk)

These are pure refactors of internal module boundaries. Every file stays server-only. The only risk is a missed import path — run `npm run build` after each to confirm.

### 2a. Split `server/data/admin.ts` (422 lines → 4 files)

Currently a grab-bag of 15+ functions. Split by domain:

```
server/data/admin.ts (422 lines)
  → server/data/admin/kpis.ts        — getAdminKpis, countProfilesAwaitingReview
  → server/data/admin/startups.ts    — listStartups, getStartupDetail, getRecentStartups, distributions
  → server/data/admin/investors.ts   — listInvestors, getInvestorTypeDistribution
  → server/data/admin/meetings.ts    — listMeetings, getRecentMeetings, getUpcomingMeetings
  → server/data/admin/profiles.ts    — listProfileSubmissions, getProfileStatus, getProfileForReview
  → server/data/admin/index.ts       — re-exports everything (so existing imports don't break)
```

The `index.ts` barrel means **no import paths change** in any page file.

### 2b. Split `server/data/founder.ts` (393 lines → 4 files)

```
server/data/founder.ts (393 lines)
  → server/data/founder/startup.ts   — getOwnStartup, getOwnBranding, computeProfileCompletion
  → server/data/founder/matches.ts   — getOwnMatches, getOwnReplies
  → server/data/founder/meetings.ts  — getOwnMeetings
  → server/data/founder/profile.ts   — getOwnProfile, getOwnPrefill, getOwnDeck
  → server/data/founder/overview.ts  — getFounderOverview
  → server/data/founder/index.ts     — re-exports everything
```

### 2c. Split `shared/types/db.ts` (336 lines → enum file + type file)

```
shared/types/db.ts (336 lines)
  → shared/types/enums.ts    — all enum/const values (UserRole, StartupStatus, Bucket, etc.)
  → shared/types/models.ts   — all interfaces (AppUser, Startup, Investor, Match, etc.)
  → shared/types/index.ts    — re-exports
```

---

## Phase 3 — Consolidate component organisation (1 hour, low risk)

### 3a. Establish colocation rule

Current state: some client components are colocated next to their route (good), some are in `client/components/founder/` (confusing). Adopt a rule:

> **Route-specific** components live in the route directory (already done for profile, financials, dashboard).
> **Shared across routes** components live in `client/components/`.

Check each file in `client/components/founder/`:

| File | Used by | Verdict |
|---|---|---|
| `shell.tsx` | founder layout only | shared (keep) |
| `nav.tsx` | founder layout only | shared (keep) |
| `list-detail.tsx` | dashboard only? | colocate to `dashboard/_components/` if so |
| `passed-list.tsx` | dashboard only? | colocate to `dashboard/_components/` if so |
| `ui.tsx` (484 lines) | multiple pages | split into smaller shared components |
| `pill-tabs.tsx` | multiple pages | shared (keep) |
| `motion.tsx` | multiple pages | shared (keep) |
| `investor-format.ts` | dashboard only? | colocate if so |

### 3b. Break up `founder/ui.tsx` (484 lines)

This is the single largest client component file. It likely contains multiple unrelated small components. Split into individual files by component, or at minimum group by purpose (cards, stat displays, formatting helpers).

---

## Phase 4 — Improve DX guardrails (30 min, zero risk)

### 4a. Strengthen ESLint

Current `.eslintrc.json` is minimal. Add:

```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "import/order": ["warn", {
      "groups": ["builtin", "external", "internal", "parent", "sibling"],
      "newlines-between": "always"
    }],
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

### 4b. Number migration files

Rename from:
```
MIGRATIONS/notifications.sql
MIGRATIONS/startup-branding.sql
MIGRATIONS/startup-profiles.sql
...
```

To:
```
MIGRATIONS/001-startup-profiles.sql
MIGRATIONS/002-startup-branding.sql
MIGRATIONS/003-startup-decks.sql
MIGRATIONS/004-startup-financials.sql
MIGRATIONS/005-startup-mis.sql
MIGRATIONS/006-weekly-reports.sql
MIGRATIONS/007-startup-profile-prefill.sql
MIGRATIONS/008-notifications.sql
```

This makes the execution order explicit for anyone new.

---

## Priority order

| # | What | Time | Risk | Impact |
|---|---|---|---|---|
| 1 | Delete dead files (1a, 1b) | 10 min | zero | Removes confusion |
| 2 | Move root clutter (1c) | 5 min | zero | Cleaner root |
| 3 | Split `admin.ts` + `founder.ts` (2a, 2b) | 1 hour | low (build verifies) | Readable data layer |
| 4 | Split `db.ts` (2c) | 20 min | low | Cleaner types |
| 5 | Break up `ui.tsx` (3b) | 30 min | low | Readable components |
| 6 | Colocation audit (3a) | 30 min | low | Consistent pattern |
| 7 | ESLint + migration numbering (4a, 4b) | 20 min | zero | Better DX |

Total: ~3 hours of incremental, independently shippable changes. Each step is its own commit/PR.
