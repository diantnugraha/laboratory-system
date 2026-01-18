/**
 * Method module configuration
 * Constants and defaults for method-related operations
 */

/**
 * Code prefix for method entities
 */
export const METHOD_CODE_PREFIX = 'MTD' as const;

/**
 * Default code format: MTD.00001
 */
export const METHOD_CODE_PATTERN = /^MTD\.(\d+)$/;

/**
 * Domains to filter out from search queries (legacy behavior)
 * These are treated as "noise" that should not trigger search
 */
export const IGNORED_SEARCH_DOMAINS = [
  'lab.tuv-nord.co.id',
  'dev.tuv-nord.co.id',
] as const;

export type IgnoredDomain = typeof IGNORED_SEARCH_DOMAINS[number];

/**
 * Check if a search term is an ignored domain
 */
export function isIgnoredDomain(term: string | undefined): boolean {
  if (!term) return false;
  return (IGNORED_SEARCH_DOMAINS as readonly string[]).includes(term);
}
