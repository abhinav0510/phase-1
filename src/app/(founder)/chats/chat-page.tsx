import { notFound } from "next/navigation";
import { PageHeader } from "@/client/components/founder/ui";
import { ChatLayout, type OpenThread } from "@/client/components/chat/chat-layout";
import { allowedInvestorsForStartup, ensureMeetingNotices, getThread, istLabel, markRead } from "@/server/data/chat";
import { chatSummaries, threadMessages } from "@/server/data/chat-view";
import { getInvestorSelf } from "@/server/data/investor/thesis";
import { sendToInvestor } from "./actions";

/** Shared by /chats and /chats/[investorId]. Callers have run requireFounder(). */
export async function FounderChatPage({ startupId, investorId }: { startupId: number; investorId: number | null }) {
  const allowed = await allowedInvestorsForStartup(startupId);
  if (investorId !== null && !allowed.includes(investorId)) notFound();
  // Each open chat starts with its meeting's time and Join link.
  await Promise.all(allowed.map((id) => ensureMeetingNotices(id, startupId)));
  const summaries = await chatSummaries("founder", startupId, allowed);

  let thread: OpenThread | null = null;
  if (investorId !== null) {
    const [t, inv] = await Promise.all([getThread(investorId, startupId), getInvestorSelf(investorId)]);
    const messages = await threadMessages(t?.id ?? null);
    if (t) await markRead(t.id, "founder");
    const name = inv?.name ?? "Investor";
    const person = inv?.contact_person ? `${inv.contact_person} · ${name}` : name;
    thread = {
      eyebrow: "Chat with investor",
      heading: name,
      otherName: inv?.contact_person ?? name,
      messages: messages.map((m) => ({
        id: m.id,
        mine: m.sender_role === "founder",
        attachment: m.attachment_path
          ? { url: `/api/chat/attachment/${m.id}`, name: m.attachment_name ?? "attachment", type: m.attachment_type ?? "", size: m.attachment_size ?? 0 }
          : undefined,
        system: m.sender_role === "system" ? { when: m.meeting_at ? istLabel(m.meeting_at) : "", link: m.meet_link } : undefined,
        author: m.sender_role === "founder" ? "You" : m.sender_role === "system" ? "Sidana Ventures" : person,
        body: m.body,
        at: m.created_at,
      })),
    };
  }

  const send = investorId !== null ? sendToInvestor.bind(null, investorId) : null;
  return (
    <div className="space-y-2">
      <PageHeader eyebrow="Messages" title="Investor chats" subtitle="Investors who are interested in you and have a meeting with you." />
      <ChatLayout
        listTitle="Investors"
        items={summaries.map((s) => ({
          key: String(s.otherId),
          href: `/chats/${s.otherId}`,
          name: s.name,
          preview: s.preview,
          unread: s.unread,
          active: s.otherId === investorId,
        }))}
        thread={thread}
        backHref="/chats"
        emptyTitle="No chats yet"
        emptyText="A chat opens once an investor is interested in you and has a meeting with you."
        rule="Only investors who are interested in you and have a meeting with you can chat. Sidana's team can see these chats."
        send={send}
      />
    </div>
  );
}
