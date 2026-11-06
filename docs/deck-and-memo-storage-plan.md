# Founder deck and memo uploads, stored on the VPS

Status: plan. Nothing has been built yet.

Goal: a founder can upload a new pitch deck and update their investment memo, each at most
once every 14 days. After Sidana approves it, every email the mailing automation sends from
then on uses the new deck and memo.

## 1. How the mailing automation uses decks and memos today

| Piece | What it does |
|---|---|
| Pilot sheet, `STARTUPS` tab | One row per startup. `deck_link` (col H, a bit.ly link to a Drive file), `memo_body` (plain text), `memo_html` (the email-ready memo), `highlight_1..3`. |
| Deal agents | Read the STARTUPS row through the "read the book" tool, compose the investor email from `memo_html` and `deck_link`, then call a send workflow. |
| `NEW-SEND-MB2…5`, `REPLY-SEND-MB*`, `*-ATT` | Plain senders. They take the finished HTML (and optionally one base64 attachment) and send it through Gmail. They never look up a deck or memo themselves. |
| `ENGINE-DAILY` | Reads STARTUPS for matching; does not send mail. |
| "Startup documents" sheet | Second copy of `deck_link` plus MIS, financials and cap-table Drive links. |

**Consequence:** the STARTUPS row is the single point where deck and memo enter the
automation. If that row always holds the approved deck link and the approved memo, every
existing workflow and agent picks up founder uploads with no changes to them.

## 2. Storage on the VPS

### What is stored where
| Data | Where | Why |
|---|---|---|
| Deck PDF files (and later MIS, financials) | VPS disk, `/srv/sidana/storage/documents` | Files you control on your own server, as requested |
| Memo text | Supabase Postgres (`memo_versions`) | The memo is the email body, so it must stay text. A file adds nothing |
| Metadata: versions, status, who uploaded, approvals, links, views | Supabase Postgres | Queried by the app and n8n, backed up by Supabase |

### Directory layout
```
/srv/sidana/
  app/                    ← code; replaced on every deploy
  storage/                ← never touched by deploys
    documents/
      startup/{startup_id}/deck/v{n}-{sha256-12}.pdf
    tmp/                  ← in-progress uploads, same disk so the final move is atomic
```
- Owned by the app user (e.g. `sidana`), directories `0750`, files `0640`. Nginx gets no
  direct access; the folder is never a public web root.
- Path comes from an env var, `DOCUMENTS_DIR=/srv/sidana/storage/documents`, so local
  development uses a folder inside the repo that is git-ignored.
- If the app runs in Docker, `storage/` is a bind mount, never inside the container.
- Files are **write-once**: a new upload is always a new file. Nothing is overwritten or
  edited in place, which keeps backups and audit simple.

### Upload path (how a file gets onto disk safely)
1. Founder submits the PDF to a Next.js route handler (not a server action, so the body
   can stream and is not limited to 1 MB).
2. The handler streams to `storage/tmp/`, computing SHA-256 and counting bytes as it goes.
   It stops and deletes the temp file past **25 MB**.
3. Checks: starts with `%PDF-`, not password-protected, opens and has at least one page.
   Filenames from the founder are ignored.
4. On success it is renamed into `documents/startup/{id}/deck/v{n}-{hash}.pdf` (atomic on
   the same disk) and a `document_versions` row is written with status `pending_review`.
5. Nginx: `client_max_body_size 30m;` and a longer `proxy_read_timeout` on that route only.

### Serving files
- Nothing on disk has a public URL. Every download goes through the app, which checks
  access first.
- For efficiency the app answers with an `X-Accel-Redirect` header pointing at an
  `internal;` Nginx location mapped to `storage/documents`. The app decides **who**; Nginx
  streams the bytes.

### Backups (mandatory before going live)
- Nightly `restic` backup of `storage/documents` to off-site storage, encrypted. Either
  **Backblaze B2** (a few dollars a month at this size) or a dedicated **Google Drive**
  folder through `rclone` (no new vendor, since you already use Google Workspace).
- Retention: 7 daily, 4 weekly, 12 monthly.
- A restore test once a month, plus an alert if the nightly job fails.
- The metadata is in Supabase, which keeps its own backups (daily on the Pro plan).
- Disk alert at 80% usage.

### Size
~75 startups × a handful of versions × 5–20 MB stays under **5 GB** for a long time. Any
VPS disk from 50 GB upward is enough; backups grow at the same rate.

## 3. Data model (one migration, service-role-only RLS like the existing tables)
```
document_versions
  id, startup_id, kind ('deck'), version, file_path, size_bytes, sha256, page_count,
  status ('pending_review' | 'approved' | 'rejected' | 'superseded'),
  submitted_by, submitted_at, reviewed_by, reviewed_at, review_note, approved_at

memo_versions
  id, startup_id, version, sections jsonb,     -- structured fields the founder edits
  body_text, body_html,                        -- rendered on save, in today's email style
  status (same set), submitted_by, submitted_at, reviewed_by, reviewed_at, review_note,
  approved_at

deck_links       -- stable link that goes into emails
  token, startup_id, created_at, revoked_at

deck_views       -- who opened what, when
  id, token, document_version_id, viewed_at, ip_hash, user_agent

sheet_sync_log   -- every write back to the Pilot sheet, for audit and retry
  id, startup_id, memo_version_id, deck_link, status, error, created_at
```
View `current_outreach_material`: per startup, the latest approved deck, the latest
approved memo and the stable deck URL.

