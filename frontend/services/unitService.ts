import api from './api';

export interface Unit {
  id: number;
  name: string;
  description: string;
  lab_id: number | null;
  lab?: {
    id: number;
    name: string;
  };
}

export interface UnitFormData {
  name: string;
  description: string;
  lab_id?: number | null;
}

export interface UnitsResponse {
  success: boolean;
  data: Unit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnitResponse {
  success: boolean;
  data: Unit;
  message?: string;
}

export interface UnitsJsonResponse {
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

export const unitService = {
  // Get all units with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UnitsResponse> => {
    const response = await api.get<UnitsResponse>('/units', { params });
    return response.data;
  },

  // Get unit by ID
  getById: async (id: number | string): Promise<UnitResponse> => {
    const response = await api.get<UnitResponse>(`/units/${id}`);
    return response.data;
  },

  // Create new unit
  create: async (data: UnitFormData): Promise<UnitResponse> => {
    const response = await api.post<UnitResponse>('/units', {
      name: data.name,
      description: data.description,
      lab_id: data.lab_id || null,
    });
    return response.data;
  },

  // Update unit
  update: async (id: number | string, data: Partial<UnitFormData>): Promise<UnitResponse> => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.lab_id !== undefined) updateData.lab_id = data.lab_id || null;
    
    const response = await api.put<UnitResponse>(`/units/${id}`, updateData);
    return response.data;
  },

  // Delete unit (hard delete - no trash field)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/units/${id}`);
    return response.data;
  },

  // Get units JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    lab_id?: number | string;
    dataTable?: boolean;
  }): Promise<UnitsJsonResponse> => {
    const response = await api.get<UnitsJsonResponse>('/units/json', { params });
    return response.data;
  },

  // Export units report as CSV
  getReport: async (params?: {
    start?: string;
    end?: string;
  }): Promise<Blob> => {
    const response = await api.get('/units/report', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

