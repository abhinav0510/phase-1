import { Video } from "lucide-react";

/**
 * "Join" button for a meeting's video link. Renders only for a real http(s)
 * URL; otherwise shows a dash. Opens in a new tab with noopener/noreferrer.
 */
export function JoinLink({ href }: { href: string | null | undefined }) {
  const ok = !!href && /^https?:\/\//i.test(href.trim());
  if (!ok) return <span className="text-navy-300">—</span>;
  return (
    <a
      href={href!.trim()}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-navy-200 px-2.5 py-1 text-xs font-medium text-navy-700 transition hover:border-navy-400 hover:bg-navy-50"
    >
      <Video className="h-3.5 w-3.5" />
      Join
    </a>
  );
}
