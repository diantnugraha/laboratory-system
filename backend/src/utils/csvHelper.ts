import type { FastifyReply } from 'fastify';

/**
 * CSV Helper Utility
 * Provides functions for generating and streaming CSV data
 */

/**
 * Escape a CSV field value
 * Handles quotes, commas, and newlines
 */
export const escapeCsvField = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if the field needs to be quoted
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Convert an array of objects to CSV format
 */
export const arrayToCsv = (data: Record<string, any>[], headers?: string[]): string => {
  if (data.length === 0) {
    return headers ? headers.join(',') : '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(h => escapeCsvField(h)).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => escapeCsvField(row[header])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Format a date for CSV output
 */
export const formatDateForCsv = (date: Date | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * Format a datetime for CSV output
 */
export const formatDateTimeForCsv = (date: Date | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:mm:ss format
};

/**
 * Send CSV response with proper headers
 */
export const sendCsvResponse = (
  reply: FastifyReply,
  data: string,
  filename: string
): void => {
  reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .header('Cache-Control', 'no-cache')
    .send('\ufeff' + data); // Add BOM for Excel UTF-8 compatibility
};

/**
 * Send CSV response from array of objects
 */
export const sendCsvFromArray = (
  reply: FastifyReply,
  data: Record<string, any>[],
  filename: string,
  headers?: string[]
): void => {
  const csvData = arrayToCsv(data, headers);
  sendCsvResponse(reply, csvData, filename);
};

/**
 * Worksheet report headers
 */
export const WORKSHEET_REPORT_HEADERS = [
  'WORKSHEET CODE',
  'SAMPLE CODE',
  'SAMPLE NAME',
  'PRIORITY',
  'REVIEWED DATE',
  'RELEASE DUE DATE',
  'PARAMETER',
  'METHOD',
  'DUE DATE',
  'STATUS',
  'RESULT',
  'UNIT',
  'ANALYST',
  'QC',
  'CUSTOMER',
  'CATEGORY',
  'PRICE',
];

/**
 * TODO Analyst report headers
 */
export const TODO_ANALYST_HEADERS = [
  'ANALYST TYPE',
  'PARAMETER',
  'COUNT',
];

/**
 * Enviro report headers
 */
export const ENVIRO_REPORT_HEADERS = [
  'WORKSHEET CODE',
  'SAMPLE CODE',
  'SERVICE NAME',
  'METHOD',
  'STATUS',
  'DUE DATE',
  'FINISH DATE',
  'ANALYST',
];
