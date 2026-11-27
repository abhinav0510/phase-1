"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, CalendarCheck, Download, FileSpreadsheet, FileText, Loader2, Paperclip, Presentation, Send, Video, X } from "lucide-react";
import { Avatar, Card, CompanyLogo, buttonClass } from "@/client/components/founder/ui";
import { AutoRefresh } from "@/client/components/ui/auto-refresh";
import { cn, formatDateTime } from "@/shared/lib/utils";

export interface ChatListItem {
  key: string;
  href: string;
  name: string;
  /** The other side's company logo, when it has one (startups, on the investor side). */
  logo?: string | null;
  preview: string;
  unread: number;
  active: boolean;
}

export interface ChatBubble {
  id: number;
  mine: boolean;
  /** An attached file, served by /api/chat/attachment/<id>. */
  attachment?: { url: string; name: string; type: string; size: number };
  /** A Sidana meeting notice: when the call is and its Join link. */
  system?: { when: string; link: string | null };
  author: string;
  body: string;
  at: string;
}

export interface OpenThread {
  eyebrow: string;
  heading: string;
  otherName: string;
  messages: ChatBubble[];
}

/**
 * Two-pane chat used by both portals (clause 2.8): threads on the left, the open
 * conversation on the right; on phones one pane shows at a time. New messages
 * arrive by polling the server page every 8 seconds, as elsewhere in the app.
 */
