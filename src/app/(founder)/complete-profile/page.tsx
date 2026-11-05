import { redirect } from "next/navigation";
import { requireFounder } from "@/server/auth/session";

// The profile questions now live on My Profile; old links and bookmarks land there.
export default async function CompleteProfileMoved() {
  await requireFounder();
  redirect("/profile#complete-profile");
}
