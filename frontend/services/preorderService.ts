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
  middle_name: string | null;
  surname: string;
  email: string;
  phone: string;
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
  customer_id: number;
  quotation_id: number | null;
  contact_id: number;
  received_date: string | null;
  delivery: string | null;
  receipt_number: string | null;
  driver_id: number | null;
  order_id: number | null;
  submited_by: string;
  sample_quantity: number;
  priority: string | null;
  document: string | null;
  covering_letter: string | null;
  testing_parameters: string | null;
  complete_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  remarks: string | null;
  lab: number;
  subcon: number | null;
  subcon_id: number | null;
  subcon_due: string | null;
  notes_customer: string | null;
  // Relations
  customer: PreOrderCustomer | null;
  contact: PreOrderContact | null;
  driver: PreOrderDriver | null;
  quotation: PreOrderQuotation | null;
  order: PreOrderOrder | null;
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
  submited_by: string;
  sample_quantity: number;
  priority?: string | null;
  document?: string | null;
  covering_letter?: string | null;
  testing_parameters?: string | null;
  remarks?: string | null;
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
    const response = await api.get<PreOrdersResponse>('/preorders', { params });
    return response.data;
  },

  // Get preorder by ID with full details
  getById: async (id: number | string): Promise<PreOrderResponse> => {
    const response = await api.get<PreOrderResponse>(`/preorders/${id}`);
    return response.data;
  },

  // Create new preorder
  create: async (data: PreOrderFormData): Promise<PreOrderResponse> => {
    const response = await api.post<PreOrderResponse>('/preorders', data);
    return response.data;
  },

  // Update preorder
  update: async (id: number | string, data: Partial<PreOrderFormData>): Promise<PreOrderResponse> => {
    const response = await api.put<PreOrderResponse>(`/preorders/${id}`, data);
    return response.data;
  },

  // Delete preorder (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/preorders/${id}`);
    return response.data;
  },

  // Get preorders JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    customer_id?: number;
  }): Promise<PreOrdersJsonResponse> => {
    const response = await api.get<PreOrdersJsonResponse>('/preorders/json', { params });
    return response.data;
  },

  // Generate next preorder code
  generateCode: async (lab?: number): Promise<{ success: boolean; data: { code: string } }> => {
    const response = await api.get<{ success: boolean; data: { code: string } }>('/preorders/generate-code', {
      params: lab ? { lab } : undefined,
    });
    return response.data;
  },

  // Check if preorder has linked order
  checkLinkedOrder: async (id: number | string): Promise<{
    success: boolean;
    data: {
      hasOrder: boolean;
      orderId?: number;
      orderCode?: string;
    };
  }> => {
    const response = await api.get(`/preorders/${id}/linked-order`);
    return response.data;
  },
};
