import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class strings with intelligent conflict resolution.
 * Used by every Shadcn component and any class composition that needs
 * variant-aware overrides. Equivalent to the standard `cn` helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
