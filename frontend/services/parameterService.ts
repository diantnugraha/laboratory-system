import api from './api';

export interface Parameter {
  id: number;
  name: string;
  lab_id: number;
  lab?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ParameterFormData {
  name: string;
  lab_id: number;
}

export interface ParametersResponse {
  success: boolean;
  data: Parameter[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ParameterResponse {
  success: boolean;
  data: Parameter;
  message?: string;
}

export interface ParametersJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    name: string;
    lab: {
      id: number;
      name: string;
    };
  }>;
  data?: Array<{
    id: number;
    name: string;
    lab: {
      id: number;
      name: string;
    };
  }>;
}

export const parameterService = {
  // Get all parameters with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ParametersResponse> => {
    const response = await api.get<ParametersResponse>('/parameters', { params });
    return response.data;
  },

  // Get parameter by ID
  getById: async (id: number | string): Promise<ParameterResponse> => {
    const response = await api.get<ParameterResponse>(`/parameters/${id}`);
    return response.data;
  },

  // Create new parameter
  create: async (data: ParameterFormData): Promise<ParameterResponse> => {
    const response = await api.post<ParameterResponse>('/parameters', data);
    return response.data;
  },

  // Update parameter
  update: async (id: number | string, data: Partial<ParameterFormData>): Promise<ParameterResponse> => {
    const response = await api.put<ParameterResponse>(`/parameters/${id}`, data);
    return response.data;
  },

  // Delete parameter (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/parameters/${id}`);
    return response.data;
  },

  // Get parameters JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<ParametersJsonResponse> => {
    const response = await api.get<ParametersJsonResponse>('/parameters/json', { params });
    return response.data;
  },

  // Export parameters report as CSV
  getReport: async (params?: {
    start?: string;
    end?: string;
  }): Promise<Blob> => {
    const response = await api.get('/parameters/report', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

