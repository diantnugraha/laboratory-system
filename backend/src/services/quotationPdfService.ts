import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';

/**
 * TÜV NORD Logo as base64 (actual logo image)
 */
const TUV_NORD_LOGO = 'data:image/png;base64,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';

/**
 * Special customer IDs with simplified layout
 * Hides: Price, Discount, Priority Charge columns
 */
const SPECIAL_CUSTOMER_IDS = [34, 2013, 65];

/**
 * Priority charge rates
 */
const PRIORITY_RATES: Record<string, number> = {
  normal: 0,
  urgent: 50,
  'very urgent': 100,
  'very-urgent': 100,
};

/**
 * Minimum total rule
 */
const MIN_TOTAL = 200000;
const MIN_VAT = 22000;
const MIN_GRAND_TOTAL = 222000;

/**
 * Address based on date
 */
const NEW_ADDRESS_DATE = new Date('2025-09-01');

/**
 * Lab Info
 */
const LAB_INFO = {
  name: 'Laboratorium PT TUV NORD Indonesia',
  address: 'Jl.Science Timur 1 Blok B3-F1, Kawasan industri jababeka V, Kel. Setajaya Kec. Cikarang Timur, Kabupaten Bekasi - Jawa Barat - 17530',
  phone: '+62 21 29574720',
  email: 'cslab.id@tuv-nord.com',
};

/**
 * Contact interface for PDF
 */
interface ContactData {
  title?: string;
  first_name: string;
  middle_name?: string | null;
  surname: string;
  phone?: string;
  fax?: string;
  mobile_phone?: string;
  email?: string;
}

/**
 * Address interface for PDF
 */
interface AddressData {
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

/**
 * Customer interface for PDF
 */
interface CustomerData {
  id: number;
  customer_name: string;
  top?: number | null;
}

/**
 * Service detail for PDF
 */
interface ServiceDetail {
  id: number;
  name: string;
  price: number;
  method?: { name: string };
  parameter_id?: number;
  use_pc?: boolean;
}

/**
 * Package detail for PDF
 */
interface PackageDetail {
  id: number;
  name: string;
  totalPrice: number | null;
  services?: ServiceDetail[];
}

/**
 * Sample item for PDF
 */
interface SampleItem {
  name: string;
  priority: string;
  quantity: number;
  services: Array<{
    service?: ServiceDetail;
    package?: PackageDetail;
    quantity: number;
    discount: number;
    price: number;
    isProduct?: boolean;
  }>;
}

/**
 * Product item for PDF (Additional Charge)
 */
interface ProductItem {
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

/**
 * Creator interface
 */
interface CreatorData {
  first_name: string;
  middle_name?: string | null;
  surname: string;
}

/**
 * Quotation PDF Data Interface
 */
export interface QuotationPdfData {
  id: number;
  code: string;
  quo_date: Date;
  created_at: Date;
  expired_date: Date;
  priority: string;
  lab?: string | null;
  percent_vat: number;
  percent_discount: number;
  remarks?: string | null;
  customer: CustomerData;
  contact: ContactData;
  address: AddressData;
  creator: CreatorData;
  samples: SampleItem[];
  products: ProductItem[];
}

/**
 * Quotation PDF Service
 * Generates PDF matching the TÜV NORD laboratory quotation template
 * Based on reference design from next.js-html-generator
 */
export class QuotationPdfService {
  /**
   * Format currency to Indonesian format with dot as thousand separator
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }

  /**
   * Format date to English format (January 18, 2026)
   */
  private formatDateEnglish(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Space out characters in a string (for quotation numbers)
   */
  private spaceOut(value: string): string {
    return value.split('').join(' ');
  }

  /**
   * Get contact full name
   */
  private getContactFullName(contact: ContactData): string {
    const parts = [contact.title, contact.first_name, contact.middle_name, contact.surname].filter(
      Boolean
    );
    return parts.join(' ');
  }

  /**
   * Get creator full name
   */
  private getCreatorFullName(creator: CreatorData): string {
    const parts = [creator.first_name, creator.middle_name, creator.surname].filter(Boolean);
    return parts.join(' ');
  }

  /**
   * Get priority charge rate
   */
  private getPriorityRate(priority: string): number {
    const normalizedPriority = priority?.toLowerCase().trim() || 'normal';
    return PRIORITY_RATES[normalizedPriority] || 0;
  }

  /**
   * Check if customer is special (simplified layout)
   */
  private isSpecialCustomer(customerId: number): boolean {
    return SPECIAL_CUSTOMER_IDS.includes(customerId);
  }

  /**
   * Generate barcode as base64 image
   */
  private async generateBarcode(code: string): Promise<string> {
    try {
      const pngBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: code,
        scale: 3,
        height: 12,
        includetext: false,
      });
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch {
      return '';
    }
  }

