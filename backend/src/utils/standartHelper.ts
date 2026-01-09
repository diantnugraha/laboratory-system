/**
 * Standart Helper Utilities
 * Functions for parsing and validating min/max values in standartDetails
 */

/**
 * Parse min/max value to String, handling special cases like "Negative"
 * @param value - The value to parse (can be string, number, or null)
 * @returns String value (converts number to string, preserves "Negative" as is)
 * @throws Error if value is null, undefined, or empty string
 */
export const parseMinMaxValue = (value: any): string => {
  if (value === null || value === undefined) {
    throw new Error('min and max values cannot be null or undefined');
  }

  // If already a string, trim and return
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new Error('min and max values cannot be empty strings');
    }
    return trimmed;
  }

  // If number, convert to string
  if (typeof value === 'number') {
    if (isNaN(value)) {
      throw new Error('min and max must be valid numbers');
    }
    return value.toString();
  }

  // Convert other types to string
  return String(value);
};

/**
 * Validate that min <= max (only when both are numeric)
 * @param min - Minimum value (string or number)
 * @param max - Maximum value (string or number)
 * @throws Error if min > max when both are numeric
 */
export const validateMinMaxRange = (min: any, max: any): void => {
  // Only validate if both values are numeric
  const minNum = typeof min === 'number' ? min : (typeof min === 'string' ? parseFloat(min) : NaN);
  const maxNum = typeof max === 'number' ? max : (typeof max === 'string' ? parseFloat(max) : NaN);

  // If both are valid numbers, check range
  if (!isNaN(minNum) && !isNaN(maxNum)) {
    if (minNum > maxNum) {
      throw new Error(`Min value (${minNum}) cannot be greater than Max value (${maxNum})`);
    }
  }
  // If one or both are strings like "Negative", skip validation
};
