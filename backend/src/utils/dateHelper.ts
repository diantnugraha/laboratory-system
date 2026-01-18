/**
 * Date Helper Utilities
 * Safe date parsing functions for controller use
 */

/**
 * Safely parse date string to Date object
 * Returns null for invalid or empty dates instead of Invalid Date
 */
export const safeParseDate = (dateString: string | undefined | null): Date | null => {
  if (!dateString || dateString.trim() === '') return null;

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Parse date with required validation - throws error if invalid
 * Use when the date field is required and must be valid
 */
export const parseRequiredDate = (
  dateString: string | undefined | null,
  fieldName: string
): Date => {
  const date = safeParseDate(dateString);
  if (!date) {
    throw new Error(`Invalid ${fieldName}: must be a valid date`);
  }
  return date;
};

/**
 * Parse date with optional fallback to default value
 */
export const parseDateOrDefault = (
  dateString: string | undefined | null,
  defaultDate: Date
): Date => {
  return safeParseDate(dateString) ?? defaultDate;
};

/**
 * Parse optional date field for update operations
 * - undefined input -> undefined (field not changed)
 * - null or empty string -> null (field explicitly cleared)
 * - valid date string -> Date object
 * - invalid date string -> null (treat as cleared)
 */
export const parseOptionalDate = (
  value: string | null | undefined
): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return safeParseDate(value);
};

/**
 * Parse date flexibly from multiple formats
 * Supports: YYYY-MM-DD, DD-MM-YYYY, and standard Date parseable formats
 * Uses UTC to avoid timezone issues
 */
export const parseDateFlexible = (
  dateString: string | undefined | null
): Date | null => {
  if (!dateString || dateString.trim() === '') return null;

  const trimmed = dateString.trim();

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + 'T00:00:00Z');
    return isNaN(date.getTime()) ? null : date;
  }

  // DD-MM-YYYY format
  const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(
      Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    );
    return isNaN(date.getTime()) ? null : date;
  }

  // Fallback to standard parsing
  return safeParseDate(trimmed);
};