export function ChatLayout({
  listTitle,
  items,
  thread,
  backHref,
  emptyTitle,
  emptyText,
  rule,
  send,
}: {
  listTitle: string;
  items: ChatListItem[];
  thread: OpenThread | null;
  backHref: string;
  emptyTitle: string;
  emptyText: string;
  rule: string;
  send: ((formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>) | null;
}) {
  return (
    <div className="space-y-4">
      <AutoRefresh active={!!thread} intervalMs={8000} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card className={cn("overflow-hidden", thread && "hidden lg:block")}>
          <div className="border-b border-navy-100/70 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-tide">{listTitle}</h2>
          </div>
          {items.length ? (
            <ul className="divide-y divide-navy-100/60">
              {items.map((i) => (
                <li key={i.key}>
                  <Link
                    href={i.href}
                    aria-current={i.active ? "page" : undefined}
                    className={cn("flex items-center gap-3 px-5 py-3 transition hover:bg-navy-50/60", i.active && "bg-ocean-50/70")}
                  >
                    {i.logo ? <CompanyLogo src={i.logo} name={i.name} /> : <Avatar name={i.name} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-tide">{i.name}</span>
                      <span className="block truncate text-xs text-navy-500">{i.preview}</span>
                    </span>
                    {i.unread > 0 ? (
                      <span className="rounded-full bg-ocean-600 px-2 py-0.5 text-[11px] font-semibold text-white">{i.unread} new</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-tide">{emptyTitle}</p>
              <p className="mt-1 text-xs text-navy-500">{emptyText}</p>
            </div>
          )}
        </Card>

        {thread ? (
          <Thread thread={thread} backHref={backHref} send={send} />
        ) : (
          <Card className="hidden items-center justify-center p-10 text-center text-sm text-navy-500 lg:flex">
            {items.length ? "Pick a conversation." : emptyText}
          </Card>
        )}
      </div>
      <p className="rounded-2xl border border-dashed border-navy-200 px-4 py-3 text-xs text-navy-500">{rule}</p>
    </div>
  );
}

function Thread({
  thread,
  backHref,
  send,
}: {
  thread: OpenThread;
  backHref: string;
  send: ((formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>) | null;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !file) || !send) return;
    if (file && file.size > MAX_BYTES) {
      setError("That file is over 3 MB. Please send a smaller one.");
      return;
    }
    const fd = new FormData();
    fd.set("body", body);
    if (file) fd.set("file", file);
    start(async () => {
      const res = await send(fd);
      if (res.ok) {
        setText("");
        setFile(null);
        if (picker.current) picker.current.value = "";
        setError(null);
        router.refresh();
      } else setError(res.error);
    });
  };

  return (
    <Card className="flex min-h-[460px] flex-col">
      <div className="flex items-center gap-3 border-b border-navy-100/70 px-5 py-4">
        <Link href={backHref} aria-label="All conversations" className="rounded-full p-1.5 text-navy-500 hover:bg-navy-50 lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean-600">{thread.eyebrow}</p>
          <h2 className="text-lg font-semibold text-tide">{thread.heading}</h2>
        </div>
      </div>

      <div className="flex max-h-[520px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {thread.messages.length === 0 ? (
          <p className="m-auto text-sm text-navy-500">No messages yet. Say hello to {thread.otherName}.</p>
        ) : (
          thread.messages.map((m) =>
            m.system ? (
              <MeetingNotice key={m.id} when={m.system.when} link={m.system.link} />
            ) : (
            <div key={m.id} className={cn("max-w-[80%]", m.mine ? "self-end text-right" : "self-start")}>
              <p className="mb-1 text-[11px] text-navy-500">
                {m.mine ? "You" : m.author} · {formatDateTime(m.at)}
              </p>
              <div
                className={cn(
                  "whitespace-pre-line rounded-2xl px-4 py-2.5 text-left text-sm",
                  m.mine ? "bg-ocean-600 text-white" : "bg-ocean-50 text-tide",
                )}
              >
                {m.attachment ? <AttachmentView a={m.attachment} mine={m.mine} /> : null}
                {m.body ? <span className={m.attachment ? "mt-2 block" : undefined}>{m.body}</span> : null}
              </div>
            </div>
            ),
          )
        )}
        <div ref={end} />
      </div>

      {send ? (
        <form onSubmit={submit} className="border-t border-navy-100/70 p-4">
          {error ? <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {file ? (
            <div className="mb-2 flex w-fit max-w-full items-center gap-2 rounded-xl bg-navy-50 px-3 py-1.5 text-xs text-navy-700">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-navy-400">{sizeLabel(file.size)}</span>
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => {
                  setFile(null);
                  if (picker.current) picker.current.value = "";
                }}
                className="rounded-full p-0.5 hover:bg-navy-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              ref={picker}
              type="file"
              accept={ACCEPT}
              className="hidden"
              aria-label="Attach a file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setError(f && f.size > MAX_BYTES ? "That file is over 3 MB. Please send a smaller one." : null);
                setFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => picker.current?.click()}
              aria-label="Attach image, PDF, Excel or document"
              title="Attach image, PDF, Excel or document (up to 3 MB)"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-600 transition hover:bg-navy-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(e);
              }}
              rows={1}
              maxLength={4000}
              placeholder={`Message ${thread.otherName}…`}
              aria-label="Message"
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-tide outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100"
            />
            <button type="submit" disabled={pending || (!text.trim() && !file)} className={buttonClass("primary")}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}

function MeetingNotice({ when, link }: { when: string; link: string | null }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-leaf-200 bg-leaf-50 px-4 py-3 text-center">
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf-700">
        <CalendarCheck className="h-3.5 w-3.5" /> Meeting booked · Sidana Ventures
      </p>
      <p className="mt-1 text-sm font-semibold text-tide">{when}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className={`${buttonClass("primary", "sm")} mt-2`}>
          <Video className="h-3.5 w-3.5" /> Join Google Meet
        </a>
      ) : (
        <p className="mt-1 text-xs text-navy-500">The join link will be on the calendar invite.</p>
      )}
    </div>
  );
}

const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt";

function sizeLabel(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function AttachmentView({ a, mine }: { a: NonNullable<ChatBubble["attachment"]>; mine: boolean }) {
  if (a.type.startsWith("image/")) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.url} alt={a.name} className="max-h-60 max-w-full rounded-xl bg-white object-contain" />
      </a>
    );
  }
  const Icon = /sheet|excel|csv/.test(a.type) ? FileSpreadsheet : /presentation|powerpoint/.test(a.type) ? Presentation : FileText;
  return (
    <a
      href={`${a.url}?download=1`}
      className={cn(
        "flex min-w-[220px] items-center gap-3 rounded-xl px-3 py-2.5 transition",
        mine ? "bg-white/15 hover:bg-white/25" : "bg-white hover:bg-navy-50",
      )}
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{a.name}</span>
        <span className={cn("block text-xs", mine ? "text-white/75" : "text-navy-500")}>{sizeLabel(a.size)}</span>
      </span>
      <Download className="h-4 w-4 shrink-0" />
    </a>
  );
}
