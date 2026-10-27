import { requireAdmin } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const session = await requireAdmin();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Account" />
        <CardBody className="space-y-2 text-sm">
          <Row label="Name" value={session.appUser?.full_name ?? "—"} />
          <Row label="Email" value={session.email ?? "—"} />
          <Row
            label="Role"
            value={<Badge tone="violet">{session.appUser?.role ?? "—"}</Badge>}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Security" />
        <CardBody className="space-y-3 text-sm text-navy-600">
          <p>
            Password changes and resets use Supabase Auth. Reset links are issued
            from the login screen.
          </p>
          <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-500">
            The shared bootstrap admin password is a temporary Phase-1 convenience
            and should be rotated to per-user passwords before wider rollout.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-navy-400">{label}</span>
      <span className="font-medium text-navy-800">{value}</span>
    </div>
  );
}
