import { Badge } from "@/client/components/ui/badge";
import type { BroadcastAudience, BroadcastStatus } from "@/shared/types/db";

const STATUS_TONE: Record<BroadcastStatus, "gray" | "amber" | "green" | "red"> = {
  queued: "gray",
  sending: "amber",
  sent: "green",
  partial: "amber",
  failed: "red",
};

export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{status}</Badge>;
}

export const AUDIENCE_LABEL: Record<BroadcastAudience, string> = {
  all: "All startups",
  selected: "Selected startups",
  custom: "Custom addresses",
  test: "Test copy",
};
