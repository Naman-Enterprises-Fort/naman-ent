'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(integration): forward to Sentry once configured.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-4 px-6">
      <p className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
        Something went wrong
      </p>
      <h1 className="font-semibold text-3xl tracking-tight">We hit an unexpected error.</h1>
      <p className="text-muted-foreground">
        Try again in a moment. If it keeps happening, let our support team know.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground text-sm transition-colors hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
