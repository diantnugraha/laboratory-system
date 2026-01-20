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

const PRIORITY_RATES: Record<string, number> = {
  normal: 0,
  urgent: 50,
  'very urgent': 100,
  'very-urgent': 100,
};

const MIN_TOTAL = 200000;
const MIN_VAT = 22000;
const MIN_GRAND_TOTAL = 222000;

const NEW_ADDRESS_DATE = new Date('2025-09-01');

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

interface AddressData {
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface CustomerData {
  id: number;
  customer_name: string;
  top?: number | null;
}

interface ServiceDetail {
  id: number;
  name: string;
  price: number;
  method?: { name: string };
  parameter_id?: number;
  use_pc?: boolean;
}

interface PackageDetail {
  id: number;
  name: string;
  totalPrice: number | null;
  services?: ServiceDetail[];
}

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

interface ProductItem {
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

interface CreatorData {
  first_name: string;
  middle_name?: string | null;
  surname: string;
}

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

export class QuotationPdfService {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }

  private formatDateEnglish(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private spaceOut(value: string): string {
    return value.split('').join(' ');
  }

  private getContactFullName(contact: ContactData): string {
    const parts = [contact.title, contact.first_name, contact.middle_name, contact.surname].filter(Boolean);
    return parts.join(' ');
  }

  private getCreatorFullName(creator: CreatorData): string {
    const parts = [creator.first_name, creator.middle_name, creator.surname].filter(Boolean);
    return parts.join(' ');
  }

  private getPriorityRate(priority: string): number {
    const normalizedPriority = priority?.toLowerCase().trim() || 'normal';
    return PRIORITY_RATES[normalizedPriority] || 0;
  }

  private isSpecialCustomer(customerId: number): boolean {
    return SPECIAL_CUSTOMER_IDS.includes(customerId);
  }

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

  private calculateTotals(data: QuotationPdfData, isSpecial: boolean) {
    let totalBasePrice = 0;
    let totalDiscount = 0;
    let totalPriorityCharge = 0;
    let productSubTotal = 0;

    for (const product of data.products) {
      const basePrice = product.price * product.quantity;
      const discountAmount = (product.discount / 100) * basePrice;
      const total = basePrice - discountAmount;
      productSubTotal += total;
      totalBasePrice += basePrice;
      totalDiscount += discountAmount;
    }

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

        let priorityCharge = 0;
        if (!isSpecial) {
          if (item.service) {
            const canApplyPc = item.service.parameter_id !== 0 || item.service.parameter_id === undefined;
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

    let subTotal = totalBasePrice - totalDiscount + totalPriorityCharge;
    let vat: number;
    let grandTotal: number;

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
          line-height: 1.3;
          color: #000;
        }

        .page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 15mm 52mm 15mm;
          page-break-after: always;
        }
        .page:last-child {
          page-break-after: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5mm;
        }
        .header-left {
          width: 75mm;
        }
        .header-logo {
          height: 20mm;
          width: auto;
        }
        .header-title {
          margin-top: 8mm;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 0.05em;
          color: #000;
        }
        .header-right {
          text-align: right;
        }
        .header-line {
          height: 3px;
          background: #0066b3;
          width: 95mm;
          margin-bottom: 5mm;
          margin-left: auto;
        }
        .header-info-row {
          display: flex;
          justify-content: flex-end;
          gap: 3mm;
          margin-bottom: 1mm;
          font-size: 11px;
        }
        .header-info-label {
          font-weight: bold;
        }
        .header-info-value {
          width: 45mm;
          text-align: left;
        }
        .barcode-section {
          display: flex;
          justify-content: flex-end;
          gap: 3mm;
          margin-top: 3mm;
          font-size: 11px;
        }
        .barcode-container {
          text-align: left;
        }
        .barcode-img {
          height: 14mm;
          width: auto;
        }
        .barcode-text {
          font-size: 18px;
          font-weight: 500;
          letter-spacing: 0.12em;
          margin-top: 1mm;
        }

        .customer-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 10mm;
          margin-bottom: 5mm;
          font-size: 11px;
          line-height: 1.4;
        }
        .customer-row {
          display: flex;
          margin-bottom: 0.5mm;
        }
        .customer-label {
          font-weight: bold;
          width: 22mm;
          flex-shrink: 0;
        }
        .customer-value {
          flex: 1;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        th, td {
          border: 1px solid #000;
          padding: 4px 6px;
          vertical-align: top;
        }
        th {
          font-weight: bold;
          text-align: center;
          background: #fff;
        }
        tr {
          page-break-inside: avoid;
        }
        thead {
          display: table-header-group;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }

        .sample-header-row {
          background-color: #f0f0f0;
        }
        .sample-header-row td {
          font-weight: bold;
        }

        .subtotal-row {
          background-color: #e0e0e0;
        }
        .subtotal-row td {
          font-weight: bold;
        }

        .remarks-summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 3mm;
          margin-bottom: 3mm;
        }
        .remarks-summary-table td {
          border: 1px solid #000;
          padding: 5px;
          vertical-align: top;
        }
        .remarks-cell {
          width: 55%;
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
          padding: 3px 6px;
        }
        .summary-label {
          text-align: right;
          font-weight: bold;
        }
        .summary-value {
          text-align: right;
          width: 90px;
        }

        .services-grid {
          margin-top: 4mm;
          margin-bottom: 4mm;
          font-size: 10px;
        }
        .services-grid p {
          margin-bottom: 2mm;
          text-align: justify;
        }
        .services-grid-table {
          width: 100%;
          border-collapse: collapse;
        }
        .services-grid-table td, .services-grid-table th {
          border: 1px solid #000;
          padding: 5px;
          vertical-align: top;
        }
        .service-label-col {
          width: 45mm;
        }

        .signature-section {
          margin-top: 5mm;
          font-size: 11px;
          line-height: 1.8;
        }

        .footer {
          position: absolute;
          bottom: 8mm;
          left: 15mm;
          right: 15mm;
        }
        .page-number {
          text-align: right;
          font-size: 10px;
          margin-bottom: 2mm;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .footer-left {
          width: 50%;
        }
        .footer-right {
          width: 45%;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .footer-lab-title {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 1mm;
        }
        .footer-lab-address {
          font-size: 9px;
          line-height: 1.3;
        }
        .footer-lab-contact {
          margin-top: 2mm;
          font-size: 9px;
          color: #0066b3;
        }
        .footer-line {
          height: 3px;
          background: #0066b3;
          width: 100%;
          margin-top: 2mm;
        }
        .footer-logos {
          display: flex;
          align-items: center;
          gap: 3mm;
          margin-bottom: 1mm;
        }
        .footer-logo-ilac {
          height: 38px;
          width: auto;
        }
        .footer-logo-kan {
          height: 42px;
          width: auto;
        }
        .footer-logo-tuv-group {
          height: 12px;
          width: auto;
          margin-bottom: 1mm;
        }

        .terms-page .header-title {
          display: none;
        }
        .terms-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4mm;
        }
        .terms-columns {
          display: grid;
          grid-template-columns: 40% 60%;
          gap: 4mm;
        }
        .terms-block {
          margin-bottom: 3mm;
        }
        .terms-block-title {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 1mm;
        }
        .terms-block-content {
          font-size: 8px;
          line-height: 1.4;
          text-align: justify;
        }
        .terms-block-content ul {
          margin-left: 4mm;
          padding-left: 0;
        }
        .terms-block-content li {
          margin-bottom: 1mm;
        }
        .standard-terms-title {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 2mm;
        }
        .standard-terms-content {
          font-size: 6px;
          line-height: 1.3;
          text-align: justify;
        }
        .standard-terms-content p {
          margin-bottom: 1.5mm;
        }

        .package-services {
          font-size: 9px;
          color: #333;
          margin-top: 1px;
          padding-left: 2mm;
        }
      </style>
    `;
  }

  private buildHeader(data: QuotationPdfData, barcodeImg: string, showTitle: boolean = true): string {
    return `
      <div class="header">
        <div class="header-left">
          <img src="${getTuvNordLogo()}" alt="TÜV NORD" class="header-logo" />
          ${showTitle ? '<div class="header-title">QUOTATION</div>' : ''}
        </div>
        <div class="header-right">
          <div class="header-line"></div>
          <div class="header-info-row">
            <span class="header-info-label">Quotation Date</span>
            <span class="header-info-value">${this.formatDateEnglish(data.quo_date)}</span>
          </div>
          <div class="header-info-row">
            <span class="header-info-label">Expiration Date</span>
            <span class="header-info-value">${this.formatDateEnglish(data.expired_date)}</span>
          </div>
          <div class="barcode-section">
            <span class="header-info-label">Quotation No.</span>
            <div class="barcode-container">
              ${barcodeImg ? `<img src="${barcodeImg}" class="barcode-img" alt="${data.code}"/>` : ''}
              <div class="barcode-text">${this.spaceOut(data.code)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private buildFooter(pageNum: number, totalPages: number): string {
    return `
      <div class="footer">
        <div class="page-number">Page ${pageNum} from ${totalPages}</div>
        <div class="footer-content">
          <div class="footer-left">
            <div class="footer-lab-title">Laboratorium PT TUV NORD Indonesia</div>
            <div class="footer-lab-address">
              Jl.Science Timur 1 Blok B3-F1<br>
              Kawasan industri jababeka V<br>
              Kel. Setajaya Kec. Cikarang Timur<br>
              Kabupaten Bekasi - Jawa Barat - 17530
            </div>
            <div class="footer-lab-contact">
              Email cslab.id@tuv-nord.com<br>
              Phone +62 21 29574720
            </div>
            <div class="footer-line"></div>
          </div>
          <div class="footer-right">
            <div class="footer-logos">
              <img src="${getIlacMraLogo()}" class="footer-logo-ilac" />
              <img src="${getKanLogo()}" class="footer-logo-kan" />
            </div>
            <img src="${getTuvNordGroupLogo()}" class="footer-logo-tuv-group" />
            <div class="footer-line"></div>
          </div>
        </div>
      </div>
    `;
  }

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
            <span class="customer-value">${contactName}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Company</span>
            <span class="customer-value">${data.customer.customer_name}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Address</span>
            <span class="customer-value">${addressParts.join('<br>')}</span>
          </div>
        </div>
        <div>
          <div class="customer-row">
            <span class="customer-label">Phone</span>
            <span class="customer-value">${data.contact.phone || '-'}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Fax</span>
            <span class="customer-value">${data.contact.fax || ''}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Mobile Phone</span>
            <span class="customer-value">${data.contact.mobile_phone || ''}</span>
          </div>
          <div class="customer-row">
            <span class="customer-label">Email Address</span>
            <span class="customer-value">${data.contact.email || ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  private buildProductsTable(products: ProductItem[]): string {
    if (!products || products.length === 0) return '';

    let html = `
      <table style="margin-bottom: 3mm;">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>ADDITIONAL CHARGE</th>
            <th style="width: 80px;">PRICE</th>
            <th style="width: 40px;">QTY</th>
            <th style="width: 50px;">DISC%</th>
            <th style="width: 80px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>`;

    products.forEach((product, idx) => {
      const basePrice = product.price * product.quantity;
      const discountAmount = (product.discount / 100) * basePrice;
      const total = basePrice - discountAmount;

      html += `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${product.name}</td>
          <td class="text-right">${this.formatCurrency(product.price)}</td>
          <td class="text-center">${product.quantity}</td>
          <td class="text-center">${product.discount}</td>
          <td class="text-right">${this.formatCurrency(total)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    return html;
  }

  private buildSamplesTable(data: QuotationPdfData, isSpecial: boolean): string {
    if (!data.samples || data.samples.length === 0) return '';

    const colDefs = isSpecial
      ? `<th style="width: 30px;">No</th>
         <th>SERVICES</th>
         <th style="width: 100px;">METHOD</th>
         <th style="width: 40px;">QTY</th>
         <th style="width: 80px;">TOTAL</th>`
      : `<th style="width: 30px;">No</th>
         <th>SERVICES</th>
         <th style="width: 100px;">METHOD</th>
         <th style="width: 70px;">PRICE</th>
         <th style="width: 35px;">QTY</th>
         <th style="width: 45px;">DISC%</th>
         <th style="width: 35px;">PC%</th>
         <th style="width: 70px;">TOTAL</th>`;

    let html = `
      <table>
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

      const colspan = isSpecial ? 4 : 7;
      html += `
        <tr class="sample-header-row">
          <td colspan="${colspan}">${sample.name}</td>
          <td class="text-center"><span style="font-weight: normal;">Priority</span> ${priorityLabel}</td>
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
              packageServicesHtml += `- ${svc.name} | ${svc.method?.name || ''}<br>`;
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
            const canApplyPc = item.service.parameter_id !== 0 || item.service.parameter_id === undefined;
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
              <td class="text-center">${rowNum}</td>
              <td>${itemName}${item.package ? ' :' : ''}${packageServicesHtml}</td>
              <td>${methodName}</td>
              <td class="text-center">${qty}</td>
              <td class="text-right">${this.formatCurrency(total)}</td>
            </tr>`;
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
            </tr>`;
        }
        rowNum++;
      }

      grandSubTotal += sampleSubTotal;
    }

    const subTotalColspan = isSpecial ? 4 : 7;
    html += `
        <tr class="subtotal-row">
          <td colspan="${subTotalColspan}" class="text-right">Sub Total (IDR)</td>
          <td class="text-right">${this.formatCurrency(grandSubTotal)}</td>
        </tr>
      </tbody>
    </table>`;

    return html;
  }

  private buildRemarksSummary(
    data: QuotationPdfData,
    totals: ReturnType<typeof this.calculateTotals>,
    isSpecial: boolean
  ): string {
    const remarksContent = data.remarks ? data.remarks.replace(/\n/g, '<br>') : '';

    const summaryRows = isSpecial
      ? `
        <tr>
          <td class="summary-label">Sub Total (IDR)</td>
          <td class="summary-value">${this.formatCurrency(totals.subTotal)}</td>
        </tr>
        <tr>
          <td class="summary-label">VAT (IDR)</td>
          <td class="summary-value">${this.formatCurrency(totals.vat)}</td>
        </tr>
        <tr>
          <td class="summary-label">Grand Total (IDR)</td>
          <td class="summary-value" style="font-weight: bold;">${this.formatCurrency(totals.grandTotal)}</td>
        </tr>`
      : `
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
        <tr>
          <td class="summary-label">Grand Total (IDR)</td>
          <td class="summary-value" style="font-weight: bold;">${this.formatCurrency(totals.grandTotal)}</td>
        </tr>`;

    return `
      <table class="remarks-summary-table">
        <tr>
          <td class="remarks-cell">
            <strong>Remarks :</strong><br>
            ${remarksContent}
          </td>
          <td class="summary-cell">
            <table class="summary-inner-table">
              ${summaryRows}
            </table>
          </td>
        </tr>
      </table>`;
  }

  private buildServicesGrid(): string {
    return `
      <div class="services-grid">
        <p>With our experience and expertise in ITC (Inspection, Testing & Certification) business we also offer you one stop solution with special discount for another valuable services that we can provided:</p>
        <table class="services-grid-table">
          <thead>
            <tr>
              <th colspan="2">Services</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="service-label-col">System Certification(Additional Scheme)</td>
              <td>ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc.</td>
            </tr>
            <tr>
              <td class="service-label-col">Product Certification</td>
              <td>SNI, CE, GS, etc.</td>
            </tr>
            <tr>
              <td class="service-label-col">Inspection</td>
              <td>Rack Inspection, QA/QC Inspection, etc.</td>
            </tr>
            <tr>
              <td class="service-label-col">Training</td>
              <td>In House Training for All Management Systems Topic (Awareness, Internal Audit, Documentation, etc.)</td>
            </tr>
            <tr>
              <td class="service-label-col">Laboratory Services</td>
              <td>Consumer goods product testing, Product stability & shelf life, Environmental testing & monitoring, Industrial Hygine, Petroleum & chemical analysis, Calibration</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 2mm;">For complete information please feel free to contact our Sales Representative.</p>
      </div>`;
  }

  private buildSignatureSection(data: QuotationPdfData): string {
    const creatorName = this.getCreatorFullName(data.creator);
    return `
      <div class="signature-section">
        <p>Created by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${creatorName}</strong></p>
        <p>Customer Approval: _______________________________________________________________________</p>
      </div>`;
  }

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
            <p>All services provided by TÜV NORD Laboratory ("TÜV NORD Laboratory") are subject to the terms and conditions stated herein. As our client, you ("Client") understand and agree that placement of any order for our services constitutes acceptance of the terms and conditions stated herein. To the exten that any Client order contains anyi terms or conditions that vary from the terms and conditions stated herein, all such additional or varying terms and conditions shallbe of no force or effect, and shall not be part of the Client- TÜV NORD Laboratory relationship or contract, even if TÜV NORD Laboratory performs the requested service.</p>

            <p><strong>CONFIDENTIALITY</strong> confidentiality is maintained in all interractions with Clients. Appropriate confidentiality agreements are signed willingly. If information is subpoenaed and released through the operation of any judicial, regulatory, or similar process, the Client is notified. In TÜV NORD Laboratory name or data in any manner which might cause harm to TÜV NORD Laboratory reputation and/or business. Under no circumtances in the name of TÜV NORD Laboratory to be published, either alone or in association with that of any other party, without prior written approval.</p>

            <p><strong>PAYMENT TERMS</strong> ${paymentTerms} Minimum order per invoice is Rp 200.000,- .Prices are subject to change without notice. The payment can be transferred to PT. TÜV NORD Indonesia, Bank HSBC World Trade Centre, A/C No. 050-074269- 001.</p>

            <p><strong>BILLING</strong> All fees or bills are charged direcly to the Client, unless a third party has been authorized via a signed statement indicating payment responsibility. It is assumed that the paperwork submitted with a sample describes the testing desired. If changes are made after the originally requested testing is initiated or completed. The Client must accept payment responsibility. Please notify TÜV NORD Laboratory immediately if changes in testing are necessary.</p>

            <p><strong>SAMPLE SUBMISSION</strong> sample submission should be made on a TÜV NORD Laboratory "Sample Testing Application Form (STAF). Please contact our Laboratory staff to get complete information.</p>

            <p><strong>HAZARDOUS SUBSTANCES AND PATHOGEN</strong> any sample containing or suspected to contain a pathogen or substance that is considered hazardous must be clearly indentifief as such on the container and communicated to TÜV NORD Laboratory before shipping. TÜV NORD Laboratory reserves the right to refuse any sample which may pose a risk to employees.</p>

            <p><strong>ANALYSIS</strong> TÜV NORD Laboratory strives to provide a seven (7) until ten (10) working day turnaround. Rush analysis is offered contingent upon pre-notification and approval of TÜV NORD Laboratory. Howeever, a rush fee of 100% surcharge of the list fee will be added to the invoice for each analysis completed in fewer than (5) working days at the request of the Client. TÜV NORD Laboratory reserves the right to outsource an analysis entirely at TÜV NORD Laboratory expense and without prior notification to Client, unless Client requests otherwise. Reported result relate only to the items tested and test reports shall not be reproduced except in full.</p>

            <p><strong>LITIGATION</strong> All costs associated with litigation or dispute, incluing complieance for all document, for oral or written testimony or preparation of same, or for any others purpose related to work provided by TÜV NORD Laboratory in connection with analyses/reports performed/completed for the Client, shall be paid by the Client. Such costs include, but are not limited to, hourly charges, travel accomodations, mileage, counsel, and all other expenses associated with said litigation or dispute.</p>

            <p><strong>WARRANTY AND LIMITS OF LIABILITY</strong> TÜV NORD Laboratory warrants that all services will be performed in a timely manner by competent personel. Any services performed by TÜV NORD Laboratory under proper technical direction by Client. Which are determined by Client to have been performed improperly in light of the above warranty . and which after investigation by the TÜV NORD Laboratory are acknowledged in writing by TÜV NORD Laboratory President Director to have been performed improperly. Shall be corrected by TÜV NORD Laboratory without charge to Client, provided that Client provides TÜV NORD Laboratory with a written request for such correction within two (2) weeks after Client knew or should reasonably have known of problem. The liability of the TÜV NORD Laboratory in respect of any claims for loss, damage or expense of whatoever nature and howsoever arising in respect of any breach of contract and/or any failure to exercise due sklikk and care by the TÜV NORD Laboratory shall in no circumtances exceed a total aggregate sum equal to ten (10) times the amount of the fee or commission payable in respect of the specific services required under the particular contract with the TÜV NORD Laboratory which gives rise to such claims for indirect or consequential loss including loss of profit and/or loss of future bussniness and/or loss of productions and/or cancellation of contracts entered into by the Client. The TÜV NORD Laboratory shall not in any event be liable for any loss or damage caused by delay in performanc or non-performance of any of its services where the same is occasioned by any cause whatsoever that is beyond the TÜV NORD Laboratory control including but not limited to war, civil disturbance, requisitioning, governmental or parliamentary restriction, prohibitions or enactment of any kind, import or export regulations, strike or trade dipute (whetever incolving its own employees or those of any other person), difficulties in obtaining workmen or materials, breakdown of machinery, fire or accident. Should any such event occur the TÜV NORD Laboratory may cancel or suspend any contract for the provision of services without incurring any liability whatsoever. The TÜV NORD Laboratory will not be liable to the Client for any loss or damage whatsoever sustained by the Client as a result of any failure by the TÜV NORD Laboratory to comply with any time estimate given by the TÜV NORD Laboratory relating to the provision of its services. TÜV NORD Laboratory accepted no legal responsibility for the purpose for which the Client uses the test result or report, or for any consequence of such use. TÜV NORD Laboratory provide no guidance regarding and accept no legal responsibility for the purpose for which the Client uses the test result or reports, and shall have no legal responsibility forany consequence of such use. Client agrees ti indemnify and defend TÜV NORD Laboratory all claims, damages, liabilities, and expenses relating ti Client's use of TÜV NORD Laboratory's services or Client's Marketing, distribution, sale, or other dissemination of Client's products or services. The allocations of liability in this WARRANTY AND LIMITS OF LIABILITY section represent the agreed and bargained-for understanding between the Client and TÜV NORD Laboratory, TÜV NORD Laboratory fees for the services provided hereunder reflect such allocations.</p>
          </div>
        </div>
      </div>`;
  }

  private buildTermsHeader(data: QuotationPdfData, barcodeImg: string): string {
    return `
      <div class="header">
        <div class="header-left">
          <img src="${getTuvNordLogo()}" alt="TÜV NORD" class="header-logo" />
        </div>
        <div class="header-right">
          <div class="header-line"></div>
          <div class="header-info-row">
            <span class="header-info-label">Date</span>
            <span class="header-info-value">${this.formatDateEnglish(data.quo_date)}</span>
          </div>
          <div class="barcode-section">
            <span class="header-info-label">Quotation No.</span>
            <div class="barcode-container">
              ${barcodeImg ? `<img src="${barcodeImg}" class="barcode-img" alt="${data.code}"/>` : ''}
              <div class="barcode-text">${this.spaceOut(data.code)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async generatePdf(data: QuotationPdfData): Promise<Buffer> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);
    const barcodeImg = await this.generateBarcode(data.code);
    const totals = this.calculateTotals(data, isSpecial);
    const styles = this.buildStyles();

    // Build main content HTML (without page wrappers - we'll add them after measuring)
    const mainContentHtml = `
      ${this.buildHeader(data, barcodeImg, true)}
      ${this.buildCustomerSection(data)}
      ${this.buildProductsTable(data.products)}
      ${this.buildSamplesTable(data, isSpecial)}
      ${this.buildRemarksSummary(data, totals, isSpecial)}
      ${this.buildServicesGrid()}
      ${this.buildSignatureSection(data)}
    `;

    const termsContentHtml = `
      ${this.buildTermsHeader(data, barcodeImg)}
      ${this.buildTermsContent(data.customer, data.created_at)}
    `;

    // First pass: render to measure pages
    const measureHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
        <div class="page" id="main-content">
          ${mainContentHtml}
        </div>
        <div class="page terms-page" id="terms-content">
          ${termsContentHtml}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(measureHtml, { waitUntil: 'networkidle0', timeout: 60000 });

      // Get total pages by generating a preliminary PDF
      const prelimPdf = await page.pdf({ format: 'A4', printBackground: true });
      const totalPages = await this.countPdfPages(prelimPdf);

      // Now rebuild with correct page numbers
      let finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
      `;

      // For simplicity, we'll use a single flow approach with CSS handling page breaks
      // The footer will be added to each logical section

      // Main content pages (may span multiple pages due to table content)
      finalHtml += `
        <div class="page">
          ${mainContentHtml}
          ${this.buildFooter(1, totalPages)}
        </div>
      `;

      // Terms page
      finalHtml += `
        <div class="page terms-page">
          ${termsContentHtml}
          ${this.buildFooter(totalPages, totalPages)}
        </div>
      `;

      finalHtml += `</body></html>`;

      await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 60000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        timeout: 60000,
      });

      await page.close();
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async countPdfPages(pdfBuffer: Uint8Array): Promise<number> {
    // Simple page count by looking for /Page objects in PDF
    const pdfString = Buffer.from(pdfBuffer).toString('latin1');
    const matches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
  }

  async generateHtmlPreview(data: QuotationPdfData): Promise<string> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);
    const barcodeImg = await this.generateBarcode(data.code);
    const totals = this.calculateTotals(data, isSpecial);
    const styles = this.buildStyles();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
        <div class="page">
          ${this.buildHeader(data, barcodeImg, true)}
          ${this.buildCustomerSection(data)}
          ${this.buildProductsTable(data.products)}
          ${this.buildSamplesTable(data, isSpecial)}
          ${this.buildRemarksSummary(data, totals, isSpecial)}
          ${this.buildServicesGrid()}
          ${this.buildSignatureSection(data)}
          ${this.buildFooter(1, 2)}
        </div>
        <div class="page terms-page">
          ${this.buildTermsHeader(data, barcodeImg)}
          ${this.buildTermsContent(data.customer, data.created_at)}
          ${this.buildFooter(2, 2)}
        </div>
      </body>
      </html>
    `;
  }
}

export const quotationPdfService = new QuotationPdfService();
