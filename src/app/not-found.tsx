import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-tide">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-tide-3">This page doesn&apos;t exist or has moved.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-medium text-white">
          Go to the homepage
        </Link>
      </div>
    </main>
  );
}
