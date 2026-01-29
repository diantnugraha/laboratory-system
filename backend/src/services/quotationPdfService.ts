import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { quotationCalculationService, QuotationLineItem } from './quotationCalculationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for logos
let cachedLogos: {
  tuvNord?: Buffer;
  ilacMra?: Buffer;
  kan?: Buffer;
  tuvNordGroup?: Buffer;
} = {};

function getTuvNordLogoBuffer(): Buffer {
  if (!cachedLogos.tuvNord) {
    const logoPath = path.join(__dirname, '../assets/pdf/tuv-nord-logo.png');
    cachedLogos.tuvNord = fs.readFileSync(logoPath);
  }
  return cachedLogos.tuvNord;
}

function getIlacMraLogoBuffer(): Buffer {
  if (!cachedLogos.ilacMra) {
    const logoPath = path.join(__dirname, '../assets/pdf/ilac-mra.png');
    cachedLogos.ilacMra = fs.readFileSync(logoPath);
  }
  return cachedLogos.ilacMra;
}

function getKanLogoBuffer(): Buffer | null {
  if (!cachedLogos.kan) {
    try {
      const logoPath = path.join(__dirname, '../assets/pdf/kan-logo.png');
      cachedLogos.kan = fs.readFileSync(logoPath);
    } catch {
      return null;
    }
  }
  return cachedLogos.kan;
}

function getTuvNordGroupLogoBuffer(): Buffer {
  if (!cachedLogos.tuvNordGroup) {
    const logoPath = path.join(__dirname, '../assets/pdf/tuv-nord-group.png');
    cachedLogos.tuvNordGroup = fs.readFileSync(logoPath);
  }
  return cachedLogos.tuvNordGroup;
}

const SPECIAL_CUSTOMER_IDS = [34, 2013, 65];
const PRIORITY_RATES: Record<string, number> = { normal: 0, urgent: 50, 'very urgent': 100, 'very-urgent': 100 };

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&apos;': "'"
  };

  // First decode named entities
  let decoded = text.replace(/&[a-zA-Z0-9]+;/g, (match) => entities[match] || match);

  // Then decode numeric entities like &#8217;
  decoded = decoded.replace(/&#(\d+);/g, (_match, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });

  return decoded;
}

// Helper function to strip HTML tags from text
function stripHtmlTags(htmlText: string): string {
  const decoded = decodeHtmlEntities(htmlText);
  return decoded.replace(/<[^>]+>/g, '');
}

// Helper function to calculate height of HTML text
function heightOfHtmlString(
  doc: PDFKit.PDFDocument,
  htmlText: string,
  options: { width: number; fontSize?: number }
): number {
  const plainText = stripHtmlTags(htmlText);
  const fontSize = options.fontSize || 7;
  doc.fontSize(fontSize);
  return doc.heightOfString(plainText, { width: options.width });
}

// Helper function to render HTML text with formatting (italic, superscript, etc.)
function renderHtmlText(
  doc: PDFKit.PDFDocument,
  htmlText: string,
  x: number,
  y: number,
  options: { width: number; align?: string; baseFont?: string; baseFontSize?: number }
): number {
  const baseFont = options.baseFont || 'Helvetica';
  const baseFontSize = options.baseFontSize || 7;

  // Decode HTML entities first
  let text = decodeHtmlEntities(htmlText);

  // Remove <sup> tags but keep the content (don't convert to unicode)
  // Just render as normal text to avoid character corruption
  text = text.replace(/<sup>(.*?)<\/sup>/gi, '$1');

  // Remove <sub> tags if present
  text = text.replace(/<sub>(.*?)<\/sub>/gi, '$1');

  // Parse <i> tags for italic rendering
  const parts: Array<{ text: string; italic: boolean }> = [];
  const italicPattern = /<i>(.*?)<\/i>/gi;
  let lastIndex = 0;
  let match;

  while ((match = italicPattern.exec(text)) !== null) {
    // Add text before italic
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), italic: false });
    }
    // Add italic text
    parts.push({ text: match[1], italic: true });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), italic: false });
  }

  // If no italic tags, just render as plain text
  if (parts.length === 0) {
    parts.push({ text, italic: false });
  }

  // Render parts with proper font switching
  doc.fillColor('#333');
  const align = (options.align as 'left' | 'center' | 'right' | 'justify') || 'left';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.text) continue;

    const font = part.italic ? `${baseFont}-Oblique` : baseFont;
    doc.font(font).fontSize(baseFontSize);

    const isLastPart = i === parts.length - 1;
    const isFirstPart = i === 0;

    if (isFirstPart) {
      doc.text(part.text, x, y, {
        width: options.width,
        align: align,
        continued: !isLastPart,
        lineGap: 0
      });
    } else {
      doc.text(part.text, {
        continued: !isLastPart,
        lineGap: 0
      });
    }
  }

  // Calculate actual height used
  const plainText = stripHtmlTags(htmlText);
  doc.font(baseFont).fontSize(baseFontSize);
  const textHeight = doc.heightOfString(plainText, { width: options.width });
  return textHeight;
}
const NEW_ADDRESS_DATE = new Date('2025-09-01');

// PDF Layout Constants (in points, 1mm = 2.83465 points)
const mm = (value: number) => value * 2.83465;
const PAGE_WIDTH = mm(210); // A4 width
const PAGE_HEIGHT = mm(297); // A4 height
const MARGIN_LEFT = mm(12);
const MARGIN_RIGHT = mm(12);
const MARGIN_TOP = mm(10);
const MARGIN_BOTTOM = mm(10);
const HEADER_HEIGHT = mm(40);
const FOOTER_HEIGHT = mm(30);
const CONTENT_START_Y = MARGIN_TOP + HEADER_HEIGHT;
const CONTENT_END_Y = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

interface ContactData { title?: string; first_name: string; middle_name?: string | null; surname: string; phone?: string; fax?: string; mobile_phone?: string; email?: string; }
interface AddressData { address: string; city?: string; state?: string; postal_code?: string; country?: string; }
interface CustomerData { id: number; customer_name: string; top?: number | null; }
interface ServiceDetail { id: number; name: string; price: number; method?: { name: string }; parameter_id?: number; use_pc?: boolean; }
interface PackageDetail { id: number; name: string; totalPrice: number | null; services?: ServiceDetail[]; }
interface SampleItem { name: string; priority: string; quantity: number; services: Array<{ service?: ServiceDetail; package?: PackageDetail; quantity: number; discount: number; price: number; isProduct?: boolean; }>; }
interface ProductItem { name: string; price: number; quantity: number; discount: number; }
interface CreatorData { first_name: string; middle_name?: string | null; surname: string; }
export interface QuotationPdfData { id: number; code: string; quo_date: Date; created_at: Date; expired_date: Date; priority: string; lab?: string | null; percent_vat: number; percent_discount: number; remarks?: string | null; customer: CustomerData; contact: ContactData; address: AddressData; creator: CreatorData; samples: SampleItem[]; products: ProductItem[]; totals?: { total: number; discount: number; priorityCharge: number; subTotal: number; vat: number; grandTotal: number; }; }

export class QuotationPdfService {
  private formatCurrency(amount: number): string {
    if (isNaN(amount) || amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
  }

  private formatDateEnglish(date: Date | string | null | undefined): string {
    if (!date) return '-';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '-';
      return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return '-'; }
  }

