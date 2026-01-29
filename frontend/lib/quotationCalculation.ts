/**
 * Quotation Calculation Utility
 * Mirrors the backend calculation service for consistent calculations
 */

// Constants
const MIN_TOTAL = 200000;
const MIN_VAT = 22000;
const MIN_GRAND_TOTAL = 222000;

/**
 * Priority rates for quotation calculations
 */
export type QuotationPriority = 'normal' | 'urgent' | 'very urgent';

/**
 * Line item for calculation input
 */
export interface QuotationLineItem {
  unitPrice: number;
  serviceQuantity: number;
  sampleQuantity: number;
  discountPercent: number;
  applyPriorityCharge: boolean;
}

/**
 * Result of quotation calculation
 */
export interface QuotationTotals {
  grossTotal: number;
  itemDiscountTotal: number;
  afterItemDiscount: number;
  quotationDiscountPercent: number;
  quotationDiscountTotal: number;
  afterQuotationDiscount: number;
  priorityRate: number;
  priorityChargeTotal: number;
  subTotal: number;
  vatPercent: number;
  vatTotal: number;
  grandTotal: number;
  isMinimumApplied: boolean;
}

/**
 * Get priority rate from priority string
 */
export function getPriorityRate(priority: string | null | undefined): number {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 50;
    case 'very urgent':
    case 'very-urgent':
      return 100;
    default:
      return 0;
  }
}

/**
 * Calculate quotation totals from line items
 *
 * Formula:
 * 1. grossTotal        = Σ(unitPrice × serviceQty × sampleQty)
 * 2. itemDiscountTotal = Σ(grossPrice × itemDiscount%)
 * 3. afterItemDiscount = grossTotal - itemDiscountTotal
 * 4. quoDiscountTotal  = afterItemDiscount × quotationDiscount%
 * 5. afterQuoDiscount  = afterItemDiscount - quoDiscountTotal
 * 6. priorityCharge    = Σ(itemAfterDiscount × priorityRate%) for applicable items
 * 7. subTotal          = afterQuoDiscount + priorityCharge
 * 8. vat               = subTotal × vatPercent%
 * 9. grandTotal        = subTotal + vat
 */
export function calculateQuotationTotals(params: {
  items: QuotationLineItem[];
  quotationDiscountPercent: number;
  priority: QuotationPriority | string;
  vatPercent: number;
}): QuotationTotals {
  const { items, quotationDiscountPercent, priority, vatPercent } = params;
  const priorityRate = getPriorityRate(priority);

  // Step 1-2: Calculate gross total and item discounts
  let grossTotal = 0;
  let itemDiscountTotal = 0;

  for (const item of items) {
    const unitPrice = Number(item.unitPrice) || 0;
    const serviceQty = Number(item.serviceQuantity) || 1;
    const sampleQty = Number(item.sampleQuantity) || 1;
    const discountPercent = Number(item.discountPercent) || 0;

    const itemGross = unitPrice * serviceQty * sampleQty;
    grossTotal += itemGross;

    const itemDiscount = itemGross * (discountPercent / 100);
    itemDiscountTotal += itemDiscount;
  }

  // Step 3: After item discount
  const afterItemDiscount = grossTotal - itemDiscountTotal;

  // Step 4-5: Quotation-level discount
  const quotationDiscountTotal = afterItemDiscount * (quotationDiscountPercent / 100);
  const afterQuotationDiscount = afterItemDiscount - quotationDiscountTotal;

  // Step 6: Priority charge (calculated per item, proportionally after quotation discount)
  let priorityChargeTotal = 0;
  for (const item of items) {
    if (item.applyPriorityCharge && priorityRate > 0) {
      const unitPrice = Number(item.unitPrice) || 0;
      const serviceQty = Number(item.serviceQuantity) || 1;
      const sampleQty = Number(item.sampleQuantity) || 1;
      const discountPercent = Number(item.discountPercent) || 0;

      const itemGross = unitPrice * serviceQty * sampleQty;
      const itemDiscount = itemGross * (discountPercent / 100);
      const itemAfterItemDiscount = itemGross - itemDiscount;

      // Apply quotation discount proportionally to this item
      const itemProportion = itemAfterItemDiscount / (afterItemDiscount || 1);
      const itemAfterQuoDiscount = itemAfterItemDiscount - (quotationDiscountTotal * itemProportion);

      priorityChargeTotal += itemAfterQuoDiscount * (priorityRate / 100);
    }
  }

  // Step 7: Sub total
  let subTotal = afterQuotationDiscount + priorityChargeTotal;

  // Step 8-9: VAT and grand total
  let vatTotal: number;
  let grandTotal: number;
  let isMinimumApplied = false;

  // Apply minimum rule
  if (subTotal < MIN_TOTAL) {
    isMinimumApplied = true;
    subTotal = MIN_TOTAL;
    vatTotal = MIN_VAT;
    grandTotal = MIN_GRAND_TOTAL;
  } else {
    vatTotal = subTotal * (vatPercent / 100);
    grandTotal = subTotal + vatTotal;
  }

  return {
    grossTotal: Math.round(grossTotal),
    itemDiscountTotal: Math.round(itemDiscountTotal),
    afterItemDiscount: Math.round(afterItemDiscount),
    quotationDiscountPercent,
    quotationDiscountTotal: Math.round(quotationDiscountTotal),
    afterQuotationDiscount: Math.round(afterQuotationDiscount),
    priorityRate,
    priorityChargeTotal: Math.round(priorityChargeTotal),
    subTotal: Math.round(subTotal),
    vatPercent,
    vatTotal: Math.round(vatTotal),
    grandTotal: Math.round(grandTotal),
    isMinimumApplied,
  };
}

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}