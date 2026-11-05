import { redirect } from "next/navigation";
import { requireFounder } from "@/server/auth/session";

// Financials now live on the dashboard; old links and bookmarks land there.
export default async function FinancialsMoved() {
  await requireFounder();
  redirect("/dashboard");
}
