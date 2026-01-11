import api from './api';

// ===== Interfaces =====

export interface StandardDetail {
  id?: number;
  service_id: number;
  min: string;
  max: string;
  unit: string;
  service?: {
    id: number;
    code: string;
    name: string;
    parameter?: {
      id: number;
      name: string;
    };
    method?: {
      id: number;
      name: string;
      matrix?: {
        id: number;
        name: string;
      };
    };
  };
}

export interface Standard {
  id: number;
  code: string;
  name: string;
  category_id: number | null;
  customer_id: number | null;
  category?: {
    id: number;
    name: string;
  };
  customer?: {
    id: number;
    customer_name: string;
    code: string;
  };
  standartDetails: StandardDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface StandardListItem {
  id: number;
  code: string;
  name: string;
  category?: { id: number; name: string };
  customer?: { id: number; customer_name: string; code: string };
  standartDetails?: StandardDetail[];
}

export interface StandardFormData {
  code: string;
  name: string;
  categoryId?: number | null;
  customerId?: number | null;
  standartDetails: Array<{
    serviceId: number;
    min: string;
    max: string;
    unit: string;
  }>;
}

// ===== Response Interfaces =====

export interface StandardsResponse {
  success: boolean;
  data: StandardListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StandardResponse {
  success: boolean;
  data: Standard;
  message?: string;
}

export interface StandardSelectItem {
  id: number;
  code: string;
  name: string;
}

export interface StandardSelectResponse {
  success: boolean;
  data: StandardSelectItem[];
}

export interface StandardsJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: StandardSelectItem[];
  data?: StandardSelectItem[];
}

// ===== Service =====

export const standardService = {
  // Get all standards with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    select?: boolean;
  }): Promise<StandardsResponse | StandardSelectResponse> => {
    const response = await api.get<StandardsResponse | StandardSelectResponse>('/standards', { params });
    return response.data;
  },

  // Get standard by ID with full details
  getById: async (id: number | string): Promise<StandardResponse> => {
    const response = await api.get<StandardResponse>(`/standards/${id}`);
    return response.data;
  },

  // Create new standard
  create: async (data: StandardFormData): Promise<StandardResponse> => {
    // Map frontend camelCase to backend snake_case
    const payload = {
      code: data.code,
      name: data.name,
      category_id: data.categoryId || null,
      customer_id: data.customerId || null,
      standartDetails: data.standartDetails.map(detail => ({
        service_id: detail.serviceId,
        min: detail.min,
        max: detail.max,
        unit: detail.unit,
      })),
    };
    const response = await api.post<StandardResponse>('/standards', payload);
    return response.data;
  },

  // Update standard
  update: async (id: number | string, data: Partial<StandardFormData>): Promise<StandardResponse> => {
    const payload: any = {};
    if (data.code !== undefined) payload.code = data.code;
    if (data.name !== undefined) payload.name = data.name;
    if (data.categoryId !== undefined) payload.category_id = data.categoryId || null;
    if (data.customerId !== undefined) payload.customer_id = data.customerId || null;
    if (data.standartDetails !== undefined) {
      payload.standartDetails = data.standartDetails.map(detail => ({
        service_id: detail.serviceId,
        min: detail.min,
        max: detail.max,
        unit: detail.unit,
      }));
    }
    const response = await api.put<StandardResponse>(`/standards/${id}`, payload);
    return response.data;
  },

  // Delete standard (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/standards/${id}`);
    return response.data;
  },

  // Get standards JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<StandardsJsonResponse> => {
    const response = await api.get<StandardsJsonResponse>('/standards/json', { params });
    return response.data;
  },

  // Get standards for select dropdown
  getSelect: async (): Promise<StandardSelectResponse> => {
    const response = await api.get<StandardSelectResponse>('/standards', { params: { select: true } });
    return response.data;
  },
};
