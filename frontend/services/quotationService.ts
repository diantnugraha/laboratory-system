import api from './api';

// ===== Interfaces =====

export interface QuotationCustomer {
  id: number;
  code: string;
  customer_name: string;
  special_customer: number | null;
  top: number | null;
}

export interface QuotationContact {
  id: number;
  first_name: string;
  middle_name: string | null;
  surname: string;
  email: string;
  phone: string;
  department: string | null;
}

export interface QuotationAddress {
  id: number;
  address_type: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface QuotationDetail {
  id: number;
  quotationId: number;
  serviceId: number;
  sampleName: string;
  sampleDescription: string | null;
  volume: string | null;
  priority: string;
  quantity: number;
  percentDiscount: number;
  packageId: number | null;
  indexArray: number | null;
  indexSample: number | null;
  price: number | null;
  product: number | null;
  serviceMatrix: string | null;
  service?: {
    id: number;
    code?: string;
    name: string;
    price: number;
    parameter?: {
      id: number;
      name: string;
    };
    method?: {
      id: number;
      name: string;
    };
  };
  package?: {
    id: number;
    code?: string;
    name: string;
    totalPrice: number;
    services?: Array<{
      id: number;
      name: string;
      price: number;
      parameter?: { id: number; name: string };
      method?: { id: number; name: string };
    }>;
  };
}

export interface QuotationOrder {
  id: number;
  code: string | null;
  order_status: string | null;
}

export interface Quotation {
  id: number;
  code: string;
  quo_status: string;
  quo_date: string;
  sampling_request: string | null;
  sampling_date: string | null;
  customer_id: number | null;
  contact_id: number | null;
  address_id: number | null;
  volume: string | null;
  remarks: string | null;
  min_volume_sample: string | null;
  sub_total: number;
  percent_discount: number;
  percent_vat: number;
  percent_pc: number | null;
  price_group: number | null;
  priority: string | null;
  total: number;
  lab: string | null;
  expired_date: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: number;
  updated_by: number | null;
  customer: QuotationCustomer | null;
  contact: QuotationContact | null;
  address: QuotationAddress | null;
  quotation_detail?: QuotationDetail[];
  orders?: QuotationOrder[];
}

export interface QuotationListItem {
  id: number;
  code: string;
  quoStatus: string;
  quoDate: string;
  expiredDate: string | null;
  samplingRequest: string | null;
  samplingDate: string | null;
  subTotal: number;
  total: number;
  percentVat: number;
  percentPc: number | null;
  priority: string | null;
  lab: string | null;
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
    status: string | null;
  } | null;
  createdBy: {
    id: number;
    name: string;
  } | null;
}

// Form input interfaces
export interface SampleServiceInput {
  id: number;
  quantity: number;
  discount: number;
  id_detail?: number;
  order?: number;
}

export interface SamplePackageInput {
  id: number;
  quantity: number;
  discount: number;
  id_detail?: string;
  order?: number;
}

export interface SampleInput {
  name: string;
  quantity: number;
  priority: 'normal' | 'urgent' | 'very urgent';
  services?: SampleServiceInput[];
  packages?: SamplePackageInput[];
}

export interface ProductInput {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  id_detail?: number;
}

export interface QuotationFormData {
  quo_status?: string;
  quo_date: string;
  sampling_request?: boolean | string | number;
  sampling_date?: string | null;
  customer_id: number;
  contact_id: number;
  address_id: number;
  volume?: string | null;
  remarks?: string | null;
  min_volume_sample?: string;
  sub_total: number;
  percent_discount?: number;
  percent_vat?: number;
  percent_pc?: number | null;
  price_group?: number | null;
  priority?: string;
  lab?: string;
  samples?: SampleInput[];
  products?: ProductInput[];
}

// ===== Response Interfaces =====

export interface QuotationsResponse {
  success: boolean;
  data: QuotationListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuotationResponse {
  success: boolean;
  data: Quotation;
  message?: string;
}

export interface QuotationsJsonItem {
  id: number;
  code: string;
  customer: {
    id: number;
    name: string;
  };
  quoDate: string;
  quoStatus: string;
  total: number;
}

export interface QuotationsJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: QuotationsJsonItem[];
  data?: QuotationsJsonItem[];
}

export interface QuotationDuplicateData {
  quotation: Quotation;
  sampleArray: Record<string, {
    name: string;
    quantity: number;
    priority: string;
    services: Array<{
      id: number;
      quantity: number;
      discount: number;
      id_detail?: number;
    }>;
    packages: Array<{
      id: number;
      quantity: number;
      discount: number;
      id_detail?: string;
    }>;
  }>;
}

export interface QuotationDuplicateResponse {
  success: boolean;
  data: QuotationDuplicateData;
}

