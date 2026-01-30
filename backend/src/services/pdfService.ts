import path from 'path';
import fs from 'fs';
import { browserPool } from './browserPool.js';

/**
 * TÜV NORD Logo as base64
 */
const TUV_NORD_LOGO = 'data:image/png;base64,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';

/**
 * Lab Info constants
 */
const LAB_INFO = {
  name: 'Laboratorium PT TUV NORD Indonesia',
  address: 'Jl.Science Timur 1 Blok B3-F1, Kawasan industri jababeka V, Kel. Setajaya Kec. Cikarang Timur, Kabupaten Bekasi - Jawa Barat - 17530',
  phone: '+62 21 29574720',
  email: 'cslab.id@tuv-nord.com',
};

/**
 * PDF Document Types
 */
export type PDFDocumentType =
  | 'sppc'           // Surat Persetujuan Pengujian & Kalibrasi
  | 'quotation'      // Quotation/Penawaran
  | 'request_form'   // Form Permintaan
  | 'coa_request'    // COA Request
  | 'coa_release'    // COA Release
  | 'invoice'        // Invoice
  | 'order_detail';  // Order Detail for Review

/**
 * PDF Generation Options
 */
export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

/**
 * SPPC Data Interface
 */
export interface SPPCData {
  orderCode: string;
  orderDate: string;
  customerName: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
  samples: Array<{
    code: string;
    name: string;
    matrix: string;
    parameters: Array<{
      name: string;
      method: string;
      price: number;
    }>;
  }>;
  subTotal: number;
  discountPercent: number;
  discountValue: number;
  vatPercent: number;
  vatValue: number;
  total: number;
  remarks?: string;
}

/**
 * Quotation Data Interface
 */
export interface QuotationData {
  quotationCode: string;
  quotationDate: string;
  validUntil: string;
  customerName: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
  services: Array<{
    no: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subTotal: number;
  discountPercent: number;
  discountValue: number;
  vatPercent: number;
  vatValue: number;
  total: number;
  termsAndConditions?: string[];
  remarks?: string;
}

/**
 * Invoice Data Interface
 */
export interface InvoiceData {
  invoiceCode: string;
  invoiceDate: string;
  dueDate: string;
  fakturNo?: string;
  customerName: string;
  contactName: string;
  address: string;
  npwp?: string;
  orders: Array<{
    code: string;
    description: string;
    total: number;
  }>;
  subTotal: number;
  discountValue: number;
  vatValue: number;
  total: number;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
}

/**
 * COA Data Interface
 */
export interface COAData {
  coaCode: string;
  orderCode: string;
  sampleCode: string;
  sampleName: string;
  matrix: string;
  receivedDate: string;
  analysisDate: string;
  customerName: string;
  contactName: string;
  parameters: Array<{
    name: string;
    method: string;
    result: string;
    unit: string;
    specification?: string;
    status?: 'pass' | 'fail';
  }>;
  conclusion?: string;
  remarks?: string;
  approvedBy?: string;
  approvedDate?: string;
}

/**
 * Request Form Data Interface
 */
export interface RequestFormData {
  requestCode: string;
  requestDate: string;
  orderCode?: string;
  customerName: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
  samples: Array<{
    code: string;
    name: string;
    matrix: string;
    quantity: number;
    condition?: string;
    parameters: Array<{
      name: string;
      method: string;
    }>;
  }>;
  priority?: string;
  expectedDueDate?: string;
  specialInstructions?: string;
  remarks?: string;
}

/**
 * COA Request Data Interface
 */
export interface COARequestData {
  requestCode: string;
  requestDate: string;
  orderCode: string;
  customerName: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
  samples: Array<{
    code: string;
    name: string;
    matrix: string;
    status: string;
    completionDate?: string;
  }>;
  requestedFormat?: string;
  deliveryMethod?: string;
  remarks?: string;
}

/**
 * COA Release Data Interface
 */
export interface COAReleaseData {
  releaseCode: string;
  releaseDate: string;
  orderCode: string;
  customerName: string;
  contactName: string;
  address: string;
  samples: Array<{
    code: string;
    name: string;
    coaCode: string;
    status: string;
    releasedDate: string;
  }>;
  deliveryMethod: string;
  receivedBy?: string;
  receivedDate?: string;
  remarks?: string;
  releasedBy?: string;
}

/**
 * Order Detail Data Interface (for Review)
 */
export interface OrderDetailData {
  orderCode: string;
  orderDate: string;
  orderStatus: string;
  priority: string | null;
  customerName: string;
  customerCode: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  samples: Array<{
    code: string;
    name: string;
    priority: string;
    dueDate: string | null;
    services: Array<{
      parameter: string;
      method: string;
      price: number;
    }>;
  }>;
  subTotal: number;
  discountPercent: number;
  discountValue: number;
  vatPercent: number;
  vatValue: number;
  total: number;
  remarks: string | null;
  quotationCode: string | null;
  preOrderCode: string | null;
}

/**
 * PDF Service Class
 * Handles PDF document generation using Puppeteer
 * Design based on TÜV NORD reference template
 */
export class PDFService {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates', 'pdf');
    this.ensureTemplatesDir();
  }

