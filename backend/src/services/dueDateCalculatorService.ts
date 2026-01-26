import { PrismaClient } from '@prisma/client';
import {
  SAMPLE_DUE_DATE_OFFSETS,
  SamplePriority,
  getDueDateOffset,
} from '../config/sample.js';

/**
 * Input for due date calculation
 */
export interface DueDateInput {
  startDate: Date;
  priority: SamplePriority | string;
  holidayCount?: number; // Optional override from order
}

/**
 * Result of due date calculation
 */
export interface DueDateResult {
  dueDate: Date;
  coaReleaseDueDate: Date;
  businessDaysAdded: number;
  holidaysSkipped: number;
}

/**
 * Service for calculating sample due dates
 * Handles business day calculations excluding weekends and holidays
 */
export class DueDateCalculatorService {
  private prisma: PrismaClient;
  private holidayCache: Map<number, Date[]> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate due date and COA release due date based on priority
   * Excludes weekends (Saturday, Sunday) and holidays from Event table
   */
  async calculate(input: DueDateInput): Promise<DueDateResult> {
    const { startDate, priority, holidayCount } = input;
    const offsets = getDueDateOffset(priority);

    // Get holidays for the calculation period
    const year = startDate.getFullYear();
    const holidays = await this.getHolidays(year);

    // Also get next year holidays in case calculation spans years
    const nextYearHolidays = await this.getHolidays(year + 1);
    const allHolidays = [...holidays, ...nextYearHolidays];

    // Calculate due date (analysis deadline)
    const dueDateResult = await this.addBusinessDays(
      startDate,
      offsets.dueDate,
      allHolidays
    );

    // Calculate COA release due date
    const coaReleaseDueDateResult = await this.addBusinessDays(
      startDate,
      offsets.coaRelease,
      allHolidays
    );

    // Add additional holiday count from order if provided
    let finalDueDate = dueDateResult.date;
    let finalCoaReleaseDueDate = coaReleaseDueDateResult.date;
    let additionalHolidaysSkipped = 0;

    if (holidayCount && holidayCount > 0) {
      const additionalDueDate = await this.addBusinessDays(
        finalDueDate,
        holidayCount,
        allHolidays
      );
      const additionalCoaDate = await this.addBusinessDays(
        finalCoaReleaseDueDate,
        holidayCount,
        allHolidays
      );

      finalDueDate = additionalDueDate.date;
      finalCoaReleaseDueDate = additionalCoaDate.date;
      additionalHolidaysSkipped = holidayCount;
    }

    return {
      dueDate: finalDueDate,
      coaReleaseDueDate: finalCoaReleaseDueDate,
      businessDaysAdded: offsets.coaRelease + (holidayCount || 0),
      holidaysSkipped:
        dueDateResult.holidaysSkipped +
        coaReleaseDueDateResult.holidaysSkipped +
        additionalHolidaysSkipped,
    };
  }

  /**
   * Add business days to a date, skipping weekends and holidays
   */
  async addBusinessDays(
    startDate: Date,
    days: number,
    holidays?: Date[]
  ): Promise<{ date: Date; holidaysSkipped: number }> {
    // Get holidays if not provided
    const holidayList =
      holidays ||
      (await this.getHolidays(startDate.getFullYear()));

    let currentDate = new Date(startDate);
    let daysAdded = 0;
    let holidaysSkipped = 0;

    while (daysAdded < days) {
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Check if it's a business day
      if (this.isBusinessDay(currentDate, holidayList)) {
        daysAdded++;
      } else {
        // Track if it was a holiday (not weekend)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          holidaysSkipped++;
        }
      }
    }

    return { date: currentDate, holidaysSkipped };
  }

  /**
   * Check if a date is a business day (not weekend, not holiday)
   */
  isBusinessDay(date: Date, holidays: Date[]): boolean {
    const dayOfWeek = date.getDay();

    // Check if weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check if holiday
    const dateStr = this.formatDateForComparison(date);
    const isHoliday = holidays.some(
      (h) => this.formatDateForComparison(h) === dateStr
    );

    return !isHoliday;
  }

  /**
   * Get holidays from Event table for a specific year
   * Results are cached for performance
   */
  async getHolidays(year: number): Promise<Date[]> {
    // Check cache first
    if (this.holidayCache.has(year)) {
      return this.holidayCache.get(year)!;
    }

    try {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);

      const events = await this.prisma.event.findMany({
        where: {
          trash: null,
          event_date: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        select: {
          event_date: true,
        },
      });

      const holidays = events
        .map((e) => e.event_date)
        .filter((d): d is Date => d !== null);

      // Cache the result
      this.holidayCache.set(year, holidays);

      return holidays;
    } catch (error) {
      console.error(`Failed to fetch holidays for year ${year}:`, error);
      // Return empty array on error to continue with weekend-only calculation
      return [];
    }
  }

  /**
   * Clear holiday cache (useful for testing or when events are updated)
   */
  clearCache(): void {
    this.holidayCache.clear();
  }

  /**
   * Format date for comparison (YYYY-MM-DD)
   */
  private formatDateForComparison(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate remaining time until due date
   * Returns formatted string like "3d, 5hr" or "((2d, 3hr))" for overdue
   */
  calculateRemainingTime(
    dueDate: Date,
    referenceDate?: Date
  ): { remaining: string; isOverdue: boolean } {
    const now = referenceDate || new Date();
    const diff = dueDate.getTime() - now.getTime();

    const absDiff = Math.abs(diff);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    const isOverdue = diff < 0;

    if (days === 0 && hours === 0) {
      return { remaining: 'Now', isOverdue: false };
    }

    const timeStr = `${days}d, ${hours}hr`;

    return {
      remaining: isOverdue ? `(( ${timeStr} ))` : timeStr,
      isOverdue,
    };
  }

  /**
   * Check if a sample has subcontracted services
   * Used to determine if subcontracted priority should be applied
   */
  async checkSubcontracted(sampleId: number): Promise<boolean> {
    try {
      const subconWorksheet = await this.prisma.worksheet.findFirst({
        where: {
          sample_id: sampleId,
          trash: null,
          service: {
            status: 'Subcontracted',
          },
        },
      });

      return subconWorksheet !== null;
    } catch (error) {
      console.error(`Failed to check subcontracted for sample ${sampleId}:`, error);
      return false;
    }
  }

  /**
   * Get effective priority considering subcontracted services
   */
  async getEffectivePriority(
    sampleId: number,
    basePriority: string
  ): Promise<SamplePriority> {
    const isSubcontracted = await this.checkSubcontracted(sampleId);

    if (isSubcontracted) {
      return 'Subcontracted';
    }

    // Validate and normalize priority
    const normalizedPriority = basePriority as SamplePriority;
    if (SAMPLE_DUE_DATE_OFFSETS[normalizedPriority]) {
      return normalizedPriority;
    }

    return 'Normal';
  }
}
