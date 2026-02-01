import api from './api';

// ===== Interfaces =====

export interface OrderCustomer {
  id: number;
  code: string;
  customer_name: string;
}

export interface OrderContact {
  id: number;
  first_name: string;
  middle_name?: string | null;
  surname: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

export interface OrderAddress {
  id: number;
  address: string;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}

export interface OrderQuotation {
  id: number;
  code: string;
}

export interface OrderPreOrder {
  id: number;
  code: string;
}

export interface OrderInvoice {
  id: number;
  code: string;
}

export interface OrderWorksheet {
  id: number;
  code: string | null;
  status: string | null;
  serviceId: number;
  serviceName: string;
  serviceCode: string;
  parameter: string;
  method: string;
  price: number;
  discount: number;
  total: number;
  packageId: number | null;
  packageName: string | null;
}

export interface OrderSample {
  id: number;
  code: string;
  name: string;
  description: string | null;
  volume: string | null;
  sampleStorage: string | null;
  quantity: number | null;
  priority: string;
  standardId: number | null;
  standardName: string | null;
  receivedDate: string | null;
  dueDate: string | null;
  price: number | null;
  discount: number | null;
  sampleStatus: string;
  coaReleasedDate: string | null;
  worksheets: OrderWorksheet[];
}

export interface Order {
  id: number;
  code: string;
  orderStatus: string;
  orderPriority: string | null;
  orderDate: string;
  receivedDate: string | null;
  receivedBy: number | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  submitedBy: string | null;
  customerId: number | null;
  contactId: number | null;
  addressId: number | null;
  quotationId: number | null;
  preOrderId: number | null;
  invoiceId: number | null;
  remarks: string | null;
  priceGroup: string | null;
  expense: number | null;
  priority: string | null;
  document: string | null;
  subTotal: number;
  percentDiscount: number;
  percentVat: number;
  total: number;
  paymentDocument: string | null;
  paymentDate: string | null;
  paymentConfirmationDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  unlock: number | null;
  delivery: string | null;
  coveringLetter: number | null;
  testingParameters: number | null;
  characteristic: number | null;
  // Relations
  customer: OrderCustomer | null;
  contact: OrderContact | null;
  address: OrderAddress | null;
  quotation: OrderQuotation | null;
  preOrder: OrderPreOrder | null;
  invoice: OrderInvoice | null;
  samples?: OrderSample[];
}

export interface OrderListItem {
  id: number;
  code: string;
  orderStatus: string;
  orderPriority: string | null;
  orderDate: string;
  subTotal: number;
  total: number;
  customer: {
    id: number;
    name: string;
    code: string;
  } | null;
  contact: {
    id: number;
    name: string;
  } | null;
  createdBy: {
    id: number;
    name: string;
  } | null;
}

/**
 * Service data for sample worksheets
 */
export interface OrderSampleService {
  service_id: number;
  package_id?: number | null;
  discount?: number;
  price?: number;
}

/**
 * Sample data for order creation
 */
export interface OrderSampleFormData {
  name: string;
  description?: string | null;
  quantity?: number | null;
  volume?: string | null;
  sample_storage?: string | null;
  packaging_type?: string | null;
  standard_id?: number | null;
  due_date?: string | null;
  priority?: string;
  lead_time?: string;
  price?: number | null;
  discount?: number | null;
  services?: OrderSampleService[];
}

export interface OrderFormData {
  customer_id: number;
  contact_id: number;
  address_id?: number | null;
  contract_id?: number | null;
  pre_order_id?: number | null;
  quotation_id?: number | null;
  status?: string;
  priority?: string;
  order_date: string;
  due_date?: string | null;
  sub_total?: number;
  discount_percent?: number;
  discount_value?: number;
  vat_percent?: number;
  vat_value?: number;
  total?: number;
  remarks?: string | null;
  notes_internal?: string | null;
  lab?: number;
  submited_by?: string;
  expense?: number | null;
  delivery?: string | null;
  // Samples with services for atomic creation
  samples?: OrderSampleFormData[];
}

// ===== Response Interfaces =====

export interface OrdersResponse {
  success: boolean;
  data: OrderListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderResponse {
  success: boolean;
  data: Order;
  message?: string;
}

export interface OrdersJsonItem {
  id: number;
  code: string;
  customer: {
    id: number;
    name: string;
  };
  orderDate: string | null;
}

export interface OrdersJsonResponse {
  success: boolean;
  data: OrdersJsonItem[];
}

// ===== Order Service =====

export const orderService = {
  // Get all orders with pagination and filters
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customer_id?: number;
    status?: string;
    priority?: string;
    date_from?: string;
    date_to?: string;
  }, signal?: AbortSignal): Promise<OrdersResponse> => {
    const response = await api.get<OrdersResponse>('/orders', { params, signal });
    return response.data;
  },

  // Get order by ID with full details including samples
  getById: async (id: number | string, signal?: AbortSignal): Promise<OrderResponse> => {
    const response = await api.get<OrderResponse>(`/orders/${id}`, { signal });
    return response.data;
  },

  // Create new order
  create: async (data: OrderFormData): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>('/orders', data);
    return response.data;
  },

  // Update order
  update: async (id: number | string, data: Partial<OrderFormData>): Promise<OrderResponse> => {
    const response = await api.put<OrderResponse>(`/orders/${id}`, data);
    return response.data;
  },

  // Delete order (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/orders/${id}`);
    return response.data;
  },

  // Generate next order code
  generateCode: async (): Promise<{ success: boolean; data: { code: string } }> => {
    const response = await api.get<{ success: boolean; data: { code: string } }>('/orders/generate-code');
    return response.data;
  },

  // Get orders JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    customer_id?: number;
  }): Promise<OrdersJsonResponse> => {
    const response = await api.get<OrdersJsonResponse>('/orders/json', { params });
    return response.data;
  },

  // Update order status
  updateStatus: async (id: number | string, status: string): Promise<OrderResponse> => {
    const response = await api.patch<OrderResponse>(`/orders/${id}/status`, { status });
    return response.data;
  },

  // Review order (approve/reject)
  review: async (id: number | string, data: { status: string; reason?: string }): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>(`/orders/${id}/review`, data);
    return response.data;
  },

  // Upload payment document
  uploadPayment: async (id: number | string, file: File, paymentDate?: string): Promise<OrderResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (paymentDate) {
      formData.append('payment_date', paymentDate);
    }
    const response = await api.post<OrderResponse>(`/orders/${id}/upload-payment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Confirm payment
  confirmPayment: async (id: number | string): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>(`/orders/${id}/confirm-payment`);
    return response.data;
  },

  // Resend order email
  resendEmail: async (id: number | string, emailType?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(`/orders/${id}/resend-email`, {
      email_type: emailType,
    });
    return response.data;
  },

  // Create revision
  createRevision: async (id: number | string, reason?: string): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>(`/orders/${id}/revise`, { reason });
    return response.data;
  },

  // Unlock order
  unlock: async (id: number | string): Promise<OrderResponse> => {
    const response = await api.post<OrderResponse>(`/orders/${id}/unlock`);
    return response.data;
  },

  // Download order document
  downloadDocument: async (id: number | string, type: 'sppc' | 'quotation' | 'request_form' | 'coa_request' | 'coa_release' | 'order_detail'): Promise<Blob> => {
    const response = await api.get(`/orders/${id}/download`, {
      params: { type },
      responseType: 'blob',
    });
    return response.data;
  },
};
