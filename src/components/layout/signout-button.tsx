"use client";

import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  icon: "flex h-9 w-9 items-center justify-center rounded-full border border-navy-100 text-navy-500 hover:bg-navy-50 hover:text-navy-800",
  sidebar:
    "group relative flex h-10 w-10 items-center justify-center rounded-xl text-navy-300 hover:bg-white/10 hover:text-white",
  menu: "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50",
};

export function SignOutButton({
  variant = "icon",
}: {
  variant?: keyof typeof VARIANTS;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={loading}
      title="Log out"
      aria-label="Log out"
      className={cn("transition disabled:opacity-50", VARIANTS[variant])}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {variant === "menu" ? "Sign out" : null}
      {variant === "sidebar" ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
          Log out
        </span>
      ) : null}
    </button>
  );
}
