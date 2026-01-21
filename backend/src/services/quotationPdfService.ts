import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for logos
let cachedLogos: {
  tuvNord?: string;
  ilacMra?: string;
  kan?: string;
  tuvNordGroup?: string;
} = {};

function getTuvNordLogo(): string {
  if (!cachedLogos.tuvNord) {
    const logoPath = path.join(__dirname, '../assets/pdf/tuv-nord-logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    cachedLogos.tuvNord = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
  return cachedLogos.tuvNord;
}

function getIlacMraLogo(): string {
  if (!cachedLogos.ilacMra) {
    const logoPath = path.join(__dirname, '../assets/pdf/ilac-mra.png');
    const logoBuffer = fs.readFileSync(logoPath);
    cachedLogos.ilacMra = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
  return cachedLogos.ilacMra;
}

function getKanLogo(): string {
  if (!cachedLogos.kan) {
    const logoPath = path.join(__dirname, '../assets/pdf/kan-logo.svg');
    const logoBuffer = fs.readFileSync(logoPath);
    cachedLogos.kan = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
  }
  return cachedLogos.kan;
}

function getTuvNordGroupLogo(): string {
  if (!cachedLogos.tuvNordGroup) {
    const logoPath = path.join(__dirname, '../assets/pdf/tuv-nord-group.png');
    const logoBuffer = fs.readFileSync(logoPath);
    cachedLogos.tuvNordGroup = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
  return cachedLogos.tuvNordGroup;
}

const SPECIAL_CUSTOMER_IDS = [34, 2013, 65];
const PRIORITY_RATES: Record<string, number> = { normal: 0, urgent: 50, 'very urgent': 100, 'very-urgent': 100 };
const MIN_TOTAL = 200000;
const MIN_VAT = 22000;
const MIN_GRAND_TOTAL = 222000;
const NEW_ADDRESS_DATE = new Date('2025-09-01');

interface ContactData { title?: string; first_name: string; middle_name?: string | null; surname: string; phone?: string; fax?: string; mobile_phone?: string; email?: string; }
interface AddressData { address: string; city?: string; state?: string; postal_code?: string; country?: string; }
interface CustomerData { id: number; customer_name: string; top?: number | null; }
interface ServiceDetail { id: number; name: string; price: number; method?: { name: string }; parameter_id?: number; use_pc?: boolean; }
interface PackageDetail { id: number; name: string; totalPrice: number | null; services?: ServiceDetail[]; }
interface SampleItem { name: string; priority: string; quantity: number; services: Array<{ service?: ServiceDetail; package?: PackageDetail; quantity: number; discount: number; price: number; isProduct?: boolean; }>; }
interface ProductItem { name: string; price: number; quantity: number; discount: number; }
interface CreatorData { first_name: string; middle_name?: string | null; surname: string; }
export interface QuotationPdfData { id: number; code: string; quo_date: Date; created_at: Date; expired_date: Date; priority: string; lab?: string | null; percent_vat: number; percent_discount: number; remarks?: string | null; customer: CustomerData; contact: ContactData; address: AddressData; creator: CreatorData; samples: SampleItem[]; products: ProductItem[]; }

export class QuotationPdfService {
  private formatCurrency(amount: number): string {
    if (isNaN(amount) || amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
  }

  // FIX: Proper date formatting
  private formatDateEnglish(date: Date | string | null | undefined): string {
    if (!date) return '-';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '-';
      return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return '-'; }
  }

  private spaceOut(value: string): string { return value.split('').join(' '); }
  private getContactFullName(contact: ContactData): string { return [contact.title, contact.first_name, contact.middle_name, contact.surname].filter(Boolean).join(' '); }
  private getCreatorFullName(creator: CreatorData): string { return [creator.first_name, creator.middle_name, creator.surname].filter(Boolean).join(' '); }
  private getPriorityRate(priority: string): number { return PRIORITY_RATES[priority?.toLowerCase().trim() || 'normal'] || 0; }
  private isSpecialCustomer(customerId: number): boolean { return SPECIAL_CUSTOMER_IDS.includes(customerId); }

  private async generateBarcode(code: string): Promise<string> {
    try {
      const pngBuffer = await bwipjs.toBuffer({ bcid: 'code128', text: code, scale: 3, height: 10, includetext: false });
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch { return ''; }
  }

  private calculateTotals(data: QuotationPdfData, isSpecial: boolean) {
    let totalBasePrice = 0, totalDiscount = 0, totalPriorityCharge = 0, productSubTotal = 0;

    for (const product of data.products || []) {
      const price = Number(product.price) || 0, quantity = Number(product.quantity) || 0, discount = Number(product.discount) || 0;
      const basePrice = price * quantity, discountAmount = (discount / 100) * basePrice;
      productSubTotal += basePrice - discountAmount;
      totalBasePrice += basePrice;
      totalDiscount += discountAmount;
    }

    for (const sample of data.samples || []) {
      const priorityRate = this.getPriorityRate(sample.priority), sampleQty = Number(sample.quantity) || 1;
      for (const item of sample.services || []) {
        let itemPrice = item.package ? (Number(item.package.totalPrice) || 0) : item.service ? (Number(item.price) || Number(item.service.price) || 0) : item.isProduct ? (Number(item.price) || 0) : 0;
        const itemQty = Number(item.quantity) || 1, itemDiscount = Number(item.discount) || 0;
        const basePrice = itemPrice * itemQty * sampleQty, discountAmount = (itemDiscount / 100) * basePrice, afterDiscount = basePrice - discountAmount;
        let priorityCharge = 0;
        if (!isSpecial) {
          if (item.service) { const canApplyPc = item.service.parameter_id !== 0 || item.service.parameter_id === undefined; if (canApplyPc || item.service.use_pc) priorityCharge = (priorityRate / 100) * afterDiscount; }
          else if (item.package) priorityCharge = (priorityRate / 100) * afterDiscount;
        }
        totalBasePrice += basePrice; totalDiscount += discountAmount; totalPriorityCharge += priorityCharge;
      }
    }

    let subTotal = totalBasePrice - totalDiscount + totalPriorityCharge;
    const percentVat = Number(data.percent_vat) || 11;
    let vat: number, grandTotal: number;
    if (subTotal <= MIN_TOTAL) { subTotal = MIN_TOTAL; vat = MIN_VAT; grandTotal = MIN_GRAND_TOTAL; }
    else { vat = (percentVat / 100) * subTotal; grandTotal = subTotal + vat; }
    return { totalBasePrice: Math.round(totalBasePrice), totalDiscount: Math.round(totalDiscount), totalPriorityCharge: Math.round(totalPriorityCharge), subTotal: Math.round(subTotal), vat: Math.round(vat), grandTotal: Math.round(grandTotal), productSubTotal: Math.round(productSubTotal) };
  }

  private buildStyles(): string {
    return `<style>
      @page { size: A4; margin: 45mm 12mm 35mm 12mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 210mm; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      /* HEADER FIXED - MUNCUL DI SETIAP HALAMAN */
      #header { position: fixed; top: 0; left: 0; right: 0; height: 40mm; background: white; z-index: 9999; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 10mm 12mm 3mm 12mm; }

      /* CONTENT WRAPPER - FLOWS ACROSS PAGES */
      .content { padding: 0 12mm; }
      .page-break { page-break-before: always; }
      .header-left { width: 55mm; }
      .header-logo { height: 16mm; width: auto; }
      .header-title { margin-top: 4mm; font-size: 22pt; font-weight: bold; letter-spacing: 0.5mm; color: #000; }
      .header-right { text-align: right; width: 95mm; }
      .header-line { height: 2.5px; background: #0066a1; width: 100%; margin-bottom: 3mm; }
      .header-info-table { margin-left: auto; border-collapse: collapse; }
      .header-info-table td { padding: 0.8mm 0; font-size: 9pt; vertical-align: top; }
      .header-info-table .label { font-weight: bold; padding-right: 4mm; text-align: left; }
      .header-info-table .value { text-align: left; min-width: 38mm; }
      .barcode-container { margin-top: 2mm; text-align: right; }
      .barcode-img { height: 14mm; width: auto; }
      .barcode-text { font-family: 'Courier New', Courier, monospace; font-size: 11pt; letter-spacing: 3px; margin-top: 1mm; }

      /* CUSTOMER - NO BORDER (MATCHING MOCKUP) */
      .customer-section { display: flex; width: 100%; margin-bottom: 4mm; font-size: 9pt; }
      .customer-left { width: 50%; padding-right: 5mm; vertical-align: top; }
      .customer-right { width: 50%; padding-left: 5mm; vertical-align: top; }
      .customer-row { display: flex; margin-bottom: 0.5mm; line-height: 1.4; }
      .customer-label { font-weight: bold; width: 22mm; flex-shrink: 0; }
      .customer-value { flex: 1; }

      /* TABLES */
      table { width: 100%; border-collapse: collapse; font-size: 8pt; }
      th, td { border: 1px solid #000; padding: 1.5mm 2mm; vertical-align: top; }
      th { background-color: #e6e6e6 !important; font-weight: bold; text-align: center; }
      thead { display: table-header-group; }
      tbody tr { page-break-inside: avoid; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }

      /* PRODUCTS TABLE */
      .products-table { margin-bottom: 3mm; }
      .products-table .col-no { width: 8mm; }
      .products-table .col-price { width: 20mm; }
      .products-table .col-qty { width: 12mm; }
      .products-table .col-disc { width: 14mm; }
      .products-table .col-total { width: 22mm; }

      /* SERVICES TABLE */
      .services-table { margin-bottom: 0; }
      .services-table .col-no { width: 8mm; text-align: center; }
      .services-table .col-services { text-align: left; }
      .services-table .col-method { width: 38mm; text-align: left; font-size: 7pt; }
      .services-table .col-price { width: 18mm; text-align: right; }
      .services-table .col-qty { width: 10mm; text-align: center; }
      .services-table .col-disc { width: 12mm; text-align: center; }
      .services-table .col-pc { width: 10mm; text-align: center; }
      .services-table .col-total { width: 20mm; text-align: right; }
      .sample-header-row td { background-color: #f0f0f0 !important; font-weight: bold; }
      .priority-cell { text-align: right !important; }
      .priority-label { font-weight: normal; }
      .subtotal-row td { font-weight: bold; background-color: #e8e8e8 !important; }
      .package-services { font-size: 7pt; color: #333; margin-top: 1mm; padding-left: 2mm; line-height: 1.3; }

      /* REMARKS & SUMMARY */
      .remarks-summary-section { display: table; width: 100%; margin-top: 0; margin-bottom: 3mm; border: 1px solid #000; }
      .remarks-cell { display: table-cell; width: 50%; padding: 2mm 3mm; vertical-align: top; border-right: 1px solid #000; font-size: 8pt; }
      .remarks-title { font-weight: bold; margin-bottom: 1mm; }
      .summary-cell { display: table-cell; width: 50%; padding: 0; vertical-align: top; }
      .summary-table { width: 100%; border-collapse: collapse; font-size: 8pt; border: none; }
      .summary-table td { border: none; border-bottom: 1px solid #000; padding: 1.5mm 3mm; }
      .summary-table tr:last-child td { border-bottom: none; }
      .summary-table .label { text-align: right; font-weight: bold; width: 55%; }
      .summary-table .value { text-align: right; width: 45%; }
      .summary-table .grand-total td { font-weight: bold; }

      /* SERVICES GRID */
      .services-grid { margin-top: 3mm; margin-bottom: 3mm; font-size: 8pt; }
      .services-grid-intro { margin-bottom: 2mm; text-align: justify; line-height: 1.35; }
      .services-grid-table { width: 100%; border-collapse: collapse; }
      .services-grid-table th { background-color: #e6e6e6 !important; border: 1px solid #000; padding: 2mm; font-weight: bold; text-align: center; }
      .services-grid-table td { border: 1px solid #000; padding: 2mm; vertical-align: top; font-size: 8pt; }
      .services-grid-table .service-type { width: 35mm; }
      .services-grid-note { margin-top: 2mm; }

      /* SIGNATURE */
      .signature-section { margin-top: 3mm; font-size: 9pt; }
      .created-by-row { margin-bottom: 2mm; }
      .customer-approval-row { display: flex; align-items: baseline; }
      .approval-line { flex: 1; border-bottom: 1px solid #000; margin-left: 2mm; height: 5mm; }

      /* FOOTER FIXED - MUNCUL DI SETIAP HALAMAN */
      #footer { position: fixed; bottom: 0; left: 0; right: 0; height: 30mm; background: white; z-index: 9999; }
      .footer { padding: 0 12mm; }
      .page-number { text-align: right; font-size: 8pt; margin-bottom: 2mm; }
      .page-number::before { content: "Page " counter(page) " from " counter(pages); }
      .footer-line-left { height: 2.5px; background: #0066a1; width: 100%; margin-top: 3mm; }
      .footer-line-right { height: 2.5px; background: #0066a1; width: 100%; margin-top: 3mm; }
      .footer-content { display: flex; justify-content: space-between; align-items: flex-start; }
      .footer-left { width: 50%; }
      .footer-company { font-weight: bold; font-size: 8pt; margin-bottom: 1mm; }
      .footer-address { font-size: 7pt; line-height: 1.35; }
      .footer-contact { margin-top: 2mm; font-size: 7pt; }
      .footer-right { width: 45%; display: flex; flex-direction: column; align-items: flex-end; }
      .footer-logos-row { display: flex; align-items: flex-start; justify-content: flex-end; gap: 3mm; margin-bottom: 2mm; }
      .footer-logo-ilac { height: 12mm; width: auto; }
      .kan-block { text-align: center; }
      .footer-logo-kan { height: 12mm; width: auto; }
      .kan-text { font-size: 5pt; line-height: 1.2; margin-top: 0.5mm; }
      .footer-logo-tuv-group { height: 8mm; width: auto; margin-top: 1mm; }

      /* TERMS PAGE */
      .terms-title { font-size: 14pt; font-weight: bold; color: #000; margin-bottom: 4mm; margin-top: 2mm; }
      .terms-columns { display: flex; gap: 5mm; }
      .terms-column-left { width: 50%; flex: 1; }
      .terms-column-right { width: 50%; flex: 1; }
      .terms-block { margin-bottom: 3mm; }
      .terms-block-title { font-weight: bold; font-size: 9pt; margin-bottom: 1mm; }
      .terms-block-content { font-size: 7pt; line-height: 1.4; text-align: justify; }
      .terms-block-content ul { margin-left: 3mm; padding-left: 2mm; list-style-type: disc; }
      .terms-block-content li { margin-bottom: 1mm; }
      .standard-terms-title { font-weight: bold; font-size: 9pt; margin-bottom: 2mm; }
      .standard-terms-content { font-size: 5.5pt; line-height: 1.3; text-align: justify; }
      .standard-terms-content p { margin-bottom: 1.5mm; }

      @media print {
        html, body { width: 210mm; height: 297mm; }
        .page { margin: 0; page-break-after: always; }
        tbody tr { page-break-inside: avoid; }
        th { background-color: #e6e6e6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sample-header-row td { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>`;
  }

  private buildHeader(data: QuotationPdfData, barcodeImg: string, showTitle: boolean = true): string {
    return `<div class="header"><div class="header-left"><img src="${getTuvNordLogo()}" alt="TÜV NORD" class="header-logo" />${showTitle ? '<div class="header-title">QUOTATION</div>' : ''}</div><div class="header-right"><div class="header-line"></div><table class="header-info-table"><tr><td class="label">Quotation Date</td><td class="value">${this.formatDateEnglish(data.quo_date)}</td></tr><tr><td class="label">Expiration Date</td><td class="value">${this.formatDateEnglish(data.expired_date)}</td></tr><tr><td class="label">Quotation No.</td><td class="value"></td></tr></table><div class="barcode-container">${barcodeImg ? `<img src="${barcodeImg}" class="barcode-img" alt="${data.code}"/>` : ''}<div class="barcode-text">${this.spaceOut(data.code)}</div></div></div></div>`;
  }

  private buildFooter(): string {
    return `<div class="footer"><div class="page-number"></div><div class="footer-content"><div class="footer-left"><div class="footer-company">Laboratorium PT TUV NORD Indonesia</div><div class="footer-address">Jl.Science Timur 1 Blok B3-F1<br>Kawasan industri jababeka V<br>Kel. Setajaya Kec. Cikarang Timur<br>Kabupaten Bekasi - Jawa Barat - 17530</div><div class="footer-contact">Email cslab.id@tuv-nord.com<br>Phone +62 21 29574720</div><div class="footer-line-left"></div></div><div class="footer-right"><div class="footer-logos-row"><img src="${getIlacMraLogo()}" class="footer-logo-ilac" alt="ilac-MRA" /><div class="kan-block"><img src="${getKanLogo()}" class="footer-logo-kan" alt="KAN" /><div class="kan-text">Komite Akreditasi Nasional<br>LP-411-IDN<br>LK-109-IDN</div></div></div><img src="${getTuvNordGroupLogo()}" class="footer-logo-tuv-group" alt="TÜV NORD GROUP" /><div class="footer-line-right"></div></div></div></div>`;
  }

  private buildCustomerSection(data: QuotationPdfData): string {
    const contactName = this.getContactFullName(data.contact);
    const addressParts = [data.address.address, data.address.city, data.address.state, data.address.postal_code, data.address.country].filter(Boolean);
    return `<div class="customer-section"><div class="customer-left"><div class="customer-row"><span class="customer-label">To</span><span class="customer-value">${contactName}</span></div><div class="customer-row"><span class="customer-label">Company</span><span class="customer-value">${data.customer.customer_name}</span></div><div class="customer-row"><span class="customer-label">Address</span><span class="customer-value">${addressParts.join('<br>')}</span></div></div><div class="customer-right"><div class="customer-row"><span class="customer-label">Phone</span><span class="customer-value">${data.contact.phone || '-'}</span></div><div class="customer-row"><span class="customer-label">Fax</span><span class="customer-value">${data.contact.fax || ''}</span></div><div class="customer-row"><span class="customer-label">Mobile Phone</span><span class="customer-value">${data.contact.mobile_phone || ''}</span></div><div class="customer-row"><span class="customer-label">Email Address</span><span class="customer-value">${data.contact.email || ''}</span></div></div></div>`;
  }

  private buildProductsTable(products: ProductItem[]): string {
    if (!products || products.length === 0) return '';
    let html = `<table class="products-table"><thead><tr><th class="col-no">No</th><th class="col-name">ADDITIONAL CHARGE</th><th class="col-price">PRICE</th><th class="col-qty">QTY</th><th class="col-disc">DISC%</th><th class="col-total">TOTAL</th></tr></thead><tbody>`;
    products.forEach((product, idx) => {
      const price = Number(product.price) || 0, quantity = Number(product.quantity) || 0, discount = Number(product.discount) || 0;
      const total = (price * quantity) - ((discount / 100) * price * quantity);
      html += `<tr><td class="text-center">${idx + 1}</td><td>${product.name}</td><td class="text-right">${this.formatCurrency(price)}</td><td class="text-center">${quantity}</td><td class="text-center">${discount}</td><td class="text-right">${this.formatCurrency(total)}</td></tr>`;
    });
    return html + `</tbody></table>`;
  }

  private buildSamplesTable(data: QuotationPdfData, isSpecial: boolean): string {
    if (!data.samples || data.samples.length === 0) return '';
    const headerRow = isSpecial ? `<tr><th class="col-no">No</th><th class="col-services">SERVICES</th><th class="col-method">METHOD</th><th class="col-qty">QTY</th><th class="col-total">TOTAL</th></tr>` : `<tr><th class="col-no">No</th><th class="col-services">SERVICES</th><th class="col-method">METHOD</th><th class="col-price">PRICE</th><th class="col-qty">QTY</th><th class="col-disc">DISC%</th><th class="col-pc">PC%</th><th class="col-total">TOTAL</th></tr>`;
    let html = `<table class="services-table"><thead>${headerRow}</thead><tbody>`;
    let rowNum = 1, grandSubTotal = 0;

    for (const sample of data.samples) {
      const priorityRate = this.getPriorityRate(sample.priority), priorityLabel = sample.priority?.toLowerCase() || 'normal', sampleQty = Number(sample.quantity) || 1;
      const colspan = isSpecial ? 4 : 7;
      html += `<tr class="sample-header-row"><td colspan="${colspan}">${sample.name}</td><td class="priority-cell"><span class="priority-label">Priority</span><br><strong>${priorityLabel}</strong></td></tr>`;

      for (const item of sample.services || []) {
        let itemPrice = 0, itemName = '', methodName = '', packageServicesHtml = '';
        if (item.package) { itemPrice = Number(item.package.totalPrice) || 0; itemName = item.package.name; if (item.package.services?.length) { packageServicesHtml = '<div class="package-services">'; for (const svc of item.package.services) packageServicesHtml += `- ${svc.name} | ${svc.method?.name || ''}<br>`; packageServicesHtml += '</div>'; } }
        else if (item.service) { itemPrice = Number(item.price) || Number(item.service.price) || 0; itemName = item.service.name; methodName = item.service.method?.name || ''; }
        const itemQty = Number(item.quantity) || 1, itemDiscount = Number(item.discount) || 0, qty = itemQty * sampleQty;
        const basePrice = itemPrice * qty, discountAmount = (itemDiscount / 100) * basePrice, afterDiscount = basePrice - discountAmount;
        let pcRate = 0;
        if (!isSpecial) { if (item.service) { const canApplyPc = item.service.parameter_id !== 0 || item.service.parameter_id === undefined; if (canApplyPc || item.service.use_pc) pcRate = priorityRate; } else if (item.package) pcRate = priorityRate; }
        const total = afterDiscount + ((pcRate / 100) * afterDiscount);
        grandSubTotal += total;

        if (isSpecial) html += `<tr><td class="col-no text-center">${rowNum}</td><td class="col-services">${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td><td class="col-method">${methodName}</td><td class="col-qty text-center">${qty}</td><td class="col-total text-right">${this.formatCurrency(total)}</td></tr>`;
        else html += `<tr><td class="col-no text-center">${rowNum}</td><td class="col-services">${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td><td class="col-method">${methodName}</td><td class="col-price text-right">${this.formatCurrency(itemPrice)}</td><td class="col-qty text-center">${qty}</td><td class="col-disc text-center">${itemDiscount}</td><td class="col-pc text-center">${pcRate}</td><td class="col-total text-right">${this.formatCurrency(total)}</td></tr>`;
        rowNum++;
      }
    }
    const subTotalColspan = isSpecial ? 4 : 7;
    return html + `<tr class="subtotal-row"><td colspan="${subTotalColspan}" class="text-left">Sub Total (IDR)</td><td class="text-right">${this.formatCurrency(grandSubTotal)}</td></tr></tbody></table>`;
  }

  private buildRemarksSummary(data: QuotationPdfData, totals: ReturnType<typeof this.calculateTotals>, isSpecial: boolean): string {
    const remarksContent = data.remarks ? data.remarks.replace(/\n/g, '<br>') : '';
    const summaryRows = isSpecial
      ? `<tr><td class="label">Sub Total (IDR)</td><td class="value">${this.formatCurrency(totals.subTotal)}</td></tr><tr><td class="label">VAT (IDR)</td><td class="value">${this.formatCurrency(totals.vat)}</td></tr><tr class="grand-total"><td class="label">Grand Total (IDR)</td><td class="value">${this.formatCurrency(totals.grandTotal)}</td></tr>`
      : `<tr><td class="label">Total (IDR)</td><td class="value">${this.formatCurrency(totals.totalBasePrice)}</td></tr><tr><td class="label">Discount (IDR)</td><td class="value">${this.formatCurrency(totals.totalDiscount)}</td></tr><tr><td class="label">Priority Chrg (IDR)</td><td class="value">${this.formatCurrency(totals.totalPriorityCharge)}</td></tr><tr><td class="label">Sub Total (IDR)</td><td class="value">${this.formatCurrency(totals.subTotal)}</td></tr><tr><td class="label">VAT (IDR)</td><td class="value">${this.formatCurrency(totals.vat)}</td></tr><tr class="grand-total"><td class="label">Grand Total (IDR)</td><td class="value">${this.formatCurrency(totals.grandTotal)}</td></tr>`;
    return `<div class="remarks-summary-section"><div class="remarks-cell"><div class="remarks-title">Remarks :</div><div>${remarksContent}</div></div><div class="summary-cell"><table class="summary-table">${summaryRows}</table></div></div>`;
  }

  private buildServicesGrid(): string {
    return `<div class="services-grid"><p class="services-grid-intro">With our experience and expertise in ITC (Inspection, Testing & Certification) business we also offer you one stop solution with special discount for another valuable services that we can provided:</p><table class="services-grid-table"><thead><tr><th colspan="2">Services</th></tr></thead><tbody><tr><td class="service-type">System Certification<br>(Additional Scheme)</td><td>ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc.</td></tr><tr><td class="service-type">Product Certification</td><td>SNI, CE, GS, etc.</td></tr><tr><td class="service-type">Inspection</td><td>Rack Inspection, QA/QC Inspection, etc.</td></tr><tr><td class="service-type">Training</td><td>In House Training for All Management Systems Topic (Awareness, Internal Audit, Documentation, etc.)</td></tr><tr><td class="service-type">Laboratory Services</td><td>Consumer goods product testing, Product stability & shelf life, Environmental testing & monitoring, Industrial Hygine, Petroleum & chemical analysis, Calibration</td></tr></tbody></table><p class="services-grid-note">For complete information please feel free to contact our Sales Representative.</p></div>`;
  }

  private buildSignatureSection(data: QuotationPdfData): string {
    return `<div class="signature-section"><div class="created-by-row">Created by <strong>${this.getCreatorFullName(data.creator)}</strong></div><div class="customer-approval-row"><span>Customer Approval:</span><span class="approval-line"></span></div></div>`;
  }

  private buildTermsContent(customer: CustomerData, createdAt: Date): string {
    const paymentTerms = customer.top && customer.top > 0 ? `Payment terms are Net ${customer.top} days.` : 'Payment must be made prior to sending the report.';
    const useNewAddress = createdAt && new Date(createdAt) >= NEW_ADDRESS_DATE;
    const headOfficeAddress = useNewAddress ? 'Arkadia Green Park, Tower G, Lantai 17, Jl. TB Simatupang Kav. 88 Kelurahan Kebagusan, Kecamatan Pasar Minggu, Kota Administrasi Jakarta Selatan Provinsi DKI Jakarta, Kode Pos 12520' : 'Perkantoran Hijau Arkadia, Tower F 6th Floor, Suite 706. JL. TB. Simatupang Kav. 88 Pasar Minggu, Jakarta Selatan.';
    return `<div class="terms-title">Term & Condition:</div><div class="terms-columns"><div class="terms-column-left" style="padding-right: 2.5mm;"><div class="terms-block"><div class="terms-block-title">Shipping Product Samples</div><div class="terms-block-content">To insure the integrity and security of samples sent to TÜV NORD Laboratory, we ask that our customers observe the following guidelines when shipping samples :<ul><li>Secure each food sample in its own container. Seal each sample package completely so that no leakage will occur. This is very important to prevent cross- contamination.</li><li>Use packing materials that are strong enough to travel without damage or leakage.</li><li>Samples needing refrigeration should be shipped appropriately. Please mark "refrigerate" on the outside of the package to ensure continuous refrigeration.</li><li>Label each sample individually with the identification you would like included on the final report.</li></ul></div></div><div class="terms-block"><div class="terms-block-title">Sample Privacy</div><div class="terms-block-content">At TÜV NORD Laboratory, customer privacy is of utmost importance to us because it is important to YOU. We have provided full confidentially to all of our partners. Not only do we have the right systems in place, but we alo have the right people.</div></div><div class="terms-block"><div class="terms-block-title">Quotation and to Submit Samples</div><div class="terms-block-content">Visit our website https://www.tuv-nord.com/id/en to download a sample submission form and contact our marketing team to get quotation. Submit the completed form along with your samples to<br><br><strong>Head Office (Only for durable product):</strong><br>PT. TÜV NORD Indonesia<br>${headOfficeAddress}<br><br><strong>Laboratory:</strong><br>Jl. Science Timur 1, Block B3-F1 Kawasan Industri Jababeka V Cibatu Cikarang - Bekasi 17530<br><em>(Exit Tol Cibatu, Km. 34)</em></div></div></div><div class="terms-column-right" style="padding-left: 2.5mm;"><div class="standard-terms-title">Standard Term and Conditions</div><div class="standard-terms-content"><p>All services provided by TÜV NORD Laboratory ("TÜV NORD Laboratory") are subject to the terms and conditions stated herein. As our client, you ("Client") understand and agree that placement of any order for our services constitutes acceptance of the terms and conditions stated herein.</p><p><strong>CONFIDENTIALITY</strong> confidentiality is maintained in all interractions with Clients. Appropriate confidentiality agreements are signed willingly.</p><p><strong>PAYMENT TERMS</strong> ${paymentTerms} Minimum order per invoice is Rp 200.000,- .Prices are subject to change without notice. The payment can be transferred to PT. TÜV NORD Indonesia, Bank HSBC World Trade Centre, A/C No. 050-074269- 001.</p><p><strong>BILLING</strong> All fees or bills are charged direcly to the Client, unless a third party has been authorized via a signed statement indicating payment responsibility.</p><p><strong>SAMPLE SUBMISSION</strong> sample submission should be made on a TÜV NORD Laboratory "Sample Testing Application Form (STAF). Please contact our Laboratory staff to get complete information.</p><p><strong>HAZARDOUS SUBSTANCES AND PATHOGEN</strong> any sample containing or suspected to contain a pathogen or substance that is considered hazardous must be clearly indentifief as such on the container and communicated to TÜV NORD Laboratory before shipping.</p><p><strong>ANALYSIS</strong> TÜV NORD Laboratory strives to provide a seven (7) until ten (10) working day turnaround. Rush analysis is offered contingent upon pre-notification and approval of TÜV NORD Laboratory.</p><p><strong>LITIGATION</strong> All costs associated with litigation or dispute shall be paid by the Client.</p><p><strong>WARRANTY AND LIMITS OF LIABILITY</strong> TÜV NORD Laboratory warrants that all services will be performed in a timely manner by competent personel.</p></div></div></div>`;
  }

  async generatePdf(data: QuotationPdfData): Promise<Buffer> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);
    const barcodeImg = await this.generateBarcode(data.code);
    const totals = this.calculateTotals(data, isSpecial);
    const styles = this.buildStyles();

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'] });
    try {
      const page = await browser.newPage();

      // NEW STRUCTURE: Fixed header/footer with flowing content
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${styles}
</head>
<body>
  <div id="header">${this.buildHeader(data, barcodeImg, true)}</div>

  <div class="content">
    ${this.buildCustomerSection(data)}
    ${this.buildProductsTable(data.products)}
    ${this.buildSamplesTable(data, isSpecial)}
    ${this.buildRemarksSummary(data, totals, isSpecial)}
    ${this.buildServicesGrid()}
    ${this.buildSignatureSection(data)}

    <div class="page-break"></div>

    ${this.buildTermsContent(data.customer, data.created_at)}
  </div>

  <div id="footer">${this.buildFooter()}</div>
</body>
</html>`;

      await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, timeout: 60000 });
      await page.close();
      return Buffer.from(pdfBuffer);
    } finally { await browser.close(); }
  }

  async generateHtmlPreview(data: QuotationPdfData): Promise<string> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);
    const barcodeImg = await this.generateBarcode(data.code);
    const totals = this.calculateTotals(data, isSpecial);
    const styles = this.buildStyles();
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${styles}
  <style>body{background:#ccc;padding:20px;}</style>
</head>
<body>
  <div id="header">${this.buildHeader(data, barcodeImg, true)}</div>

  <div class="content">
    ${this.buildCustomerSection(data)}
    ${this.buildProductsTable(data.products)}
    ${this.buildSamplesTable(data, isSpecial)}
    ${this.buildRemarksSummary(data, totals, isSpecial)}
    ${this.buildServicesGrid()}
    ${this.buildSignatureSection(data)}

    <div class="page-break"></div>

    ${this.buildTermsContent(data.customer, data.created_at)}
  </div>

  <div id="footer">${this.buildFooter()}</div>
</body>
</html>`;
  }
}

export const quotationPdfService = new QuotationPdfService();