/**
 * Slug generation utilities for human-readable identifiers
 */

/**
 * Convert a name to a URL-safe slug identifier.
 * Lowercase, alphanumeric + hyphens only, no leading/trailing/consecutive hyphens.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // collapse consecutive hyphens
}

/**
 * Ensure a slug is unique among existing slugs by appending -2, -3, etc.
 */
export function ensureUniqueSlug(slug: string, existing: string[]): string {
  if (!existing.includes(slug)) return slug;
  let counter = 2;
  while (existing.includes(`${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}
