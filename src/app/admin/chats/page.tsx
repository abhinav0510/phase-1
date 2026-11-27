import Link from "next/link";
import { Card, CardBody } from "@/client/components/admin/ui/card";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { requireAdmin } from "@/server/auth/session";
import { getChatTranscript, listChatThreads } from "@/server/data/admin";
import { formatDateTime } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

/** Every investor–founder chat, read-only (clause 2.11). ?thread=<id> opens one transcript. */
export default async function AdminChats({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { rows, ready } = await listChatThreads();
  const threadId = Number(sp.thread ?? "");
  const open = Number.isInteger(threadId) && threadId > 0 ? await getChatTranscript(threadId) : null;

  return (
    <div className="space-y-4">
      {open ? (
        <Card>
          <CardBody>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-navy-500">Transcript · read-only</p>
                <h2 className="text-lg font-semibold text-navy-900">
                  {open.thread.startup_name} ↔ {open.thread.investor_name}
                </h2>
              </div>
              <Link href="/admin/chats" className="rounded-lg border border-navy-200 px-3 py-1.5 text-sm text-navy-600 hover:bg-navy-50">
                Close
              </Link>
            </div>
            {open.messages.length ? (
              <ol className="space-y-3">
                {open.messages.map((m) => (
                  <li key={m.id} className="rounded-xl bg-navy-50/60 px-4 py-3">
                    <p className="text-xs text-navy-500">
                      <b className="text-navy-800">{m.sender_role === "system" ? "Sidana Ventures (automatic)" : m.sender_role === "founder" ? open.thread.startup_name : open.thread.investor_name}</b> ({m.sender_role}) ·{" "}
                      {formatDateTime(m.created_at)}
                    </p>
                    {m.body ? <p className="mt-1 whitespace-pre-line text-sm text-navy-800">{m.body}</p> : null}
                    {m.attachment_path ? (
                      <a href={`/api/chat/attachment/${m.id}?download=1`} className="mt-1 inline-block text-sm font-medium text-ocean-700 underline">
                        Attachment: {m.attachment_name ?? "file"}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No messages in this thread yet" />
            )}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="p-0">
          <div className="px-5 py-3 text-xs text-navy-500">{rows.length} chats</div>
          {!ready ? (
            <div className="p-5">
              <EmptyState title="Chat tables not created yet" message="Run MIGRATIONS/015-chat.sql in Supabase." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No investor–founder chats yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Startup</TH>
                  <TH>Investor</TH>
                  <TH>Messages</TH>
                  <TH>Last message</TH>
                  <TH>When</TH>
                  <TH>Transcript</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium text-navy-800">{t.startup_name}</TD>
                    <TD className="text-navy-500">{t.investor_name}</TD>
                    <TD className="text-navy-500">{t.message_count}</TD>
                    <TD className="max-w-[320px] truncate text-navy-500">{t.last_body ?? "—"}</TD>
                    <TD className="text-navy-500">{formatDateTime(t.last_message_at)}</TD>
                    <TD>
                      <Link href={`/admin/chats?thread=${t.id}`} className="rounded-lg border border-navy-200 px-3 py-1 text-xs text-navy-600 hover:bg-navy-50">
                        Read
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
