import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader, StatCard } from "@/client/components/admin/ui/card";
import { requireAdmin } from "@/server/auth/session";
import { getDealSharingData } from "@/server/data/admin";
import {
  categorizedPairs,
  dailySeries,
  istToday,
  nz,
  periodPairs,
  resolvePeriod,
  totalsFor,
} from "@/shared/lib/deal-sharing";
import { formatDateTime } from "@/shared/lib/utils";
import { PeriodPicker } from "./_components/period-picker";
import { DailyChart } from "./_components/daily-chart";
import { SharesTable, type ShareRow } from "./_components/shares-table";

export const dynamic = "force-dynamic";

/** A sync runs every 15 minutes; past this the figures may be behind the sheet. */
const STALE_MINUTES = 45;

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${SHORT[Number(d.slice(5, 7)) - 1]}`;
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");

export default async function DealSharingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string; month?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const now = Date.now();
  const period = resolvePeriod(params, now);
  const today = istToday(now);
  const data = await getDealSharingData();

  const header = (
    <div className="space-y-4">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-navy-900">Deal sharing</h2>
        <p className="text-sm text-navy-500">
          Deals shared with investors and how they responded, counted from the Pilot sheet&apos;s PIPELINE tab the same way as the daily deal report.
        </p>
      </div>
      <PeriodPicker kind={period.kind} day={period.kind === "day" ? period.from : ""} month={period.kind === "pickmonth" ? period.from.slice(0, 7) : ""} today={today} />
    </div>
  );

  if (data.state !== "ready") {
    const why = {
      not_created: "The PIPELINE mirror isn't set up yet. Apply MIGRATIONS/010-pipeline-mirror.sql in Supabase, then switch on the SYNC-PIPELINE workflow in n8n.",
      never_synced: data.lastRun?.error
        ? `The PIPELINE mirror hasn't synced successfully yet. Last attempt failed: ${data.lastRun.error}`
        : "The PIPELINE mirror hasn't synced yet. Switch on the SYNC-PIPELINE workflow in n8n; it runs every 15 minutes.",
      read_failed: "Couldn't read the PIPELINE mirror right now. Reload to try again.",
    }[data.state];
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardBody>
            <p className="text-sm text-navy-600" role="status" data-sync-state={data.state}>
              {why}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const pairs = categorizedPairs(data.rows, data.meetings);
  const t = totalsFor(pairs, data.rows, period);
  const list = periodPairs(pairs, period);
  const rows: ShareRow[] = list.map((p) => ({
    key: p.key,
    date: p.date,
    startup: p.startup,
    startupId: data.startupIds[nz(p.startup)] ?? null,
    investor: p.investor,
    owner: p.owner,
    category: p.category,
    response: p.response,
    status: p.status,
    rows: p.rows,
    dealIds: p.dealIds,
  }));
  const series = period.kind === "today" || period.kind === "day" ? null : dailySeries(pairs, period).map((d) => ({ ...d, label: dayLabel(d.day) }));

  const synced = data.lastOk!;
  const ageMin = Math.round((now - Date.parse(synced.finishedAt)) / 60000);
  const lastFailed = data.lastRun && !data.lastRun.ok && data.lastRun.startedAt > synced.startedAt;

  return (
    <div className="space-y-6">
      {header}

      <p
        role="status"
        data-sync-status
        className={
          ageMin > STALE_MINUTES || lastFailed
            ? "rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800"
            : "rounded-xl bg-navy-50/60 px-4 py-2 text-xs text-navy-600"
        }
      >
        Synced from the PIPELINE tab {formatDateTime(synced.finishedAt)} ({synced.rowsRead.toLocaleString("en-IN")} sheet rows).
        {ageMin > STALE_MINUTES ? ` That was ${ageMin} minutes ago, so the newest shares may be missing.` : ""}
        {lastFailed ? ` The latest sync failed: ${data.lastRun!.error ?? "unknown error"}.` : ""}
      </p>

      <section aria-label={`Totals for ${period.label}`} data-totals>
        <h3 className="mb-3 text-sm font-semibold text-navy-800">{period.label}</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div data-tile="shares" className="flex [&>div]:w-full">
            <StatCard
              tone="blue"
              label="Deals shared"
              value={t.shares}
              hint={t.rowShares !== t.shares ? `${t.rowShares} sheet rows (some shared again)` : `${t.startups} startups · ${t.investors} investors`}
            />
          </div>
          <div data-tile="responses" className="flex [&>div]:w-full">
            <StatCard tone="lavender" label="Responses" value={t.responses} hint={`${pct(t.responses, t.shares)} of deals shared`} />
          </div>
          <div data-tile="interested" className="flex [&>div]:w-full">
            <StatCard tone="mint" label="Interested / meeting" value={t.interested + t.meetings} hint={`${t.interested} interested · ${t.meetings} meeting`} />
          </div>
          <div data-tile="passed" className="flex [&>div]:w-full">
            <StatCard tone="cream" label="Passed" value={t.passed} hint={`${t.noReply} no reply yet`} />
          </div>
        </div>
      </section>

      {series ? (
        <Card>
          <CardHeader title="Deals shared per day" subtitle={period.label} />
          <CardBody>
            <DailyChart data={series} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={period.kind === "today" || period.kind === "day" ? `Deals shared on ${period.label.replace(/^Today, /, "")}` : "Deals shared"}
          subtitle="One row per startup and investor firm, with the investor's response from the sheet"
        />
        <CardBody className="p-0 pt-2">
          <SharesTable rows={rows} showDate={period.from !== period.to} />
        </CardBody>
      </Card>
    </div>
  );
}
