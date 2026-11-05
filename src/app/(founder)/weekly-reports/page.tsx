import { redirect } from "next/navigation";
import { requireFounder } from "@/server/auth/session";

// Weekly reports are no longer shown to founders. Old bookmarks and email links land on
// the dashboard instead of an error page.
export default async function WeeklyReports() {
  await requireFounder();
  redirect("/dashboard");
}
