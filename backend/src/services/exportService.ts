import { Parser } from 'json2csv';

/**
 * Order Export Data Interface
 */
export interface OrderExportData {
  code: string;
  orderDate: string;
  customerCode: string;
  customerName: string;
  contactName: string;
  status: string;
  priority: string;
  subTotal: number;
  discountValue: number;
  vatValue: number;
  total: number;
  lab: string;
  remarks?: string;
  createdAt: string;
}

/**
 * CTS Export Data Interface (Customer Testing Service)
 */
export interface CTSExportData {
  no: number;
  orderCode: string;
  orderDate: string;
  customerName: string;
  sampleCode: string;
  sampleName: string;
  matrix: string;
  parameterName: string;
  methodName: string;
  price: number;
  status: string;
}

/**
 * Non-CTS Export Data Interface
 */
export interface NonCTSExportData {
  no: number;
  orderCode: string;
  orderDate: string;
  customerName: string;
  sampleCode: string;
  sampleName: string;
  matrix: string;
  parameterName: string;
  methodName: string;
  price: number;
  status: string;
  subcontractor?: string;
}

/**
 * Calibration Export Data Interface
 */
export interface CalibrationExportData {
  no: number;
  orderCode: string;
  orderDate: string;
  customerName: string;
  equipmentName: string;
  equipmentModel: string;
  serialNumber: string;
  calibrationPoint: string;
  price: number;
  status: string;
  dueDate?: string;
}

/**
 * Active Customer Export Data Interface
 */
export interface ActiveCustomerExportData {
  no: number;
  customerCode: string;
  customerName: string;
  business: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrderDate: string;
  salesIncharge?: string;
  status: string;
}

/**
 * Report Export Data Interface
 */
export interface ReportExportData {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
}

/**
 * Invoice Export Data Interface
 */
export interface InvoiceExportData {
  code: string;
  invoiceDate: string;
  dueDate: string;
  customerCode: string;
  customerName: string;
  contactName: string;
  status: string;
  subTotal: number;
  vatValue: number;
  total: number;
  paymentStatus?: string;
  paymentDate?: string;
}

/**
 * Export Service Class
 * Handles CSV export for various data types
 */
