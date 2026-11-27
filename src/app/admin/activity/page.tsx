import Link from "next/link";
import { Card, CardBody } from "@/client/components/admin/ui/card";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { Badge } from "@/client/components/ui/badge";
import { requireAdmin } from "@/server/auth/session";
import { listPortalActivity } from "@/server/data/admin";
import { ACTION_LABELS } from "@/server/data/activity";
import { formatDateTime } from "@/shared/lib/utils";
import { PASS_REASON_LABEL, TRIGGER_LABEL } from "@/shared/lib/deal-signals";

export const dynamic = "force-dynamic";

const PORTALS = ["all", "investor", "founder", "system", "admin"] as const;
const TONE = { investor: "blue", founder: "green", system: "gray", admin: "amber" } as const;

/** Every portal action, newest first (clause 2.11). */
export default async function AdminActivity({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const portal = PORTALS.includes((sp.portal ?? "all") as (typeof PORTALS)[number]) ? sp.portal ?? "all" : "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;
  const { rows, total, ready } = await listPortalActivity({ page, pageSize, portal: portal === "all" ? null : portal });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: string, n: number) => `/admin/activity?portal=${p}&page=${n}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PORTALS.map((p) => (
          <Link
            key={p}
            href={href(p, 1)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${portal === p ? "bg-navy-900 text-white" : "border border-navy-200 text-navy-600 hover:bg-navy-50"}`}
          >
            {p}
          </Link>
        ))}
      </div>
      <Card>
        <CardBody className="p-0">
          <div className="flex items-center justify-between px-5 py-3 text-xs text-navy-500">
            <span>{total.toLocaleString("en-IN")} actions</span>
            <span>
              Page {page} of {totalPages}
            </span>
          </div>
          {!ready ? (
            <div className="p-5">
              <EmptyState title="Activity log not created yet" message="Run MIGRATIONS/017-portal-activity-and-grant.sql in Supabase." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No activity yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>When</TH>
                  <TH>Portal</TH>
                  <TH>Who</TH>
                  <TH>What</TH>
                  <TH>Investor</TH>
                  <TH>Startup</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap text-navy-500">{formatDateTime(r.at)}</TD>
                    <TD>
                      <Badge tone={TONE[r.portal]}>{r.portal}</Badge>
                    </TD>
                    <TD className="text-navy-800">{r.actor_label ?? "—"}</TD>
                    <TD className="text-navy-800">
                      {ACTION_LABELS[r.action] ?? r.action}
                      {describe(r.action, r.meta)}
                    </TD>
                    <TD className="text-navy-500">{r.investor_name ?? "—"}</TD>
                    <TD className="text-navy-500">{r.startup_name ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <PageLink href={href(portal, Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </PageLink>
            <PageLink href={href(portal, Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              Next
            </PageLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/** A short detail from the action's meta, e.g. which sectors were added. Never chat text. */
function describe(action: string, meta: Record<string, unknown>): string {
  const list = (v: unknown) => (Array.isArray(v) && v.length ? v.join(", ") : null);
  if (action === "thesis_changed") {
    const parts = [list(meta.added_sectors) && `added ${list(meta.added_sectors)}`, list(meta.removed_sectors) && `removed ${list(meta.removed_sectors)}`].filter(Boolean);
    return parts.length ? `: ${parts.join("; ")}` : "";
  }
  if (action === "access_granted" && typeof meta.via === "string") return ` (${meta.via})`;
  if (action === "deal_passed" && typeof meta.reason === "string") {
    const changed = meta.thesis_changes && Object.keys(meta.thesis_changes as object).length ? "; thesis updated" : "";
    return `: ${PASS_REASON_LABEL[meta.reason as keyof typeof PASS_REASON_LABEL] ?? meta.reason}${changed}`;
  }
  if ((action === "trigger_set" || action === "trigger_met") && typeof meta.metric === "string") {
    return `: ${TRIGGER_LABEL[meta.metric as keyof typeof TRIGGER_LABEL]?.label.toLowerCase() ?? meta.metric} ${Number(meta.threshold)}`;
  }
  if (action === "meeting_scheduled" && typeof meta.at === "string") return ` for ${formatDateTime(meta.at)}`;
  if (action === "profile_updated" && Array.isArray(meta.changes)) {
    const c = meta.changes as { label: string; before: string; after: string }[];
    return `: ${c
      .slice(0, 4)
      .map((x) => `${x.label} “${x.before || "—"}” → “${x.after || "—"}”`)
      .join("; ")}${c.length > 4 ? `; and ${c.length - 4} more` : ""}`;
  }
  if ((action === "founder_synced" || action === "thesis_synced") && Array.isArray(meta.changes)) return `: ${(meta.changes as string[]).length} cell(s) changed`;
  if ((action === "founder_sync_failed" || action === "thesis_sync_failed") && (meta.why || meta.reason)) return `: ${String(meta.why ?? meta.reason)}`;
  return "";
}

function PageLink({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="cursor-not-allowed rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-navy-300">{children}</span>;
  }
  return (
    <Link href={href} className="rounded-lg border border-navy-200 px-3 py-1.5 text-sm text-navy-600 hover:bg-navy-50">
      {children}
    </Link>
  );
}
