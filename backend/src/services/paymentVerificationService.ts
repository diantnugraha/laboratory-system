import { PrismaClient } from '@prisma/client';
import { PAYMENT_VERIFICATION } from '../config/sample.js';

/**
 * Result of payment verification
 */
export interface PaymentVerificationResult {
  /** Whether the sample/order can proceed */
  canProceed: boolean;
  /** Whether customer is on whitelist (special_customer = 1) */
  isSpecialCustomer: boolean;
  /** Outstanding invoice amount (sum of unpaid invoices past due) */
  outstandingAmount: number;
  /** List of outstanding invoices */
  outstandingInvoices: OutstandingInvoice[];
  /** Reason if cannot proceed */
  reason?: string;
  /** Customer's Terms of Payment */
  top: number;
}

/**
 * Outstanding invoice details
 */
export interface OutstandingInvoice {
  id: number;
  code: string | null;
  subTotal: number | null;
  invoiceSendDate: Date | null;
  daysPastDue: number;
}

/**
 * Service for verifying customer payment status
 * Used in sample approval flow to check for outstanding invoices
 */
export class PaymentVerificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Verify if customer can proceed with COA release
   *
   * Business rules:
   * - Special customers (whitelist): Check outstanding > TOP + 3 days
   *   - Can proceed but with notification
   * - Regular customers: Check outstanding > 63 days (60 + 3)
   *   - Cannot proceed if payment_document is null
   */
  async verifyPaymentStatus(customerId: number): Promise<PaymentVerificationResult> {
    // Get customer details
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, trash: null },
      select: {
        id: true,
        special_customer: true,
        top: true,
        customer_name: true,
      },
    });

    if (!customer) {
      return {
        canProceed: false,
        isSpecialCustomer: false,
        outstandingAmount: 0,
        outstandingInvoices: [],
        reason: 'Customer not found',
        top: 0,
      };
    }

    const isSpecialCustomer = customer.special_customer === 1;
    const top = customer.top ?? PAYMENT_VERIFICATION.DEFAULT_TOP_DAYS;

    // Calculate due days threshold
    const dueDays = isSpecialCustomer
      ? top + PAYMENT_VERIFICATION.SPECIAL_CUSTOMER_GRACE_DAYS
      : PAYMENT_VERIFICATION.REGULAR_CUSTOMER_MAX_DAYS;

    // Get outstanding invoices
    const { amount, invoices } = await this.getOutstandingInvoices(
      customerId,
      dueDays
    );

    // Determine if can proceed
    let canProceed = true;
    let reason: string | undefined;

    if (amount > 0) {
      if (isSpecialCustomer) {
        // Special customer can proceed but will get notification
        canProceed = true;
        reason = `Outstanding amount: ${this.formatCurrency(amount)} (TOP + ${PAYMENT_VERIFICATION.SPECIAL_CUSTOMER_GRACE_DAYS} days exceeded)`;
      } else {
        // Regular customer cannot proceed
        canProceed = false;
        reason = `Outstanding amount: ${this.formatCurrency(amount)} exceeds ${PAYMENT_VERIFICATION.REGULAR_CUSTOMER_MAX_DAYS} days. Payment required.`;
      }
    }

    return {
      canProceed,
      isSpecialCustomer,
      outstandingAmount: amount,
      outstandingInvoices: invoices,
      reason,
      top,
    };
  }

  /**
   * Get outstanding invoice amount for a customer
   * Returns invoices where status != 'PAID' and past due date threshold
   */
  async getOutstandingInvoices(
    customerId: number,
    dueDays: number
  ): Promise<{ amount: number; invoices: OutstandingInvoice[] }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate cutoff date (invoices sent before this date are past due)
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - dueDays);

    try {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          customer_id: customerId,
          trash: null,
          code: { not: null }, // Only count invoices with code
          status: { not: 'PAID' },
          invoice_send_date: {
            lte: cutoffDate,
          },
        },
        select: {
          id: true,
          code: true,
          sub_total: true,
          invoice_send_date: true,
        },
      });

      const outstandingInvoices: OutstandingInvoice[] = invoices.map((inv) => {
        const sendDate = inv.invoice_send_date;
        const daysPastDue = sendDate
          ? Math.floor(
              (today.getTime() - sendDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          id: inv.id,
          code: inv.code,
          subTotal: inv.sub_total,
          invoiceSendDate: inv.invoice_send_date,
          daysPastDue,
        };
      });

      const totalAmount = outstandingInvoices.reduce(
        (sum, inv) => sum + (inv.subTotal || 0),
        0
      );

      return {
        amount: totalAmount,
        invoices: outstandingInvoices,
      };
    } catch (error) {
      console.error(
        `Failed to get outstanding invoices for customer ${customerId}:`,
        error
      );
      return { amount: 0, invoices: [] };
    }
  }

  /**
   * Check if customer is on whitelist (special_customer = 1)
   */
  async isSpecialCustomer(customerId: number): Promise<boolean> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, trash: null },
      select: { special_customer: true },
    });

    return customer?.special_customer === 1;
  }

  /**
   * Get customer's Terms of Payment (TOP)
   */
  async getCustomerTOP(customerId: number): Promise<number> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, trash: null },
      select: { top: true },
    });

    return customer?.top ?? PAYMENT_VERIFICATION.DEFAULT_TOP_DAYS;
  }

  /**
   * Check if order has valid payment document/date
   */
  async checkOrderPayment(orderId: number): Promise<{
    hasPayment: boolean;
    paymentDocument: string | null;
    paymentDate: Date | null;
  }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, trash: null },
      select: {
        payment_document: true,
        payment_date: true,
      },
    });

    if (!order) {
      return {
        hasPayment: false,
        paymentDocument: null,
        paymentDate: null,
      };
    }

    return {
      hasPayment: !!(order.payment_document || order.payment_date),
      paymentDocument: order.payment_document,
      paymentDate: order.payment_date,
    };
  }

  /**
   * Verify payment for approval flow
   * Combines customer verification with order payment check
   */
  async verifyForApproval(
    customerId: number,
    orderId: number
  ): Promise<PaymentVerificationResult & { orderHasPayment: boolean }> {
    const [customerVerification, orderPayment] = await Promise.all([
      this.verifyPaymentStatus(customerId),
      this.checkOrderPayment(orderId),
    ]);

    // For regular customers without payment, block if outstanding
    if (
      !customerVerification.isSpecialCustomer &&
      !orderPayment.hasPayment &&
      customerVerification.outstandingAmount > 0
    ) {
      return {
        ...customerVerification,
        canProceed: false,
        reason: `Payment document required. Outstanding: ${this.formatCurrency(customerVerification.outstandingAmount)}`,
        orderHasPayment: orderPayment.hasPayment,
      };
    }

    return {
      ...customerVerification,
      orderHasPayment: orderPayment.hasPayment,
    };
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
