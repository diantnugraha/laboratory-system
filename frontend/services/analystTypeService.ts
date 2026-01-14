import api from './api';

// Interfaces
export interface AnalystType {
  id: number;
  name: string;
  list_service: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: number;
  updated_by: number | null;
  trash: number | null;
  analystCount?: number;
  serviceCount?: number;
}

export interface AnalystTypesResponse {
  success: boolean;
  data: AnalystType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AnalystTypeResponse {
  success: boolean;
  data: AnalystType;
  message?: string;
}

export interface AnalystTypesJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{ id: number; name: string }>;
  data?: Array<{ id: number; name: string }>;
}

// Helper functions for list_service conversion
export const parseListService = (listService: string | null): string[] => {
  if (!listService) return [];
  return listService.split(',').filter(id => id.trim() !== '');
};

export const toListService = (serviceIds: string[]): string | null => {
  if (serviceIds.length === 0) return null;
  return `,${serviceIds.join(',')},`;
};

// Service
export const analystTypeService = {
  // Get all analyst types with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AnalystTypesResponse> => {
    const response = await api.get<AnalystTypesResponse>('/analyst-types', { params });
    return response.data;
  },

  // Get analyst type by ID
  getById: async (id: number | string): Promise<AnalystTypeResponse> => {
    const response = await api.get<AnalystTypeResponse>(`/analyst-types/${id}`);
    return response.data;
  },

  // Create new analyst type
  create: async (data: {
    name: string;
    list_service?: string | null;
  }): Promise<AnalystTypeResponse> => {
    const response = await api.post<AnalystTypeResponse>('/analyst-types', data);
    return response.data;
  },

  // Update analyst type
  update: async (
    id: number | string,
    data: { name?: string; list_service?: string | null }
  ): Promise<AnalystTypeResponse> => {
    const response = await api.put<AnalystTypeResponse>(`/analyst-types/${id}`, data);
    return response.data;
  },

  // Delete analyst type (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/analyst-types/${id}`);
    return response.data;
  },

  // Get analyst types JSON for autocomplete/dropdown
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<AnalystTypesJsonResponse> => {
    const response = await api.get<AnalystTypesJsonResponse>('/analyst-types/json', { params });
    return response.data;
  },
};
