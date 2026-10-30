"use client";

import "./globals.css";

/** Last resort for a failure in the root layout itself. It has to bring its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-canvas">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold text-tide">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-tide-3">Please try again in a moment.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
