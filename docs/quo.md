# Quotation PDF Template Specification

## Document Information
- **Source File**: `protected/views/template/quotation.php`
- **PDF Library**: HTML2PDF
- **Page Size**: A4 Portrait
- **Margins**: 10mm all sides
- **Header Height**: 60mm (backtop)
- **Footer Height**: 50mm (backbottom)

---

## 1. PDF Structure Overview

```
┌─────────────────────────────────────────┐
│              PAGE 1 - QUOTATION         │
├─────────────────────────────────────────┤
│  HEADER                                 │
│  ├── Company Logo (conditional)         │
│  ├── Title: "QUOTATION"                 │
│  ├── Quotation Date                     │
│  ├── Expiration Date (+1 month)         │
│  └── Quotation No. (Barcode)            │
├─────────────────────────────────────────┤
│  CUSTOMER INFO                          │
│  ├── To (Contact Name)                  │
│  ├── Company                            │
│  ├── Address                            │
│  ├── Phone/Fax/Mobile                   │
│  └── Email                              │
├─────────────────────────────────────────┤
│  PRODUCTS TABLE (if any)                │
│  ├── No, Name, Price, Qty, Disc%, Total │
│  └── Additional Charge items            │
├─────────────────────────────────────────┤
│  SAMPLES TABLE (for each sample)        │
│  ├── Sample Name & Priority             │
│  ├── Services (Name, Method, Price...)  │
│  ├── Packages (expanded services)       │
│  └── Sub Total per sample               │
├─────────────────────────────────────────┤
│  SUMMARY                                │
│  ├── Total, Discount, Priority Charge   │
│  ├── Sub Total, VAT, Grand Total        │
│  └── Remarks                            │
├─────────────────────────────────────────┤
│  ADDITIONAL SERVICES                    │
│  └── Company services promotion         │
├─────────────────────────────────────────┤
│  FOOTER                                 │
│  ├── Created by                         │
│  ├── Customer Approval line             │
│  └── Page number                        │
├─────────────────────────────────────────┤
│           PAGE 2 - TERMS & CONDITIONS   │
│  ├── Shipping Product Samples           │
│  ├── Sample Privacy                     │
│  ├── Standard Term and Conditions       │
│  └── Payment Terms, Analysis, etc.      │
└─────────────────────────────────────────┘
```

---

## 2. Header Section

### 2.1 Logo Selection (Conditional)
```php
if ($model->created_at < '2023-08-17') {
    include "header-footer/header.php";      // Old header
} else {
    include "header-footer/header-new.php";  // New header
}
```

### 2.2 Header Content
| Field | Source | Format |
|-------|--------|--------|
| Title | Static | "QUOTATION" (H1) |
| Quotation Date | `date('F d, Y')` | "January 15, 2026" |
| Expiration Date | Current date + 1 month | "February 15, 2026" |
| Quotation No. | `$model->code` | Barcode C128A (50mm x 10mm) |

---

## 3. Customer Information Section

### 3.1 Left Column (Contact Info)
| Field | Source |
|-------|--------|
| To | `$model->contact->title` + `first_name` + `middle_name` + `surname` |
| Company | `$model->customer->customer_name` |
| Address | `$model->address->address`, `city`, `state`, `postal_code`, `country` |

### 3.2 Right Column (Contact Details)
| Field | Source |
|-------|--------|
| Phone | `$model->contact->phone` |
| Fax | `$model->contact->fax` |
| Mobile Phone | `$model->contact->mobile_phone` |
| Email Address | `$model->contact->email` |

---

## 4. Products Section (Additional Charge)

### 4.1 Table Columns
| Column | Width | Alignment |
|--------|-------|-----------|
| No | 5% | Center |
| Additional Charge | 50% | Left |
| Price | 15% | Right |
| Qty | 10% | Center |
| Disc% | 7% | Center |
| Total | 13% | Right |

### 4.2 Calculation Logic
```typescript
// For each product
const discountedPrice = price - (discount / 100 * price);
const total = discountedPrice * quantity;
subTotal += total;

// Tracking
basePrice = price * quantity;
discountAmount = (discount / 100) * basePrice;
```

---

## 5. Samples Section

### 5.1 Table Columns (Standard Layout)
For customers NOT in [34, 2013, 65]:
| Column | Width | Content |
|--------|-------|---------|
| No | 5% | Row number |
| Services | 25% | Service name |
| Method | 25% | Method name |
| Price | 10% | Unit price |
| Qty | 5% | Quantity |
| Disc% | 10% | Discount percentage |
| PC% | 7% | Priority charge % |
| Total | 13% | Line total |

### 5.2 Table Columns (Special Layout)
For customers IN [34, 2013, 65]:
| Column | Width | Content |
|--------|-------|---------|
| No | 5% | Row number |
| Services | 30% | Service name |
| Method | 40% | Method name |
| Qty | 5% | Quantity |
| Price | 20% | Total price |

