import { redirect } from "next/navigation";
import { requireUser, landingPathFor, isAdmin } from "@/server/auth/session";
import { AuthHeading, AuthShell } from "@/client/components/site/auth-shell";
import { ForceResetForm } from "./force-reset-form";

export const dynamic = "force-dynamic";

export default async function ForceResetPage() {
  const session = await requireUser();

  // Already reset → nothing to do here; send them to their portal.
  if (!session.mustReset) {
    redirect(landingPathFor(session.appUser?.role));
  }

  const redirectTo = landingPathFor(session.appUser?.role);
  const admin = isAdmin(session.appUser?.role);

  return (
    <AuthShell
      portalLabel={admin ? "Team Access" : "Founder Portal"}
      variant={admin ? "team" : "founder"}
      tagline={admin ? ["Sidana", "operations", "desk"] : undefined}
    >
      <AuthHeading
        eyebrow="One-time step"
        title="Set your password."
        sub="You signed in with a temporary activation password. Choose your own to secure your account."
      />
      <ForceResetForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