  /**
   * Ensure templates directory exists
   */
  private ensureTemplatesDir(): void {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * Format number to Indonesian decimal format (space as thousand separator)
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date to English format (January 19, 2026)
   */
  private formatDateEnglish(date: string): string {
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
   * Get shared CSS styles matching TÜV NORD reference design
   */
  private getSharedStyles(): string {
    return `
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
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm;
        background: white;
        position: relative;
      }
      .tuv-blue { color: #005b9a; }
      .bg-tuv-blue { background-color: #005b9a; }

      /* Header styles */
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6mm;
      }
      .logo-section {
        display: flex;
        flex-direction: column;
      }
      .logo-img {
        height: 26mm;
        width: auto;
      }
      .document-title {
        font-size: 26px;
        font-weight: bold;
        letter-spacing: 0.08em;
        margin-top: 18mm;
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
        font-size: 11px;
        line-height: 1.25;
      }
      .header-info-row {
        display: flex;
        margin-bottom: 2px;
      }
      .header-info-label {
        font-weight: bold;
        width: 34mm;
      }
      .document-no {
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        margin-top: 2px;
      }

      /* Customer info styles */
      .customer-section {
        display: flex;
        gap: 18mm;
        margin-bottom: 4mm;
        font-size: 11px;
        line-height: 1.25;
      }
      .customer-left, .customer-right {
        flex: 1;
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

      /* Table styles */
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

      /* Summary table */
      .summary-section {
        display: flex;
        gap: 5mm;
        margin-top: 4mm;
      }
      .remarks-box {
        flex: 1;
        border: 1px solid #000;
        padding: 8px;
        min-height: 25mm;
      }
      .remarks-box strong {
        display: block;
        margin-bottom: 2mm;
      }
      .summary-table {
        width: auto;
        min-width: 200px;
      }
      .summary-table td {
        padding: 4px 8px;
        font-size: 10px;
      }
      .summary-label {
        text-align: right;
        font-weight: bold;
      }
      .summary-value {
        text-align: right;
        min-width: 100px;
      }
      .grand-total td {
        font-weight: bold;
        font-size: 11px;
      }

      /* Services grid */
      .services-grid {
        margin-top: 5mm;
        margin-bottom: 5mm;
        font-size: 10px;
      }
      .services-grid p {
        margin-bottom: 4mm;
      }
      .services-grid table td {
        padding: 8px;
        vertical-align: top;
      }
      .services-grid .label-col {
        width: 54mm;
      }

      /* Signature section */
      .signature-section {
        margin-top: 10mm;
        font-size: 11px;
      }
      .signature-row {
        display: flex;
        align-items: center;
        margin-bottom: 3mm;
      }
      .signature-label {
        width: 40mm;
      }
      .signature-line {
        flex: 1;
        max-width: 200px;
        border-bottom: 1px solid #000;
        height: 20px;
      }

      /* Footer styles */
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
      .footer-left strong {
        display: block;
        margin-bottom: 0.5mm;
      }
      .footer-right {
        text-align: right;
      }
      .footer-logos {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 2mm;
      }
      .ilac-logo {
        font-size: 7px;
        font-weight: bold;
        color: #006600;
        border: 1px solid #006600;
        padding: 2px 4px;
        border-radius: 50%;
        text-align: center;
        line-height: 1.2;
      }
      .kan-logo {
        text-align: center;
        font-size: 6px;
        line-height: 1.2;
      }
      .kan-logo .kan-check {
        font-size: 11px;
        font-weight: bold;
        color: #cc0000;
      }
      .tuv-group {
        font-weight: bold;
        color: #005b9a;
        font-size: 9px;
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
    `;
  }

  /**
   * Build header HTML
   */
  private buildHeader(title: string, code: string, date: string, expiryDate?: string): string {
    return `
      <div class="header-container">
        <div class="logo-section">
          <img src="${TUV_NORD_LOGO}" alt="TÜV NORD" class="logo-img" />
          <div class="document-title">${title}</div>
        </div>
        <div class="header-right">
          <div class="header-line"></div>
          <div class="header-info">
            <div class="header-info-row">
              <span class="header-info-label">${title === 'QUOTATION' ? 'Quotation Date' : 'Date'}</span>
              <span>${this.formatDateEnglish(date)}</span>
            </div>
            ${expiryDate ? `
            <div class="header-info-row">
              <span class="header-info-label">Expiration Date</span>
              <span>${this.formatDateEnglish(expiryDate)}</span>
            </div>
            ` : ''}
            <div class="header-info-row" style="margin-top: 3mm;">
              <span class="header-info-label">${title === 'QUOTATION' ? 'Quotation No.' : 'No.'}</span>
              <span></span>
            </div>
            <div class="document-no">${this.spaceOut(code)}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build footer HTML
   */
  private buildFooter(page: number, totalPages: number): string {
    return `
      <div class="footer">
        <div class="page-number">Page ${page} from ${totalPages}</div>
        <div class="footer-content">
          <div class="footer-left">
            <strong>${LAB_INFO.name}</strong>
            <div>${LAB_INFO.address}</div>
            <div>Email ${LAB_INFO.email}</div>
            <div>Phone ${LAB_INFO.phone}</div>
          </div>
          <div class="footer-right">
            <div class="footer-logos">
              <div class="ilac-logo">ilac<br/>MRA</div>
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
      </div>
    `;
  }

  /**
   * Generate PDF from HTML content using browser pool
   * This reuses browser instances for better performance (~80-90% faster)
   */
  async generatePDF(html: string, options: PDFGenerationOptions = {}): Promise<Buffer> {
    const { browser, release } = await browserPool.acquire();

    try {
      const page = await browser.newPage();

      try {
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfOptions: any = {
          format: options.format || 'A4',
          landscape: options.landscape || false,
          printBackground: true,
          margin: options.margin || {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
          },
        };

        const pdfBuffer = await page.pdf(pdfOptions);
        return Buffer.from(pdfBuffer);
      } finally {
        await page.close();
      }
    } finally {
      release();
    }
  }

  /**
   * Generate SPPC Document
   */
  async generateSPPC(data: SPPCData): Promise<Buffer> {
    const html = this.buildSPPCTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build SPPC HTML Template - TÜV NORD style
   */
  private buildSPPCTemplate(data: SPPCData): string {
    const samplesHtml = data.samples.map((sample, idx) => `
      <tr style="background-color: #f5f5f5;">
        <td colspan="4" style="font-weight: bold;">${idx + 1}. ${sample.code} - ${sample.name} (${sample.matrix})</td>
      </tr>
      ${sample.parameters.map((param, pIdx) => `
        <tr>
          <td class="text-center">${idx + 1}.${pIdx + 1}</td>
          <td>${param.name}</td>
          <td>${param.method}</td>
          <td class="text-right">${this.formatCurrency(param.price)}</td>
        </tr>
      `).join('')}
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('SPPC', data.orderCode, data.orderDate)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">To</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Company</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Address</span>
                <span>${data.address}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">Phone</span>
                <span>${data.phone || '-'}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Email Address</span>
                <span>${data.email || ''}</span>
              </div>
            </div>
          </div>

          <table style="margin-bottom: 4mm; font-size: 11px;">
            <thead>
              <tr>
                <th style="width: 44px;">No</th>
                <th>Parameter</th>
                <th style="width: 140px;">Method</th>
                <th style="width: 140px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${samplesHtml}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="remarks-box">
              <strong>Remarks :</strong>
              ${data.remarks ? `<div>${data.remarks}</div>` : ''}
            </div>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.subTotal)}</td>
              </tr>
              ${data.discountValue > 0 ? `
              <tr>
                <td class="summary-label">Discount (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.discountValue)}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="summary-label">VAT (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.vatValue)}</td>
              </tr>
              <tr class="grand-total">
                <td class="summary-label">Grand Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.total)}</td>
              </tr>
            </table>
          </div>

          <div class="signature-section">
            <div class="signature-row">
              <span class="signature-label">Customer Approval:</span>
              <div class="signature-line"></div>
            </div>
            <div class="signature-row">
              <span class="signature-label">Laboratory:</span>
              <div class="signature-line"></div>
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate Quotation Document
   */
  async generateQuotation(data: QuotationData): Promise<Buffer> {
    const html = this.buildQuotationTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build Quotation HTML Template - TÜV NORD style
   */
  private buildQuotationTemplate(data: QuotationData): string {
    const servicesHtml = data.services.map(service => `
      <tr>
        <td class="text-left">${service.no}</td>
        <td>${service.description}</td>
        <td class="text-right">${this.formatCurrency(service.unitPrice)}</td>
        <td class="text-left">${service.quantity}</td>
        <td class="text-left">${data.discountPercent || 0}</td>
        <td class="text-right">${this.formatCurrency(service.total)}</td>
      </tr>
    `).join('');

    const totalBeforeDiscount = data.services.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('QUOTATION', data.quotationCode, data.quotationDate, data.validUntil)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">To</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Company</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Address</span>
                <span>${data.address}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">Phone</span>
                <span>${data.phone || '-'}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Email Address</span>
                <span>${data.email || ''}</span>
              </div>
            </div>
          </div>

          <table style="margin-bottom: 3mm; font-size: 11px;">
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
            <tbody>
              ${servicesHtml}
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 3mm;">
            <tr>
              <td style="border: 1px solid #000; padding: 8px; width: 65%; vertical-align: top;">
                <strong>Remarks :</strong>
                ${data.remarks ? `<div style="margin-top: 2mm;">${data.remarks}</div>` : ''}
              </td>
              <td style="border: 1px solid #000; padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">Total (IDR)</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right; width: 140px;">${this.formatCurrency(totalBeforeDiscount)}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">Discount (IDR)</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: right;">${this.formatCurrency(data.discountValue)}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">Priority Chrg (IDR)</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: right;">0</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">Sub Total (IDR)</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: right;">${this.formatCurrency(data.subTotal)}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">VAT (IDR)</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: right;">${this.formatCurrency(data.vatValue)}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">Grand Total (IDR)</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; text-align: right;">${this.formatCurrency(data.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="services-grid">
            <p>With our experience and expertise in ITC (Inspection, Testing & Certification) business we also offer you one stop solution with special discount for another valuable services that we can provided:</p>
            <table>
              <thead>
                <tr>
                  <th colspan="2">Services</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-col">System Certification<br/>(Additional Scheme)</td>
                  <td>ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc.</td>
                </tr>
                <tr>
                  <td>Product Certification</td>
                  <td>SNI, CE, GS, etc.</td>
                </tr>
                <tr>
                  <td>Inspection</td>
                  <td>Rack Inspection, QA/QC Inspection, etc.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="signature-section">
            <div class="signature-row">
              <span class="signature-label">Created by</span>
              <span style="font-weight: bold;">_________________</span>
            </div>
            <div class="signature-row" style="margin-top: 4mm;">
              <span class="signature-label">Customer Approval:</span>
              <div class="signature-line"></div>
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate Invoice Document
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    const html = this.buildInvoiceTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build Invoice HTML Template - TÜV NORD style
   */
  private buildInvoiceTemplate(data: InvoiceData): string {
    const ordersHtml = data.orders.map((order, idx) => `
      <tr>
        <td class="text-left">${idx + 1}</td>
        <td>${order.code}</td>
        <td>${order.description}</td>
        <td class="text-right">${this.formatCurrency(order.total)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('INVOICE', data.invoiceCode, data.invoiceDate)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">Invoice No.</span>
                <span>${data.invoiceCode}</span>
              </div>
              ${data.fakturNo ? `
              <div class="customer-row">
                <span class="customer-label">Faktur No.</span>
                <span>${data.fakturNo}</span>
              </div>
              ` : ''}
              <div class="customer-row">
                <span class="customer-label">Date</span>
                <span>${this.formatDateEnglish(data.invoiceDate)}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Due Date</span>
                <span>${this.formatDateEnglish(data.dueDate)}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">To</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Company</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Address</span>
                <span>${data.address}</span>
              </div>
              ${data.npwp ? `
              <div class="customer-row">
                <span class="customer-label-right">NPWP</span>
                <span>${data.npwp}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <table style="margin-bottom: 4mm; font-size: 11px;">
            <thead>
              <tr>
                <th style="width: 44px;">No</th>
                <th style="width: 120px;">Order Code</th>
                <th>Description</th>
                <th style="width: 150px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${ordersHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <table class="summary-table" style="width: auto;">
              <tr>
                <td class="summary-label">Sub Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.subTotal)}</td>
              </tr>
              ${data.discountValue > 0 ? `
              <tr>
                <td class="summary-label">Discount (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.discountValue)}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="summary-label">VAT (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.vatValue)}</td>
              </tr>
              <tr class="grand-total">
                <td class="summary-label">Grand Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.total)}</td>
              </tr>
            </table>
          </div>

