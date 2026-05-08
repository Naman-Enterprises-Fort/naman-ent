import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-4 px-6">
      <p className="font-medium text-muted-foreground text-sm uppercase tracking-wider">404</p>
      <h1 className="font-semibold text-3xl tracking-tight">We couldn't find that page.</h1>
      <p className="text-muted-foreground">
        The link may have moved or expired. Head back home and start again.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground text-sm transition-colors hover:opacity-90"
      >
        Back to home
      </Link>
    </main>
  );
}