  /**
   * Calculate totals for quotation
   */
  private calculateTotals(
    data: QuotationPdfData,
    isSpecial: boolean
  ): {
    totalBasePrice: number;
    totalDiscount: number;
    totalPriorityCharge: number;
    subTotal: number;
    vat: number;
    grandTotal: number;
    productSubTotal: number;
  } {
    let totalBasePrice = 0;
    let totalDiscount = 0;
    let totalPriorityCharge = 0;
    let productSubTotal = 0;

    // Calculate products (Additional Charge)
    for (const product of data.products) {
      const basePrice = product.price * product.quantity;
      const discountAmount = (product.discount / 100) * basePrice;
      const total = basePrice - discountAmount;
      productSubTotal += total;
      totalBasePrice += basePrice;
      totalDiscount += discountAmount;
    }

    // Calculate samples
    for (const sample of data.samples) {
      const priorityRate = this.getPriorityRate(sample.priority);

      for (const item of sample.services) {
        let itemPrice = 0;

        if (item.package) {
          itemPrice = item.package.totalPrice || 0;
        } else if (item.service) {
          itemPrice = item.price || item.service.price;
        } else if (item.isProduct) {
          itemPrice = item.price;
        }

        const basePrice = itemPrice * item.quantity * sample.quantity;
        const discountAmount = (item.discount / 100) * basePrice;
        const afterDiscount = basePrice - discountAmount;

        // Priority charge
        let priorityCharge = 0;
        if (!isSpecial) {
          if (item.service) {
            const canApplyPc =
              item.service.parameter_id !== 0 || item.service.parameter_id === undefined;
            if (canApplyPc || item.service.use_pc) {
              priorityCharge = (priorityRate / 100) * afterDiscount;
            }
          } else if (item.package) {
            priorityCharge = (priorityRate / 100) * afterDiscount;
          }
        }

        totalBasePrice += basePrice;
        totalDiscount += discountAmount;
        totalPriorityCharge += priorityCharge;
      }
    }

    // Calculate sub total
    let subTotal = totalBasePrice - totalDiscount + totalPriorityCharge;
    let vat: number;
    let grandTotal: number;

    // Minimum order rule
    if (subTotal <= MIN_TOTAL) {
      subTotal = MIN_TOTAL;
      vat = MIN_VAT;
      grandTotal = MIN_GRAND_TOTAL;
    } else {
      vat = (data.percent_vat / 100) * subTotal;
      grandTotal = subTotal + vat;
    }

    return {
      totalBasePrice,
      totalDiscount,
      totalPriorityCharge,
      subTotal,
      vat: Math.round(vat),
      grandTotal: Math.round(grandTotal),
      productSubTotal,
    };
  }

