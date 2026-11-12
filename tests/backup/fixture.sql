-- A small stand-in for the Supabase database, used by tests/backup/run.sh.
-- It has the parts the backup touches: public tables with a policy, auth.users and
-- auth.identities, and storage.objects.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, encrypted_password text);
create table auth.identities (id uuid primary key, user_id uuid references auth.users, provider text);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create schema storage;
create table storage.objects (id serial primary key, bucket_id text, name text, metadata jsonb);
create table public.startups (id bigint primary key, name text);
create table public.startup_branding (startup_id bigint primary key, logo_path text, updated_at timestamptz default now());
alter table public.startup_branding enable row level security;
create policy own_branding on public.startup_branding for select to authenticated using (auth.uid() is not null);
insert into public.startups select g, 'Startup ' || g from generate_series(1, 250) g;
insert into public.startup_branding values (1, '1/logo.png'), (2, '2/logo.png');
insert into auth.users values
  ('00000000-0000-0000-0000-000000000001', 'founder@example.com', '$2a$10$hash'),
  ('00000000-0000-0000-0000-000000000002', 'team@example.com', '$2a$10$hash');
insert into auth.identities values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'email');