  private getContactFullName(contact: ContactData): string { return [contact.title, contact.first_name, contact.middle_name, contact.surname].filter(Boolean).join(' '); }
  private getCreatorFullName(creator: CreatorData): string { return [creator.first_name, creator.middle_name, creator.surname].filter(Boolean).join(' '); }
  private getPriorityRate(priority: string): number { return PRIORITY_RATES[priority?.toLowerCase().trim() || 'normal'] || 0; }
  private isSpecialCustomer(customerId: number): boolean { return SPECIAL_CUSTOMER_IDS.includes(customerId); }

  private async generateBarcodeBuffer(code: string): Promise<Buffer> {
    try {
      return await bwipjs.toBuffer({
        bcid: 'code128',      // Barcode type
        text: code,
        scale: 2,             // Scale factor
        height: 8,            // Height in mm
        includetext: false    // Don't include text in the barcode image
      });
    } catch {
      return Buffer.alloc(0);
    }
  }

  private calculateTotals(data: QuotationPdfData, isSpecial: boolean) {
    // Use pre-calculated totals from controller if available
    if (data.totals) {
      return {
        totalBasePrice: Math.round(data.totals.total),
        totalDiscount: Math.round(data.totals.discount),
        totalPriorityCharge: Math.round(data.totals.priorityCharge),
        subTotal: Math.round(data.totals.subTotal),
        vat: Math.round(data.totals.vat),
        grandTotal: Math.round(data.totals.grandTotal),
        productSubTotal: 0,
      };
    }

    // Fallback: calculate from items using unified calculation service
    const items: QuotationLineItem[] = [];
    let productSubTotal = 0;

    // Add products
    for (const product of data.products || []) {
      const price = Number(product.price) || 0;
      const quantity = Number(product.quantity) || 0;
      const discount = Number(product.discount) || 0;
      const basePrice = price * quantity;
      const discountAmount = (discount / 100) * basePrice;
      productSubTotal += basePrice - discountAmount;

      items.push({
        unitPrice: price,
        serviceQuantity: quantity,
        sampleQuantity: 1,
        discountPercent: discount,
        applyPriorityCharge: false, // Products don't have PC
      });
    }

    // Add services from samples
    for (const sample of data.samples || []) {
      const sampleQty = Number(sample.quantity) || 1;

      for (const item of sample.services || []) {
        let itemPrice = 0;
        let applyPc = false;

        if (item.package) {
          itemPrice = Number(item.package.totalPrice) || 0;
          applyPc = !isSpecial; // Packages apply PC unless special customer
        } else if (item.service) {
          itemPrice = Number(item.service.price) || Number(item.price) || 0;
          // Check if PC should apply
          if (!isSpecial) {
            const canApplyPc = item.service.parameter_id !== 0 || item.service.parameter_id === undefined;
            applyPc = canApplyPc || Boolean(item.service.use_pc);
          }
        } else if (item.isProduct) {
          itemPrice = Number(item.price) || 0;
          applyPc = false;
        }

        const itemQty = Number(item.quantity) || 1;
        const itemDiscount = Number(item.discount) || 0;

        items.push({
          unitPrice: itemPrice,
          serviceQuantity: itemQty,
          sampleQuantity: sampleQty,
          discountPercent: itemDiscount,
          applyPriorityCharge: applyPc,
        });
      }
    }

    // Use shared calculation service
    const percentVat = Number(data.percent_vat) || 11;
    const percentDiscount = Number(data.percent_discount) || 0;

    const totals = quotationCalculationService.calculateFromItems({
      items,
      quotationDiscountPercent: percentDiscount,
      priority: data.priority || 'normal',
      vatPercent: percentVat,
    });

    // Map to legacy format expected by PDF rendering
    // Note: totalDiscount now includes BOTH item-level and quotation-level discounts
    const totalDiscount = totals.itemDiscountTotal + totals.quotationDiscountTotal;

    return {
      totalBasePrice: totals.grossTotal,
      totalDiscount: totalDiscount,
      totalPriorityCharge: totals.priorityChargeTotal,
      subTotal: totals.subTotal,
      vat: totals.vatTotal,
      grandTotal: totals.grandTotal,
      productSubTotal: Math.round(productSubTotal),
    };
  }

