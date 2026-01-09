/**
 * User Helper Utilities
 * Domain-specific logic for user operations
 */

/**
 * Handle department array - join with ";;" delimiter
 * @param departments - Can be array of strings, single string, or undefined
 * @returns Formatted string with ";;" delimiter or null
 */
export const handleDepartmentArray = (
  departments: string[] | string | undefined
): string | null => {
  if (!departments) return null;

  if (Array.isArray(departments)) {
    return departments.filter(d => d && String(d).trim()).join(';;');
  }

  return String(departments).trim() || null;
};