export class ExportService {
  /**
   * Format number to Indonesian currency format
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
  }

  /**
   * Format date to Indonesian format
   */
  private formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Generic CSV generation
   */
  private generateCSV<T>(data: T[], fields: { label: string; value: string | ((row: T) => any) }[]): string {
    if (data.length === 0) {
      return fields.map(f => f.label).join(',') + '\n';
    }

    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export Orders to CSV
   */
  exportOrders(data: OrderExportData[]): string {
    const fields = [
      { label: 'Kode Order', value: 'code' },
      { label: 'Tanggal Order', value: (row: OrderExportData) => this.formatDate(row.orderDate) },
      { label: 'Kode Customer', value: 'customerCode' },
      { label: 'Nama Customer', value: 'customerName' },
      { label: 'Kontak', value: 'contactName' },
      { label: 'Status', value: 'status' },
      { label: 'Prioritas', value: 'priority' },
      { label: 'Sub Total', value: (row: OrderExportData) => this.formatCurrency(row.subTotal) },
      { label: 'Diskon', value: (row: OrderExportData) => this.formatCurrency(row.discountValue) },
      { label: 'PPN', value: (row: OrderExportData) => this.formatCurrency(row.vatValue) },
      { label: 'Total', value: (row: OrderExportData) => this.formatCurrency(row.total) },
      { label: 'Lab', value: 'lab' },
      { label: 'Catatan', value: 'remarks' },
      { label: 'Dibuat', value: (row: OrderExportData) => this.formatDate(row.createdAt) },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Export CTS (Customer Testing Service) Orders to CSV
   */
  exportCTS(data: CTSExportData[]): string {
    const fields = [
      { label: 'No', value: 'no' },
      { label: 'Kode Order', value: 'orderCode' },
      { label: 'Tanggal Order', value: (row: CTSExportData) => this.formatDate(row.orderDate) },
      { label: 'Nama Customer', value: 'customerName' },
      { label: 'Kode Sample', value: 'sampleCode' },
      { label: 'Nama Sample', value: 'sampleName' },
      { label: 'Matrix', value: 'matrix' },
      { label: 'Parameter', value: 'parameterName' },
      { label: 'Metode', value: 'methodName' },
      { label: 'Harga', value: (row: CTSExportData) => this.formatCurrency(row.price) },
      { label: 'Status', value: 'status' },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Export Non-CTS Orders to CSV
   */
  exportNonCTS(data: NonCTSExportData[]): string {
    const fields = [
      { label: 'No', value: 'no' },
      { label: 'Kode Order', value: 'orderCode' },
      { label: 'Tanggal Order', value: (row: NonCTSExportData) => this.formatDate(row.orderDate) },
      { label: 'Nama Customer', value: 'customerName' },
      { label: 'Kode Sample', value: 'sampleCode' },
      { label: 'Nama Sample', value: 'sampleName' },
      { label: 'Matrix', value: 'matrix' },
      { label: 'Parameter', value: 'parameterName' },
      { label: 'Metode', value: 'methodName' },
      { label: 'Harga', value: (row: NonCTSExportData) => this.formatCurrency(row.price) },
      { label: 'Status', value: 'status' },
      { label: 'Subkontraktor', value: 'subcontractor' },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Export Calibration Orders to CSV
   */
  exportCalibration(data: CalibrationExportData[]): string {
    const fields = [
      { label: 'No', value: 'no' },
      { label: 'Kode Order', value: 'orderCode' },
      { label: 'Tanggal Order', value: (row: CalibrationExportData) => this.formatDate(row.orderDate) },
      { label: 'Nama Customer', value: 'customerName' },
      { label: 'Nama Alat', value: 'equipmentName' },
      { label: 'Model', value: 'equipmentModel' },
      { label: 'Serial Number', value: 'serialNumber' },
      { label: 'Titik Kalibrasi', value: 'calibrationPoint' },
      { label: 'Harga', value: (row: CalibrationExportData) => this.formatCurrency(row.price) },
      { label: 'Status', value: 'status' },
      { label: 'Jatuh Tempo', value: (row: CalibrationExportData) => row.dueDate ? this.formatDate(row.dueDate) : '' },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Export Active Customers to CSV
   */
  exportActiveCustomers(data: ActiveCustomerExportData[]): string {
    const fields = [
      { label: 'No', value: 'no' },
      { label: 'Kode Customer', value: 'customerCode' },
      { label: 'Nama Customer', value: 'customerName' },
      { label: 'Bisnis', value: 'business' },
      { label: 'Total Order', value: 'totalOrders' },
      { label: 'Total Revenue', value: (row: ActiveCustomerExportData) => this.formatCurrency(row.totalRevenue) },
      { label: 'Order Terakhir', value: (row: ActiveCustomerExportData) => this.formatDate(row.lastOrderDate) },
      { label: 'Sales Incharge', value: 'salesIncharge' },
      { label: 'Status', value: 'status' },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Export Report Summary to CSV
   */
  exportReport(data: ReportExportData[]): string {
    const fields = [
      { label: 'Periode', value: 'period' },
      { label: 'Total Order', value: 'totalOrders' },
      { label: 'Total Revenue', value: (row: ReportExportData) => this.formatCurrency(row.totalRevenue) },
      { label: 'Rata-rata Order', value: (row: ReportExportData) => this.formatCurrency(row.averageOrderValue) },
      { label: 'Order Selesai', value: 'completedOrders' },
      { label: 'Order Dibatalkan', value: 'cancelledOrders' },
      { label: 'Order Pending', value: 'pendingOrders' },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Export Invoices to CSV
   */
  exportInvoices(data: InvoiceExportData[]): string {
    const fields = [
      { label: 'Kode Invoice', value: 'code' },
      { label: 'Tanggal Invoice', value: (row: InvoiceExportData) => this.formatDate(row.invoiceDate) },
      { label: 'Jatuh Tempo', value: (row: InvoiceExportData) => this.formatDate(row.dueDate) },
      { label: 'Kode Customer', value: 'customerCode' },
      { label: 'Nama Customer', value: 'customerName' },
      { label: 'Kontak', value: 'contactName' },
      { label: 'Status', value: 'status' },
      { label: 'Sub Total', value: (row: InvoiceExportData) => this.formatCurrency(row.subTotal) },
      { label: 'PPN', value: (row: InvoiceExportData) => this.formatCurrency(row.vatValue) },
      { label: 'Total', value: (row: InvoiceExportData) => this.formatCurrency(row.total) },
      { label: 'Status Pembayaran', value: 'paymentStatus' },
      { label: 'Tanggal Pembayaran', value: (row: InvoiceExportData) => row.paymentDate ? this.formatDate(row.paymentDate) : '' },
    ];

    return this.generateCSV(data, fields);
  }

  /**
   * Generate file name with timestamp
   */
  generateFileName(prefix: string, extension: string = 'csv'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${timestamp}.${extension}`;
  }
}

// Export singleton instance
export const exportService = new ExportService();
