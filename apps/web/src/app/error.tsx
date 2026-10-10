"use client";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/Button";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-reading px-4 py-16 md:px-6">
      <ErrorState
        title="This page didn't load"
        code={error.digest ? `INTERNAL · ${error.digest}` : "INTERNAL"}
        message="Something broke on our side. It's been logged."
        action={
          <Button variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