          ${data.bankName ? `
          <div style="margin-top: 8mm; padding: 10px; border: 1px solid #000;">
            <strong style="display: block; margin-bottom: 3mm;">Payment Information:</strong>
            <div class="customer-row">
              <span style="font-weight: bold; width: 100px; display: inline-block;">Bank</span>
              <span>: ${data.bankName}</span>
            </div>
            <div class="customer-row">
              <span style="font-weight: bold; width: 100px; display: inline-block;">Account Name</span>
              <span>: ${data.accountName}</span>
            </div>
            <div class="customer-row">
              <span style="font-weight: bold; width: 100px; display: inline-block;">Account No.</span>
              <span>: ${data.accountNumber}</span>
            </div>
          </div>
          ` : ''}

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate COA Document
   */
  async generateCOA(data: COAData): Promise<Buffer> {
    const html = this.buildCOATemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build COA HTML Template - TÜV NORD style
   */
  private buildCOATemplate(data: COAData): string {
    const hasSpecification = data.parameters.some(p => p.specification);
    const hasStatus = data.parameters.some(p => p.status);

    const parametersHtml = data.parameters.map((param, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${param.name}</td>
        <td>${param.method}</td>
        <td class="text-center">${param.result}</td>
        <td class="text-center">${param.unit}</td>
        ${hasSpecification ? `<td class="text-center">${param.specification || '-'}</td>` : ''}
        ${hasStatus ? `
          <td class="text-center" style="color: ${param.status === 'pass' ? '#006600' : '#cc0000'}; font-weight: bold;">
            ${param.status === 'pass' ? 'PASS' : 'FAIL'}
          </td>
        ` : ''}
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('CERTIFICATE OF ANALYSIS', data.coaCode, data.analysisDate)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">Order No.</span>
                <span>${data.orderCode}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Sample Code</span>
                <span>${data.sampleCode}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Sample Name</span>
                <span>${data.sampleName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Matrix</span>
                <span>${data.matrix}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">Customer</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Contact</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Received Date</span>
                <span>${this.formatDateEnglish(data.receivedDate)}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Analysis Date</span>
                <span>${this.formatDateEnglish(data.analysisDate)}</span>
              </div>
            </div>
          </div>

          <table style="margin-bottom: 4mm; font-size: 10px;">
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Parameter</th>
                <th style="width: 120px;">Method</th>
                <th style="width: 80px;">Result</th>
                <th style="width: 60px;">Unit</th>
                ${hasSpecification ? '<th style="width: 80px;">Spec</th>' : ''}
                ${hasStatus ? '<th style="width: 60px;">Status</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${parametersHtml}
            </tbody>
          </table>

          ${data.conclusion ? `
          <div style="margin-top: 5mm; padding: 10px; border-left: 4px solid #005b9a; background-color: #f5f9fc;">
            <strong>Conclusion:</strong>
            <p style="margin-top: 2mm;">${data.conclusion}</p>
          </div>
          ` : ''}

          ${data.remarks ? `
          <div style="margin-top: 4mm;">
            <strong>Remarks:</strong>
            <p style="margin-top: 2mm;">${data.remarks}</p>
          </div>
          ` : ''}

          <div class="signature-section" style="display: flex; justify-content: flex-end; margin-top: 15mm;">
            <div style="text-align: center; width: 200px;">
              <p>Approved by</p>
              <div style="border-bottom: 1px solid #000; height: 50px; margin: 5px 0;"></div>
              <p style="font-weight: bold;">${data.approvedBy || '_________________'}</p>
              ${data.approvedDate ? `<p style="font-size: 9px;">${this.formatDateEnglish(data.approvedDate)}</p>` : ''}
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate Request Form Document
   */
  async generateRequestForm(data: RequestFormData): Promise<Buffer> {
    const html = this.buildRequestFormTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build Request Form HTML Template - TÜV NORD style
   */
  private buildRequestFormTemplate(data: RequestFormData): string {
    const samplesHtml = data.samples.map((sample, idx) => `
      <tr style="background-color: #f5f5f5;">
        <td colspan="4" style="font-weight: bold;">${idx + 1}. ${sample.code} - ${sample.name}</td>
      </tr>
      <tr>
        <td class="text-center" style="width: 44px;">-</td>
        <td>Matrix: ${sample.matrix}</td>
        <td>Quantity: ${sample.quantity}</td>
        <td>Condition: ${sample.condition || 'Normal'}</td>
      </tr>
      ${sample.parameters.map((param, pIdx) => `
        <tr>
          <td class="text-center">${idx + 1}.${pIdx + 1}</td>
          <td>${param.name}</td>
          <td colspan="2">${param.method}</td>
        </tr>
      `).join('')}
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('REQUEST FORM', data.requestCode, data.requestDate)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">To</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Company</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Address</span>
                <span>${data.address}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">Phone</span>
                <span>${data.phone || '-'}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Email Address</span>
                <span>${data.email || ''}</span>
              </div>
              ${data.orderCode ? `
              <div class="customer-row">
                <span class="customer-label-right">Order No.</span>
                <span>${data.orderCode}</span>
              </div>
              ` : ''}
            </div>
          </div>

          ${data.priority || data.expectedDueDate ? `
          <div style="margin-bottom: 4mm; padding: 8px; background-color: #f5f9fc; border-left: 4px solid #005b9a;">
            ${data.priority ? `<div><strong>Priority:</strong> ${data.priority}</div>` : ''}
            ${data.expectedDueDate ? `<div><strong>Expected Due Date:</strong> ${this.formatDateEnglish(data.expectedDueDate)}</div>` : ''}
          </div>
          ` : ''}

          <table style="margin-bottom: 4mm; font-size: 11px;">
            <thead>
              <tr>
                <th style="width: 44px;">No</th>
                <th>Parameter / Detail</th>
                <th style="width: 140px;">Method / Info</th>
                <th style="width: 140px;">Additional</th>
              </tr>
            </thead>
            <tbody>
              ${samplesHtml}
            </tbody>
          </table>

          ${data.specialInstructions ? `
          <div style="margin-top: 4mm; padding: 10px; border: 1px solid #000;">
            <strong>Special Instructions:</strong>
            <p style="margin-top: 2mm;">${data.specialInstructions}</p>
          </div>
          ` : ''}

          <div class="summary-section">
            <div class="remarks-box">
              <strong>Remarks :</strong>
              ${data.remarks ? `<div>${data.remarks}</div>` : ''}
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-row">
              <span class="signature-label">Customer Approval:</span>
              <div class="signature-line"></div>
            </div>
            <div class="signature-row">
              <span class="signature-label">Laboratory:</span>
              <div class="signature-line"></div>
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate COA Request Document
   */
  async generateCOARequest(data: COARequestData): Promise<Buffer> {
    const html = this.buildCOARequestTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build COA Request HTML Template - TÜV NORD style
   */
  private buildCOARequestTemplate(data: COARequestData): string {
    const samplesHtml = data.samples.map((sample, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${sample.code}</td>
        <td>${sample.name}</td>
        <td>${sample.matrix}</td>
        <td class="text-center">${sample.status}</td>
        <td class="text-center">${sample.completionDate ? this.formatDateEnglish(sample.completionDate) : '-'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('COA REQUEST', data.requestCode, data.requestDate)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">Order No.</span>
                <span>${data.orderCode}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Request No.</span>
                <span>${data.requestCode}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Date</span>
                <span>${this.formatDateEnglish(data.requestDate)}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">Customer</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Contact</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Address</span>
                <span>${data.address}</span>
              </div>
            </div>
          </div>

          <p style="margin-bottom: 4mm; font-size: 11px;">
            We hereby request the Certificate of Analysis (COA) for the following samples:
          </p>

          <table style="margin-bottom: 4mm; font-size: 10px;">
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th style="width: 100px;">Sample Code</th>
                <th>Sample Name</th>
                <th style="width: 80px;">Matrix</th>
                <th style="width: 80px;">Status</th>
                <th style="width: 100px;">Completion</th>
              </tr>
            </thead>
            <tbody>
              ${samplesHtml}
            </tbody>
          </table>

          <div style="margin-top: 5mm; padding: 10px; border: 1px solid #000;">
            <div class="customer-row" style="margin-bottom: 3mm;">
              <span style="font-weight: bold; width: 120px; display: inline-block;">Requested Format</span>
              <span>: ${data.requestedFormat || 'Original (Hard Copy)'}</span>
            </div>
            <div class="customer-row">
              <span style="font-weight: bold; width: 120px; display: inline-block;">Delivery Method</span>
              <span>: ${data.deliveryMethod || 'Pick Up'}</span>
            </div>
          </div>

          ${data.remarks ? `
          <div class="remarks-box" style="margin-top: 4mm;">
            <strong>Remarks :</strong>
            <div>${data.remarks}</div>
          </div>
          ` : ''}

          <div class="signature-section" style="display: flex; justify-content: space-between; margin-top: 10mm;">
            <div style="text-align: center; width: 45%;">
              <p>Requested by</p>
              <div style="border-bottom: 1px solid #000; height: 50px; margin: 5px 0;"></div>
              <p>${data.contactName}</p>
              <p style="font-size: 9px;">${this.formatDateEnglish(data.requestDate)}</p>
            </div>
            <div style="text-align: center; width: 45%;">
              <p>Approved by</p>
              <div style="border-bottom: 1px solid #000; height: 50px; margin: 5px 0;"></div>
              <p>_________________</p>
              <p style="font-size: 9px;">Date: _________________</p>
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate COA Release Document
   */
  async generateCOARelease(data: COAReleaseData): Promise<Buffer> {
    const html = this.buildCOAReleaseTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build COA Release HTML Template - TÜV NORD style
   */
  private buildCOAReleaseTemplate(data: COAReleaseData): string {
    const samplesHtml = data.samples.map((sample, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${sample.code}</td>
        <td>${sample.name}</td>
        <td>${sample.coaCode}</td>
        <td class="text-center" style="color: ${sample.status === 'Released' ? '#006600' : '#cc0000'}; font-weight: bold;">
          ${sample.status}
        </td>
        <td class="text-center">${this.formatDateEnglish(sample.releasedDate)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('COA RELEASE', data.releaseCode, data.releaseDate)}

          <div class="customer-section">
            <div class="customer-left">
              <div class="customer-row">
                <span class="customer-label">Order No.</span>
                <span>${data.orderCode}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Release No.</span>
                <span>${data.releaseCode}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label">Date</span>
                <span>${this.formatDateEnglish(data.releaseDate)}</span>
              </div>
            </div>
            <div class="customer-right">
              <div class="customer-row">
                <span class="customer-label-right">Customer</span>
                <span>${data.customerName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Contact</span>
                <span>${data.contactName}</span>
              </div>
              <div class="customer-row">
                <span class="customer-label-right">Address</span>
                <span>${data.address}</span>
              </div>
            </div>
          </div>

          <p style="margin-bottom: 4mm; font-size: 11px;">
            The following Certificates of Analysis (COA) have been released:
          </p>

          <table style="margin-bottom: 4mm; font-size: 10px;">
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th style="width: 100px;">Sample Code</th>
                <th>Sample Name</th>
                <th style="width: 100px;">COA Code</th>
                <th style="width: 80px;">Status</th>
                <th style="width: 100px;">Released Date</th>
              </tr>
            </thead>
            <tbody>
              ${samplesHtml}
            </tbody>
          </table>

          <div style="margin-top: 5mm; padding: 10px; border: 1px solid #000;">
            <div class="customer-row" style="margin-bottom: 3mm;">
              <span style="font-weight: bold; width: 120px; display: inline-block;">Delivery Method</span>
              <span>: ${data.deliveryMethod}</span>
            </div>
            ${data.receivedBy ? `
            <div class="customer-row" style="margin-bottom: 3mm;">
              <span style="font-weight: bold; width: 120px; display: inline-block;">Received By</span>
              <span>: ${data.receivedBy}</span>
            </div>
            ` : ''}
            ${data.receivedDate ? `
            <div class="customer-row">
              <span style="font-weight: bold; width: 120px; display: inline-block;">Received Date</span>
              <span>: ${this.formatDateEnglish(data.receivedDate)}</span>
            </div>
            ` : ''}
          </div>

          ${data.remarks ? `
          <div class="remarks-box" style="margin-top: 4mm;">
            <strong>Remarks :</strong>
            <div>${data.remarks}</div>
          </div>
          ` : ''}

          <div class="signature-section" style="display: flex; justify-content: space-between; margin-top: 10mm;">
            <div style="text-align: center; width: 45%;">
              <p>Released by</p>
              <div style="border-bottom: 1px solid #000; height: 50px; margin: 5px 0;"></div>
              <p style="font-weight: bold;">${data.releasedBy || '_________________'}</p>
              <p style="font-size: 9px;">${this.formatDateEnglish(data.releaseDate)}</p>
            </div>
            <div style="text-align: center; width: 45%;">
              <p>Received by</p>
              <div style="border-bottom: 1px solid #000; height: 50px; margin: 5px 0;"></div>
              <p>${data.receivedBy || '_________________'}</p>
              <p style="font-size: 9px;">Date: ${data.receivedDate ? this.formatDateEnglish(data.receivedDate) : '_________________'}</p>
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate Order Detail Document (for Review)
   */
  async generateOrderDetail(data: OrderDetailData): Promise<Buffer> {
    const html = this.buildOrderDetailTemplate(data);
    return this.generatePDF(html);
  }

  /**
   * Build Order Detail HTML Template - TÜV NORD style
   */
  private buildOrderDetailTemplate(data: OrderDetailData): string {
    const samplesHtml = data.samples.map((sample, idx) => `
      <tr style="background-color: #f5f5f5;">
        <td colspan="4" style="font-weight: bold;">${idx + 1}. ${sample.code} - ${sample.name}</td>
      </tr>
      <tr>
        <td class="text-center" style="width: 44px;">-</td>
        <td>Priority: ${sample.priority || 'Normal'}</td>
        <td colspan="2">Due Date: ${sample.dueDate ? this.formatDateEnglish(sample.dueDate) : '-'}</td>
      </tr>
      ${sample.services.map((service, sIdx) => `
        <tr>
          <td class="text-center">${idx + 1}.${sIdx + 1}</td>
          <td>${service.parameter}</td>
          <td>${service.method}</td>
          <td class="text-right">${this.formatCurrency(service.price)}</td>
        </tr>
      `).join('')}
    `).join('');

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'created': return '#2563eb';
        case 'to be verified': return '#ea580c';
        case 'reviewed': return '#16a34a';
        case 'need to revise': return '#dc2626';
        case 'under process': return '#7c3aed';
        case 'complete': return '#059669';
        case 'cancelled': return '#dc2626';
        default: return '#6b7280';
      }
    };

    const getPriorityColor = (priority: string | null) => {
      switch (priority?.toLowerCase()) {
        case 'urgent': return '#ea580c';
        case 'very urgent': return '#dc2626';
        case 'special request': return '#7c3aed';
        default: return '#16a34a';
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${this.getSharedStyles()}
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-box {
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px;
          }
          .info-box-title {
            font-weight: bold;
            font-size: 11px;
            color: #005b9a;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row {
            display: flex;
            margin-bottom: 4px;
            font-size: 10px;
          }
          .info-label {
            font-weight: bold;
            width: 80px;
            flex-shrink: 0;
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHeader('ORDER DETAIL', data.orderCode, data.orderDate)}

          <!-- Status and Priority Badges -->
          <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
            <span class="status-badge" style="background-color: ${getStatusColor(data.orderStatus)}20; color: ${getStatusColor(data.orderStatus)}; border: 1px solid ${getStatusColor(data.orderStatus)};">
              ${data.orderStatus}
            </span>
            ${data.priority ? `
            <span class="status-badge" style="background-color: ${getPriorityColor(data.priority)}20; color: ${getPriorityColor(data.priority)}; border: 1px solid ${getPriorityColor(data.priority)};">
              ${data.priority}
            </span>
            ` : ''}
          </div>

          <!-- Info Grid -->
          <div class="info-grid">
            <!-- Customer Info -->
            <div class="info-box">
              <div class="info-box-title">Customer Information</div>
              <div class="info-row">
                <span class="info-label">Customer</span>
                <span>${data.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Code</span>
                <span>${data.customerCode}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact</span>
                <span>${data.contactName}</span>
              </div>
              ${data.contactEmail ? `
              <div class="info-row">
                <span class="info-label">Email</span>
                <span>${data.contactEmail}</span>
              </div>
              ` : ''}
              ${data.contactPhone ? `
              <div class="info-row">
                <span class="info-label">Phone</span>
                <span>${data.contactPhone}</span>
              </div>
              ` : ''}
            </div>

            <!-- Order Info -->
            <div class="info-box">
              <div class="info-box-title">Order Information</div>
              <div class="info-row">
                <span class="info-label">Order Code</span>
                <span>${data.orderCode}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Date</span>
                <span>${this.formatDateEnglish(data.orderDate)}</span>
              </div>
              ${data.quotationCode ? `
              <div class="info-row">
                <span class="info-label">Quotation</span>
                <span>${data.quotationCode}</span>
              </div>
              ` : ''}
              ${data.preOrderCode ? `
              <div class="info-row">
                <span class="info-label">Pre-Order</span>
                <span>${data.preOrderCode}</span>
              </div>
              ` : ''}
            </div>
          </div>

          ${data.address ? `
          <div style="margin-bottom: 15px; padding: 8px 12px; background-color: #f9fafb; border-radius: 4px; font-size: 10px;">
            <strong>Address:</strong> ${data.address}
          </div>
          ` : ''}

          <!-- Samples Table -->
          <table style="margin-bottom: 4mm; font-size: 10px;">
            <thead>
              <tr>
                <th style="width: 44px;">No</th>
                <th>Parameter</th>
                <th style="width: 140px;">Method</th>
                <th style="width: 120px;">Price (IDR)</th>
              </tr>
            </thead>
            <tbody>
              ${samplesHtml}
            </tbody>
          </table>

          <!-- Summary Section -->
          <div class="summary-section">
            <div class="remarks-box">
              <strong>Remarks :</strong>
              ${data.remarks ? `<div>${data.remarks}</div>` : '<div style="color: #9ca3af;">No remarks</div>'}
            </div>
            <table class="summary-table">
              <tr>
                <td class="summary-label">Sub Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.subTotal)}</td>
              </tr>
              ${data.discountValue > 0 ? `
              <tr>
                <td class="summary-label">Discount ${data.discountPercent > 0 ? `(${data.discountPercent}%)` : ''}</td>
                <td class="summary-value">-${this.formatCurrency(data.discountValue)}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="summary-label">VAT (${data.vatPercent}%)</td>
                <td class="summary-value">${this.formatCurrency(data.vatValue)}</td>
              </tr>
              <tr class="grand-total">
                <td class="summary-label">Grand Total (IDR)</td>
                <td class="summary-value">${this.formatCurrency(data.total)}</td>
              </tr>
            </table>
          </div>

          <!-- Review Section -->
          <div style="margin-top: 15mm; padding: 12px; border: 2px solid #005b9a; border-radius: 4px; background-color: #f0f9ff;">
            <div style="font-weight: bold; color: #005b9a; margin-bottom: 8px; font-size: 11px;">FOR REVIEWER USE</div>
            <div style="display: flex; gap: 20px;">
              <div style="flex: 1;">
                <div style="margin-bottom: 3mm;">
                  <span style="font-weight: bold;">Decision:</span>
                  <span style="margin-left: 10px;">☐ Approved</span>
                  <span style="margin-left: 10px;">☐ Need Revision</span>
                </div>
                <div>
                  <span style="font-weight: bold;">Notes:</span>
                  <div style="border-bottom: 1px solid #000; height: 30px; margin-top: 2mm;"></div>
                </div>
              </div>
              <div style="width: 120px; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 2mm;">Reviewer</div>
                <div style="border-bottom: 1px solid #000; height: 40px;"></div>
                <div style="font-size: 9px; margin-top: 2mm;">Date: ____________</div>
              </div>
            </div>
          </div>

          ${this.buildFooter(1, 1)}
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const pdfService = new PDFService();
