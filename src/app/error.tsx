"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

/** Shown when a page can't load its data, so a failed read never looks like "nothing here". */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // The failure happened on the server, so retrying has to fetch the page again.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-tide">We couldn&apos;t load this page</h1>
        <p className="mt-3 text-sm leading-6 text-tide-3">
          Your data is safe. This is usually a brief connection problem, so please try again in a moment.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ocean-700"
        >
          Try again
        </button>
        {error.digest && <p className="mt-6 text-xs text-tide-3">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