### 5.3 Priority Cost Logic
```typescript
const priorityCost = {
  'normal': 0,
  'urgent': 50,      // 50% surcharge
  'very-urgent': 100 // 100% surcharge
};

// Can be overridden by Contract settings
if (contract.status_service === 'selected') {
  // Check ContractDetail for specific service
  priorityCost = contractDetail.dsc_urgent || contractDetail.dsc_very_urgent;
} else {
  // Use Contract default
  priorityCost = contract.dsc_urgent || contract.dsc_very_urgent;
}
```

### 5.4 Service Price Calculation
```typescript
// Get price (from service or contract)
let servicePrice = service.getPriceOn(model.created_at);
if (contractId) {
  const contractData = service.getContractData(contractId);
  servicePrice = contractData.price;
}

// Calculate total
const discountedPrice = servicePrice - (discount / 100 * servicePrice);
const withPriority = discountedPrice + (discountedPrice * (priorityCost / 100));
const total = withPriority * quantity;

// Skip priority charge for non-parameter services
if (service.parameter_id === 0 && !service.use_pc) {
  priorityCost = 0;
}
```

### 5.5 Package Display
```typescript
// Packages show expanded service list
const packageServices = package.list_service.split(',');
let servicesList = '';
for (const serviceId of packageServices) {
  const service = Service.findByPk(serviceId);
  servicesList += ` - ${service.name} | ${service.method.name} <br/>`;
}
```

---

## 6. Summary Section

### 6.1 Summary Table (Standard Layout)
| Row | Label | Value |
|-----|-------|-------|
| 1 | Total (IDR) | `totalBasePrice` |
| 2 | Discount (IDR) | `totalDiscount` |
| 3 | Priority Chrg (IDR) | `totalPriorityPrice` |
| 4 | Sub Total (IDR) | `subTotalAll_Final` |
| 5 | VAT (IDR) | `price_vat` |
| 6 | Grand Total (IDR) | `total_all` |

### 6.2 Minimum Order Rule
```typescript
const subTotalAll = totalBasePrice - totalDiscount + totalPriorityPrice;

if (subTotalAll <= 200000) {
  subTotalAll_Final = 200000;
  price_vat = 22000;       // Fixed VAT for minimum
  total_all = 222000;      // Fixed total
} else {
  subTotalAll_Final = subTotalAll;
  price_vat = (percent_vat / 100) * subTotalAll;
  total_all = subTotalAll + price_vat;
}
```

### 6.3 Special Layout (Customers 34, 2013, 65)
- Hides: Total, Discount, Priority Charge
- Shows: Sub Total, VAT, Grand Total only

---

## 7. Additional Services Section

| Service Category | Description |
|------------------|-------------|
| System Certification | ISO 9001, ISO 14001, ISO 45001, ISO 27001, ISO 37001, ISO 50001, IATF, ISO 22000, FSSC 22000, HACCP, ISPO, ISCC, etc. |
| Product Certification | SNI, CE, GS, etc. |
| Inspection | Rack Inspection, QA/QC Inspection, etc. |
| Training | In House Training for All Management Systems Topic |
| Laboratory Services | Consumer goods, Product stability, Environmental testing, Industrial Hygiene, Petroleum analysis, Calibration |

---

## 8. Footer Section

### 8.1 Page 1 Footer
```
Created by: {creator_name}
Customer Approval: _______________________________________________
Page X from Y
```

### 8.2 Footer Selection (Conditional)
```php
if ($model->created_at < '2023-08-17') {
    include "header-footer/footer.php";      // Old footer
} else {
    include "header-footer/footer-new.php";  // New footer
}
```

---

## 9. Page 2 - Terms & Conditions

### 9.1 Left Column Content
- **Shipping Product Samples**: Guidelines for sample packaging
- **Sample Privacy**: Confidentiality statement
- **Quotation and Sample Submission**: Website and contact info
- **Address** (Conditional based on date):
  - >= 2025-09-01: New address (Arkadia Green Park Tower G)
  - < 2025-09-01: Old address (Arkadia Tower F)

### 9.2 Right Column Content
- **Confidentiality**
- **Payment Terms**: Based on customer TOP (Terms of Payment)
- **Billing**
- **Sample Submission**
- **Hazardous Substances**
- **Analysis**: 7-10 working days, rush fee 100%
- **Litigation**
- **Warranty and Limits of Liability**

### 9.3 Payment Terms Logic
```typescript
if (customer.top) {
  // Customer has credit terms
  text = `Payment terms are Net ${customer.top} days.`;
} else {
  // Prepaid
  text = 'Payment must be made prior to sending the report.';
}
```

---

## 10. CSS Classes Reference

### 10.1 Width Classes
| Class | Width |
|-------|-------|
| `.c3` | 3% |
| `.c5` | 5% |
| `.c7` | 7% |
| `.c10` | 10% |
| `.c13` | 13% |
| `.c15` | 15% |
| `.c17` | 17% |
| `.c20` | 20% |
| `.c25` | 25% |
| `.c30` | 30% |
| `.c33` | 33% |
| `.c40` | 40% |
| `.c50` | 50% |
| `.c55` | 55% |
| `.c60` | 60% |
| `.c65` | 65% |
| `.c70` | 70% |
| `.c75` | 75% |
| `.c80` | 80% |
| `.c100` | 100% |

