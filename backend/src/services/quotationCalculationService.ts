/**
 * Quotation Calculation Service
 * Single source of truth for all quotation price calculations
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
  unitPrice: number;              // Service/package price
  serviceQuantity: number;        // Qty of service (usually 1)
  sampleQuantity: number;         // Qty of samples using this service
  discountPercent: number;        // Item-level discount (0-100)
  applyPriorityCharge: boolean;   // Whether PC applies to this item
}

/**
 * Result of quotation calculation
 */
export interface QuotationTotals {
  // Raw totals (before any discounts)
  grossTotal: number;

  // Discount breakdown
  itemDiscountTotal: number;        // Sum of per-item discounts
  afterItemDiscount: number;        // grossTotal - itemDiscountTotal

  quotationDiscountPercent: number;
  quotationDiscountTotal: number;   // afterItemDiscount × quotationDiscount%
  afterQuotationDiscount: number;   // afterItemDiscount - quotationDiscountTotal

  // Priority charge
  priorityRate: number;             // 0, 50, or 100
  priorityChargeTotal: number;      // afterQuotationDiscount × priorityRate%

  // Final totals
  subTotal: number;                 // afterQuotationDiscount + priorityChargeTotal
  vatPercent: number;
  vatTotal: number;                 // subTotal × vatPercent%
  grandTotal: number;               // subTotal + vatTotal

  // Flags
  isMinimumApplied: boolean;
}

/**
 * Input parameters for calculation
 */
export interface CalculationParams {
  items: QuotationLineItem[];
  quotationDiscountPercent: number;
  priority: QuotationPriority | string;
  vatPercent: number;
}

/**
 * Service for calculating quotation totals
 * Ensures consistent calculation across controller, PDF service, and frontend
 */
export class QuotationCalculationService {
  /**
   * Get priority rate from priority string
   */
  getPriorityRate(priority: string | null | undefined): number {
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
   * Calculate totals from line items
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
  calculateFromItems(params: CalculationParams): QuotationTotals {
    const { items, quotationDiscountPercent, priority, vatPercent } = params;
    const priorityRate = this.getPriorityRate(priority);

    // Step 1-2: Calculate gross total and item discounts
    let grossTotal = 0;
    let itemDiscountTotal = 0;
    let priorityChargeTotal = 0;

    for (const item of items) {
      const unitPrice = Number(item.unitPrice) || 0;
      const serviceQty = Number(item.serviceQuantity) || 1;
      const sampleQty = Number(item.sampleQuantity) || 1;
      const discountPercent = Number(item.discountPercent) || 0;

      // Gross price for this item (before discount)
      const itemGross = unitPrice * serviceQty * sampleQty;
      grossTotal += itemGross;

      // Item-level discount
      const itemDiscount = itemGross * (discountPercent / 100);
      itemDiscountTotal += itemDiscount;

      // Priority charge calculation (on after-discount amount)
      // Note: PC is calculated per item for items that have applyPriorityCharge = true
      if (item.applyPriorityCharge && priorityRate > 0) {
        const itemAfterDiscount = itemGross - itemDiscount;
        priorityChargeTotal += itemAfterDiscount * (priorityRate / 100);
      }
    }

    // Step 3: After item discount
    const afterItemDiscount = grossTotal - itemDiscountTotal;

    // Step 4-5: Quotation-level discount
    const quotationDiscountTotal = afterItemDiscount * (quotationDiscountPercent / 100);
    const afterQuotationDiscount = afterItemDiscount - quotationDiscountTotal;

    // Step 6: Priority charge is already calculated per item above
    // But we need to recalculate it based on afterQuotationDiscount if quotation discount is applied
    // Decision: Priority charge is calculated AFTER quotation discount (on afterQuotationDiscount)
    // Recalculate priority charge based on the formula in the design doc
    priorityChargeTotal = 0;
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

    // Round all values
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
   * Calculate totals from pre-stored values
   * Used when we have the stored sub_total from database and need to apply quotation-level calculations
   *
   * @param storedSubTotal - The sub_total from database (sum of items with item-discounts already applied)
   * @param quotationDiscountPercent - Quotation-level discount percentage
   * @param priority - Priority string
   * @param vatPercent - VAT percentage
   */
  calculateFromStoredTotal(params: {
    storedSubTotal: number;
    quotationDiscountPercent: number;
    priority: string | null;
    vatPercent: number;
  }): QuotationTotals {
    const { storedSubTotal, quotationDiscountPercent, priority, vatPercent } = params;
    const priorityRate = this.getPriorityRate(priority);

    // storedSubTotal = afterItemDiscount (already has item discounts applied)
    const afterItemDiscount = storedSubTotal;

    // Quotation-level discount
    const quotationDiscountTotal = afterItemDiscount * (quotationDiscountPercent / 100);
    const afterQuotationDiscount = afterItemDiscount - quotationDiscountTotal;

    // Priority charge (on after quotation discount)
    const priorityChargeTotal = afterQuotationDiscount * (priorityRate / 100);

    // Sub total
    let subTotal = afterQuotationDiscount + priorityChargeTotal;

    // VAT and grand total
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
      grossTotal: Math.round(storedSubTotal), // We don't have the original gross, use stored as approximation
      itemDiscountTotal: 0, // Already applied in storedSubTotal
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
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}

// Export singleton instance
export const quotationCalculationService = new QuotationCalculationService();