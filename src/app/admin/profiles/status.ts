import type { ProfileStatus } from "@/shared/types/db";

export const PROFILE_STATUS_META: Record<
  ProfileStatus,
  { label: string; tone: "amber" | "red" | "gray" | "green" }
> = {
  submitted: { label: "Awaiting review", tone: "amber" },
  changes_requested: { label: "Changes requested", tone: "red" },
  draft: { label: "Draft", tone: "gray" },
  approved: { label: "Approved", tone: "green" },
};
