/**
 * Run an async fn and fall back to a value (default `undefined`) when it throws.
 *
 * Used on RSC pages to gracefully degrade when the database isn't reachable
 * (no `.env.local`, Neon paused, etc.) — the page renders an empty state instead
 * of a 500. Production should not rely on this masking real failures, so log
 * the error in callers when meaningful.
 */
export async function safe<T, F = undefined>(fn: () => Promise<T>, fallback?: F): Promise<T | F> {
  try {
    return await fn();
  } catch {
    return fallback as F;
  }
}