### 10.2 Text Classes
| Class | Style |
|-------|-------|
| `.text-left` | text-align: left |
| `.text-right` | text-align: right |
| `.text-center` | text-align: center |
| `.text-top` | vertical-align: top |
| `.text-sm` | font-size: 7pt |
| `.text-md` | font-size: 10pt |
| `.text-5` | font-size: 4.5pt |
| `.text-8` | font-size: 8.5pt |

### 10.3 Height Classes
| Class | Height |
|-------|--------|
| `.h5` | 5pt |
| `.h15` | 15pt |
| `.h30` | 30pt |
| `.h60` | 60pt |
| `.h90` | 90pt |

### 10.4 Table Classes
| Class | Description |
|-------|-------------|
| `.table` | width: 100%, border-collapse: collapse |
| `.table-border` | Adds 0.5pt border to cells |
| `.row-head` | Gray background (#EEE) |

---

## 11. Data Model Requirements

### 11.1 Quotation Model
```typescript
interface Quotation {
  id: number;
  code: string;
  created_at: string;
  quo_date: string;
  priority: string;
  price_group: number | null;
  percent_vat: number;
  remarks: string;
  customer_id: number;

  // Relations
  customer: Customer;
  contact: Contact;
  address: Address;
  creator: User;
}
```

### 11.2 Customer Model
```typescript
interface Customer {
  id: number;
  customer_name: string;
  top: number | null;  // Terms of Payment (days)
}
```

### 11.3 Contact Model
```typescript
interface Contact {
  id: number;
  title: string;
  first_name: string;
  middle_name: string;
  surname: string;
  phone: string;
  fax: string;
  mobile_phone: string;
  email: string;
}
```

### 11.4 Address Model
```typescript
interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}
```

### 11.5 Service Model
```typescript
interface Service {
  id: number;
  name: string;
  parameter_id: number;
  use_pc: boolean;

  // Methods
  getPriceOn(date: string): number;
  getContractData(contractId: number): ContractData;

  // Relations
  method: Method;
}
```

### 11.6 Package Model
```typescript
interface Package {
  id: number;
  name: string;
  total_price: number;
  list_service: string;  // Comma-separated service IDs
}
```

### 11.7 Contract Model
```typescript
interface Contract {
  id: number;
  customer_id: number;
  periode_from: string;
  periode_to: string;
  status_service: string;  // 'selected' or other
  dsc_urgent: number;
  dsc_very_urgent: number;
}
```

---

## 12. POST Data Structure

### 12.1 Product Data
```typescript
interface ProductPost {
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

// $_POST['product'][index] = ProductPost
```

### 12.2 Sample Data
```typescript
interface SamplePost {
  name: string;
  priority: string;
  service?: {
    [key: string]: {
      id: number;
      quantity: number;
      discount: number;
    }
  };
  package?: {
    [key: string]: {
      id: number;
      quantity: number;
      discount: number;
    }
  };
}

// $_POST['sample'][index] = SamplePost
```

---

## 13. Node.js PDF Generation (Puppeteer)

### 13.1 Recommended Library
```typescript
// Use Puppeteer for HTML to PDF conversion
import puppeteer from 'puppeteer';

async function generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Render HTML template
  const html = renderQuotationTemplate(data);
  await page.setContent(html);

  // Generate PDF
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    displayHeaderFooter: true,
    headerTemplate: renderHeader(data),
    footerTemplate: renderFooter(data)
  });

  await browser.close();
  return pdf;
}
```

### 13.2 Alternative: PDFKit
```typescript
import PDFDocument from 'pdfkit';

function generateQuotationPdf(data: QuotationPdfData): Buffer {
  const doc = new PDFDocument({ size: 'A4', margin: 30 });

  // Add content
  doc.fontSize(16).text('QUOTATION', { align: 'left' });
  // ... more content

  doc.end();
  return doc;
}
```

### 13.3 Barcode Generation
```typescript
import bwipjs from 'bwip-js';

async function generateBarcode(code: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: code,
    scale: 3,
    height: 10,
    includetext: true
  });
}
```

---

## 14. Special Customer Logic

### 14.1 Customer IDs with Different Layout
```typescript
const SPECIAL_CUSTOMER_IDS = [34, 2013, 65];

if (SPECIAL_CUSTOMER_IDS.includes(customerId)) {
  // Use simplified layout
  // Hide: Price column, Discount column, Priority Charge column
  // Show: Total only
}
```

### 14.2 Environmental Lab User
```typescript
const ENVIRONMENTAL_LAB_USER_ID = 1625;

// Code format: QT.E.YYMM{NN}
```

---

## 15. Date Conditional Logic

| Condition | Result |
|-----------|--------|
| `created_at < '2023-08-17'` | Use old header/footer |
| `created_at >= '2023-08-17'` | Use new header/footer |
| `created_at >= '2025-09-01'` | Use new office address |

---

*End of Document*
