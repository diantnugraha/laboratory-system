import api from './api';

export interface Matrix {
  id: number;
  name: string;
}

export interface MatrixFormData {
  name: string;
}

export interface MatricesResponse {
  success: boolean;
  data: Matrix[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MatrixResponse {
  success: boolean;
  data: Matrix;
  message?: string;
}

export interface MatricesJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    name: string;
  }>;
  data?: Array<{
    id: number;
    name: string;
  }>;
}

export const matrixService = {
  // Get all matrices with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<MatricesResponse> => {
    const response = await api.get<MatricesResponse>('/matrices', { params });
    return response.data;
  },

  // Get matrix by ID
  getById: async (id: number | string): Promise<MatrixResponse> => {
    const response = await api.get<MatrixResponse>(`/matrices/${id}`);
    return response.data;
  },

  // Create new matrix
  create: async (data: MatrixFormData): Promise<MatrixResponse> => {
    const response = await api.post<MatrixResponse>('/matrices', data);
    return response.data;
  },

  // Update matrix
  update: async (id: number | string, data: Partial<MatrixFormData>): Promise<MatrixResponse> => {
    const response = await api.put<MatrixResponse>(`/matrices/${id}`, data);
    return response.data;
  },

  // Delete matrix (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/matrices/${id}`);
    return response.data;
  },

  // Get matrices JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<MatricesJsonResponse> => {
    const response = await api.get<MatricesJsonResponse>('/matrices/json', { params });
    return response.data;
  },
};

