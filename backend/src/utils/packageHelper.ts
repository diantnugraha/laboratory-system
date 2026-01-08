import { PrismaClient } from '@prisma/client';

/**
 * Package Helper Utilities
 * Functions for managing package service lists and calculations
 */

/**
 * Parse comma-separated service list string to array of IDs
 * Input: ",1,2,3," or "1,2,3"
 * Output: [1, 2, 3]
 * 
 * @param listServiceString - Comma-separated string of service IDs
 * @returns Array of service IDs
 */
export const parseServiceList = (listServiceString: string | undefined): number[] => {
  if (!listServiceString || typeof listServiceString !== 'string') {
    return [];
  }

  // Remove leading and trailing commas, then split
  const trimmed = listServiceString.trim().replace(/^,+|,+$/g, '');
  
  if (!trimmed) {
    return [];
  }

  // Split by comma and convert to integers, filter out invalid values
  return trimmed
    .split(',')
    .map((id) => {
      const parsed = parseInt(id.trim(), 10);
      return isNaN(parsed) ? null : parsed;
    })
    .filter((id): id is number => id !== null && id > 0);
};

/**
 * Format array of service IDs to comma-separated string
 * Input: [1, 2, 3]
 * Output: ",1,2,3,"
 * 
 * @param serviceIds - Array of service IDs
 * @returns Comma-separated string with leading and trailing commas
 */
export const formatServiceList = (serviceIds: number[] | undefined): string => {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    return '';
  }

  // Filter valid IDs and convert to string
  const validIds = serviceIds
    .map((id) => {
      const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
      return isNaN(parsed) ? null : parsed;
    })
    .filter((id): id is number => id !== null && id > 0)
    .map((id) => id.toString());

  if (validIds.length === 0) {
    return '';
  }

  // Format with leading and trailing commas
  return `,${validIds.join(',')},`;
};

/**
 * Calculate total price from service IDs
 * Fetches services in batch and sums their prices
 * 
 * @param serviceIds - Array of service IDs
 * @param prisma - Prisma client instance
 * @returns Total price
 */
export const calculateTotalPrice = async (
  serviceIds: number[],
  prisma: PrismaClient
): Promise<number> => {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    return 0;
  }

  // Filter valid IDs
  const validIds = serviceIds
    .map((id) => {
      const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
      return isNaN(parsed) ? null : parsed;
    })
    .filter((id): id is number => id !== null && id > 0);

  if (validIds.length === 0) {
    return 0;
  }

  try {
    // Fetch services in batch
    const services = await prisma.service.findMany({
      where: {
        id: { in: validIds },
        trash: null,
      },
      select: {
        id: true,
        price: true,
      },
    });

    // Sum all prices
    const total = services.reduce((sum, service) => sum + (service.price || 0), 0);

    return total;
  } catch (error) {
    console.error('calculateTotalPrice error:', error);
    throw new Error('Failed to calculate total price');
  }
};

/**
 * Parse date string from d-m-Y format to Date object
 * Input: "01-01-2024" or "1-1-2024"
 * Output: Date object or null if invalid
 * 
 * @param dateString - Date string in d-m-Y format
 * @returns Date object or null if invalid
 */
export const parseDateDMY = (dateString: string | undefined | null): Date | null => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();
  if (!trimmed) {
    return null;
  }

  // Parse d-m-Y format (e.g., "01-01-2024" or "1-1-2024")
  const parts = trimmed.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  // Create date (month is 0-indexed in JavaScript Date)
  const date = new Date(year, month - 1, day);
  
  // Validate the date is valid
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

/**
 * Format Date object to Y-m-d string format for database storage
 * Input: Date object
 * Output: "2024-01-01" or null if invalid
 * 
 * @param date - Date object
 * @returns Date string in Y-m-d format or null if invalid
 */
export const formatDateYMD = (date: Date | undefined | null): string | null => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};



