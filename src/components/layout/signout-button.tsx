"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition hover:bg-navy-50 hover:text-navy-800 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