  /**
   * Build CSS styles - EXACT match to reference design
   */
  private buildStyles(): string {
    return `
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          line-height: 1.25;
          color: #000;
        }

        /* Page container - A4 size */
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          background: white;
          position: relative;
          page-break-after: always;
          display: flex;
          flex-direction: column;
        }
        .page:last-child {
          page-break-after: avoid;
        }

        /* Header - matches reference exactly */
        .header {
          display: grid;
          grid-template-columns: 85mm 1fr;
          align-items: start;
          margin-bottom: 6mm;
        }
        .header-left {
          display: flex;
          flex-direction: column;
        }
        .header-logo {
          height: 26mm;
          width: auto;
        }
        .header-title {
          margin-top: 18mm;
          font-size: 26px;
          font-weight: bold;
          letter-spacing: 0.08em;
        }
        .header-right {
          padding-top: 2mm;
        }
        .header-line {
          height: 2px;
          background: #005b9a;
          width: 100%;
          margin-bottom: 10mm;
        }
        .header-info {
          display: grid;
          grid-template-columns: 34mm 1fr;
          gap: 2px 0;
          font-size: 11px;
          line-height: 1.25;
        }
        .header-info-label {
          font-weight: bold;
        }
        .barcode-section {
          display: grid;
          grid-template-columns: 34mm 1fr;
          margin-top: 3mm;
          align-items: start;
          font-size: 11px;
        }
        .barcode-img {
          max-width: 100%;
          height: auto;
        }
        .barcode-text {
          margin-top: 2px;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* Customer info - matches reference exactly */
        .customer-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 18mm;
          margin-bottom: 4mm;
          font-size: 11px;
          line-height: 1.25;
        }
        .customer-row {
          display: flex;
          margin-bottom: 1px;
        }
        .customer-label {
          font-weight: bold;
          width: 26mm;
          flex-shrink: 0;
        }
        .customer-label-right {
          font-weight: bold;
          width: 32mm;
          flex-shrink: 0;
        }

        /* Table styles - matches reference exactly */
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          vertical-align: top;
        }
        th {
          font-weight: bold;
          text-align: center;
          font-size: 11px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .align-top { vertical-align: top; }

        /* Remarks & Summary table - matches reference exactly */
        .remarks-summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 3mm;
        }
        .remarks-summary-table td {
          border: 1px solid #000;
          padding: 8px;
          vertical-align: top;
        }
        .remarks-cell {
          width: 65%;
        }
        .summary-cell {
          padding: 0 !important;
        }
        .summary-inner-table {
          width: 100%;
          border-collapse: collapse;
        }
        .summary-inner-table td {
          border: 1px solid #000;
          padding: 4px 8px;
        }
        .summary-label {
          font-weight: bold;
          text-align: right;
        }
        .summary-value {
          text-align: right;
          width: 140px;
        }

        /* Services grid - matches reference exactly */
        .services-grid {
          margin-bottom: 4mm;
          font-size: 10px;
        }
        .services-grid-table {
          width: 100%;
          border-collapse: collapse;
        }
        .services-grid-table td {
          border: 1px solid #000;
          padding: 8px;
          vertical-align: top;
        }
        .services-grid-table th {
          border: 1px solid #000;
          padding: 8px;
          font-weight: bold;
          text-align: center;
        }
        .service-label {
          width: 54mm;
        }

        /* Signature section */
        .signature-section {
          margin-top: 4mm;
          font-size: 10px;
          line-height: 1.6;
        }

        /* Footer - matches reference exactly */
        .footer {
          margin-top: auto;
          padding-top: 10mm;
        }
        .page-number {
          text-align: right;
          font-size: 10px;
          margin-bottom: 6mm;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 10px;
          line-height: 1.25;
        }
        .footer-left {
          max-width: 120mm;
        }
        .footer-left p {
          margin-bottom: 2px;
        }
        .footer-left .lab-name {
          font-weight: bold;
        }
        .footer-right {
          height: 20mm;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-end;
        }
        .footer-logos {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 2mm;
        }
        .ilac-logo {
          font-size: 8px;
          font-weight: bold;
          color: #006600;
          border: 2px solid #006600;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .kan-logo {
          text-align: center;
          font-size: 6px;
          line-height: 1.3;
        }
        .kan-check {
          font-size: 14px;
          font-weight: bold;
          color: #cc0000;
        }
        .tuv-group {
          font-weight: bold;
          color: #005b9a;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .footer-lines {
          display: flex;
          justify-content: space-between;
          margin-top: 6mm;
        }
        .footer-line {
          height: 2px;
          background: #005b9a;
          width: 78mm;
        }

        /* Terms page styles */
        .terms-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 4mm;
        }
        .terms-columns {
          display: grid;
          grid-template-columns: 38% 62%;
          gap: 5mm;
          font-size: 6px;
        }
        .terms-block {
          margin-bottom: 3mm;
        }
        .terms-block-title {
          font-weight: bold;
          font-size: 8px;
          margin-bottom: 1mm;
        }
        .terms-block-content {
          font-size: 6px;
          line-height: 1.4;
          text-align: justify;
        }
        .terms-block-content ul {
          margin-left: 3mm;
          padding-left: 0;
        }
        .terms-block-content li {
          margin-bottom: 1mm;
        }
        .standard-terms-title {
          font-weight: bold;
          font-size: 8px;
          margin-bottom: 2mm;
        }
        .standard-terms-content {
          font-size: 5px;
          line-height: 1.3;
          text-align: justify;
        }
        .standard-terms-content p {
          margin-bottom: 1.5mm;
        }

        /* Package services list */
        .package-services {
          font-size: 9px;
          color: #333;
          margin-top: 2px;
        }
        .package-services div {
          margin-left: 4px;
        }
      </style>
    `;
  }

