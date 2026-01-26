import api from './api';

// ===== Interfaces =====

export interface PreOrderCustomer {
  id: number;
  code: string;
  customer_name: string;
}

export interface PreOrderContact {
  id: number;
  first_name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

export interface PreOrderDriver {
  id: number;
  name: string;
}

export interface PreOrderQuotation {
  id: number;
  code: string;
}

export interface PreOrderOrder {
  id: number;
  code: string;
}

export interface PreOrder {
  id: number;
  code: string;
  customerId: number;
  quotationId: number | null;
  contactId: number;
  receivedDate: string | null;
  delivery: string | null;
  receiptNumber: string | null;
  driverId: number | null;
  orderId: number | null;
  submitedBy: string;
  sampleQuantity: number;
  priority: string | null;
  document: string | null;
  coveringLetter: string | null;
  testingParameters: string | null;
  completeDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  remarks: string | null;
  unlock: number | null;
  characteristic: number | null;
  lab: number;
  subcon: number | null;
  subconId: number | null;
  subconDue: string | null;
  notesCustomer: string | null;
  // Relations
  customer: PreOrderCustomer | null;
  contact: PreOrderContact | null;
  driver: PreOrderDriver | null;
  quotation: PreOrderQuotation | null;
  orders?: PreOrderOrder[] | null;
}

export interface PreOrderListItem {
  id: number;
  code: string;
  receivedDate: string | null;
  delivery: string | null;
  submitedBy: string;
  sampleQuantity: number;
  priority: string | null;
  lab: number;
  completeDate: string | null;
  customer: {
    id: number;
    name: string;
    code: string;
  } | null;
  contact: {
    id: number;
    name: string;
  } | null;
  order: {
    id: number | null;
    code: string | null;
  } | null;
  createdBy: {
    id: number;
    name: string;
  } | null;
}

export interface PreOrderFormData {
  customer_id: number;
  contact_id: number;
  quotation_id?: number | null;
  received_date?: string | null;
  delivery?: string | null;
  receipt_number?: string | null;
  driver_id?: number | null;
  submited_by: string;
  sample_quantity: number;
  priority?: string | null;
  document?: string | null;
  covering_letter?: string | null;
  testing_parameters?: string | null;
  remarks?: string | null;
  characteristic?: number | null;
  lab: number;
  subcon?: number | null;
  subcon_id?: number | null;
  subcon_due?: string | null;
  notes_customer?: string | null;
}

// ===== Response Interfaces =====

export interface PreOrdersResponse {
  success: boolean;
  data: PreOrderListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PreOrderResponse {
  success: boolean;
  data: PreOrder;
  message?: string;
}

export interface PreOrdersJsonItem {
  id: number;
  code: string;
  customer: {
    id: number;
    name: string;
  };
  receivedDate: string | null;
}

export interface PreOrdersJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: PreOrdersJsonItem[];
  data?: PreOrdersJsonItem[];
}

// ===== Additional Interfaces =====

export interface CanCreateOrderResponse {
  success: boolean;
  data: {
    canCreate: boolean;
    isDocumentComplete: boolean;
    hasOrder: boolean;
    hasOutstanding: boolean;
    isUnlocked: boolean;
    outstandingAmount?: number;
    reasons: string[];
  };
}

export interface OutstandingResponse {
  success: boolean;
  data: {
    hasOutstanding: boolean;
    amount: number;
    daysPastDue: number;
    isWhitelist: boolean;
    threshold: number;
  };
}

export interface PreSample {
  id: number;
  code: string;
  name: string;
  description: string | null;
  volume: string | null;
  sampleStorage: string | null;
  priority: string | null;
  customFields: string | null;
  indexSample: number | null;
  indexArray: number | null;
}

export interface SamplesResponse {
  success: boolean;
  data: PreSample[];
}

export interface CreateFromQuotationData {
  submited_by: string;
  received_date?: string | null;
  delivery?: string | null;
  receipt_number?: string | null;
  driver_id?: number | null;
  priority?: string | null;
  remarks?: string | null;
  characteristic?: number | null;
  notes_customer?: string | null;
}

// ===== PreOrder Service =====

export const preorderService = {
  // Get all preorders with pagination and filters
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customer_id?: number;
    lab?: number;
    date_start?: string;
    date_end?: string;
  }): Promise<PreOrdersResponse> => {
    const response = await api.get<PreOrdersResponse>('/pre-orders', { params });
    return response.data;
  },

  // Get preorder by ID with full details
  getById: async (id: number | string): Promise<PreOrderResponse> => {
    const response = await api.get<PreOrderResponse>(`/pre-orders/${id}`);
    return response.data;
  },

  // Create new preorder
  create: async (data: PreOrderFormData): Promise<PreOrderResponse> => {
    const response = await api.post<PreOrderResponse>('/pre-orders', data);
    return response.data;
  },

  // Create preorder with file upload
  createWithFile: async (data: FormData): Promise<PreOrderResponse> => {
    const response = await api.post<PreOrderResponse>('/pre-orders', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update preorder (using PATCH as per backend)
  update: async (id: number | string, data: Partial<PreOrderFormData>): Promise<PreOrderResponse> => {
    const response = await api.patch<PreOrderResponse>(`/pre-orders/${id}`, data);
    return response.data;
  },

  // Update preorder with file upload
  updateWithFile: async (id: number | string, data: FormData): Promise<PreOrderResponse> => {
    const response = await api.patch<PreOrderResponse>(`/pre-orders/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete preorder (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/pre-orders/${id}`);
    return response.data;
  },

  // Get preorders JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    customer_id?: number;
  }): Promise<PreOrdersJsonResponse> => {
    const response = await api.get<PreOrdersJsonResponse>('/pre-orders/json', { params });
    return response.data;
  },

  // Generate next preorder code
  generateCode: async (lab?: number): Promise<{ success: boolean; data: { code: string } }> => {
    const response = await api.get<{ success: boolean; data: { code: string } }>('/pre-orders/generate-code', {
      params: lab ? { lab } : undefined,
    });
    return response.data;
  },

  // Check if preorder can create an order
  canCreateOrder: async (id: number | string): Promise<CanCreateOrderResponse> => {
    const response = await api.get<CanCreateOrderResponse>(`/pre-orders/${id}/can-create-order`);
    return response.data;
  },

  // Get samples for preorder
  getSamples: async (id: number | string): Promise<SamplesResponse> => {
    const response = await api.get<SamplesResponse>(`/pre-orders/${id}/samples`);
    return response.data;
  },

  // Check outstanding for customer
  checkOutstanding: async (id: number | string): Promise<OutstandingResponse> => {
    const response = await api.get<OutstandingResponse>(`/pre-orders/${id}/outstanding`);
    return response.data;
  },

  // Unlock preorder (SuperAdmin/TechnicalManager only)
  unlock: async (id: number | string): Promise<PreOrderResponse> => {
    const response = await api.post<PreOrderResponse>(`/pre-orders/${id}/unlock`);
    return response.data;
  },

  // Create preorder from quotation
  createFromQuotation: async (quotationId: number, data: CreateFromQuotationData): Promise<PreOrderResponse> => {
    const response = await api.post<PreOrderResponse>(`/pre-orders/from-quotation/${quotationId}`, data);
    return response.data;
  },
};
