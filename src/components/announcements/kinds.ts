import type { AnnouncementAudience, AnnouncementKind } from "@/lib/types/db";

export const KIND_META: Record<
  AnnouncementKind,
  { label: string; tone: "blue" | "violet" | "amber" | "gray" }
> = {
  update: { label: "Software update", tone: "blue" },
  change: { label: "Change", tone: "violet" },
  maintenance: { label: "Maintenance", tone: "amber" },
  info: { label: "Info", tone: "gray" },
};

export const AUDIENCE_META: Record<AnnouncementAudience, string> = {
  all: "Everyone",
  founders: "Founders only",
  team: "Sidana team only",
};