  private getBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  async generatePdf(data: QuotationPdfData): Promise<Buffer> {
    const isSpecial = this.isSpecialCustomer(data.customer.id);
    const barcodeBuffer = await this.generateBarcodeBuffer(data.code);
    const totals = this.calculateTotals(data, isSpecial);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      autoFirstPage: true
    });

    // Draw main content page
    this.drawPage1(doc, data, barcodeBuffer, isSpecial, totals);

    // Draw terms page
    this.drawTermsPage(doc, data);

    // Add header/footer to ALL pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      this.drawHeader(doc, data, barcodeBuffer, i);
      this.drawFooter(doc, i + 1, pageCount);
    }

    doc.end();
    return await this.getBuffer(doc);
  }

  private drawHeader(doc: PDFKit.PDFDocument, data: QuotationPdfData, barcodeBuffer: Buffer, pageIndex: number): void {
    const x = MARGIN_LEFT;
    const y = MARGIN_TOP;

    // Draw TUV NORD logo
    doc.image(getTuvNordLogoBuffer(), x, y, { width: mm(40), height: mm(20) });

    // Draw "QUOTATION" title (only on first page)
    if (pageIndex === 0) {
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor('#000000')
         .text('QUOTATION', x, y + mm(25), { characterSpacing: 0.5 });
    }

    // Right section - Blue line, table, barcode
    const rightX = PAGE_WIDTH - MARGIN_RIGHT - mm(95);
    const rightY = y;

    // Blue line
    doc.moveTo(rightX, rightY)
       .lineTo(PAGE_WIDTH - MARGIN_RIGHT, rightY)
       .lineWidth(mm(0.5))
       .strokeColor('#0c2ad5')
       .stroke();

    // Info table
    const tableY = rightY + mm(3);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
    doc.text('Quotation Date', rightX, tableY, { width: mm(40), continued: false });
    doc.font('Helvetica').text(this.formatDateEnglish(data.quo_date), rightX + mm(42), tableY);

    doc.font('Helvetica-Bold').text('Expiration Date', rightX, tableY + mm(5));
    doc.font('Helvetica').text(this.formatDateEnglish(data.expired_date), rightX + mm(42), tableY + mm(5));

    doc.font('Helvetica-Bold').text('Quotation No.', rightX, tableY + mm(10));

    // Barcode inline with Quotation No.
    if (barcodeBuffer.length > 0) {
      const barcodeX = rightX + mm(42);
      const barcodeY = tableY + mm(9);
      const barcodeWidth = mm(35);
      const barcodeHeight = mm(8);

      // Draw barcode image inline
      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeWidth, height: barcodeHeight });

      // Draw quotation code below barcode (centered)
      doc.font('Helvetica').fontSize(8).fillColor('#000000')
         .text(data.code, barcodeX, barcodeY + barcodeHeight + mm(0.5), { width: barcodeWidth, align: 'center' });
    }
  }

  private drawFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number): void {
    const footerY = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT;
    const x = MARGIN_LEFT;

    // Page number
    doc.font('Helvetica').fontSize(8).fillColor('#000000')
       .text(`Page ${pageNum} from ${totalPages}`, MARGIN_LEFT, footerY, {
         width: CONTENT_WIDTH,
         align: 'right'
       });

    // Footer content - two columns
    const leftColX = x;
    const rightColX = x + (CONTENT_WIDTH / 2) + mm(10);
    const contentY = footerY + mm(4);

    // Left section
    doc.font('Helvetica-Bold').fontSize(8).text('Laboratorium PT TUV NORD Indonesia', leftColX, contentY);
    doc.font('Helvetica').fontSize(7)
       .text('Jl.Science Timur 1 Blok B3-F1', leftColX, contentY + mm(3))
       .text('Kawasan industri jababeka V', leftColX, contentY + mm(6))
       .text('Kel. Setajaya Kec. Cikarang Timur', leftColX, contentY + mm(9))
       .text('Kabupaten Bekasi - Jawa Barat - 17530', leftColX, contentY + mm(12));

    doc.text('Email cslab.id@tuv-nord.com', leftColX, contentY + mm(16))
       .text('Phone +62 21 29574720', leftColX, contentY + mm(19));

    // Blue line LEFT
    const lineLeftY = contentY + mm(24);
    doc.moveTo(leftColX, lineLeftY)
       .lineTo(leftColX + (CONTENT_WIDTH / 2) - mm(5), lineLeftY)
       .lineWidth(mm(0.5))
       .strokeColor('#0c2ad5')
       .stroke();

    // Right section - Logos (geser ke kanan agar di bawah "Page X from Y")
    const ilacX = rightColX + mm(45);
    const ilacY = contentY;

    // ILAC-MRA logo (kiri)
    doc.image(getIlacMraLogoBuffer(), ilacX, ilacY, { height: mm(12) });

    // KAN logo (kanan ILAC-MRA) - geser ke atas agar text di bawahnya
    const kanX = ilacX + mm(14);
    const kanY = ilacY - mm(8);
    const kanLogo = getKanLogoBuffer();
    if (kanLogo) {
      doc.image(kanLogo, kanX, kanY, { height: mm(25) });
    }

    // Text LP/LK di bawah KAN logo
    const kanLogoWidth = mm(30);
    doc.font('Helvetica').fontSize(5)
       .text('LP-411-IDN', kanX, ilacY + mm(12), { width: kanLogoWidth, align: 'center' })
       .text('LK-109-IDN', kanX, ilacY + mm(14), { width: kanLogoWidth, align: 'center' });

    // TUV NORD Group logo di bawah text LP/LK
    const groupLogoX = ilacX + mm(20);
    const groupLogoY = ilacY + mm(17);
    doc.image(getTuvNordGroupLogoBuffer(), groupLogoX, groupLogoY, { height: mm(1.5) });

    // Blue line RIGHT
    const lineRightY = contentY + mm(24);
    const rightLineWidth = (CONTENT_WIDTH / 2) - mm(10);
    doc.moveTo(rightColX, lineRightY)
       .lineTo(rightColX + rightLineWidth, lineRightY)
       .lineWidth(mm(0.5))
       .strokeColor('#0c2ad5')
       .stroke();
  }

  private drawPage1(
    doc: PDFKit.PDFDocument,
    data: QuotationPdfData,
    _barcodeBuffer: Buffer,
    isSpecial: boolean,
    totals: ReturnType<typeof this.calculateTotals>
  ): number {
    let y = CONTENT_START_Y;

    // Customer section
    y = this.drawCustomerSection(doc, data, y);

    // Products table
    if (data.products && data.products.length > 0) {
      y = this.drawProductsTable(doc, data.products, y);
    }

    // Services/Samples table
    y = this.drawSamplesTable(doc, data, isSpecial, y);

    // Remarks & Summary
    y = this.drawRemarksSummary(doc, data, totals, isSpecial, y);

    // Services grid
    y = this.drawServicesGrid(doc, y);

    // Signature
    y = this.drawSignatureSection(doc, data, y);

    return y;
  }

  private drawCustomerSection(doc: PDFKit.PDFDocument, data: QuotationPdfData, startY: number): number {
    let y = startY;
    const leftColX = MARGIN_LEFT;
    const rightColX = MARGIN_LEFT + (CONTENT_WIDTH / 2);

    // Fixed positions for alignment
    const leftLabelX = leftColX;
    const leftColonX = leftColX + mm(22); // Fixed position for all colons in left column
    const rightLabelX = rightColX;
    const rightColonX = rightColX + mm(28); // Fixed position for all colons in right column

    // Calculate widths to use full available space (from colon to end of column)
    const leftColWidth = rightColX - leftColonX - mm(3); // Full width from colon to middle of page
    const rightColWidth = (MARGIN_LEFT + CONTENT_WIDTH) - rightColonX - mm(3); // Full width to right edge

    doc.fontSize(9).fillColor('#000000');

    // Left column
    const contactName = this.getContactFullName(data.contact);

    // Format address with proper line breaks to avoid orphaned commas
    const addressLine1 = data.address.address || '';
    const addressLine2Parts = [data.address.city, data.address.state, data.address.country].filter(Boolean);
    const addressLine2 = addressLine2Parts.join(', ');
    const addressText = addressLine2 ? `${addressLine1}\n${addressLine2}` : addressLine1;

    // To
    doc.font('Helvetica-Bold').text('To', leftLabelX, y);
    doc.font('Helvetica').text(': ' + contactName, leftColonX, y, { width: leftColWidth });

    // Company
    doc.font('Helvetica-Bold').text('Company', leftLabelX, y + mm(5));
    doc.font('Helvetica').text(': ' + data.customer.customer_name, leftColonX, y + mm(5), { width: leftColWidth });

    // Address (calculate height for proper wrapping with explicit line breaks)
    doc.font('Helvetica-Bold').text('Address', leftLabelX, y + mm(10));
    const addressHeight = doc.font('Helvetica').heightOfString(': ' + addressText, { width: leftColWidth, lineGap: 0 });
    doc.text(': ' + addressText, leftColonX, y + mm(10), { width: leftColWidth, lineGap: 0 });

    // Right column
    // Phone
    doc.font('Helvetica-Bold').text('Phone', rightLabelX, y);
    doc.font('Helvetica').text(': ' + (data.contact.phone || '-'), rightColonX, y, { width: rightColWidth });

    // Fax
    doc.font('Helvetica-Bold').text('Fax', rightLabelX, y + mm(5));
    doc.font('Helvetica').text(': ' + (data.contact.fax || ''), rightColonX, y + mm(5), { width: rightColWidth });

    // Mobile Phone
    doc.font('Helvetica-Bold').text('Mobile Phone', rightLabelX, y + mm(10));
    doc.font('Helvetica').text(': ' + (data.contact.mobile_phone || ''), rightColonX, y + mm(10), { width: rightColWidth });

    // Email Address
    doc.font('Helvetica-Bold').text('Email Address', rightLabelX, y + mm(15));
    doc.font('Helvetica').text(': ' + (data.contact.email || ''), rightColonX, y + mm(15), { width: rightColWidth });

    // Calculate total height needed based on address height
    const totalHeight = Math.max(mm(25), mm(15) + addressHeight + mm(5));
    return y + totalHeight;
  }

  private drawProductsTable(doc: PDFKit.PDFDocument, products: ProductItem[], startY: number): number {
    let y = startY;
    const x = MARGIN_LEFT;

    // Column widths
    const colNo = mm(8);
    const colName = CONTENT_WIDTH - mm(8) - mm(20) - mm(12) - mm(14) - mm(22);
    const colPrice = mm(20);
    const colQty = mm(12);
    const colDisc = mm(14);
    const colTotal = mm(22);

    // Table header
    doc.rect(x, y, CONTENT_WIDTH, mm(5)).fillAndStroke('#e6e6e6', '#000');
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(8);
    doc.text('No', x + mm(1), y + mm(1.5), { width: colNo - mm(2), align: 'center' });
    doc.text('ADDITIONAL CHARGE', x + colNo + mm(1), y + mm(1.5), { width: colName - mm(2), align: 'left' });
    doc.text('PRICE', x + colNo + colName + mm(1), y + mm(1.5), { width: colPrice - mm(2), align: 'center' });
    doc.text('QTY', x + colNo + colName + colPrice + mm(1), y + mm(1.5), { width: colQty - mm(2), align: 'center' });
    doc.text('DISC%', x + colNo + colName + colPrice + colQty + mm(1), y + mm(1.5), { width: colDisc - mm(2), align: 'center' });
    doc.text('TOTAL', x + colNo + colName + colPrice + colQty + colDisc + mm(1), y + mm(1.5), { width: colTotal - mm(2), align: 'center' });

    // Draw vertical separator lines
    doc.moveTo(x + colNo, y).lineTo(x + colNo, y + mm(5)).stroke('#000');
    doc.moveTo(x + colNo + colName, y).lineTo(x + colNo + colName, y + mm(5)).stroke('#000');
    doc.moveTo(x + colNo + colName + colPrice, y).lineTo(x + colNo + colName + colPrice, y + mm(5)).stroke('#000');
    doc.moveTo(x + colNo + colName + colPrice + colQty, y).lineTo(x + colNo + colName + colPrice + colQty, y + mm(5)).stroke('#000');
    doc.moveTo(x + colNo + colName + colPrice + colQty + colDisc, y).lineTo(x + colNo + colName + colPrice + colQty + colDisc, y + mm(5)).stroke('#000');

    y += mm(5);

    // Table rows
    doc.font('Helvetica').fontSize(8);
    products.forEach((product, idx) => {
      const price = Number(product.price) || 0;
      const quantity = Number(product.quantity) || 0;
      const discount = Number(product.discount) || 0;
      const total = (price * quantity) - ((discount / 100) * price * quantity);

      // Calculate dynamic row height based on product name
      const nameHeight = doc.heightOfString(product.name, { width: colName - mm(2) });
      const rowHeight = Math.max(mm(5), nameHeight + mm(3));

      // Draw cell borders
      doc.rect(x, y, colNo, rowHeight).stroke('#000');
      doc.rect(x + colNo, y, colName, rowHeight).stroke('#000');
      doc.rect(x + colNo + colName, y, colPrice, rowHeight).stroke('#000');
      doc.rect(x + colNo + colName + colPrice, y, colQty, rowHeight).stroke('#000');
      doc.rect(x + colNo + colName + colPrice + colQty, y, colDisc, rowHeight).stroke('#000');
      doc.rect(x + colNo + colName + colPrice + colQty + colDisc, y, colTotal, rowHeight).stroke('#000');

      // Draw cell content
      doc.fillColor('#000');
      doc.text((idx + 1).toString(), x + mm(1), y + mm(1.5), { width: colNo - mm(2), align: 'center', lineGap: 0 });
      doc.text(product.name, x + colNo + mm(1), y + mm(1.5), { width: colName - mm(2), align: 'left', lineGap: 0 });
      doc.text(this.formatCurrency(price), x + colNo + colName + mm(1), y + mm(1.5), { width: colPrice - mm(2), align: 'right', lineGap: 0 });
      doc.text(quantity.toString(), x + colNo + colName + colPrice + mm(1), y + mm(1.5), { width: colQty - mm(2), align: 'center', lineGap: 0 });
      doc.text(discount.toString(), x + colNo + colName + colPrice + colQty + mm(1), y + mm(1.5), { width: colDisc - mm(2), align: 'center', lineGap: 0 });
      doc.text(this.formatCurrency(total), x + colNo + colName + colPrice + colQty + colDisc + mm(1), y + mm(1.5), { width: colTotal - mm(2), align: 'right', lineGap: 0 });

      y += rowHeight;
    });

    return y + mm(3);
  }

  private drawSamplesTable(doc: PDFKit.PDFDocument, data: QuotationPdfData, isSpecial: boolean, startY: number): number {
    if (!data.samples || data.samples.length === 0) return startY;

    let y = startY;
    const x = MARGIN_LEFT;

    // Column widths (different for special vs regular)
    const colNo = mm(8);
    let colServices: number, colMethod: number, colPrice: number, colQty: number, colDisc: number, colPc: number, colTotal: number;

    if (isSpecial) {
      colServices = CONTENT_WIDTH - mm(8) - mm(38) - mm(10) - mm(20);
      colMethod = mm(38);
      colPrice = 0;
      colQty = mm(10);
      colDisc = 0;
      colPc = 0;
      colTotal = mm(20);
    } else {
      colServices = CONTENT_WIDTH - mm(8) - mm(38) - mm(18) - mm(10) - mm(12) - mm(10) - mm(20);
      colMethod = mm(38);
      colPrice = mm(18);
      colQty = mm(10);
      colDisc = mm(12);
      colPc = mm(10);
      colTotal = mm(20);
    }

    // Draw table header
    const drawHeader = (yPos: number) => {
      doc.rect(x, yPos, CONTENT_WIDTH, mm(5)).fillAndStroke('#e6e6e6', '#000');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(8);

      if (isSpecial) {
        doc.text('No', x + mm(1), yPos + mm(1.5), { width: colNo - mm(2), align: 'center' });
        doc.text('SERVICES', x + colNo + mm(1), yPos + mm(1.5), { width: colServices - mm(2), align: 'left' });
        doc.text('METHOD', x + colNo + colServices + mm(1), yPos + mm(1.5), { width: colMethod - mm(2), align: 'center' });
        doc.text('QTY', x + colNo + colServices + colMethod + mm(1), yPos + mm(1.5), { width: colQty - mm(2), align: 'center' });
        doc.text('TOTAL', x + colNo + colServices + colMethod + colQty + mm(1), yPos + mm(1.5), { width: colTotal - mm(2), align: 'center' });

        // Draw vertical separator lines
        doc.moveTo(x + colNo, yPos).lineTo(x + colNo, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices, yPos).lineTo(x + colNo + colServices, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod, yPos).lineTo(x + colNo + colServices + colMethod, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod + colQty, yPos).lineTo(x + colNo + colServices + colMethod + colQty, yPos + mm(5)).stroke('#000');
      } else {
        doc.text('No', x + mm(1), yPos + mm(1.5), { width: colNo - mm(2), align: 'center' });
        doc.text('SERVICES', x + colNo + mm(1), yPos + mm(1.5), { width: colServices - mm(2), align: 'left' });
        doc.text('METHOD', x + colNo + colServices + mm(1), yPos + mm(1.5), { width: colMethod - mm(2), align: 'center' });
        doc.text('PRICE', x + colNo + colServices + colMethod + mm(1), yPos + mm(1.5), { width: colPrice - mm(2), align: 'center' });
        doc.text('QTY', x + colNo + colServices + colMethod + colPrice + mm(1), yPos + mm(1.5), { width: colQty - mm(2), align: 'center' });
        doc.text('DISC%', x + colNo + colServices + colMethod + colPrice + colQty + mm(1), yPos + mm(1.5), { width: colDisc - mm(2), align: 'center' });
        doc.text('PC%', x + colNo + colServices + colMethod + colPrice + colQty + colDisc + mm(1), yPos + mm(1.5), { width: colPc - mm(2), align: 'center' });
        doc.text('TOTAL', x + colNo + colServices + colMethod + colPrice + colQty + colDisc + colPc + mm(1), yPos + mm(1.5), { width: colTotal - mm(2), align: 'center' });

        // Draw vertical separator lines
        doc.moveTo(x + colNo, yPos).lineTo(x + colNo, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices, yPos).lineTo(x + colNo + colServices, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod, yPos).lineTo(x + colNo + colServices + colMethod, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod + colPrice, yPos).lineTo(x + colNo + colServices + colMethod + colPrice, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod + colPrice + colQty, yPos).lineTo(x + colNo + colServices + colMethod + colPrice + colQty, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod + colPrice + colQty + colDisc, yPos).lineTo(x + colNo + colServices + colMethod + colPrice + colQty + colDisc, yPos + mm(5)).stroke('#000');
        doc.moveTo(x + colNo + colServices + colMethod + colPrice + colQty + colDisc + colPc, yPos).lineTo(x + colNo + colServices + colMethod + colPrice + colQty + colDisc + colPc, yPos + mm(5)).stroke('#000');
      }
      return yPos + mm(5);
    };

    y = drawHeader(y);

    let rowNum = 1;
    let grandSubTotal = 0;

    for (const sample of data.samples) {
      const priorityRate = this.getPriorityRate(sample.priority);
      const priorityLabel = data.priority?.toLowerCase() || 'normal';
      const sampleQty = Number(sample.quantity) || 1;

      // Check if need new page for sample header
      if (y > CONTENT_END_Y - mm(10)) {
        doc.addPage();
        y = CONTENT_START_Y;
        y = drawHeader(y);
      }

      // Sample header row
      doc.rect(x, y, CONTENT_WIDTH, mm(5)).fillAndStroke('#f0f0f0', '#000');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(8);
      // Sample name on the left, priority inline on the right (horizontal layout)
      const priorityText = `Priority: ${priorityLabel.charAt(0).toUpperCase() + priorityLabel.slice(1)}`;
      doc.text(`${sample.name}`, x + mm(1), y + mm(1.5), { width: CONTENT_WIDTH - mm(45), align: 'left', lineGap: 0 });
      doc.font('Helvetica').fontSize(7).text(priorityText, x + CONTENT_WIDTH - mm(43), y + mm(1.5), { width: mm(40), align: 'right', lineGap: 0 });
      y += mm(5);

      // Service rows
      for (const item of sample.services || []) {
        let itemPrice = 0, itemName = '', methodName = '';
        let hasPackage = false;

        if (item.package) {
          itemPrice = Number(item.package.totalPrice) || 0;
          itemName = item.package.name;
          hasPackage = true;
        } else if (item.service) {
          // BUGFIX: Prioritize service.price from master data (always correct)
          // over item.price from quotation_detail (may include priority charge incorrectly)
          itemPrice = Number(item.service.price) || Number(item.price) || 0;
          itemName = item.service.name;
          methodName = item.service.method?.name || '';
        }

        const itemQty = Number(item.quantity) || 1;
        const itemDiscount = Number(item.discount) || 0;
        const qty = itemQty * sampleQty;
        const basePrice = itemPrice * qty;
        const discountAmount = (itemDiscount / 100) * basePrice;
        const afterDiscount = basePrice - discountAmount;

        let pcRate = 0;
        if (!isSpecial) {
          if (item.service) {
            const canApplyPc = item.service.parameter_id !== 0 || item.service.parameter_id === undefined;
            if (canApplyPc || item.service.use_pc) pcRate = priorityRate;
          } else if (item.package) pcRate = priorityRate;
        }

        const total = afterDiscount + ((pcRate / 100) * afterDiscount);
        grandSubTotal += total;

        // Calculate dynamic row height based on item name and method name (both support HTML)
        doc.font('Helvetica').fontSize(8);
        const nameHeight = heightOfHtmlString(doc, itemName + (hasPackage ? ' :' : ''), { width: colServices - mm(2), fontSize: 8 });
        const methodHeight = heightOfHtmlString(doc, methodName, { width: colMethod - mm(2), fontSize: 8 });
        let baseRowHeight = Math.max(mm(5), nameHeight + mm(2.5), methodHeight + mm(2.5));

        // If it's a package, calculate total height including nested services with dynamic text wrapping and HTML support
        let packageServicesHeight = 0;
        const packageServiceHeights: number[] = [];
        if (hasPackage && item.package?.services && item.package.services.length > 0) {
          for (const svc of item.package.services) {
            const svcText = `- ${svc.name} | ${svc.method?.name || ''}`;
            // Calculate height using HTML-aware function
            const svcHeight = heightOfHtmlString(doc, svcText, { width: colServices - mm(3), fontSize: 7 });
            const svcRowHeight = Math.max(mm(3.5), svcHeight + mm(1.5));
            packageServiceHeights.push(svcRowHeight);
            packageServicesHeight += svcRowHeight;
          }
        }
        const totalRowHeight = baseRowHeight + packageServicesHeight;

        // Check if need new page
        if (y > CONTENT_END_Y - totalRowHeight) {
          doc.addPage();
          y = CONTENT_START_Y;
          y = drawHeader(y);
        }

        // Draw row with full height (including package services)
        doc.font('Helvetica').fontSize(8).fillColor('#000');

        if (isSpecial) {
          doc.rect(x, y, colNo, totalRowHeight).stroke('#000');
          doc.rect(x + colNo, y, colServices, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices, y, colMethod, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod, y, colQty, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod + colQty, y, colTotal, totalRowHeight).stroke('#000');

          doc.text(rowNum.toString(), x + mm(1), y + mm(1.2), { width: colNo - mm(2), align: 'center', lineGap: 0 });
          // Render service name with HTML support
          renderHtmlText(doc, itemName + (hasPackage ? ' :' : ''), x + colNo + mm(1), y + mm(1.2), { width: colServices - mm(2), align: 'left', baseFont: 'Helvetica', baseFontSize: 8 });
          // Render method name with HTML support
          renderHtmlText(doc, methodName, x + colNo + colServices + mm(1), y + mm(1.2), { width: colMethod - mm(2), align: 'left', baseFont: 'Helvetica', baseFontSize: 8 });
          doc.font('Helvetica').fontSize(8).fillColor('#000');
          doc.text(qty.toString(), x + colNo + colServices + colMethod + mm(1), y + mm(1.2), { width: colQty - mm(2), align: 'center', lineGap: 0 });
          doc.text(this.formatCurrency(total), x + colNo + colServices + colMethod + colQty + mm(1), y + mm(1.2), { width: colTotal - mm(2), align: 'right', lineGap: 0 });
        } else {
          doc.rect(x, y, colNo, totalRowHeight).stroke('#000');
          doc.rect(x + colNo, y, colServices, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices, y, colMethod, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod, y, colPrice, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod + colPrice, y, colQty, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod + colPrice + colQty, y, colDisc, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod + colPrice + colQty + colDisc, y, colPc, totalRowHeight).stroke('#000');
          doc.rect(x + colNo + colServices + colMethod + colPrice + colQty + colDisc + colPc, y, colTotal, totalRowHeight).stroke('#000');

          doc.text(rowNum.toString(), x + mm(1), y + mm(1.2), { width: colNo - mm(2), align: 'center', lineGap: 0 });
          // Render service name with HTML support
          renderHtmlText(doc, itemName + (hasPackage ? ' :' : ''), x + colNo + mm(1), y + mm(1.2), { width: colServices - mm(2), align: 'left', baseFont: 'Helvetica', baseFontSize: 8 });
          // Render method name with HTML support
          renderHtmlText(doc, methodName, x + colNo + colServices + mm(1), y + mm(1.2), { width: colMethod - mm(2), align: 'left', baseFont: 'Helvetica', baseFontSize: 8 });
          doc.font('Helvetica').fontSize(8).fillColor('#000');
          doc.text(this.formatCurrency(itemPrice), x + colNo + colServices + colMethod + mm(1), y + mm(1.2), { width: colPrice - mm(2), align: 'right', lineGap: 0 });
          doc.text(qty.toString(), x + colNo + colServices + colMethod + colPrice + mm(1), y + mm(1.2), { width: colQty - mm(2), align: 'center', lineGap: 0 });
          doc.text(itemDiscount.toString(), x + colNo + colServices + colMethod + colPrice + colQty + mm(1), y + mm(1.2), { width: colDisc - mm(2), align: 'center', lineGap: 0 });
          doc.text(pcRate.toString(), x + colNo + colServices + colMethod + colPrice + colQty + colDisc + mm(1), y + mm(1.2), { width: colPc - mm(2), align: 'center', lineGap: 0 });
          doc.text(this.formatCurrency(total), x + colNo + colServices + colMethod + colPrice + colQty + colDisc + colPc + mm(1), y + mm(1.2), { width: colTotal - mm(2), align: 'right', lineGap: 0 });
        }

        // Package nested services (draw inside the cell with dynamic height and HTML rendering)
        let currentY = y + baseRowHeight;
        if (hasPackage && item.package?.services && item.package.services.length > 0) {
          doc.fillColor('#333');
          for (let idx = 0; idx < item.package.services.length; idx++) {
            const svc = item.package.services[idx];
            const svcText = `- ${svc.name} | ${svc.method?.name || ''}`;

            // Render with HTML support for tags like <i>, <sup>, etc.
            renderHtmlText(doc, svcText, x + colNo + mm(2), currentY, {
              width: colServices - mm(3),
              align: 'left',
              baseFont: 'Helvetica',
              baseFontSize: 7
            });

            currentY += packageServiceHeights[idx];
          }
          doc.fontSize(8).fillColor('#000');
        }

        y += totalRowHeight;

        rowNum++;
      }
    }

    // Sub-total row
    if (y > CONTENT_END_Y - mm(5)) {
      doc.addPage();
      y = CONTENT_START_Y;
      y = drawHeader(y);
    }

    doc.rect(x, y, CONTENT_WIDTH, mm(5)).fillAndStroke('#e8e8e8', '#000');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    doc.text('Sub Total (IDR)', x + mm(1), y + mm(1.5), { width: CONTENT_WIDTH - colTotal - mm(2), align: 'left', lineGap: 0 });
    doc.text(this.formatCurrency(grandSubTotal), x + CONTENT_WIDTH - colTotal + mm(1), y + mm(1.5), { width: colTotal - mm(2), align: 'right', lineGap: 0 });
    y += mm(5);

    return y + mm(3);
  }

  private drawRemarksSummary(
    doc: PDFKit.PDFDocument,
    data: QuotationPdfData,
    totals: ReturnType<typeof this.calculateTotals>,
    isSpecial: boolean,
    startY: number
  ): number {
    let y = startY;
    const x = MARGIN_LEFT;

    // Border around the whole section
    const sectionHeight = mm(25);

    // Check if remarks summary section fits
    if (y + sectionHeight > CONTENT_END_Y) {
      doc.addPage();
      y = CONTENT_START_Y;
    }

    doc.rect(x, y, CONTENT_WIDTH, sectionHeight).stroke('#000');

    // Left section - Remarks
    const leftWidth = CONTENT_WIDTH / 2;
    doc.moveTo(x + leftWidth, y).lineTo(x + leftWidth, y + sectionHeight).stroke('#000');

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    doc.text('Remarks :', x + mm(3), y + mm(2), { width: leftWidth - mm(6) });

    const remarksContent = data.remarks ? data.remarks.replace(/\n/g, '\n') : '';
    doc.font('Helvetica').fontSize(7);
    doc.text(remarksContent, x + mm(3), y + mm(6), { width: leftWidth - mm(6), height: sectionHeight - mm(8) });

    // Right section - Summary table
    const rightX = x + leftWidth;
    const summaryRows = [];

    if (isSpecial) {
      summaryRows.push(['Sub Total (IDR)', this.formatCurrency(totals.subTotal)]);
      summaryRows.push(['VAT (IDR)', this.formatCurrency(totals.vat)]);
      summaryRows.push(['Grand Total (IDR)', this.formatCurrency(totals.grandTotal)]);
    } else {
      summaryRows.push(['Total (IDR)', this.formatCurrency(totals.totalBasePrice)]);
      summaryRows.push(['Discount (IDR)', this.formatCurrency(totals.totalDiscount)]);
      summaryRows.push(['Priority Chrg (IDR)', this.formatCurrency(totals.totalPriorityCharge)]);
      summaryRows.push(['Sub Total (IDR)', this.formatCurrency(totals.subTotal)]);
      summaryRows.push(['VAT (IDR)', this.formatCurrency(totals.vat)]);
      summaryRows.push(['Grand Total (IDR)', this.formatCurrency(totals.grandTotal)]);
    }

    let summaryY = y;
    const rowHeight = sectionHeight / summaryRows.length;

    summaryRows.forEach((row, idx) => {
      const isGrandTotal = row[0].includes('Grand Total');

      // Draw bottom border for each row except the last
      if (idx < summaryRows.length - 1) {
        doc.moveTo(rightX, summaryY + rowHeight).lineTo(x + CONTENT_WIDTH, summaryY + rowHeight).stroke('#000');
      }

      // Draw label and value
      doc.font(isGrandTotal ? 'Helvetica-Bold' : 'Helvetica-Bold').fontSize(8).fillColor('#000');
      doc.text(row[0], rightX + mm(3), summaryY + mm(1.5), { width: leftWidth * 0.55 - mm(3), align: 'right' });

      doc.font(isGrandTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      doc.text(row[1], rightX + leftWidth * 0.55, summaryY + mm(1.5), { width: leftWidth * 0.45 - mm(3), align: 'right' });

      summaryY += rowHeight;
    });

    return y + sectionHeight + mm(3);
  }

  private drawServicesGrid(doc: PDFKit.PDFDocument, startY: number): number {
    let y = startY;
    const x = MARGIN_LEFT;

    // Check if we have enough space for intro + header + at least one row (approx 20mm)
    if (y + mm(20) > CONTENT_END_Y) {
      doc.addPage();
      y = CONTENT_START_Y;
    }

    // Intro text
    doc.font('Helvetica').fontSize(8).fillColor('#000');
    const introText = 'With our experience and expertise in ITC (Inspection, Testing & Certification) business we also offer you one stop solution with special discount for another valuable services that we can provided:';
    doc.text(introText, x, y, { width: CONTENT_WIDTH, align: 'justify' });
    y += mm(8);

    // Table header
    doc.rect(x, y, CONTENT_WIDTH, mm(5)).fillAndStroke('#e6e6e6', '#000');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    doc.text('Services', x + mm(1), y + mm(1.5), { width: CONTENT_WIDTH - mm(2), align: 'center' });
    y += mm(5);

    // Table rows
    const services = [
      ['System Certification\n(Additional Scheme)', 'ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc.'],
      ['Product Certification', 'SNI, CE, GS, etc.'],
      ['Inspection', 'Rack Inspection, QA/QC Inspection, etc.'],
      ['Training', 'In House Training for All Management Systems Topic (Awareness, Internal Audit, Documentation, etc.)'],
      ['Laboratory Services', 'Consumer goods product testing, Product stability & shelf life, Environmental testing & monitoring, Industrial Hygine, Petroleum & chemical analysis, Calibration']
    ];

    const col1Width = mm(35);
    const col2Width = CONTENT_WIDTH - col1Width;

    services.forEach(([type, desc]) => {
      const rowHeight = mm(8);

      // Check if this row would exceed content area
      if (y + rowHeight > CONTENT_END_Y) {
        doc.addPage();
        y = CONTENT_START_Y;

        // Redraw table header on new page
        doc.rect(x, y, CONTENT_WIDTH, mm(5)).fillAndStroke('#e6e6e6', '#000');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
        doc.text('Services (continued)', x + mm(1), y + mm(1.5), { width: CONTENT_WIDTH - mm(2), align: 'center' });
        y += mm(5);
      }

      doc.rect(x, y, col1Width, rowHeight).stroke('#000');
      doc.rect(x + col1Width, y, col2Width, rowHeight).stroke('#000');

      doc.font('Helvetica').fontSize(8).fillColor('#000');
      doc.text(type, x + mm(2), y + mm(2), { width: col1Width - mm(4), align: 'left' });
      doc.text(desc, x + col1Width + mm(2), y + mm(2), { width: col2Width - mm(4), align: 'left' });

      y += rowHeight;
    });

    // Note - check if it fits
    if (y + mm(7) > CONTENT_END_Y) {
      doc.addPage();
      y = CONTENT_START_Y;
    }

    y += mm(2);
    doc.font('Helvetica').fontSize(8);
    doc.text('For complete information please feel free to contact our Sales Representative.', x, y, { width: CONTENT_WIDTH });

    return y + mm(5);
  }

  private drawSignatureSection(doc: PDFKit.PDFDocument, data: QuotationPdfData, startY: number): number {
    let y = startY;
    const x = MARGIN_LEFT;

    // Check if signature section fits (approx 15mm needed)
    if (y + mm(15) > CONTENT_END_Y) {
      doc.addPage();
      y = CONTENT_START_Y;
    }

    // Created by
    doc.font('Helvetica').fontSize(9).fillColor('#000');
    const creatorName = this.getCreatorFullName(data.creator);
    doc.text(`Created by `, x, y, { continued: true });
    doc.font('Helvetica-Bold').text(creatorName);
    y += mm(7);

    // Customer Approval line
    doc.font('Helvetica').fontSize(9);
    doc.text('Customer Approval:', x, y);

    // Approval line
    const lineStartX = x + mm(40);
    const lineEndX = x + CONTENT_WIDTH;
    const lineY = y + mm(2);
    doc.moveTo(lineStartX, lineY).lineTo(lineEndX, lineY).stroke('#000');

    return y + mm(10);
  }

  private drawTermsPage(doc: PDFKit.PDFDocument, data: QuotationPdfData): void {
    doc.addPage();

    let y = CONTENT_START_Y;

    // Title
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
       .text('Term & Condition:', MARGIN_LEFT, y);
    y += mm(6);

    // Two columns (50/50)
    const leftX = MARGIN_LEFT;
    const rightX = MARGIN_LEFT + (CONTENT_WIDTH / 2) + mm(2.5);
    const colWidth = (CONTENT_WIDTH / 2) - mm(2.5);

    // LEFT COLUMN
    let leftY = y;

    // Shipping Product Samples
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text('Shipping Product Samples', leftX, leftY, { width: colWidth });
    leftY += mm(5);

    doc.font('Helvetica').fontSize(7);
    const shippingText = 'To insure the integrity and security of samples sent to TÜV NORD Laboratory, we ask that our customers observe the following guidelines when shipping samples :';
    doc.text(shippingText, leftX, leftY, { width: colWidth, align: 'justify' });
    leftY += mm(10);

    const shippingItems = [
      'Secure each food sample in its own container. Seal each sample package completely so that no leakage will occur. This is very important to prevent cross-contamination.',
      'Use packing materials that are strong enough to travel without damage or leakage.',
      'Samples needing refrigeration should be shipped appropriately. Please mark "refrigerate" on the outside of the package to ensure continuous refrigeration.',
      'Label each sample individually with the identification you would like included on the final report.'
    ];

    shippingItems.forEach(item => {
      doc.text('•  ' + item, leftX + mm(2), leftY, { width: colWidth - mm(4), align: 'justify' });
      leftY += mm(8);
    });

    leftY += mm(2);

    // Sample Privacy
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Sample Privacy', leftX, leftY, { width: colWidth });
    leftY += mm(5);

    doc.font('Helvetica').fontSize(7);
    const privacyText = 'At TÜV NORD Laboratory, customer privacy is of utmost importance to us because it is important to YOU. We have provided full confidentially to all of our partners. Not only do we have the right systems in place, but we alo have the right people.';
    doc.text(privacyText, leftX, leftY, { width: colWidth, align: 'justify' });
    leftY += mm(13);

    // Quotation and to Submit Samples
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Quotation and to Submit Samples', leftX, leftY, { width: colWidth });
    leftY += mm(5);

    doc.font('Helvetica').fontSize(7);
    const quotationText = 'Visit our website https://www.tuv-nord.com/id/en to download a sample submission form and contact our marketing team to get quotation. Submit the completed form along with your samples to';
    doc.text(quotationText, leftX, leftY, { width: colWidth, align: 'justify' });
    leftY += mm(12);

    const useNewAddress = data.created_at && new Date(data.created_at) >= NEW_ADDRESS_DATE;
    const headOfficeAddress = useNewAddress
      ? 'Arkadia Green Park, Tower G, Lantai 17, Jl. TB Simatupang Kav. 88 Kelurahan Kebagusan, Kecamatan Pasar Minggu, Kota Administrasi Jakarta Selatan Provinsi DKI Jakarta, Kode Pos 12520'
      : 'Perkantoran Hijau Arkadia, Tower F 6th Floor, Suite 706. JL. TB. Simatupang Kav. 88 Pasar Minggu, Jakarta Selatan.';

    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('Head Office (Only for durable product):', leftX, leftY, { width: colWidth });
    leftY += mm(3);

    doc.font('Helvetica').fontSize(7);
    doc.text('PT. TÜV NORD Indonesia', leftX, leftY, { width: colWidth });
    leftY += mm(3);
    doc.text(headOfficeAddress, leftX, leftY, { width: colWidth, align: 'justify' });
    leftY += mm(13);

    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('Laboratory:', leftX, leftY, { width: colWidth });
    leftY += mm(3);

    doc.font('Helvetica').fontSize(7);
    doc.text('Jl. Science Timur 1, Block B3-F1 Kawasan Industri Jababeka V Cibatu Cikarang - Bekasi 17530', leftX, leftY, { width: colWidth });
    leftY += mm(8);

    doc.font('Helvetica-Oblique').fontSize(7);
    doc.text('(Exit Tol Cibatu, Km. 34)', leftX, leftY, { width: colWidth });

    // RIGHT COLUMN
    let rightY = y;

    // Standard Term and Conditions
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text('Standard Term and Conditions', rightX, rightY, { width: colWidth });
    rightY += mm(5);

    doc.font('Helvetica').fontSize(5.5);

    const standardTerms = [
      'All services provided by TÜV NORD Laboratory ("TÜV NORD Laboratory") are subject to the terms and conditions stated herein. As our client, you ("Client") understand and agree that placement of any order for our services constitutes acceptance of the terms and conditions stated herein.',

      'CONFIDENTIALITY confidentiality is maintained in all interractions with Clients. Appropriate confidentiality agreements are signed willingly.',

      `PAYMENT TERMS ${data.customer.top && data.customer.top > 0 ? `Payment terms are Net ${data.customer.top} days.` : 'Payment must be made prior to sending the report.'} Minimum order per invoice is Rp 200.000,- .Prices are subject to change without notice. The payment can be transferred to PT. TÜV NORD Indonesia, Bank HSBC World Trade Centre, A/C No. 050-074269- 001.`,

      'BILLING All fees or bills are charged direcly to the Client, unless a third party has been authorized via a signed statement indicating payment responsibility.',

      'SAMPLE SUBMISSION sample submission should be made on a TÜV NORD Laboratory "Sample Testing Application Form (STAF). Please contact our Laboratory staff to get complete information.',

      'HAZARDOUS SUBSTANCES AND PATHOGEN any sample containing or suspected to contain a pathogen or substance that is considered hazardous must be clearly indentifief as such on the container and communicated to TÜV NORD Laboratory before shipping.',

      'ANALYSIS TÜV NORD Laboratory strives to provide a seven (7) until ten (10) working day turnaround. Rush analysis is offered contingent upon pre-notification and approval of TÜV NORD Laboratory. However, a rush fee of 100% surcharge of the list fee will be added to the invoice for each analysis completed in fewer than (5) working days at the request of the Client. TÜV NORD Laboratory reserves the right to outsource an analysis entirely at TÜV NORD Laboratory expense and without prior notification to Client, unless Client requests otherwise. Reported result relate only to the items tested and test reports shall not be reproduced except in full.',

      'LITIGATION All costs associated with litigation or dispute, incluing complieance for all document, for oral or written testimony or preparation of same, or for any others purpose related to work provided by TÜV NORD Laboratory in connection with analyses/reports performed/completed for the Client, shall be paid by the Client. Such costs include, but are not limited to, hourly charges, travel accomodations, mileage, counsel, and all other expenses associated with said litigation or dispute.',

      'WARRANTY AND LIMITS OF OF LIABILITY TÜV NORD Laboratory warrants that all services will be performed in a timely manner by competent personel. Any services performed by TÜV NORD Laboratory under proper technical direction by Client. Which are determined by Client to have been performed improperly in light of the above warranty and which after investigation by the TÜV NORD Laboratory are acknowledged in writing by TÜV NORD Laboratory President Director to have been performed improperly. Shall be corrected by TÜV NORD Laboratory without charge to Client, provided that Client provides TÜV NORD Laboratory with a written request for such correction within two (2) weeks after Client knew or should reasonably have known of problem. The liability of the TÜV NORD Laboratory in respect of any claims for loss, damage or expense of whatoever nature and howsoever arising in respect of any breach of contract and/or any failure to exercise due sklikk and care by the TÜV NORD Laboratory shall in no circumtances exceed a total aggregate sum equal to ten (10) times the amount of the fee or commission payable in respect of the specific services required under the particular contract with the TÜV NORD Laboratory which gives rise to such claims for indirect or consequential loss including loss of profit and/or loss of future bussniness and/or loss of productions and/or cancellation of contracts entered into by the Client. The TÜV NORD Laboratory shall not in any event be liable for any loss or damage caused by delay in performanc or non-performance of any of its services where the same is occasioned by any cause whatsoever that is beyond the TÜV NORD Laboratory control including but not limited to war, civil disturbance, requisitioning, governmental or parliamentary restriction, prohibitions or enactment of any kind, import or export regulations, strike or trade dipute (whetever incolving its own employees or those of any other person), difficulties in obtaining workmen or materials, breakdown of machinery, fire or accident. Should any such event occur the TÜV NORD Laboratory may cancel or suspend any contract for the provision of services without incurring any liability whatsoever. The TÜV NORD Laboratory will not be liable to the Client for any loss or damage whatsoever sustained by the Client as a result of any failure by the TÜV NORD Laboratory to comply with any time estimate given by the TÜV NORD Laboratory relating to the provision of its services. TÜV NORD Laboratory accepted no legal responsibility for the purpose for which the Client uses the test result or report, or for any consequence of such use. TÜV NORD Laboratory provide no guidance regarding and accept no legal responsibility for the purpose for which the Client uses the test result or reports, and shall have no legal responsibility forany consequence of such use. Client agrees ti indemnify and defend TÜV NORD Laboratory all claims, damages, liabilities, and expenses relating ti Clients use of TÜV NORD Laboratorys services or Clients Marketing, distribution, sale, or other dissemination of Clients products or services. The allocations of liability in this WARRANTY AND LIMITS OF LIABILITY section represent the agreed and bargained-for understanding between the Client and TÜV NORD Laboratory, TÜV NORD Laboratory fees for the services provided hereunder reflect such allocations.',
    ];

    standardTerms.forEach(term => {
      const textHeight = doc.heightOfString(term, { width: colWidth, align: 'justify' });
      doc.text(term, rightX, rightY, { width: colWidth, align: 'justify' });
      rightY += textHeight + mm(2);
    });
  }

  async generateHtmlPreview(_data: QuotationPdfData): Promise<string> {
    // TODO: Implement HTML preview (optional, may keep old Puppeteer code for this)
    return '<html><body>PDF Preview not available with PDFKit</body></html>';
  }
}

export const quotationPdfService = new QuotationPdfService();
