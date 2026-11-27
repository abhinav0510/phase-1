-- ============================================================================
-- Phase 2 · 015 · Investor–founder chat (clause 2.8)
-- ============================================================================
--
-- One thread per investor–startup pair, plain-text messages. The app only lets
-- a pair chat when the investor is interested AND has a meeting with that
-- startup; the rule is checked on the server for every read and send.
-- Admins read every thread (clause 2.11); nobody edits or deletes messages.
-- When a meeting is booked for the pair, a 'system' message with its date,
-- time and Join link is posted to the thread, so both sides see it first.
--
-- PURELY ADDITIVE: two new tables and one private Storage bucket.
-- RLS on, no anon/authenticated policy (service role only).
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.chat_threads (
  id                      bigint generated always as identity primary key,
  investor_id             bigint not null,
  startup_id              bigint not null,
  created_at              timestamptz not null default now(),
  last_message_at         timestamptz,
  investor_last_read_at   timestamptz,
  founder_last_read_at    timestamptz,
  unique (investor_id, startup_id)
);

create index if not exists chat_threads_startup_idx on public.chat_threads (startup_id);

create table if not exists public.chat_messages (
  id              bigint generated always as identity primary key,
  thread_id       bigint not null references public.chat_threads (id) on delete cascade,
  sender_role     text   not null check (sender_role in ('investor', 'founder', 'system')),
  sender_user_id  uuid,                                -- null for 'system' messages
  body            text   not null default '' check (char_length(body) <= 4000),
  -- 'system' meeting notices: the call's time and Join link, posted once per meeting.
  meeting_at      timestamptz,
  meet_link       text,
  -- An optional attached file (image, PDF, Excel, Word, PowerPoint, CSV) in the
  -- private 'chat-attachments' bucket, served only through the app after the
  -- chat rule is checked.
  attachment_path text unique,
  attachment_name text,
  attachment_type text,
  attachment_size integer check (attachment_size is null or attachment_size between 1 and 3145728),
  created_at      timestamptz not null default now(),
  check (sender_role = 'system' or sender_user_id is not null),
  check (char_length(body) > 0 or attachment_path is not null)
);

create index if not exists chat_messages_thread_idx
  on public.chat_messages (thread_id, created_at);
-- One meeting notice per call, even if both sides open the chat at the same moment.
create unique index if not exists chat_messages_meeting_notice_key
  on public.chat_messages (thread_id, meeting_at) where sender_role = 'system';

alter table public.chat_threads  enable row level security;
alter table public.chat_messages enable row level security;

-- Private bucket for chat attachments: 3 MB cap (uploads pass through nginx's 4 MB
-- limit), no storage.objects policy, so only the server can read or write it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  3145728,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'
  ]
)
on conflict (id) do nothing;
