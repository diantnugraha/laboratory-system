import api from './api';

// ===== Interfaces =====

export interface Subcontractor {
  id: number;
  lab_name: string;
  address_name: string;
  phone: string;
  fax: string;
  contact: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubcontractorFormData {
  lab_name: string;
  address_name: string;
  phone: string;
  fax: string;
  contact: string;
  email: string;
}

// ===== Response Interfaces =====

export interface SubcontractorsResponse {
  success: boolean;
  data: Subcontractor[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubcontractorResponse {
  success: boolean;
  data: Subcontractor;
  message?: string;
}

export interface SubcontractorsJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    lab_name: string;
  }>;
  data?: Array<{
    id: number;
    lab_name: string;
  }>;
}

// ===== Subcontractor Service =====

export const subcontractorService = {
  // Get all subcontractors with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<SubcontractorsResponse> => {
    const response = await api.get<SubcontractorsResponse>('/subcontractors', { params });
    return response.data;
  },

  // Get subcontractor by ID
  getById: async (id: number | string): Promise<SubcontractorResponse> => {
    const response = await api.get<SubcontractorResponse>(`/subcontractors/${id}`);
    return response.data;
  },

  // Create new subcontractor
  create: async (data: SubcontractorFormData): Promise<SubcontractorResponse> => {
    const response = await api.post<SubcontractorResponse>('/subcontractors', data);
    return response.data;
  },

  // Update subcontractor
  update: async (id: number | string, data: Partial<SubcontractorFormData>): Promise<SubcontractorResponse> => {
    const response = await api.put<SubcontractorResponse>(`/subcontractors/${id}`, data);
    return response.data;
  },

  // Delete subcontractor
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/subcontractors/${id}`);
    return response.data;
  },

  // Get subcontractors JSON for autocomplete
  getJson: async (params?: {
    q?: string;
  }): Promise<SubcontractorsJsonResponse> => {
    const response = await api.get<SubcontractorsJsonResponse>('/subcontractors/json', { params });
    return response.data;
  },
};
