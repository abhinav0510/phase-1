import { Card, CardHeader, CardBody, StatCard } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/client/components/admin/ui/table";
import { requireAdmin } from "@/server/auth/session";
import { listAppUsers, getAdminKpis, getContactEmailsByStartup } from "@/server/data/admin";
import { ADMIN_ROLES } from "@/shared/types/db";
import { formatDate } from "@/shared/lib/utils";
import { ResetPasswordButton } from "./reset-password-button";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  await requireAdmin();
  const [users, kpis, contactEmails] = await Promise.all([
    listAppUsers(),
    getAdminKpis(),
    getContactEmailsByStartup(),
  ]);
  const founders = users.filter((u) => u.role === "founder");
  const admins = users.filter((u) => ADMIN_ROLES.includes(u.role));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="App users" value={users.length} accent />
        <StatCard
          label="Founder accounts"
          value={`${founders.length} / ${kpis.startupsTotal}`}
          hint="Provisioned vs. total startups"
        />
        <StatCard label="Team / admin accounts" value={admins.length} />
      </div>

      <Card>
        <CardHeader
          title="Users & access"
          subtitle="Accounts in app_users, mapped to Supabase Auth"
        />
        <CardBody className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Linked to</TH>
                <TH>Active</TH>
                <TH>Created</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-navy-800">
                    {u.full_name ?? "—"}
                  </TD>
                  <TD className="text-navy-500">
                    {u.startup_id && contactEmails.get(u.startup_id)?.length
                      ? contactEmails.get(u.startup_id)!.join(", ")
                      : u.email ?? "—"}
                  </TD>
                  <TD>
                    <Badge tone={ADMIN_ROLES.includes(u.role) ? "violet" : "blue"}>
                      {u.role}
                    </Badge>
                  </TD>
                  <TD className="text-navy-500">
                    {u.startup_id
                      ? `startup #${u.startup_id}`
                      : u.investor_id
                        ? `investor #${u.investor_id}`
                        : "—"}
                  </TD>
                  <TD>
                    {u.active ? (
                      <Badge tone="green">active</Badge>
                    ) : (
                      <Badge tone="gray">inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-navy-500">{formatDate(u.created_at)}</TD>
                  <TD>
                    <ResetPasswordButton userId={u.id} userName={u.full_name} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Founder account provisioning" />
        <CardBody className="space-y-3 text-sm text-navy-600">
          <p>
            Founder logins are provisioned by a trusted server-side script that
            creates a Supabase Auth user per startup and inserts a matching{" "}
            <code className="rounded bg-navy-50 px-1">app_users</code> row (role{" "}
            <code className="rounded bg-navy-50 px-1">founder</code>, linked to the
            startup). It is <strong>additive only</strong> — it never modifies or
            deletes existing startups, investors, or rows.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-navy-500">
            <li>Login ID = the startup&apos;s numeric id.</li>
            <li>
              Initial password = a one-time activation code the founder must
              change on first login.
            </li>
            <li>Idempotent: re-running skips startups that already have an account.</li>
          </ul>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Not run automatically. Execute{" "}
            <code className="rounded bg-white px-1">npm run provision:founders</code>{" "}
            after you confirm, so no accounts are created without your approval.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