  /**
   * Build header HTML - matches reference exactly
   */
  private buildHeader(data: QuotationPdfData, barcodeImg: string, showTitle: boolean = true): string {
    return `
      <div class="header">
        <div class="header-left">
          <img src="${TUV_NORD_LOGO}" alt="TÜV NORD" class="header-logo" />
          ${showTitle ? '<div class="header-title">QUOTATION</div>' : ''}
        </div>
        <div class="header-right">
          <div class="header-line"></div>
          <div class="header-info">
            <div class="header-info-label">Quotation Date</div>
            <div>${this.formatDateEnglish(data.quo_date)}</div>
            <div class="header-info-label">Expiration Date</div>
            <div>${this.formatDateEnglish(data.expired_date)}</div>
          </div>
          <div class="barcode-section">
            <div class="header-info-label">Quotation No.</div>
            <div>
              ${barcodeImg ? `<img src="${barcodeImg}" class="barcode-img" alt="${data.code}" style="max-width: 120px;"/>` : ''}
              <div class="barcode-text">${this.spaceOut(data.code)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build customer section - matches reference exactly
   */
  private buildCustomerSection(data: QuotationPdfData): string {
    const contactName = this.getContactFullName(data.contact);
    const addressParts = [
      data.address.address,
      data.address.city,
      data.address.state,
      data.address.postal_code,
      data.address.country
    ].filter(Boolean);

    return `
      <div class="customer-section">
        <div>
          <div class="customer-row">
            <span class="customer-label">To</span>
            <span>${contactName}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Company</span>
            <span>${data.customer.customer_name}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Address</span>
            <span>${addressParts.join(', ')}</span>
          </div>
        </div>
        <div>
          <div class="customer-row">
            <span class="customer-label-right">Phone</span>
            <span>${data.contact.phone || '-'}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label-right">Fax</span>
            <span>${data.contact.fax || ''}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label-right">Mobile Phone</span>
            <span>${data.contact.mobile_phone || ''}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label-right">Email Address</span>
            <span>${data.contact.email || ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build products table (Additional Charge) - matches reference exactly
   */
  private buildProductsTable(products: ProductItem[]): string {
    if (!products || products.length === 0) return '';

    let html = `
      <table style="margin-bottom: 4mm; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 44px;">No</th>
            <th>ADDITIONAL CHARGE</th>
            <th style="width: 140px;">PRICE</th>
            <th style="width: 70px;">QTY</th>
            <th style="width: 90px;">DISC%</th>
            <th style="width: 140px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>`;

    products.forEach((product, idx) => {
      const basePrice = product.price * product.quantity;
      const discountAmount = (product.discount / 100) * basePrice;
      const total = basePrice - discountAmount;

      html += `
          <tr>
            <td class="text-left align-top">${idx + 1}</td>
            <td class="align-top">${product.name}</td>
            <td class="text-right align-top">${this.formatCurrency(product.price)}</td>
            <td class="text-left align-top">${product.quantity}</td>
            <td class="text-left align-top">${product.discount}</td>
            <td class="text-right align-top">${this.formatCurrency(total)}</td>
          </tr>`;
    });

    html += `
        </tbody>
      </table>`;

    return html;
  }

  /**
   * Build samples/services table
   */
  private buildSamplesTable(data: QuotationPdfData, isSpecial: boolean): string {
    if (!data.samples || data.samples.length === 0) return '';

    const colDefs = isSpecial
      ? `<th style="width: 44px;">No</th>
         <th>SERVICES</th>
         <th style="width: 140px;">METHOD</th>
         <th style="width: 70px;">QTY</th>
         <th style="width: 140px;">TOTAL</th>`
      : `<th style="width: 44px;">No</th>
         <th>SERVICES</th>
         <th style="width: 140px;">METHOD</th>
         <th style="width: 100px;">PRICE</th>
         <th style="width: 50px;">QTY</th>
         <th style="width: 60px;">DISC%</th>
         <th style="width: 50px;">PC%</th>
         <th style="width: 120px;">TOTAL</th>`;

    let html = `
      <table style="margin-bottom: 3mm; font-size: 10px;">
        <thead>
          <tr>${colDefs}</tr>
        </thead>
        <tbody>`;

    let rowNum = 1;
    let grandSubTotal = 0;

    for (const sample of data.samples) {
      const priorityRate = this.getPriorityRate(sample.priority);
      const priorityLabel = sample.priority?.toLowerCase() || 'normal';
      let sampleSubTotal = 0;

      // Sample header row
      const colspan = isSpecial ? 4 : 7;
      html += `
          <tr style="background-color: #f5f5f5;">
            <td colspan="${colspan}" style="font-weight: bold;">${sample.name}</td>
            <td class="text-center"><span style="font-weight: normal; font-size: 9px;">Priority</span> ${priorityLabel}</td>
          </tr>`;

      for (const item of sample.services) {
        let itemPrice = 0;
        let itemName = '';
        let methodName = '';
        let packageServicesHtml = '';

        if (item.package) {
          itemPrice = item.package.totalPrice || 0;
          itemName = item.package.name;
          if (item.package.services && item.package.services.length > 0) {
            packageServicesHtml = '<div class="package-services">';
            for (const svc of item.package.services) {
              packageServicesHtml += `<div>- ${svc.name} | ${svc.method?.name || ''}</div>`;
            }
            packageServicesHtml += '</div>';
          }
        } else if (item.service) {
          itemPrice = item.price || item.service.price;
          itemName = item.service.name;
          methodName = item.service.method?.name || '';
        }

        const qty = item.quantity * sample.quantity;
        const basePrice = itemPrice * qty;
        const discountAmount = (item.discount / 100) * basePrice;
        const afterDiscount = basePrice - discountAmount;

        let pcRate = 0;
        if (!isSpecial) {
          if (item.service) {
            const canApplyPc =
              item.service.parameter_id !== 0 || item.service.parameter_id === undefined;
            if (canApplyPc || item.service.use_pc) {
              pcRate = priorityRate;
            }
          } else if (item.package) {
            pcRate = priorityRate;
          }
        }

        const priorityCharge = (pcRate / 100) * afterDiscount;
        const total = afterDiscount + priorityCharge;
        sampleSubTotal += total;

        if (isSpecial) {
          html += `
              <tr>
                <td class="text-left align-top">${rowNum}</td>
                <td class="align-top">${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td>
                <td class="align-top">${methodName}</td>
                <td class="text-left align-top">${qty}</td>
                <td class="text-right align-top">${this.formatCurrency(total)}</td>
              </tr>`;
        } else {
          html += `
              <tr>
                <td class="text-left align-top">${rowNum}</td>
                <td class="align-top">${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td>
                <td class="align-top">${methodName}</td>
                <td class="text-right align-top">${this.formatCurrency(itemPrice)}</td>
                <td class="text-left align-top">${qty}</td>
                <td class="text-left align-top">${item.discount}</td>
                <td class="text-left align-top">${pcRate}</td>
                <td class="text-right align-top">${this.formatCurrency(total)}</td>
              </tr>`;
        }
        rowNum++;
      }

      grandSubTotal += sampleSubTotal;
    }

    // Sub total row
    const subTotalColspan = isSpecial ? 4 : 7;
    html += `
          <tr style="background-color: #e8e8e8;">
            <td colspan="${subTotalColspan}" class="text-right" style="font-weight: bold;">Sub Total (IDR)</td>
            <td class="text-right" style="font-weight: bold;">${this.formatCurrency(grandSubTotal)}</td>
          </tr>
        </tbody>
      </table>`;

    return html;
  }

  /**
   * Build remarks and summary section - matches reference exactly
   */
  private buildRemarksSummary(
    data: QuotationPdfData,
    totals: ReturnType<typeof this.calculateTotals>,
    isSpecial: boolean
  ): string {
    const remarksContent = data.remarks ? data.remarks.replace(/\n/g, '<br>') : '';

    if (isSpecial) {
      return `
        <table class="remarks-summary-table">
          <tr>
            <td class="remarks-cell">
              <p style="font-weight: bold; margin-bottom: 2mm;">Remarks :</p>
              ${remarksContent}
            </td>
            <td class="summary-cell">
              <table class="summary-inner-table">
                <tr>
                  <td class="summary-label">Sub Total (IDR)</td>
                  <td class="summary-value">${this.formatCurrency(totals.subTotal)}</td>
                </tr>
                <tr>
                  <td class="summary-label">VAT (IDR)</td>
                  <td class="summary-value">${this.formatCurrency(totals.vat)}</td>
                </tr>
                <tr>
                  <td class="summary-label" style="font-weight: bold;">Grand Total (IDR)</td>
                  <td class="summary-value" style="font-weight: bold;">${this.formatCurrency(totals.grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    }

    return `
      <table class="remarks-summary-table">
        <tr>
          <td class="remarks-cell">
            <p style="font-weight: bold; margin-bottom: 2mm;">Remarks :</p>
            ${remarksContent}
          </td>
          <td class="summary-cell">
            <table class="summary-inner-table">
              <tr>
                <td class="summary-label">Total (IDR)</td>
                <td class="summary-value" style="font-weight: bold;">${this.formatCurrency(totals.totalBasePrice)}</td>
              </tr>
              <tr>
                <td class="summary-label">Discount (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.totalDiscount)}</td>
              </tr>
              <tr>
                <td class="summary-label">Priority Chrg (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.totalPriorityCharge)}</td>
              </tr>
              <tr>
                <td class="summary-label">Sub Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.subTotal)}</td>
              </tr>
              <tr>
                <td class="summary-label">VAT (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.vat)}</td>
              </tr>
              <tr>
                <td class="summary-label" style="font-weight: bold;">Grand Total (IDR)</td>
                <td class="summary-value" style="font-weight: bold;">${this.formatCurrency(totals.grandTotal)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Build services grid - matches reference exactly
   */
  private buildServicesGrid(): string {
    return `
      <div class="services-grid">
        <p style="margin-bottom: 3mm; text-align: justify;">With our experience and expertise in ITC (Inspection, Testing & Certification) business we also offer you one stop solution with special discount for another valuable services that we can provided:</p>
        <table class="services-grid-table">
          <thead>
            <tr>
              <th colspan="2">Services</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="service-label">System Certification<br/>(Additional Scheme)</td>
              <td>ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc.</td>
            </tr>
            <tr>
              <td class="service-label">Product Certification</td>
              <td>SNI, CE, GS, etc.</td>
            </tr>
            <tr>
              <td class="service-label">Inspection</td>
              <td>Rack Inspection, QA/QC Inspection, etc.</td>
            </tr>
            <tr>
              <td class="service-label">Training</td>
              <td>In House Training for All Management Systems Topic (Awareness, Internal Audit, Documentation, etc.)</td>
            </tr>
            <tr>
              <td class="service-label">Laboratory Services</td>
              <td>Consumer goods product testing, Product stability & shelf life, Environmental testing & monitoring, Industrial Hygine, Petroleum & chemical analysis, Calibration</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 3mm;">For complete information please feel free to contact our Sales Representative.</p>
      </div>`;
  }

  /**
   * Build signature section
   */
  private buildSignatureSection(data: QuotationPdfData): string {
    const creatorName = this.getCreatorFullName(data.creator);
    return `
      <div class="signature-section">
        <p>Created by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${creatorName}</strong></p>
        <p style="margin-top: 3mm;">Customer Approval:&nbsp;<span style="display: inline-block; width: 200px; border-bottom: 1px solid #000;">&nbsp;</span></p>
      </div>`;
  }

  /**
   * Build footer - matches reference exactly
   */
  private buildFooter(page: number, totalPages: number): string {
    return `
      <div class="footer">
        <div class="page-number">Page ${page} from ${totalPages}</div>
        <div class="footer-content">
          <div class="footer-left">
            <p class="lab-name">${LAB_INFO.name}</p>
            <p>${LAB_INFO.address}</p>
            <p>Email ${LAB_INFO.email}</p>
            <p>Phone ${LAB_INFO.phone}</p>
          </div>
          <div class="footer-right">
            <div class="footer-logos">
              <div class="ilac-logo">
                <span>ilac</span>
                <span>MRA</span>
              </div>
              <div class="kan-logo">
                <div class="kan-check">✓ KAN</div>
                <div>Komite Akreditasi Nasional</div>
                <div>LP-411-IDN</div>
                <div>LK-109-IDN</div>
              </div>
            </div>
            <div class="tuv-group">TÜVNORDGROUP</div>
          </div>
        </div>
        <div class="footer-lines">
          <div class="footer-line"></div>
          <div class="footer-line"></div>
        </div>
      </div>`;
  }

  /**
   * Build Terms & Conditions page
   */
  private buildTermsContent(customer: CustomerData, createdAt: Date): string {
    const paymentTerms =
      customer.top && customer.top > 0
        ? `Payment terms are Net ${customer.top} days.`
        : 'Payment must be made prior to sending the report.';

    const useNewAddress = new Date(createdAt) >= NEW_ADDRESS_DATE;
    const headOfficeAddress = useNewAddress
      ? 'Arkadia Green Park, Tower G, Lantai 17, Jl. TB Simatupang Kav. 88 Kelurahan Kebagusan, Kecamatan Pasar Minggu, Kota Administrasi Jakarta Selatan Provinsi DKI Jakarta, Kode Pos 12520'
      : 'Perkantoran Hijau Arkadia, Tower F 6th Floor, Suite 706. JL. TB. Simatupang Kav. 88 Pasar Minggu, Jakarta Selatan.';

    return `
      <div class="terms-title">Term & Condition:</div>
      <div class="terms-columns">
        <div>
          <div class="terms-block">
            <div class="terms-block-title">Shipping Product Samples</div>
            <div class="terms-block-content">
              To insure the integrity and security of samples sent to TÜV NORD Laboratory, we ask that our customers observe the following guidelines when shipping samples:
              <ul>
                <li>Secure each food sample in its own container. Seal each sample package completely so that no leakage will occur.</li>
                <li>Use packing materials that are strong enough to travel without damage or leakage.</li>
                <li>Samples needing refrigeration should be shipped appropriately. Please mark "refrigerate" on the outside of the package.</li>
                <li>Label each sample individually with the identification you would like included on the final report.</li>
              </ul>
            </div>
          </div>

          <div class="terms-block">
            <div class="terms-block-title">Sample Privacy</div>
            <div class="terms-block-content">
              At TÜV NORD Laboratory, customer privacy is of utmost importance to us because it is important to YOU. We have provided full confidentially to all of our partners.
            </div>
          </div>

          <div class="terms-block">
            <div class="terms-block-title">Quotation and to Submit Samples</div>
            <div class="terms-block-content">
              Visit our website https://www.tuv-nord.com/id/en to download a sample submission form and contact our marketing team to get quotation.<br><br>
              <strong>Head Office (Only for durable product):</strong><br>
              PT. TÜV NORD Indonesia<br>
              ${headOfficeAddress}<br><br>
              <strong>Laboratory:</strong><br>
              Jl. Science Timur 1, Block B3-F1 Kawasan Industri Jababeka V Cibatu Cikarang - Bekasi 17530<br>
              <em>(Exit Tol Cibatu, Km. 34)</em>
            </div>
          </div>
        </div>

        <div>
          <div class="standard-terms-title">Standard Term and Conditions</div>
          <div class="standard-terms-content">
            <p>All services provided by TÜV NORD Laboratory ("TÜV NORD Laboratory") are subject to the terms and conditions stated herein.</p>

            <p><strong>CONFIDENTIALITY</strong> Confidentiality is maintained in all interactions with Clients. Appropriate confidentiality agreements are signed willingly.</p>

            <p><strong>PAYMENT TERMS</strong> ${paymentTerms} Minimum order per invoice is Rp 200.000,-. Prices are subject to change without notice. The payment can be transferred to PT. TÜV NORD Indonesia, Bank HSBC World Trade Centre, A/C No. 050-074269-001.</p>

            <p><strong>BILLING</strong> All fees or bills are charged directly to the Client, unless a third party has been authorized via a signed statement indicating payment responsibility.</p>

            <p><strong>SAMPLE SUBMISSION</strong> Sample submission should be made on a TÜV NORD Laboratory "Sample Testing Application Form (STAF). Please contact our Laboratory staff to get complete information.</p>

            <p><strong>HAZARDOUS SUBSTANCES AND PATHOGEN</strong> Any sample containing or suspected to contain a pathogen or substance that is considered hazardous must be clearly identified as such on the container.</p>

            <p><strong>ANALYSIS</strong> TÜV NORD Laboratory strives to provide a seven (7) until ten (10) working day turnaround. Rush analysis is offered contingent upon pre-notification and approval. A rush fee of 100% surcharge will be added for analysis completed in fewer than (5) working days.</p>

            <p><strong>LITIGATION</strong> All costs associated with litigation or dispute shall be paid by the Client.</p>

            <p><strong>WARRANTY AND LIMITS OF LIABILITY</strong> TÜV NORD Laboratory warrants that all services will be performed in a timely manner by competent personnel. The liability of TÜV NORD Laboratory shall in no circumstances exceed ten (10) times the amount of the fee.</p>
          </div>
        </div>
      </div>`;
  }

  /**
   * Estimate total pages
   */
  private estimateTotalPages(data: QuotationPdfData): number {
    let totalRows = 0;
    for (const sample of data.samples) {
      totalRows += 1 + sample.services.length;
    }

    // Base pages: 1 content + 1 terms
    let contentPages = 1;
    if (totalRows > 15) contentPages = 2;
    if (totalRows > 30) contentPages = 3;

    return contentPages + 1; // +1 for terms page
  }

  /**
   * Build complete HTML template
   */
  private async buildHtmlTemplate(data: QuotationPdfData): Promise<string> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);
    const barcodeImg = await this.generateBarcode(data.code);
    const totals = this.calculateTotals(data, isSpecial);
    const totalPages = this.estimateTotalPages(data);

