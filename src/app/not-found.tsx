import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-2xl font-semibold text-neutral-900">Page not found</h2>
        <p className="mt-2 text-sm text-neutral-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="flex h-11 w-full items-center justify-center rounded-full bg-primary-600 px-5 text-base text-white transition-colors hover:bg-primary-700"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
