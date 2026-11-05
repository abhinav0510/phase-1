import { redirect } from "next/navigation";
import { requireFounder } from "@/server/auth/session";

// My Startup is no longer a tab; the company details are on My Profile.
export default async function MyStartupMoved() {
  await requireFounder();
  redirect("/profile");
}
