/**
 * Method Helper Utilities
 * Pure calculation functions with no database access
 */

/**
 * Generate hierarchical path for method based on ID
 * Creates path structure: /{milyar}/{juta}/{ribu}/{ratus}/
 *
 * Examples:
 * - ID 1 → /00/000/000/001/
 * - ID 123 → /00/000/000/123/
 * - ID 1234 → /00/000/001/234/
 * - ID 123456789 → /00/123/456/789/
 *
 * @param id Method ID
 * @returns Hierarchical path string
 */
export const generateMethodPath = (id: number): string => {
  const idStr = id.toString();

  // Extract last 3 digits (hundreds)
  const ratus = idStr.slice(-3).padStart(3, '0');

  // Extract digits 4-6 from end (thousands)
  const ribu = idStr.length > 3
    ? idStr.slice(-6, -3).padStart(3, '0')
    : '000';

  // Extract digits 7-9 from end (millions)
  const juta = idStr.length > 6
    ? idStr.slice(-9, -6).padStart(3, '0')
    : '000';

  // Extract digits 10-12 from end (billions)
  const milyar = idStr.length > 9
    ? idStr.slice(-12, -9).padStart(2, '0')
    : '00';

  return `/${milyar}/${juta}/${ribu}/${ratus}/`;
};
