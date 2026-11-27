import { notFound } from "next/navigation";
import { PageHeader } from "@/client/components/founder/ui";
import { ChatLayout, type OpenThread } from "@/client/components/chat/chat-layout";
import { allowedStartupsForInvestor, ensureMeetingNotices, getThread, istLabel, markRead } from "@/server/data/chat";
import { chatSummaries, founderDisplayName, threadMessages } from "@/server/data/chat-view";
import { getOwnStartup } from "@/server/data/founder";
import { getListedStartups, investorLogoUrl } from "@/server/data/investor/thesis";
import { sendToFounder } from "./actions";

/** Shared by /investor/chats and /investor/chats/[startupId]. Callers have run requireInvestor(). */
export async function InvestorChatPage({ investorId, startupId }: { investorId: number; startupId: number | null }) {
  const allowed = await allowedStartupsForInvestor(investorId);
  if (startupId !== null && !allowed.includes(startupId)) notFound();
  // Each open chat starts with its meeting's time and Join link.
  await Promise.all(allowed.map((id) => ensureMeetingNotices(investorId, id)));
  const [summaries, listed] = await Promise.all([chatSummaries("investor", investorId, allowed), getListedStartups()]);
  const logos = new Map(listed.map((s) => [s.id, investorLogoUrl(s)]));

  let thread: OpenThread | null = null;
  if (startupId !== null) {
    const [t, startup, founder] = await Promise.all([getThread(investorId, startupId), getOwnStartup(startupId), founderDisplayName(startupId)]);
    const messages = await threadMessages(t?.id ?? null);
    if (t) await markRead(t.id, "investor");
    const startupName = startup?.name ?? "Startup";
    const founderLabel = founder ? `${founder} · ${startupName}` : startupName;
    thread = {
      eyebrow: "Chat with founder",
      heading: startupName,
      otherName: founder ?? startupName,
      messages: messages.map((m) => ({
        id: m.id,
        mine: m.sender_role === "investor",
        attachment: m.attachment_path
          ? { url: `/api/chat/attachment/${m.id}`, name: m.attachment_name ?? "attachment", type: m.attachment_type ?? "", size: m.attachment_size ?? 0 }
          : undefined,
        system: m.sender_role === "system" ? { when: m.meeting_at ? istLabel(m.meeting_at) : "", link: m.meet_link } : undefined,
        author: m.sender_role === "investor" ? "You" : m.sender_role === "system" ? "Sidana Ventures" : founderLabel,
        body: m.body,
        at: m.created_at,
      })),
    };
  }

  const send = startupId !== null ? sendToFounder.bind(null, startupId) : null;
  return (
    <div className="space-y-2">
      <PageHeader eyebrow="Messages" title="Chats with founders" subtitle="Ask founders directly for documents or details." />
      <ChatLayout
        listTitle="Founders"
        items={summaries.map((s) => ({
          key: String(s.otherId),
          href: `/investor/chats/${s.otherId}`,
          name: s.name,
          logo: logos.get(s.otherId) ?? null,
          preview: s.preview,
          unread: s.unread,
          active: s.otherId === startupId,
        }))}
        thread={thread}
        backHref="/investor/chats"
        emptyTitle="No chats yet"
        emptyText="A chat opens once you're interested in a startup and have a meeting with its founder."
        rule="You can chat with a founder once you've marked interest in their startup and have a meeting with them. Sidana's team can see these chats."
        send={send}
      />
    </div>
  );
}
