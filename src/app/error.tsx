"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-2xl font-semibold text-neutral-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-neutral-600">
          We couldn&apos;t load this page. Please try again.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard")} className="w-full">
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
