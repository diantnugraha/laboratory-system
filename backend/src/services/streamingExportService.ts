import { PrismaClient } from '@prisma/client';

/**
 * Order Export Row Interface
 */
export interface OrderExportRow {
  code: string;
  orderDate: string;
  customerCode: string;
  customerName: string;
  contactName: string;
  status: string;
  priority: string;
  subTotal: number;
  discountValue: number;
  vatValue: number;
  total: number;
  lab: string;
  remarks: string;
  createdAt: string;
}

/**
 * Export Filter Interface
 */
export interface StreamExportFilter {
  search?: string;
  customerId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * CSV headers for order export
 */
export const ORDER_EXPORT_HEADERS = [
  'code',
  'orderDate',
  'customerCode',
  'customerName',
  'contactName',
  'status',
  'priority',
  'subTotal',
  'discountValue',
  'vatValue',
  'total',
  'lab',
  'remarks',
  'createdAt',
];

/**
 * Escape a CSV field value
 * Handles commas, quotes, and newlines
 */
export function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a row as CSV string
 */
export function formatCSVRow(row: OrderExportRow, headers: string[] = ORDER_EXPORT_HEADERS): string {
  return headers
    .map((header) => escapeCSVField((row as unknown as Record<string, unknown>)[header]))
    .join(',');
}

/**
 * Transform order database row to export format
 */
function transformToExportRow(order: any): OrderExportRow {
  return {
    code: order.code || '',
    orderDate: order.order_date?.toISOString() || '',
    customerCode: order.customer?.code || '',
    customerName: order.customer?.customer_name || '',
    contactName: order.contact
      ? `${order.contact.first_name || ''} ${order.contact.surname || ''}`.trim()
      : '',
    status: order.order_status || '',
    priority: order.order_priority || '',
    subTotal: Number(order.sub_total) || 0,
    discountValue: Number(order.discount_value) || 0,
    vatValue: Number(order.vat_value) || 0,
    total: Number(order.total) || 0,
    lab: order.lab === 1 ? 'Lab 1' : order.lab === 2 ? 'Lab 2' : 'All',
    remarks: order.remarks || '',
    createdAt: order.created_at?.toISOString() || '',
  };
}

/**
 * Async Generator for streaming order exports
 *
 * Fetches data in batches to avoid memory issues with large datasets.
 * Each batch is fetched from the database, transformed, and yielded one row at a time.
 *
 * Memory usage: O(batchSize) instead of O(totalRecords)
 *
 * @param prisma - Prisma client instance
 * @param filter - Export filter criteria
 * @param batchSize - Number of records to fetch per batch (default: 500)
 */
export async function* streamOrdersExport(
  prisma: PrismaClient,
  filter: StreamExportFilter,
  batchSize: number = 500
): AsyncGenerator<OrderExportRow> {
  let offset = 0;
  let hasMore = true;

  // Build where clause
  const where: any = { trash: null };

  if (filter.search) {
    where.code = { contains: filter.search, mode: 'insensitive' };
  }

  if (filter.customerId) {
    where.customer_id = filter.customerId;
  }

  if (filter.status) {
    where.order_status = filter.status;
  }

  if (filter.dateFrom) {
    where.order_date = { ...where.order_date, gte: filter.dateFrom };
  }

  if (filter.dateTo) {
    where.order_date = { ...where.order_date, lte: filter.dateTo };
  }

  while (hasMore) {
    const batch = await prisma.order.findMany({
      where,
      skip: offset,
      take: batchSize,
      orderBy: { id: 'desc' },
      include: {
        customer: {
          select: {
            code: true,
            customer_name: true,
          },
        },
        contact: {
          select: {
            first_name: true,
            surname: true,
          },
        },
      },
    });

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    // Yield each record individually
    for (const order of batch) {
      yield transformToExportRow(order);
    }

    offset += batchSize;
    hasMore = batch.length === batchSize;
  }
}

/**
 * Count total records for progress tracking (optional)
 */
export async function countExportRecords(
  prisma: PrismaClient,
  filter: StreamExportFilter
): Promise<number> {
  const where: any = { trash: null };

  if (filter.search) {
    where.code = { contains: filter.search, mode: 'insensitive' };
  }

  if (filter.customerId) {
    where.customer_id = filter.customerId;
  }

  if (filter.status) {
    where.order_status = filter.status;
  }

  if (filter.dateFrom) {
    where.order_date = { ...where.order_date, gte: filter.dateFrom };
  }

  if (filter.dateTo) {
    where.order_date = { ...where.order_date, lte: filter.dateTo };
  }

  return prisma.order.count({ where });
}
