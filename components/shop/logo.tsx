import Link from 'next/link';

/**
 * Brand logo — inline SVG mark + wordmark.
 *
 * The mark is a slate-foreground rounded square with three CMY ink dots
 * (cyan / magenta / yellow), tying the brand to the printer-cartridge
 * catalog at a glance. The wordmark stacks "Naman" (bold) over
 * "ELECTRONICS" (small caps, tracked) for a clean two-line lockup on
 * desktop; on mobile it collapses to just "Naman" beside the mark.
 *
 * Theme: the rect uses `currentColor`, so the mark flips automatically
 * between light/dark mode without a second asset. The CMY dots stay
 * brand-coloured in both modes.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Naman Electronics — home"
      className={`inline-flex items-center gap-2.5 text-foreground ${className ?? ''}`}
    >
      {/* Decorative mark — Link provides the screen-reader label; title
          satisfies Biome's a11y rule for embedded SVGs. */}
      <svg viewBox="0 0 36 36" className="size-8 shrink-0 sm:size-9" aria-hidden>
        <title>Naman Electronics logo mark</title>
        <rect width="36" height="36" rx="8" fill="currentColor" />
        {/* Three CMY ink dots, centered horizontally */}
        <circle cx="11.5" cy="18" r="3.2" fill="#22d3ee" />
        <circle cx="18" cy="18" r="3.2" fill="#ec4899" />
        <circle cx="24.5" cy="18" r="3.2" fill="#facc15" />
      </svg>
      <span className="hidden flex-col leading-none sm:flex">
        <span className="font-bold text-base tracking-tight">Naman</span>
        <span className="mt-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
          Electronics
        </span>
      </span>
      <span className="font-semibold text-sm tracking-tight sm:hidden">Naman</span>
    </Link>
  );
}
