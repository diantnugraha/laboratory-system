/**
 * Build search condition for a single field
 * Returns an object that can be spread into Prisma where clause
 */
export const buildSearchCondition = (field: string, search: string | undefined): Record<string, any> => {
  if (!search || search.trim() === '') {
    return {};
  }

  // Note: MySQL's default collation (utf8mb4_unicode_ci) is case-insensitive,
  // so contains should work case-insensitively by default without mode parameter
  return {
    [field]: {
      contains: search.trim()
    }
  };
};

/**
 * Build multi-field search condition with OR logic
 * Returns an object with OR array that can be spread into Prisma where clause
 */
export const buildMultiFieldSearchCondition = (fields: string[], search: string | undefined): Record<string, any> => {
  if (!search || search.trim() === '') {
    return {};
  }

  // Note: MySQL's default collation (utf8mb4_unicode_ci) is case-insensitive,
  // so contains should work case-insensitively by default without mode parameter
  const searchTerm = search.trim();
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm
      }
    }))
  };
};

/**
 * Sanitize search query
 */
export const sanitizeSearchQuery = (query: string | undefined): string | undefined => {
  if (!query || typeof query !== 'string') {
    return undefined;
  }
  return query.trim() || undefined;
};

/**
 * Check for duplicate value (case-insensitive)
 * @param model - Prisma model delegate
 * @param field - Field name to check
 * @param value - Value to check
 * @param additionalWhereOrExcludeId - Additional where conditions (e.g., { deletedAt: null } or { trash: null }) OR excludeId (number) for backward compatibility
 * @returns true if duplicate exists, false otherwise
 */
export const checkDuplicateCaseInsensitive = async (
  model: any,
  field: string,
  value: string,
  additionalWhereOrExcludeId?: Record<string, any> | number
): Promise<boolean> => {
  // For MySQL, mode: 'insensitive' is not supported with equals.
  // We'll build the where clause without the field filter first,
  // then filter results in memory for case-insensitive match.
  const where: any = {};

  // Handle backward compatibility: if it's a number, treat as excludeId
  if (typeof additionalWhereOrExcludeId === 'number') {
    where.id = {
      not: additionalWhereOrExcludeId
    };
    // Try to add trash filter for backward compatibility (models with trash field)
    // If model doesn't have trash, we'll catch the error and retry without it
    where.trash = null;
  } else if (additionalWhereOrExcludeId) {
    // It's an object with additional where conditions
    Object.assign(where, additionalWhereOrExcludeId);
  } else {
    // Default: try to use trash: null for backward compatibility
    // If model doesn't have trash field, we'll catch the error and retry without it
    where.trash = null;
  }

  // Fetch records matching the where conditions
  // Note: This approach filters in memory, which is acceptable for duplicate checks
  // where the result set is typically small
  try {
    const results = await model.findMany({ 
      where,
      select: { [field]: true, id: true }
    });
    
    // Filter for case-insensitive exact match
    const existing = results.find((item: any) => 
      item[field]?.toLowerCase() === value.toLowerCase()
    );
    
    return !!existing;
  } catch (error: any) {
    // If error is about unknown 'trash' argument, retry without trash filter
    if (error?.message?.includes('Unknown argument `trash`') || 
        error?.message?.includes('Unknown argument') && error?.message?.includes('trash')) {
      // Remove trash from where clause and retry
      const whereWithoutTrash = { ...where };
      delete whereWithoutTrash.trash;
      
      const results = await model.findMany({ 
        where: whereWithoutTrash,
        select: { [field]: true, id: true }
      });
      
      // Filter for case-insensitive exact match
      const existing = results.find((item: any) => 
        item[field]?.toLowerCase() === value.toLowerCase()
      );
      
      return !!existing;
    }
    // If it's a different error, rethrow it
    throw error;
  }
};
