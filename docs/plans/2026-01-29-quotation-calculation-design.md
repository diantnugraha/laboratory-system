# Quotation Price Calculation Unification

## Problem Statement

The quotation price calculation has inconsistencies between:
- **Controller** (previewQuotationPdf) - applies quotation-level discount
- **PDF Service** (fallback calculation) - only applies item-level discounts

This causes the PDF to display different values depending on which code path executes.

### Current Inconsistencies

| Field | Controller Path | Fallback Path |
|-------|-----------------|---------------|
| "Total" | Sum with item discounts already applied | Raw base prices (no discounts) |
| "Discount" | Quotation-level discount amount | Sum of item-level discounts |
| Quotation % discount | Applied | **Missing** |

## Proposed Solution

### Unified Calculation Formula

```
1. grossTotal        = Σ(unitPrice × serviceQty × sampleQty)
2. itemDiscountTotal = Σ(grossPrice × itemDiscount%)
3. afterItemDiscount = grossTotal - itemDiscountTotal
4. quoDiscountTotal  = afterItemDiscount × quotationDiscount%
5. afterQuoDiscount  = afterItemDiscount - quoDiscountTotal
6. priorityCharge    = afterQuoDiscount × priorityRate%
7. subTotal          = afterQuoDiscount + priorityCharge
8. vat               = subTotal × vatPercent%
9. grandTotal        = subTotal + vat
```

**Priority Rates:**
- Normal: 0%
- Urgent: 50%
- Very Urgent: 100%

**Minimum Rule:**
- If `subTotal < 200,000` → subTotal = 200,000, vat = 22,000, grandTotal = 222,000

### Data Structure

```typescript
interface QuotationTotals {
  // Raw totals (before any discounts)
  grossTotal: number;

  // Discount breakdown
  itemDiscountTotal: number;      // Sum of per-item discounts
  afterItemDiscount: number;      // grossTotal - itemDiscountTotal

  quotationDiscountPercent: number;
  quotationDiscountTotal: number; // afterItemDiscount × quotationDiscount%
  afterQuotationDiscount: number; // afterItemDiscount - quotationDiscountTotal

  // Priority charge
  priorityRate: number;           // 0, 50, or 100
  priorityChargeTotal: number;    // afterQuotationDiscount × priorityRate%

  // Final totals
  subTotal: number;               // afterQuotationDiscount + priorityChargeTotal
  vatPercent: number;
  vatTotal: number;               // subTotal × vatPercent%
  grandTotal: number;             // subTotal + vatTotal

  // Flags
  isMinimumApplied: boolean;
}
```

## Architecture

### New Shared Calculation Service

Create `backend/src/services/quotationCalculationService.ts`:

```typescript
// Single source of truth for all quotation calculations
class QuotationCalculationService {

  // Calculate totals from line items
  calculateFromItems(params: {
    items: QuotationLineItem[];
    quotationDiscountPercent: number;
    priority: 'normal' | 'urgent' | 'very urgent';
    vatPercent: number;
  }): QuotationTotals;

  // Get priority rate from priority string
  getPriorityRate(priority: string): number;

  // Apply minimum total rule
  applyMinimumRule(totals: QuotationTotals): QuotationTotals;
}
```

### Line Item Structure

```typescript
interface QuotationLineItem {
  unitPrice: number;        // Service/package price
  serviceQuantity: number;  // Qty of service (usually 1)
  sampleQuantity: number;   // Qty of samples using this service
  discountPercent: number;  // Item-level discount (0-100)
  applyPriorityCharge: boolean; // Whether PC applies to this item
}
```

## Implementation Plan

### Step 1: Create Calculation Service

**File:** `backend/src/services/quotationCalculationService.ts`

- Implement `QuotationCalculationService` class
- Export singleton instance
- Include all calculation logic in one place
- Add unit tests for edge cases

### Step 2: Update PDF Service

**File:** `backend/src/services/quotationPdfService.ts`

- Remove `calculateTotals()` method
- Import and use `quotationCalculationService`
- Update `QuotationPdfData` interface to use new `QuotationTotals`

### Step 3: Update Controller

**File:** `backend/src/controllers/quotationController.ts`

- Remove inline calculation logic (lines 754-761)
- Use `quotationCalculationService.calculateFromItems()`
- Pass consistent totals to PDF service

### Step 4: Update Frontend

**File:** `frontend/app/(protected)/operational/quotation/new/page.tsx`

- Align calculation logic with backend formula (lines 752-786)
- Ensure same order: item discount → quotation discount → priority charge → VAT

## Files to Modify

| File | Changes |
|------|---------|
| `backend/src/services/quotationCalculationService.ts` | **NEW** - Shared calculation logic |
| `backend/src/services/quotationPdfService.ts` | Remove `calculateTotals()`, use shared service |
| `backend/src/controllers/quotationController.ts` | Use shared service for PDF preview |
| `frontend/.../quotation/new/page.tsx` | Align calculation formula |
| `frontend/.../quotation/[id]/page.tsx` | Align calculation formula (view page) |
| `frontend/.../quotation/[id]/edit/page.tsx` | Align calculation formula (edit page) |

## PDF Display Format

The PDF summary section will show:

```
┌─────────────────────────────────────┐
│ Total (IDR)              1,000,000  │  ← grossTotal
│ Item Discount (IDR)       -100,000  │  ← itemDiscountTotal
│ Quotation Discount (IDR)   -90,000  │  ← quotationDiscountTotal (10%)
│ Priority Charge (IDR)     +405,000  │  ← priorityChargeTotal (50%)
│ Sub Total (IDR)          1,215,000  │  ← subTotal
│ VAT 11% (IDR)              133,650  │  ← vatTotal
│ Grand Total (IDR)        1,348,650  │  ← grandTotal
└─────────────────────────────────────┘
```

## Migration Notes

- No database schema changes required
- `quotation.sub_total` continues to store `afterItemDiscount` (sum of items with item-discounts applied)
- Backward compatible with existing quotation data
- Existing PDFs will render with new consistent calculation

## Testing Checklist

- [ ] Normal priority (0% PC) calculates correctly
- [ ] Urgent priority (50% PC) calculates correctly
- [ ] Very urgent priority (100% PC) calculates correctly
- [ ] Item-level discount applies before quotation discount
- [ ] Quotation-level discount applies correctly
- [ ] Both discount types combined work correctly
- [ ] Minimum total rule triggers when subTotal < 200,000
- [ ] VAT calculates on subTotal (after PC)
- [ ] PDF displays all breakdown rows correctly
- [ ] Frontend preview matches PDF output
- [ ] Edit page calculation matches create page
