import { ExternalLink, FileText, Presentation, RefreshCw } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnDeck, getOwnStartup } from "@/lib/data/founder";
import { PageHeader, Card, CardHeader, CardBody, EmptyState, ButtonLink, Avatar } from "@/components/founder/ui";
import { Reveal } from "@/components/founder/motion";
import { formatDateTime } from "@/lib/utils";
import { CopyLink } from "./copy-link";

export const dynamic = "force-dynamic";

// Drive / Slides file ids are URL-safe base64-ish strings; anything else is
// never interpolated into the iframe URL.
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

function isHttpUrl(v: string | null | undefined): v is string {
  return !!v && /^https?:\/\//i.test(v.trim());
}

export default async function PitchDeckPage() {
  const { startupId } = await requireFounder();
  const [deck, startup] = await Promise.all([getOwnDeck(startupId), getOwnStartup(startupId)]);
  const contact = startup?.owner_name ?? "your Sidana contact";

  if (!deck || !isHttpUrl(deck.deck_link)) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Investor materials" title="Pitch Deck" subtitle="The deck Sidana sends to investors on your behalf." />
        <Reveal>
          <Card>
            <CardBody className="p-8">
              <EmptyState
                title="No pitch deck on file yet"
                message={`Send your latest deck to ${contact}. Once it is added to your outreach, it will appear here within the hour.`}
              />
            </CardBody>
          </Card>
        </Reveal>
      </div>
    );
  }

  const fileId =
    deck.link_kind === "google" && deck.drive_file_id && DRIVE_ID.test(deck.drive_file_id) ? deck.drive_file_id : null;
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  const openUrl = isHttpUrl(deck.resolved_url) ? deck.resolved_url : deck.deck_link;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Investor materials"
        title="Pitch Deck"
        subtitle="This is the exact deck Sidana sends to investors in your outreach emails."
        actions={
          <>
            <CopyLink value={deck.deck_link} />
            <ButtonLink href={openUrl} external>
              <ExternalLink className="h-4 w-4" />
              {fileId ? "Open in Drive" : "Open deck"}
            </ButtonLink>
          </>
        }
      />

      <Reveal>
        <Card className="overflow-hidden">
          {embedUrl ? (
            <div className="relative w-full bg-obsidian" style={{ aspectRatio: "16 / 10" }}>
              <iframe
                src={embedUrl}
                title="Pitch deck preview"
                className="absolute inset-0 h-full w-full border-0"
                allow="fullscreen"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          ) : (
            <CardBody className="p-8">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-canvas/60 px-6 py-12 text-center">
                <FileText className="h-8 w-8 text-navy-300" />
                <p className="mt-3 text-sm font-semibold text-obsidian">This deck is hosted outside Google Drive</p>
                <p className="mt-1 max-w-sm text-xs text-navy-500">
                  It can&apos;t be previewed here. Use Open deck to view it exactly as investors do.
                </p>
              </div>
            </CardBody>
          )}
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Link investors receive" subtitle="Anyone with the link can view the deck" />
            <CardBody className="pt-3">
              <div className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-iris-soft text-iris">
                  <Presentation className="h-4 w-4" />
                </span>
                <a
                  href={deck.deck_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-all text-sm font-medium text-obsidian underline decoration-navy-200 underline-offset-4 hover:decoration-iris"
                >
                  {deck.deck_link}
                </a>
              </div>
              <p className="mt-3 text-xs text-navy-400">Investors open this link from Sidana&apos;s emails.</p>
            </CardBody>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader title="Need to update it?" />
            <CardBody className="space-y-3 pt-3 text-sm text-navy-600">
              <div className="flex items-center gap-3">
                <Avatar name={startup?.owner_name ?? "Sidana"} size="sm" />
                <p>
                  Send the new version to <span className="font-semibold text-obsidian">{contact}</span>. Once it
                  replaces the current deck, this page updates within the hour.
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-navy-400">
                <RefreshCw className="h-3.5 w-3.5" />
                Last checked {formatDateTime(deck.synced_at)}
              </p>
            </CardBody>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