## 4. The 14-day rule
- Counted separately for the deck and the memo.
- Window starts at the **approval** of the founder's last submission (as agreed earlier),
  so a rejected upload does not use up the window.
- Only one pending submission per kind at a time.
- Enforced twice: in the server action and in a Postgres function used by an insert
  trigger, so it cannot be bypassed by calling the API directly.
- The founder dashboard shows "Next update available on 6 Nov" when locked.
- Sidana admins can override with a written reason, for genuine errors.

## 5. Founder and admin experience

**Founder dashboard → "Deck & memo" page**
- Shows the deck and memo investors currently receive, with version and approval date.
- Deck: upload a PDF, see upload progress, then "Submitted for review".
- Memo: a structured form that mirrors today's memo, not a free-form file upload:
  headline line, summary, market opportunity, founder–market fit, key investment
  highlights (also feeds `highlight_1..3`), the round, recent category funding.
  The server renders it into exactly the email HTML style used now, with a live preview.
- Status of each submission: pending, approved, or rejected with the reviewer's note.

**Admin → Documents**
- Review queue: inline PDF preview of the new deck next to the current one; side-by-side
  memo diff.
- Approve or reject with a note. The founder is notified by email either way, and the team
  is notified when something is submitted.

## 6. How the mailing automation picks up the new version

### The deck: one link that never changes
- Each startup gets a stable link: `https://<your-domain>/d/{token}`.
- On first rollout that link is written into `STARTUPS.deck_link` (and the documents
  sheet) **once**, replacing the bit.ly link.
- The link always serves the **current approved** deck. When a new deck is approved,
  nothing in the sheet needs to change, and even emails sent weeks ago open the new deck.
- Each open is logged in `deck_views`, so you can see which investors opened it.
- If a token leaks, revoke it and issue a new one in seconds.

### The memo: written back to the sheet on approval
- On approval, the app calls a new n8n webhook, **MATERIAL-SYNC** (secret-protected, like
  the existing ones).
- It writes `memo_body`, `memo_html` and `highlight_1..3` into that startup's STARTUPS row,
  reusing the guarded-write pattern already used by the deal agents (read the current cell,
  then write, so nothing is overwritten by accident). The result is recorded in
  `sheet_sync_log`; failures are retried and shown to admins.
- From the next run, the deal agents compose emails with the new memo. **No send workflow
  or agent changes.**

### For attachments and the future
- A secret-protected endpoint, `GET /api/outreach/material?startup={id}`, returns the
  approved memo, the deck link and version numbers; with `&file=deck` it returns the PDF
  bytes, so an agent can attach the deck through the existing `*-ATT` senders.
- Later, the agents can read this endpoint directly instead of the sheet, and the sheet
  columns can be retired. That step is optional and done one workflow at a time.

## 7. Migration of what exists today
1. Script: follow each startup's bit.ly link to its Drive file, download it as PDF (Slides
   exported to PDF), store it as **deck v1, approved**.
2. Copy the current `memo_body` / `memo_html` into `memo_versions` as **v1, approved**,
   marked "legacy" (kept as HTML; the founder's first edit moves it into the structured
   form).
3. Create one deck token per startup, test the link on one startup, then write all tokens
   into `deck_link` through MATERIAL-SYNC.
4. Links already sent in past emails still point to bit.ly. If your bit.ly plan allows
   editing destinations, repoint each to the new `/d/{token}` link; otherwise leave the
   Drive files shared until those rounds close.

## 8. Phases
| Phase | Work | Effort | Risk to live outreach |
|---|---|---|---|
| 1 | VPS storage folder, backups, migration (tables, rule function), `/d/{token}` route with view logging | 1 day | None |
| 2 | Admin: upload a deck, edit a memo, approve; MATERIAL-SYNC workflow; import of current decks and memos | 1.5 days | Low: test on one startup's row first |
| 3 | Founder "Deck & memo" page, 14-day rule, review queue, notifications | 2 days | None: only approved versions go out |
| 4 | Outreach endpoint for attachments, "opened" in the pipeline and weekly report | 1 day | Low |
| 5 (optional) | Agents read the endpoint instead of the sheet | 1–2 days | Medium, done one workflow at a time |

About 5–6 working days for phases 1–4.

## 9. Decisions needed
1. **Domain** for the deck link (it also has to point at the VPS).
2. **Backup target**: Backblaze B2 or a Google Drive folder.
3. **Memo editing**: structured form (recommended, keeps emails consistent) or founders
   upload a memo document that the team converts.
4. **Highlights**: may founders edit `highlight_1..3`, or does the team keep those?
5. **bit.ly**: can the account edit link destinations?

## 10. Before this ships
- The VPS must be live with HTTPS, since investors will open deck links on it.
- The GitHub repository is public; make it private before any upload code lands.
- The weekly-report n8n webhooks are still unauthenticated; MATERIAL-SYNC must use a secret
  from day one.
