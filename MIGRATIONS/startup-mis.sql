-- ============================================================================
-- Sidana Platform — Founder MIS uploads
--   Founders upload their MIS (management information) spreadsheet from
--   Complete Profile, beside "Link to your financial statements". The Sidana
--   team downloads it from the admin startup page and the profile review page.
--   It is not used for matching, so it applies immediately and is not routed
--   through the profile review queue.
-- ============================================================================
--
-- PURELY ADDITIVE. Creates ONE new table and ONE private Storage bucket.
-- Does not touch, read, alter or delete any existing table, row or policy —
-- public.startups and the Pilot sheet are never written by this feature.
-- No foreign key to public.startups (same pattern as startup_branding).
--
-- Writers: the app's server code (service role) only. A founder can only ever
-- add or remove files for their OWN startup_id, taken from the verified
-- session, never from client input. Files are served back through a
-- session-checked route (/api/mis/<id>), so the bucket stays private.
-- RLS is enabled with NO anon/authenticated policy, and the bucket has no
-- storage.objects policy, so no browser client can read or write either directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

create table if not exists public.startup_mis_files (
  id             bigserial primary key,
  startup_id     bigint not null,              -- public.startups.id
  file_path      text not null unique,         -- object path in the 'startup-mis' bucket
  file_name      text not null,                -- cleaned original name, for display and download
  content_type   text not null,                -- .xlsx or .xls MIME type
  size_bytes     bigint not null,
  uploaded_by    uuid,                         -- auth user id of the founder
  created_at     timestamptz not null default now()
);

create index if not exists startup_mis_files_startup_idx
  on public.startup_mis_files (startup_id, created_at desc);

alter table public.startup_mis_files enable row level security;
revoke all on public.startup_mis_files from anon;
revoke all on public.startup_mis_files from authenticated;
grant all on public.startup_mis_files to service_role;
grant usage, select on sequence public.startup_mis_files_id_seq to service_role;

-- Private bucket: 3 MB cap, Excel only (.xlsx and .xls; macro workbooks are refused by the app).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'startup-mis',
  'startup-mis',
  false,
  3145728,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do nothing;

-- ============================================================================
-- Rollback (only if you ever need to remove the feature entirely):
--   delete from storage.objects where bucket_id = 'startup-mis';
--   delete from storage.buckets where id = 'startup-mis';
--   drop table if exists public.startup_mis_files;
-- ============================================================================
