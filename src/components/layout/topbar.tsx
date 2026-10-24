import { initials } from "@/lib/utils";
import { SignOutButton } from "./signout-button";

export function TopBar({
  title,
  subtitle,
  userName,
  userEmail,
  actions,
}: {
  title: string;
  subtitle?: string;
  userName: string | null;
  userEmail: string | null;
  /** Extra controls shown before the user block (e.g. the announcements bell). */
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-navy-100 bg-white px-6">
      <div>
        <h1 className="text-base font-semibold text-navy-900">{title}</h1>
        {subtitle ? (
          <p className="text-xs text-navy-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-navy-800">
            {userName ?? userEmail ?? "User"}
          </p>
          {userEmail ? (
            <p className="text-xs text-navy-400">{userEmail}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
          {initials(userName ?? userEmail)}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
