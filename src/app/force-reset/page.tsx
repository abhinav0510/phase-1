import { redirect } from "next/navigation";
import { requireUser, landingPathFor, isAdmin } from "@/lib/auth";
import { AuthShell } from "@/components/site/auth-shell";
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
      tagline={admin ? ["Sidana", "operations", "desk"] : undefined}
    >
      <p className="mb-5 text-[11px] uppercase tracking-[0.35em] text-gold-dim">
        One-time step
      </p>
      <h1 className="site-serif text-[44px] leading-none text-ink md:text-[54px]">
        Set your password
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        You signed in with a temporary activation password. Choose your own to
        secure your account.
      </p>
      <ForceResetForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
