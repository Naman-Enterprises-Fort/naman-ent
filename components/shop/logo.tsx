import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Naman Electronics — home"
      className={`inline-flex items-center gap-2 font-semibold text-base tracking-tight ${className ?? ''}`}
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md bg-foreground font-bold text-background text-xs"
      >
        N
      </span>
      <span className="hidden sm:inline">Naman Electronics</span>
      <span className="sm:hidden">Naman</span>
    </Link>
  );
}
