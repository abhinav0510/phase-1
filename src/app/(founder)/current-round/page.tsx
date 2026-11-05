import { redirect } from "next/navigation";
import { requireFounder } from "@/server/auth/session";

// Current Round is now called Overview; old links and bookmarks land there.
export default async function CurrentRoundMoved() {
  await requireFounder();
  redirect("/overview");
}