export interface QuotationLinkedOrderResponse {
  success: boolean;
  data: {
    hasOrder: boolean;
    orderId?: number;
    orderCode?: string;
  };
}

export interface QuotationDetailsResponse {
  success: boolean;
  data: QuotationDetail[];
}

// ===== Quotation Service =====

export const quotationService = {
  // Get all quotations with pagination and filters
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    q_code?: string;
    customer_id?: number;
    status?: string;
    search_sales?: number;
    date_start?: string;
    date_end?: string;
    lab?: string;
    sort_subtotal?: 'ASC' | 'DESC';
  }): Promise<QuotationsResponse> => {
    const response = await api.get<QuotationsResponse>('/quotations', { params });
    return response.data;
  },

  // Get quotation by ID with full details
  getById: async (id: number | string): Promise<QuotationResponse> => {
    const response = await api.get<QuotationResponse>(`/quotations/${id}`);
    return response.data;
  },

  // Create new quotation
  create: async (data: QuotationFormData): Promise<QuotationResponse> => {
    const response = await api.post<QuotationResponse>('/quotations', data);
    return response.data;
  },

  // Update quotation
  update: async (id: number | string, data: Partial<QuotationFormData>): Promise<QuotationResponse> => {
    const response = await api.put<QuotationResponse>(`/quotations/${id}`, data);
    return response.data;
  },

  // Delete quotation (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/quotations/${id}`);
    return response.data;
  },

  // Get quotations JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    customer_id?: number;
    dataTable?: boolean;
  }): Promise<QuotationsJsonResponse> => {
    const response = await api.get<QuotationsJsonResponse>('/quotations/json', { params });
    return response.data;
  },

  // Generate next quotation code
  generateCode: async (lab?: string): Promise<{ success: boolean; data: { code: string } }> => {
    const response = await api.get<{ success: boolean; data: { code: string } }>('/quotations/generate-code', {
      params: lab ? { lab } : undefined,
    });
    return response.data;
  },

  // Get quotation data for duplication
  getDuplicate: async (id: number | string): Promise<QuotationDuplicateResponse> => {
    const response = await api.get<QuotationDuplicateResponse>(`/quotations/duplicate/${id}`);
    return response.data;
  },

  // Get quotation details (items)
  getDetails: async (id: number | string): Promise<QuotationDetailsResponse> => {
    const response = await api.get<QuotationDetailsResponse>(`/quotations/${id}/details`);
    return response.data;
  },

  // Check if quotation has linked order
  checkLinkedOrder: async (id: number | string): Promise<QuotationLinkedOrderResponse> => {
    const response = await api.get<QuotationLinkedOrderResponse>(`/quotations/${id}/linked-order`);
    return response.data;
  },

  // Check if quotation has linked pre-order
  checkLinkedPreOrder: async (id: number | string): Promise<QuotationLinkedOrderResponse> => {
    const response = await api.get<QuotationLinkedOrderResponse>(`/quotations/${id}/linked-preorder`);
    return response.data;
  },

  // Get quotations for standard lab (fetch-json)
  getFetchJson: async (params?: {
    q_code?: string;
    customer_id?: number;
    search_status?: string;
    search_sales?: number;
    date_start?: string;
    date_end?: string;
    page?: number;
    per_page?: number;
    sort_subtotal?: 'ASC' | 'DESC';
  }): Promise<{
    total_count: number;
    stats?: Record<string, number>;
    items: QuotationListItem[];
  }> => {
    const response = await api.get('/quotations/fetch-json', { params });
    return response.data;
  },

  // Get quotations for environmental lab (fetch-json-env)
  getFetchJsonEnv: async (params?: {
    q_code?: string;
    customer_id?: number;
    search_status?: string;
    date_start?: string;
    date_end?: string;
    page?: number;
    per_page?: number;
    order_by?: string;
  }): Promise<{
    total_count: number;
    items: QuotationListItem[];
  }> => {
    const response = await api.get('/quotations/fetch-json-env', { params });
    return response.data;
  },

  // Export report as CSV
  getReport: async (params?: {
    start?: string;
    end?: string;
    trash?: boolean;
  }): Promise<Blob> => {
    const response = await api.get('/quotations/report', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Preview quotation as PDF
  previewPdf: async (id: number | string): Promise<Blob> => {
    const response = await api.get(`/quotations/${id}/preview-pdf`, {
      responseType: 'blob',
      timeout: 120000, // 2 minutes timeout for PDF generation
    });
    return response.data;
  },

  // Get PDF preview URL (opens in new tab with auth)
  openPdfPreview: async (id: number | string): Promise<void> => {
    try {
      const blob = await quotationService.previewPdf(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up URL after a delay to allow the new tab to load
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      throw error;
    }
  },
};
