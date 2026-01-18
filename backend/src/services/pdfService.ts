import path from 'path';
import fs from 'fs';
import { browserPool } from './browserPool';

/**
 * PDF Document Types
 */
export type PDFDocumentType =
  | 'sppc'           // Surat Persetujuan Pengujian & Kalibrasi
  | 'quotation'      // Quotation/Penawaran
  | 'request_form'   // Form Permintaan
  | 'coa_request'    // COA Request
  | 'coa_release'    // COA Release
  | 'invoice';       // Invoice

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
 * PDF Service Class
 * Handles PDF document generation using Puppeteer
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
   * Format number to Indonesian currency format
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date to Indonesian format
   */
  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
        };

        if (options.displayHeaderFooter) {
          pdfOptions.displayHeaderFooter = true;
          pdfOptions.headerTemplate = options.headerTemplate || '';
          pdfOptions.footerTemplate = options.footerTemplate || `
            <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
              <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
          `;
        }

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
    return this.generatePDF(html, {
      displayHeaderFooter: true,
    });
  }

  /**
   * Build SPPC HTML Template
   */
  private buildSPPCTemplate(data: SPPCData): string {
    const samplesHtml = data.samples.map((sample, idx) => `
      <tr class="sample-header">
        <td colspan="4"><strong>${idx + 1}. ${sample.code} - ${sample.name}</strong> (${sample.matrix})</td>
      </tr>
      ${sample.parameters.map((param, pIdx) => `
        <tr>
          <td style="padding-left: 20px;">${idx + 1}.${pIdx + 1}</td>
          <td>${param.name}</td>
          <td>${param.method}</td>
          <td style="text-align: right;">${this.formatCurrency(param.price)}</td>
        </tr>
      `).join('')}
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 16px; }
          .header p { margin: 5px 0; }
          .info-table { width: 100%; margin-bottom: 20px; }
          .info-table td { padding: 3px 0; vertical-align: top; }
          .info-label { width: 120px; font-weight: bold; }
          .services-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .services-table th, .services-table td { border: 1px solid #333; padding: 8px; }
          .services-table th { background-color: #f0f0f0; }
          .sample-header td { background-color: #f9f9f9; }
          .totals-table { width: 50%; margin-left: auto; }
          .totals-table td { padding: 5px; }
          .totals-table .label { text-align: right; }
          .totals-table .value { text-align: right; width: 150px; }
          .totals-table .total-row { font-weight: bold; border-top: 2px solid #333; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-bottom: 1px solid #333; height: 60px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SURAT PERSETUJUAN PENGUJIAN & KALIBRASI</h1>
          <p>No: ${data.orderCode}</p>
        </div>

        <table class="info-table">
          <tr>
            <td class="info-label">Tanggal</td>
            <td>: ${this.formatDate(data.orderDate)}</td>
          </tr>
          <tr>
            <td class="info-label">Pelanggan</td>
            <td>: ${data.customerName}</td>
          </tr>
          <tr>
            <td class="info-label">Kontak</td>
            <td>: ${data.contactName}</td>
          </tr>
          <tr>
            <td class="info-label">Alamat</td>
            <td>: ${data.address}</td>
          </tr>
          <tr>
            <td class="info-label">Telepon</td>
            <td>: ${data.phone}</td>
          </tr>
          <tr>
            <td class="info-label">Email</td>
            <td>: ${data.email}</td>
          </tr>
        </table>

        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th>Parameter</th>
              <th style="width: 150px;">Metode</th>
              <th style="width: 120px;">Harga</th>
            </tr>
          </thead>
          <tbody>
            ${samplesHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td class="label">Sub Total</td>
            <td class="value">${this.formatCurrency(data.subTotal)}</td>
          </tr>
          ${data.discountValue > 0 ? `
          <tr>
            <td class="label">Diskon (${data.discountPercent}%)</td>
            <td class="value">- ${this.formatCurrency(data.discountValue)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label">PPN (${data.vatPercent}%)</td>
            <td class="value">${this.formatCurrency(data.vatValue)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Total</td>
            <td class="value">${this.formatCurrency(data.total)}</td>
          </tr>
        </table>

        ${data.remarks ? `
        <div style="margin-top: 20px;">
          <strong>Catatan:</strong>
          <p>${data.remarks}</p>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <p>Pelanggan</p>
            <div class="signature-line"></div>
            <p>(${data.contactName})</p>
          </div>
          <div class="signature-box">
            <p>Laboratory</p>
            <div class="signature-line"></div>
            <p>(_________________)</p>
          </div>
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
    return this.generatePDF(html, {
      displayHeaderFooter: true,
    });
  }

  /**
   * Build Quotation HTML Template
   */
  private buildQuotationTemplate(data: QuotationData): string {
    const servicesHtml = data.services.map(service => `
      <tr>
        <td style="text-align: center;">${service.no}</td>
        <td>${service.description}</td>
        <td style="text-align: center;">${service.quantity}</td>
        <td style="text-align: center;">${service.unit}</td>
        <td style="text-align: right;">${this.formatCurrency(service.unitPrice)}</td>
        <td style="text-align: right;">${this.formatCurrency(service.total)}</td>
      </tr>
    `).join('');

    const termsHtml = data.termsAndConditions?.map((term, idx) =>
      `<li>${term}</li>`
    ).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; color: #333; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-box { width: 48%; }
          .info-table { width: 100%; }
          .info-table td { padding: 3px 0; vertical-align: top; }
          .info-label { font-weight: bold; width: 100px; }
          .services-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .services-table th, .services-table td { border: 1px solid #333; padding: 8px; }
          .services-table th { background-color: #2c3e50; color: white; }
          .totals-table { width: 40%; margin-left: auto; }
          .totals-table td { padding: 5px; }
          .totals-table .label { text-align: right; }
          .totals-table .value { text-align: right; width: 150px; }
          .totals-table .total-row { font-weight: bold; background-color: #ecf0f1; }
          .terms-section { margin-top: 30px; }
          .terms-section h3 { margin-bottom: 10px; }
          .terms-section ol { margin: 0; padding-left: 20px; }
          .terms-section li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTATION / PENAWARAN HARGA</h1>
          <p>No: ${data.quotationCode}</p>
        </div>

        <div class="info-section">
          <div class="info-box">
            <table class="info-table">
              <tr>
                <td class="info-label">Kepada</td>
                <td>: ${data.customerName}</td>
              </tr>
              <tr>
                <td class="info-label">Attn</td>
                <td>: ${data.contactName}</td>
              </tr>
              <tr>
                <td class="info-label">Alamat</td>
                <td>: ${data.address}</td>
              </tr>
              <tr>
                <td class="info-label">Telepon</td>
                <td>: ${data.phone}</td>
              </tr>
              <tr>
                <td class="info-label">Email</td>
                <td>: ${data.email}</td>
              </tr>
            </table>
          </div>
          <div class="info-box">
            <table class="info-table">
              <tr>
                <td class="info-label">Tanggal</td>
                <td>: ${this.formatDate(data.quotationDate)}</td>
              </tr>
              <tr>
                <td class="info-label">Berlaku s/d</td>
                <td>: ${this.formatDate(data.validUntil)}</td>
              </tr>
            </table>
          </div>
        </div>

        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Deskripsi</th>
              <th style="width: 60px;">Qty</th>
              <th style="width: 60px;">Satuan</th>
              <th style="width: 120px;">Harga Satuan</th>
              <th style="width: 120px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${servicesHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td class="label">Sub Total</td>
            <td class="value">${this.formatCurrency(data.subTotal)}</td>
          </tr>
          ${data.discountValue > 0 ? `
          <tr>
            <td class="label">Diskon (${data.discountPercent}%)</td>
            <td class="value">- ${this.formatCurrency(data.discountValue)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label">PPN (${data.vatPercent}%)</td>
            <td class="value">${this.formatCurrency(data.vatValue)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Total</td>
            <td class="value">${this.formatCurrency(data.total)}</td>
          </tr>
        </table>

        ${termsHtml ? `
        <div class="terms-section">
          <h3>Syarat & Ketentuan:</h3>
          <ol>
            ${termsHtml}
          </ol>
        </div>
        ` : ''}

        ${data.remarks ? `
        <div style="margin-top: 20px;">
          <strong>Catatan:</strong>
          <p>${data.remarks}</p>
        </div>
        ` : ''}
      </body>
      </html>
    `;
  }

  /**
   * Generate Invoice Document
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    const html = this.buildInvoiceTemplate(data);
    return this.generatePDF(html, {
      displayHeaderFooter: true,
    });
  }

  /**
   * Build Invoice HTML Template
   */
  private buildInvoiceTemplate(data: InvoiceData): string {
    const ordersHtml = data.orders.map((order, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${order.code}</td>
        <td>${order.description}</td>
        <td style="text-align: right;">${this.formatCurrency(order.total)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 20px; color: #c0392b; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .invoice-box { width: 48%; }
          .info-table { width: 100%; }
          .info-table td { padding: 3px 0; vertical-align: top; }
          .info-label { font-weight: bold; width: 100px; }
          .orders-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .orders-table th, .orders-table td { border: 1px solid #333; padding: 10px; }
          .orders-table th { background-color: #c0392b; color: white; }
          .totals-table { width: 50%; margin-left: auto; }
          .totals-table td { padding: 8px; }
          .totals-table .label { text-align: right; font-weight: bold; }
          .totals-table .value { text-align: right; width: 150px; }
          .totals-table .total-row { font-size: 14px; background-color: #fadbd8; }
          .bank-info { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; }
          .bank-info h3 { margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
        </div>

        <div class="invoice-info">
          <div class="invoice-box">
            <table class="info-table">
              <tr>
                <td class="info-label">No. Invoice</td>
                <td>: ${data.invoiceCode}</td>
              </tr>
              ${data.fakturNo ? `
              <tr>
                <td class="info-label">No. Faktur</td>
                <td>: ${data.fakturNo}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="info-label">Tanggal</td>
                <td>: ${this.formatDate(data.invoiceDate)}</td>
              </tr>
              <tr>
                <td class="info-label">Jatuh Tempo</td>
                <td>: ${this.formatDate(data.dueDate)}</td>
              </tr>
            </table>
          </div>
          <div class="invoice-box">
            <table class="info-table">
              <tr>
                <td class="info-label">Kepada</td>
                <td>: ${data.customerName}</td>
              </tr>
              <tr>
                <td class="info-label">Attn</td>
                <td>: ${data.contactName}</td>
              </tr>
              <tr>
                <td class="info-label">Alamat</td>
                <td>: ${data.address}</td>
              </tr>
              ${data.npwp ? `
              <tr>
                <td class="info-label">NPWP</td>
                <td>: ${data.npwp}</td>
              </tr>
              ` : ''}
            </table>
          </div>
        </div>

        <table class="orders-table">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th style="width: 120px;">Kode Order</th>
              <th>Deskripsi</th>
              <th style="width: 150px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${ordersHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td class="label">Sub Total</td>
            <td class="value">${this.formatCurrency(data.subTotal)}</td>
          </tr>
          ${data.discountValue > 0 ? `
          <tr>
            <td class="label">Diskon</td>
            <td class="value">- ${this.formatCurrency(data.discountValue)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label">PPN</td>
            <td class="value">${this.formatCurrency(data.vatValue)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL</td>
            <td class="value">${this.formatCurrency(data.total)}</td>
          </tr>
        </table>

        ${data.bankName ? `
        <div class="bank-info">
          <h3>Informasi Pembayaran:</h3>
          <table class="info-table">
            <tr>
              <td class="info-label">Bank</td>
              <td>: ${data.bankName}</td>
            </tr>
            <tr>
              <td class="info-label">Atas Nama</td>
              <td>: ${data.accountName}</td>
            </tr>
            <tr>
              <td class="info-label">No. Rekening</td>
              <td>: ${data.accountNumber}</td>
            </tr>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
    `;
  }

  /**
   * Generate COA Document
   */
  async generateCOA(data: COAData): Promise<Buffer> {
    const html = this.buildCOATemplate(data);
    return this.generatePDF(html, {
      displayHeaderFooter: true,
    });
  }

  /**
   * Build COA HTML Template
   */
  private buildCOATemplate(data: COAData): string {
    const parametersHtml = data.parameters.map((param, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${param.name}</td>
        <td>${param.method}</td>
        <td style="text-align: center;">${param.result}</td>
        <td style="text-align: center;">${param.unit}</td>
        ${param.specification ? `<td style="text-align: center;">${param.specification}</td>` : ''}
        ${param.status ? `
          <td style="text-align: center; color: ${param.status === 'pass' ? 'green' : 'red'};">
            ${param.status === 'pass' ? 'PASS' : 'FAIL'}
          </td>
        ` : ''}
      </tr>
    `).join('');

    const hasSpecification = data.parameters.some(p => p.specification);
    const hasStatus = data.parameters.some(p => p.status);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #27ae60; padding-bottom: 15px; }
          .header h1 { margin: 0; font-size: 16px; color: #27ae60; }
          .header h2 { margin: 5px 0; font-size: 14px; color: #333; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .info-box { width: 48%; }
          .info-table { width: 100%; }
          .info-table td { padding: 2px 0; vertical-align: top; }
          .info-label { font-weight: bold; width: 100px; }
          .results-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .results-table th, .results-table td { border: 1px solid #333; padding: 6px; }
          .results-table th { background-color: #27ae60; color: white; font-size: 10px; }
          .conclusion { margin-top: 20px; padding: 10px; background-color: #e8f8f5; border-left: 4px solid #27ae60; }
          .signature-section { margin-top: 40px; display: flex; justify-content: flex-end; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-bottom: 1px solid #333; height: 50px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CERTIFICATE OF ANALYSIS</h1>
          <h2>No: ${data.coaCode}</h2>
        </div>

        <div class="info-section">
          <div class="info-box">
            <table class="info-table">
              <tr>
                <td class="info-label">Order No</td>
                <td>: ${data.orderCode}</td>
              </tr>
              <tr>
                <td class="info-label">Sample Code</td>
                <td>: ${data.sampleCode}</td>
              </tr>
              <tr>
                <td class="info-label">Sample Name</td>
                <td>: ${data.sampleName}</td>
              </tr>
              <tr>
                <td class="info-label">Matrix</td>
                <td>: ${data.matrix}</td>
              </tr>
            </table>
          </div>
          <div class="info-box">
            <table class="info-table">
              <tr>
                <td class="info-label">Customer</td>
                <td>: ${data.customerName}</td>
              </tr>
              <tr>
                <td class="info-label">Contact</td>
                <td>: ${data.contactName}</td>
              </tr>
              <tr>
                <td class="info-label">Received Date</td>
                <td>: ${this.formatDate(data.receivedDate)}</td>
              </tr>
              <tr>
                <td class="info-label">Analysis Date</td>
                <td>: ${this.formatDate(data.analysisDate)}</td>
              </tr>
            </table>
          </div>
        </div>

        <table class="results-table">
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th>Parameter</th>
              <th style="width: 120px;">Method</th>
              <th style="width: 80px;">Result</th>
              <th style="width: 60px;">Unit</th>
              ${hasSpecification ? '<th style="width: 80px;">Spec</th>' : ''}
              ${hasStatus ? '<th style="width: 50px;">Status</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${parametersHtml}
          </tbody>
        </table>

        ${data.conclusion ? `
        <div class="conclusion">
          <strong>Conclusion:</strong>
          <p>${data.conclusion}</p>
        </div>
        ` : ''}

        ${data.remarks ? `
        <div style="margin-top: 15px;">
          <strong>Remarks:</strong>
          <p>${data.remarks}</p>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <p>Approved by</p>
            <div class="signature-line"></div>
            <p>${data.approvedBy || '_________________'}</p>
            ${data.approvedDate ? `<p style="font-size: 10px;">${this.formatDate(data.approvedDate)}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const pdfService = new PDFService();
