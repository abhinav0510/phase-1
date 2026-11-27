import { redirect } from "next/navigation";
import { INVESTOR_HOME, requireInvestor } from "@/server/auth/session";

/** /investor → the matches page. */
export default async function InvestorIndex() {
  await requireInvestor();
  redirect(INVESTOR_HOME);
}
