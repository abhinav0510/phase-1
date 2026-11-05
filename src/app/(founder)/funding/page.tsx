import { redirect } from "next/navigation";
import { requireFounder } from "@/server/auth/session";

// Investors & Matches is now the dashboard; old links and bookmarks land there.
export default async function FundingMoved() {
  await requireFounder();
  redirect("/dashboard");
}
