/**
 * Generate a URL-safe slug from arbitrary text.
 *
 * - Lowercases.
 * - Strips diacritics via NFKD decomposition + combining-mark removal.
 * - Collapses any run of non-alphanumeric chars to a single hyphen.
 * - Trims leading/trailing hyphens.
 * - Truncates to 80 chars (matches our slug column heuristic).
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
