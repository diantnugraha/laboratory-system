import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';

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
 */
export class QuotationPdfService {
  /**
   * Format currency to Indonesian format with space as thousand separator
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(Math.round(amount))
      .replace(/\./g, ' ');
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
   * Format date short (18 January, 2026)
   */
  private formatDateShort(date: Date): string {
    const d = new Date(date);
    return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })}, ${d.getFullYear()}`;
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
   * Format address with line breaks
   */
  private formatAddressMultiline(address: AddressData): string {
    const lines: string[] = [];
    if (address.address) lines.push(address.address);
    if (address.city) lines.push(address.city);
    if (address.state && address.postal_code) {
      lines.push(`${address.state} ${address.postal_code}`);
    } else if (address.state) {
      lines.push(address.state);
    }
    if (address.country) lines.push(address.country);
    return lines.join('<br>');
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
        includetext: true,
        textxalign: 'center',
        textsize: 10,
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

        // Priority charge (skip for non-parameter services unless use_pc is true)
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
   * Build CSS styles with fixed header and footer
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
          font-size: 9pt;
          line-height: 1.3;
          color: #333;
        }

        /* Page container */
        .page {
          width: 210mm;
          height: 297mm;
          position: relative;
          page-break-after: always;
          overflow: hidden;
        }
        .page:last-child {
          page-break-after: avoid;
        }

        /* Fixed Header - 35mm height */
        .page-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 35mm;
          padding: 8mm 15mm 0 15mm;
          background: white;
        }

        /* Fixed Footer - 38mm height */
        .page-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 38mm;
          padding: 0 15mm 8mm 15mm;
          background: white;
        }

        /* Content area - between header and footer */
        .page-content {
          position: absolute;
          top: 35mm;
          bottom: 38mm;
          left: 15mm;
          right: 15mm;
          overflow: hidden;
        }

        /* Header components */
        .header-wrapper {
          display: flex;
          justify-content: space-between;
        }
        .logo-section {
          width: 35%;
        }
        .logo-box {
          background: #003399;
          padding: 8px 15px;
          display: inline-block;
        }
        .logo-text {
          font-size: 22pt;
          font-weight: bold;
          color: white;
          letter-spacing: -1px;
        }
        .logo-text span {
          color: #cc0000;
        }
        .info-section {
          width: 60%;
          text-align: right;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }
        .info-table td {
          padding: 1px 0;
          vertical-align: top;
        }
        .info-label {
          font-weight: bold;
          text-align: right;
          padding-right: 10px;
          width: 45%;
        }
        .info-value {
          text-align: left;
          width: 55%;
        }
        .barcode-container {
          margin-top: 2px;
          text-align: right;
        }
        .barcode-img {
          max-width: 160px;
          height: auto;
        }
        .hr-red {
          border: none;
          border-top: 2px solid #cc0000;
          margin: 2mm 0 0 0;
        }
        .page-number {
          position: absolute;
          top: 8mm;
          right: 15mm;
          font-size: 8pt;
        }

        /* Footer components */
        .footer-line {
          border-top: 2px solid #003366;
          margin-bottom: 2mm;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .footer-left {
          width: 48%;
          font-size: 7.5pt;
          line-height: 1.3;
        }
        .footer-left strong {
          color: #003366;
          display: block;
          margin-bottom: 1mm;
          font-size: 8pt;
        }
        .footer-right {
          width: 48%;
          text-align: right;
        }
        .footer-logos {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-bottom: 2mm;
        }
        .ilac-logo {
          font-size: 8pt;
          font-weight: bold;
          color: #006600;
        }
        .kan-logo {
          text-align: center;
          font-size: 6.5pt;
        }
        .kan-logo .kan-text {
          font-size: 12pt;
          font-weight: bold;
          color: #cc0000;
        }
        .tuv-group {
          font-weight: bold;
          color: #003366;
          font-size: 9pt;
        }

        /* Content styles */
        .page-title {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 4mm;
        }

        /* Customer section */
        .customer-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4mm;
          font-size: 8.5pt;
        }
        .customer-table td {
          padding: 1px 0;
          vertical-align: top;
        }
        .customer-left {
          width: 50%;
        }
        .customer-right {
          width: 50%;
        }
        .cust-label {
          font-weight: bold;
          width: 65px;
          vertical-align: top;
        }
        .cust-value {
          vertical-align: top;
        }

        /* Services table */
        .services-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2mm;
          font-size: 8pt;
        }
        .services-table th,
        .services-table td {
          border: 0.5pt solid #666;
          padding: 3px 4px;
          vertical-align: top;
        }
        .services-table th {
          background-color: #e8e8e8;
          font-weight: bold;
          text-align: center;
        }
        .sample-row td {
          background-color: #f5f5f5;
          font-weight: bold;
          border-top: 1pt solid #333;
        }
        .priority-label {
          font-weight: normal;
        }
        .subtotal-row td {
          font-weight: bold;
          background-color: #f0f0f0;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .col-no { width: 4%; }
        .col-services { width: 35%; }
        .col-method { width: 24%; }
        .col-price { width: 10%; }
        .col-qty { width: 5%; }
        .col-disc { width: 6%; }
        .col-pc { width: 5%; }
        .col-total { width: 11%; }

        /* Package services list */
        .package-services {
          font-size: 7pt;
          color: #555;
          margin-top: 1px;
          font-weight: normal;
        }
        .package-services div {
          margin-left: 3px;
        }

        /* Summary section */
        .summary-wrapper {
          display: flex;
          justify-content: space-between;
          margin-top: 3mm;
          font-size: 8pt;
        }
        .remarks-box {
          width: 52%;
        }
        .remarks-box strong {
          display: block;
          margin-bottom: 2px;
        }
        .summary-box {
          width: 45%;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 2px 4px;
          border: 0.5pt solid #666;
        }
        .summary-label {
          text-align: right;
          font-weight: bold;
          width: 55%;
        }
        .summary-value {
          text-align: right;
          width: 45%;
        }
        .grand-total-row td {
          font-weight: bold;
          font-size: 9pt;
        }

        /* Additional services */
        .additional-section {
          margin-top: 3mm;
          font-size: 7.5pt;
        }
        .additional-section p {
          margin-bottom: 2mm;
        }
        .additional-table {
          width: 100%;
          border-collapse: collapse;
        }
        .additional-table td {
          padding: 3px 5px;
          border: 0.5pt solid #666;
          vertical-align: top;
        }
        .additional-table .label-col {
          width: 22%;
        }
        .additional-table .value-col {
          width: 78%;
        }

        /* Signature section */
        .signature-section {
          margin-top: 5mm;
          font-size: 8.5pt;
        }
        .created-by {
          margin-bottom: 3mm;
        }
        .approval-line {
          display: inline-block;
          width: 300px;
          border-bottom: 1px solid #333;
        }

        /* Terms page styles */
        .terms-title {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 4mm;
        }
        .terms-columns {
          display: flex;
          gap: 6mm;
          font-size: 7pt;
        }
        .terms-left {
          width: 35%;
        }
        .terms-right {
          width: 65%;
        }
        .terms-block {
          margin-bottom: 3mm;
        }
        .terms-block-title {
          font-weight: bold;
          font-size: 8pt;
          margin-bottom: 1mm;
        }
        .terms-block-content {
          font-size: 6.5pt;
          line-height: 1.35;
          text-align: justify;
        }
        .terms-block-content ul {
          margin-left: 2mm;
          padding-left: 0;
        }
        .terms-block-content li {
          margin-bottom: 0.5mm;
        }
        .standard-terms {
          font-size: 8pt;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .standard-terms-content {
          font-size: 5.5pt;
          line-height: 1.25;
          text-align: justify;
        }
        .standard-terms-content p {
          margin-bottom: 1.5mm;
          text-indent: 0;
        }
        .standard-terms-content strong {
          font-weight: bold;
        }
      </style>
    `;
  }

  /**
   * Build fixed header HTML
   */
  private buildFixedHeader(
    data: QuotationPdfData,
    barcodeImg: string,
    pageNum: number,
    totalPages: number,
    isTermsPage: boolean = false
  ): string {
    if (isTermsPage) {
      return `
        <div class="page-header">
          <div class="page-number">Page ${pageNum} from ${totalPages}</div>
          <div class="header-wrapper">
            <div class="logo-section">
              <div class="logo-box">
                <span class="logo-text">TÜV<span>NORD</span></span>
              </div>
            </div>
            <div class="info-section">
              <table class="info-table">
                <tr>
                  <td class="info-label">Date</td>
                  <td class="info-value">${this.formatDateShort(data.quo_date)}</td>
                </tr>
                <tr>
                  <td class="info-label">Quotation No.</td>
                  <td class="info-value"></td>
                </tr>
              </table>
              <div class="barcode-container">
                ${barcodeImg ? `<img src="${barcodeImg}" class="barcode-img" alt="${data.code}"/>` : `<strong>${data.code}</strong>`}
              </div>
            </div>
          </div>
          <hr class="hr-red">
        </div>
      `;
    }

    return `
      <div class="page-header">
        <div class="page-number">Page ${pageNum} from ${totalPages}</div>
        <div class="header-wrapper">
          <div class="logo-section">
            <div class="logo-box">
              <span class="logo-text">TÜV<span>NORD</span></span>
            </div>
          </div>
          <div class="info-section">
            <table class="info-table">
              <tr>
                <td class="info-label">Quotation Date</td>
                <td class="info-value">${this.formatDateEnglish(data.quo_date)}</td>
              </tr>
              <tr>
                <td class="info-label">Expiration Date</td>
                <td class="info-value">${this.formatDateEnglish(data.expired_date)}</td>
              </tr>
              <tr>
                <td class="info-label">Quotation No.</td>
                <td class="info-value"></td>
              </tr>
            </table>
            <div class="barcode-container">
              ${barcodeImg ? `<img src="${barcodeImg}" class="barcode-img" alt="${data.code}"/>` : `<strong>${data.code}</strong>`}
            </div>
          </div>
        </div>
        <hr class="hr-red">
      </div>
    `;
  }

  /**
   * Build fixed footer HTML
   */
  private buildFixedFooter(): string {
    return `
      <div class="page-footer">
        <div class="footer-line"></div>
        <div class="footer-content">
          <div class="footer-left">
            <strong>Laboratorium PT TUV NORD Indonesia</strong>
            Jl.Science Timur 1 Blok B3-F1<br>
            Kawasan industri jababeka V<br>
            Kel. Setajaya Kec. Cikarang Timur<br>
            Kabupaten Bekasi - Jawa Barat - 17530<br><br>
            Email cslab.id@tuv-nord.com<br>
            Phone +62 21 29574720
          </div>
          <div class="footer-right">
            <div class="footer-logos">
              <div class="ilac-logo">ilac-MRA</div>
              <div class="kan-logo">
                <div class="kan-text">KAN</div>
                <div>Komite Akreditasi Nasional</div>
                <div>LP-411-IDN</div>
                <div>LK-109-IDN</div>
              </div>
            </div>
            <div class="tuv-group">TÜVNORDGROUP</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build customer info section
   */
  private buildCustomerSection(data: QuotationPdfData): string {
    return `
      <div class="page-title">QUOTATION</div>
      <table class="customer-table">
        <tr>
          <td class="customer-left">
            <table>
              <tr>
                <td class="cust-label">To</td>
                <td class="cust-value">${this.getContactFullName(data.contact)} ${data.contact.phone ? '' : '-'}</td>
              </tr>
              <tr>
                <td class="cust-label">Company</td>
                <td class="cust-value">${data.customer.customer_name}</td>
              </tr>
              <tr>
                <td class="cust-label">Address</td>
                <td class="cust-value">${this.formatAddressMultiline(data.address)}</td>
              </tr>
            </table>
          </td>
          <td class="customer-right">
            <table>
              <tr>
                <td class="cust-label">Phone</td>
                <td class="cust-value">${data.contact.phone || '-'}</td>
              </tr>
              <tr>
                <td class="cust-label">Fax</td>
                <td class="cust-value">${data.contact.fax || ''}</td>
              </tr>
              <tr>
                <td class="cust-label">Mobile Phone</td>
                <td class="cust-value">${data.contact.mobile_phone || ''}</td>
              </tr>
              <tr>
                <td class="cust-label">Email Address</td>
                <td class="cust-value">${data.contact.email || ''}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Build services table header
   */
  private buildServicesTableHeader(isSpecial: boolean): string {
    if (isSpecial) {
      return `
        <tr>
          <th class="col-no">No</th>
          <th style="width: 45%;">SERVICES</th>
          <th style="width: 30%;">METHOD</th>
          <th style="width: 8%;">QTY</th>
          <th style="width: 12%;">TOTAL</th>
        </tr>
      `;
    }
    return `
      <tr>
        <th class="col-no">No</th>
        <th class="col-services">SERVICES</th>
        <th class="col-method">METHOD</th>
        <th class="col-price">PRICE</th>
        <th class="col-qty">QTY</th>
        <th class="col-disc">DISC%</th>
        <th class="col-pc">PC%</th>
        <th class="col-total">TOTAL</th>
      </tr>
    `;
  }

  /**
   * Build services table rows for a sample
   */
  private buildSampleServicesRows(
    sample: SampleItem,
    isSpecial: boolean,
    startRowNum: number
  ): { html: string; subTotal: number; rowCount: number } {
    const priorityRate = this.getPriorityRate(sample.priority);
    let subTotal = 0;
    let rowNum = startRowNum;
    let html = '';

    // Sample header row
    const priorityLabel = sample.priority?.toLowerCase() || 'normal';
    html += `
      <tr class="sample-row">
        <td colspan="${isSpecial ? 4 : 7}">${sample.name}</td>
        <td class="text-center"><span class="priority-label">Priority</span> ${priorityLabel}</td>
      </tr>
    `;

    for (const item of sample.services) {
      let itemPrice = 0;
      let itemName = '';
      let methodName = '';
      let packageServicesHtml = '';

      if (item.package) {
        itemPrice = item.package.totalPrice || 0;
        itemName = item.package.name;
        // List services in package
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

      // Calculate priority charge
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
      subTotal += total;

      if (isSpecial) {
        html += `
          <tr>
            <td class="text-center">${rowNum}</td>
            <td>${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td>
            <td>${methodName}</td>
            <td class="text-center">${qty}</td>
            <td class="text-right">${this.formatCurrency(total)}</td>
          </tr>
        `;
      } else {
        html += `
          <tr>
            <td class="text-center">${rowNum}</td>
            <td>${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td>
            <td>${methodName}</td>
            <td class="text-right">${this.formatCurrency(itemPrice)}</td>
            <td class="text-center">${qty}</td>
            <td class="text-center">${item.discount}</td>
            <td class="text-center">${pcRate}</td>
            <td class="text-right">${this.formatCurrency(total)}</td>
          </tr>
        `;
      }
      rowNum++;
    }

    return { html, subTotal, rowCount: rowNum - startRowNum };
  }

  /**
   * Build sub total row
   */
  private buildSubTotalRow(subTotal: number, isSpecial: boolean): string {
    if (isSpecial) {
      return `
        <tr class="subtotal-row">
          <td colspan="4" class="text-right">Sub Total (IDR)</td>
          <td class="text-right">${this.formatCurrency(subTotal)}</td>
        </tr>
      `;
    }
    return `
      <tr class="subtotal-row">
        <td colspan="7" class="text-right">Sub Total (IDR)</td>
        <td class="text-right">${this.formatCurrency(subTotal)}</td>
      </tr>
    `;
  }

  /**
   * Build remarks and summary section
   */
  private buildRemarksSummary(
    data: QuotationPdfData,
    totals: ReturnType<typeof this.calculateTotals>,
    isSpecial: boolean
  ): string {
    const remarksHtml = data.remarks
      ? `<div class="remarks-box">
          <strong>Remarks :</strong>
          ${data.remarks.replace(/\n/g, '<br>')}
        </div>`
      : '<div class="remarks-box"></div>';

    if (isSpecial) {
      return `
        <div class="summary-wrapper">
          ${remarksHtml}
          <div class="summary-box">
            <table class="summary-table">
              <tr>
                <td class="summary-label">Sub Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.subTotal)}</td>
              </tr>
              <tr>
                <td class="summary-label">VAT (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.vat)}</td>
              </tr>
              <tr class="grand-total-row">
                <td class="summary-label">Grand Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(totals.grandTotal)}</td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }

    return `
      <div class="summary-wrapper">
        ${remarksHtml}
        <div class="summary-box">
          <table class="summary-table">
            <tr>
              <td class="summary-label">Total (IDR)</td>
              <td class="summary-value">${this.formatCurrency(totals.totalBasePrice)}</td>
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
            <tr class="grand-total-row">
              <td class="summary-label">Grand Total (IDR)</td>
              <td class="summary-value">${this.formatCurrency(totals.grandTotal)}</td>
            </tr>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Build additional services section
   */
  private buildAdditionalServices(): string {
    return `
      <div class="additional-section">
        <p>With our experience and expertise in ITC (Inspection, Testing & Certification) business we also offer you one stop solution with special discount for another valuable services that we can provided:</p>
        <table class="additional-table">
          <tr>
            <td colspan="2" class="text-center" style="font-weight: bold;">Services</td>
          </tr>
          <tr>
            <td class="label-col">System Certification(Additional Scheme)</td>
            <td class="value-col">ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc.</td>
          </tr>
          <tr>
            <td class="label-col">Product Certification</td>
            <td class="value-col">SNI, CE, GS, etc.</td>
          </tr>
          <tr>
            <td class="label-col">Inspection</td>
            <td class="value-col">Rack Inspection, QA/QC Inspection, etc.</td>
          </tr>
          <tr>
            <td class="label-col">Training</td>
            <td class="value-col">In House Training for All Management Systems Topic (Awareness, Internal Audit, Documentation, etc.)</td>
          </tr>
          <tr>
            <td class="label-col">Laboratory Services</td>
            <td class="value-col">Consumer goods product testing, Product stability & shelf life, Environmental testing & monitoring, Industrial Hygine, Petroleum & chemical analysis, Calibration</td>
          </tr>
        </table>
        <p style="margin-top: 2mm;">For complete information please feel free to contact our Sales Representative.</p>
      </div>
    `;
  }

  /**
   * Build signature section
   */
  private buildSignatureSection(data: QuotationPdfData): string {
    return `
      <div class="signature-section">
        <div class="created-by">
          Created by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${this.getCreatorFullName(data.creator)}</strong>
        </div>
        <div>
          Customer Approval: <span class="approval-line"></span>
        </div>
      </div>
    `;
  }

  /**
   * Build Terms & Conditions content
   */
  private buildTermsContent(): string {
    return `
      <div class="terms-title">Term & Condition:</div>
      <div class="terms-columns">
        <div class="terms-left">
          <div class="terms-block">
            <div class="terms-block-title">Shipping Product Samples</div>
            <div class="terms-block-content">
              To insure the integrity and security of samples sent to TÜV NORD Laboratory, we ask that our customers observe the following guidelines when shipping samples :
              <ul>
                <li>Secure each food sample in its own container. Seal each sample package completely so that no leakage will occur. This is very important to prevent cross- contamination.</li>
                <li>Use packing materials that are strong enough to travel without damage or leakage.</li>
                <li>Samples needing refrigeration should be shipped appropriately. Please mark "refrigerate" on the outside of the package to ensure continuous refrigeration.</li>
                <li>Label each sample individually with the identification you would like included on the final report.</li>
              </ul>
            </div>
          </div>

          <div class="terms-block">
            <div class="terms-block-title">Sample Privacy</div>
            <div class="terms-block-content">
              At TÜV NORD Laboratory, customer privacy is of utmost importance to us because it is important to YOU. We have provided full confidentially to all of our partners. Not only do we have the right systems in place, but we alo have the right people.
            </div>
          </div>

          <div class="terms-block">
            <div class="terms-block-title">Quotation and to Submit Samples</div>
            <div class="terms-block-content">
              Visit our website https://www.tuv-nord.com/id/en to download a sample submission form and contact our marketing team to get quotation. Submit the completed form along with your samples to<br><br>
              <strong>Head Office (Only for durable product):</strong><br>
              PT. TÜV NORD Indonesia<br>
              Arkadia Green Park, Tower G, Lantai 17, Jl. TB Simatupang Kav. 88 Kelurahan Kebagusan, Kecamatan Pasar Minggu, Kota Administrasi Jakarta Selatan Provinsi DKI Jakarta, Kode Pos 12520<br><br>
              <strong>Laboratory:</strong><br>
              Jl. Science Timur 1, Block B3-F1 Kawasan Industri Jababeka V Cibatu Cikarang - Bekasi 17530<br>
              <em>(Exit Tol Cibatu, Km. 34)</em>
            </div>
          </div>
        </div>

        <div class="terms-right">
          <div class="standard-terms">Standard Term and Conditions</div>
          <div class="standard-terms-content">
            <p>All services provided by TÜV NORD Laboratory ("TÜV NORD Laboratory") are subject to the terms and conditions stated herein. As our client, you ("Client") understand and agree that placement of any order for our services constitutes acceptance of the terms and conditions stated herein. To the exten that any Client order contains anyi terms or conditions that vary from the terms and conditions stated herein, all such additional or varying terms and conditions shallbe of no force or effect, and shall not be part of the Client- TÜV NORD Laboratory relationship or contract, even if TÜV NORD Laboratory performs the requested service.</p>

            <p><strong>CONFIDENTIALITY</strong> confidentiality is maintained in all interractions with Clients. Appropriate confidentiality agreements are signed willingly. If information is subpoenaed and released through the operation of any judicial, regulatory, or similar process, the Client is notified. In TÜV NORD Laboratory name or data in any manner which might cause harm to TÜV NORD Laboratory reputation and/or business. Under no circumtances in the name of TÜV NORD Laboratory to be published, either alone or in association with that of any other party, without prior written approval.</p>

            <p><strong>PAYMENT TERMS</strong> Payment must be made prior to sending the report. Minimum order per invoice is Rp 200.000,- .Prices are subject to change without notice. The payment can be transferred to PT. TÜV NORD Indonesia, Bank HSBC World Trade Centre, A/C No. 050-074269- 001.</p>

            <p><strong>BILLING</strong> All fees or bills are charged direcly to the Client, unless a third party has been authorized via a signed statement indicating payment responsibility. It is assumed that the paperwork submitted with a sample describes the testing desired. If changes are made after the originally requested testing is initiated or completed. The Client must accept payment responsibility. Please notify TÜV NORD Laboratory immediately if changes in testing are necessary.</p>

            <p><strong>SAMPLE SUBMISSION</strong> sample submission should be made on a TÜV NORD Laboratory "Sample Testing Application Form (STAF). Please contact our Laboratory staff to get complete information.</p>

            <p><strong>HAZARDOUS SUBSTANCES AND PATHOGEN</strong> any sample containing or suspected to contain a pathogen or substance that is considered hazardous must be clearly indentifief as such on the container and communicated to TÜV NORD Laboratory before shipping. TÜV NORD Laboratory reserves the right to refuse any sample which may pose a risk to employees.</p>

            <p><strong>ANALYSIS</strong> TÜV NORD Laboratory strives to provide a seven (7) until ten (10) working day turnaround. Rush analysis is offered contingent upon pre-notification and approval of TÜV NORD Laboratory. Howeever, a rush fee of 100% surcharge of the list fee will be added to the invoice for each analysis completed in fewer than (5) working days at the request of the Client. TÜV NORD Laboratory reserves the right to outsource an analysis entirely at TÜV NORD Laboratory expense and without prior notification to Client, unless Client requests otherwise. Reported result relate only to the items tested and test reports shall not be reproduced except in full.</p>

            <p><strong>LITIGATION</strong> All costs associated with litigation or dispute, incluing complieance for all document, for oral or written testimony or preparation of same, or for any others purpose related to work provided by TÜV NORD Laboratory in connection with analyses/reports performed/completed for the Client, shall be paid by the Client. Such costs include, but are not limited to, hourly charges, travel accomodations, mileage, counsel, and all other expenses associated with said litigation or dispute.</p>

            <p><strong>WARRANTY AND LIMITS OF LIABILITY</strong> TÜV NORD Laboratory warrants that all services will be performed in a timely manner by competent personel. Any services performed by TÜV NORD Laboratory under proper technical direction by Client. Which are determined by Client to have been performed improperly in light of the above warranty . and which after investigation by the TÜV NORD Laboratory are acknowledged in writing by TÜV NORD Laboratory President Director to have been performed improperly. Shall be corrected by TÜV NORD Laboratory without charge to Client, provided that Client provides TÜV NORD Laboratory with a written request for such correction within two (2) weeks after Client knew or should reasonably have known of problem. The liability of the TÜV NORD Laboratory in respect of any claims for loss, damage or expense of whatoever nature and howsoever arising in respect of any breach of contract and/or any failure to exercise due sklikk and care by the TÜV NORD Laboratory shall in no circumtances exceed a total aggregate sum equal to ten (10) times the amount of the fee or commission payable in respect of the specific services required under the particular contract with the TÜV NORD Laboratory which gives rise to such claims for indirect or consequential loss including loss of profit and/or loss of future bussniness and/or loss of productions and/or cancellation of contracts entered into by the Client. The TÜV NORD Laboratory shall not in any event be liable for any loss or damage caused by delay in performanc or non-performance of any of its services where the same is occasioned by any cause whatsoever that is beyond the TÜV NORD Laboratory control including but not limited to war, civil disturbance, requisitioning, governmental or parliamentary restriction, prohibitions or enactment of any kind, import or export regulations, strike or trade dipute (whetever incolving its own employees or those of any other person), difficulties in obtaining workmen or materials, breakdown of machinery, fire or accident. Should any such event occur the TÜV NORD Laboratory may cancel or suspend any contract for the provision of services without incurring any liability whatsoever. The TÜV NORD Laboratory will not be liable to the Client for any loss or damage whatsoever sustained by the Client as a result of any failure by the TÜV NORD Laboratory to comply with any time estimate given by the TÜV NORD Laboratory relating to the provision of its services. TÜV NORD Laboratory accepted no legal responsibility for the purpose for which the Client uses the test result or report, or for any consequence of such use. TÜV NORD Laboratory provide no guidance regarding and accept no legal responsibility for the purpose for which the Client uses the test result or reports, and shall have no legal responsibility forany consequence of such use. Client agrees ti indemnify and defend TÜV NORD Laboratory all claims, damages, liabilities, and expenses relating ti Client's use of TÜV NORD Laboratory's services or Client's Marketing, distribution, sale, or other dissemination of Client's products or services. The allocations of liability in this WARRANTY AND LIMITS OF LIABILITY section represent the agreed and bargained-for understanding between the Client and TÜV NORD Laboratory, TÜV NORD Laboratory fees for the services provided hereunder reflect such allocations.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Estimate total pages based on content
   */
  private estimateTotalPages(data: QuotationPdfData): number {
    let contentPages = 1;

    let totalRows = 0;
    for (const sample of data.samples) {
      totalRows += 1;
      totalRows += sample.services.length;
    }

    if (totalRows > 12) contentPages = 2;
    if (totalRows > 24) contentPages = 3;

    return contentPages + 1; // +1 for terms page
  }

  /**
   * Build complete HTML template with fixed header/footer
   */
  private async buildHtmlTemplate(data: QuotationPdfData): Promise<string> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);

    // Generate barcode
    const barcodeImg = await this.generateBarcode(data.code);

    // Calculate totals
    const totals = this.calculateTotals(data, isSpecial);

    // Estimate total pages
    const totalPages = this.estimateTotalPages(data);

    // Build styles
    const styles = this.buildStyles();

    // Build services table content
    let servicesHtml = `<table class="services-table"><thead>${this.buildServicesTableHeader(isSpecial)}</thead><tbody>`;

    let rowNum = 1;
    let grandSubTotal = 0;

    for (const sample of data.samples) {
      const result = this.buildSampleServicesRows(sample, isSpecial, rowNum);
      servicesHtml += result.html;
      grandSubTotal += result.subTotal;
      rowNum += result.rowCount;
    }

    servicesHtml += this.buildSubTotalRow(grandSubTotal, isSpecial);
    servicesHtml += '</tbody></table>';

    // Build main content page
    const mainPage = `
      <div class="page">
        ${this.buildFixedHeader(data, barcodeImg, 1, totalPages)}
        <div class="page-content">
          ${this.buildCustomerSection(data)}
          ${servicesHtml}
          ${this.buildRemarksSummary(data, totals, isSpecial)}
          ${this.buildAdditionalServices()}
          ${this.buildSignatureSection(data)}
        </div>
        ${this.buildFixedFooter()}
      </div>
    `;

    // Build terms page
    const termsPage = `
      <div class="page">
        ${this.buildFixedHeader(data, barcodeImg, totalPages, totalPages, true)}
        <div class="page-content">
          ${this.buildTermsContent()}
        </div>
        ${this.buildFixedFooter()}
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quotation - ${data.code}</title>
        ${styles}
      </head>
      <body>
        ${mainPage}
        ${termsPage}
      </body>
      </html>
    `;
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
