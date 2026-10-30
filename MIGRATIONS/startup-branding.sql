-- ============================================================================
-- Sidana Platform — Founder branding (company logo)
--   Founders upload their company logo from the portal (/profile). It is shown
--   only inside their own founder portal (dashboard, header, My Startup) to
--   personalise it. It is NOT used for matching, so it applies immediately and
--   is not routed through the profile review queue.
-- ============================================================================
--
-- PURELY ADDITIVE. Creates ONE new table and ONE private Storage bucket.
-- Does not touch, read, alter or delete any existing table, row or policy —
-- public.startups and the Pilot sheet are never written by this feature.
-- No foreign key to public.startups (same pattern as startup_profiles).
--
-- Writers: the app's server code (service role) only. A founder can only ever
-- write the row / files for their OWN startup_id, taken from the verified
-- session, never from client input. Files are served back through a
-- session-checked route, so the bucket stays private.
-- RLS is enabled with NO anon/authenticated policy, and the bucket has no
-- storage.objects policy, so no browser client can read or write either directly.
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

create table if not exists public.startup_branding (
  startup_id         bigint primary key,       -- public.startups.id
  logo_path          text,                     -- object path in the 'startup-logos' bucket
  logo_content_type  text,                     -- image/png | image/jpeg | image/webp
  updated_by         uuid,                     -- auth user id of the last editor
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.startup_branding enable row level security;
revoke all on public.startup_branding from anon;
revoke all on public.startup_branding from authenticated;
grant all on public.startup_branding to service_role;

-- Private bucket: 2 MB cap, raster images only (no SVG — it can carry script).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'startup-logos',
  'startup-logos',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ============================================================================
-- Rollback (only if you ever need to remove the feature entirely):
--   delete from storage.objects where bucket_id = 'startup-logos';
--   delete from storage.buckets where id = 'startup-logos';
--   drop table if exists public.startup_branding;
-- ============================================================================
