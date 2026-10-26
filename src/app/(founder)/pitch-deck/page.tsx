import { ExternalLink, FileText, Presentation, RefreshCw } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnDeck, getOwnStartup } from "@/lib/data/founder";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
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
  const [deck, startup] = await Promise.all([
    getOwnDeck(startupId),
    getOwnStartup(startupId),
  ]);
  const contact = startup?.owner_name ?? "your Sidana contact";

  if (!deck || !isHttpUrl(deck.deck_link)) {
    return (
      <Card>
        <CardHeader
          title="Pitch deck"
          subtitle="The deck Sidana sends to investors on your behalf"
        />
        <CardBody className="p-8">
          <EmptyState
            title="No pitch deck on file yet"
            message={`Send your latest deck to ${contact}. Once it is added to your outreach, it will appear here within the hour.`}
          />
        </CardBody>
      </Card>
    );
  }

  const fileId =
    deck.link_kind === "google" && deck.drive_file_id && DRIVE_ID.test(deck.drive_file_id)
      ? deck.drive_file_id
      : null;
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  const openUrl = isHttpUrl(deck.resolved_url) ? deck.resolved_url : deck.deck_link;

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fbf3e3] text-[#9a6f2a]">
              <Presentation className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-navy-900">Your pitch deck</h2>
              <p className="text-sm text-navy-500">
                This is the exact deck Sidana sends to investors in your outreach emails.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyLink value={deck.deck_link} />
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {fileId ? "Open in Drive" : "Open deck"}
            </a>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        {embedUrl ? (
          <div className="relative w-full bg-navy-50" style={{ aspectRatio: "16 / 10" }}>
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
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-navy-200 bg-navy-50/40 px-6 py-12 text-center">
              <FileText className="h-8 w-8 text-navy-300" />
              <p className="mt-3 text-sm font-medium text-navy-700">
                This deck is hosted outside Google Drive
              </p>
              <p className="mt-1 max-w-sm text-xs text-navy-500">
                It can&apos;t be previewed here. Use Open deck to view it exactly as investors do.
              </p>
            </div>
          </CardBody>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Link investors receive" />
          <CardBody>
            <a
              href={deck.deck_link}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-navy-700 underline decoration-navy-200 underline-offset-4 hover:text-navy-900"
            >
              {deck.deck_link}
            </a>
            <p className="mt-3 text-xs text-navy-400">
              Investors open this link from Sidana&apos;s emails. Anyone with the link can view the deck.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Need to update it?" />
          <CardBody className="space-y-3 text-sm text-navy-600">
            <p>
              Send the new version to <span className="font-medium text-navy-800">{contact}</span>.
              Once it replaces the current deck in your outreach, this page updates within the hour.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-navy-400">
              <RefreshCw className="h-3.5 w-3.5" />
              Last checked {formatDateTime(deck.synced_at)}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
