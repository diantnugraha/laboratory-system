import api from './api';

export interface Lab {
  id: number;
  name: string;
  trash?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LabFormData {
  name: string;
}

export interface LabsResponse {
  success: boolean;
  data: Lab[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LabResponse {
  success: boolean;
  data: Lab;
  message?: string;
}

export interface LabsJsonResponse {
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

export const labService = {
  // Get all labs with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<LabsResponse> => {
    const response = await api.get<LabsResponse>('/labs', { params });
    return response.data;
  },

  // Get lab by ID
  getById: async (id: number | string): Promise<LabResponse> => {
    const response = await api.get<LabResponse>(`/labs/${id}`);
    return response.data;
  },

  // Create new lab
  create: async (data: LabFormData): Promise<LabResponse> => {
    const response = await api.post<LabResponse>('/labs', data);
    return response.data;
  },

  // Update lab
  update: async (id: number | string, data: Partial<LabFormData>): Promise<LabResponse> => {
    const response = await api.put<LabResponse>(`/labs/${id}`, data);
    return response.data;
  },

  // Delete lab (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/labs/${id}`);
    return response.data;
  },

  // Get labs JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<LabsJsonResponse> => {
    const response = await api.get<LabsJsonResponse>('/labs/json', { params });
    return response.data;
  },
};

