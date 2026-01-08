import api from './api';

export interface Method {
  id: number;
  code: string;
  name: string;
  category_name: string | null;
  status: string;
  description: string | null;
  instruction: string | null;
  matrix_id: number;
  matrix?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface MethodFormData {
  name: string;
  matrix_id: number;
  category_name?: string;
  status: string;
  description?: string;
  instruction?: string;
}

export interface MethodsResponse {
  success: boolean;
  data: Method[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MethodResponse {
  success: boolean;
  data: Method;
  message?: string;
}

export interface MethodsJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    name: string;
    code: string;
    category_name: string | null;
    description: string | null;
    matrix: {
      id: number;
      name: string;
    };
  }>;
  data?: Array<{
    id: number;
    name: string;
    code: string;
    category_name: string | null;
    description: string | null;
    matrix: {
      id: number;
      name: string;
    };
  }>;
}

export const methodService = {
  // Get all methods with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<MethodsResponse> => {
    const response = await api.get<MethodsResponse>('/methods', { params });
    return response.data;
  },

  // Get method by ID
  getById: async (id: number | string): Promise<MethodResponse> => {
    const response = await api.get<MethodResponse>(`/methods/${id}`);
    return response.data;
  },

  // Create new method
  create: async (data: MethodFormData): Promise<MethodResponse> => {
    const response = await api.post<MethodResponse>('/methods', data);
    return response.data;
  },

  // Update method
  update: async (id: number | string, data: Partial<MethodFormData>): Promise<MethodResponse> => {
    const response = await api.put<MethodResponse>(`/methods/${id}`, data);
    return response.data;
  },

  // Delete method (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/methods/${id}`);
    return response.data;
  },

  // Get methods JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<MethodsJsonResponse> => {
    const response = await api.get<MethodsJsonResponse>('/methods/json', { params });
    return response.data;
  },

  // Export methods report as CSV
  getReport: async (params?: {
    start?: string;
    end?: string;
  }): Promise<Blob> => {
    const response = await api.get('/methods/report', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