    const styles = this.buildStyles();

    // Page 1: Main quotation
    const page1 = `
      <div class="page">
        ${this.buildHeader(data, barcodeImg, true)}
        ${this.buildCustomerSection(data)}
        ${this.buildProductsTable(data.products)}
        ${this.buildSamplesTable(data, isSpecial)}
        ${this.buildRemarksSummary(data, totals, isSpecial)}
        ${this.buildServicesGrid()}
        ${this.buildSignatureSection(data)}
        ${this.buildFooter(1, totalPages)}
      </div>`;

    // Page 2 (Terms): Terms & Conditions
    const termsPage = `
      <div class="page">
        ${this.buildHeader(data, barcodeImg, false)}
        ${this.buildTermsContent(data.customer, data.created_at)}
        ${this.buildFooter(totalPages, totalPages)}
      </div>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quotation - ${data.code}</title>
        ${styles}
      </head>
      <body>
        ${page1}
        ${termsPage}
      </body>
      </html>`;
  }

  /**
   * Generate PDF from quotation data
   */
  async generatePdf(data: QuotationPdfData): Promise<Buffer> {
    const html = await this.buildHtmlTemplate(data);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        timeout: 60000,
      });

      await page.close();
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML preview (for debugging)
   */
  async generateHtmlPreview(data: QuotationPdfData): Promise<string> {
    return this.buildHtmlTemplate(data);
  }
}

// Export singleton instance
export const quotationPdfService = new QuotationPdfService();
