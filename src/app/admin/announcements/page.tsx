import { requireAdmin } from "@/server/auth/session";
import { Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/client/components/admin/ui/table";
import { listAnnouncementsAdmin } from "@/server/data/notifications";
import { AUDIENCE_META, KIND_META } from "@/client/components/announcements/kinds";
import { formatDate, formatDateTime } from "@/shared/lib/utils";
import { AnnouncementForm } from "./announcement-form";
import { AnnouncementRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncements() {
  await requireAdmin();
  const items = await listAnnouncementsAdmin();
  const now = Date.now();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="New announcement"
          subtitle="Pops up once on every matching dashboard and stays in the bell menu until it expires"
        />
        <CardBody>
          <AnnouncementForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Announcements" subtitle={`${items.length} total`} />
        <CardBody className="p-0">
          {items.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No announcements yet"
                message="Publish one above to notify founders and/or the team about software updates and changes."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Title</TH>
                  <TH>Type</TH>
                  <TH>Shown to</TH>
                  <TH>Status</TH>
                  <TH>Seen by</TH>
                  <TH>Published</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {items.map((a) => {
                  const expired = !!a.expires_at && new Date(a.expires_at).getTime() <= now;
                  return (
                    <TR key={a.id}>
                      <TD className="max-w-[280px] whitespace-normal">
                        <p className="font-medium text-navy-800">{a.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{a.body}</p>
                      </TD>
                      <TD>
                        <Badge tone={KIND_META[a.kind].tone}>{KIND_META[a.kind].label}</Badge>
                      </TD>
                      <TD className="text-navy-500">{AUDIENCE_META[a.audience]}</TD>
                      <TD>
                        {!a.is_active ? (
                          <Badge tone="gray">inactive</Badge>
                        ) : expired ? (
                          <Badge tone="gray">expired</Badge>
                        ) : (
                          <Badge tone="green">live</Badge>
                        )}
                        {a.expires_at && !expired ? (
                          <p className="mt-1 text-xs text-navy-400">until {formatDate(a.expires_at)}</p>
                        ) : null}
                      </TD>
                      <TD className="text-navy-500">
                        {a.seenBy} user{a.seenBy === 1 ? "" : "s"}
                      </TD>
                      <TD className="text-navy-500">{formatDateTime(a.publish_at)}</TD>
                      <TD>
                        <AnnouncementRowActions id={a.id} active={a.is_active} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
