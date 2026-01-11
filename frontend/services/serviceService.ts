import api from './api';

export interface Service {
  id: number;
  code: string;
  name: string;
  category_id: number;
  parameter_id: number;
  method_id: number;
  subcontractor_id?: number | null;
  analyst_type_id?: number | null;
  accreditation?: string | null;
  accreditation_valid_date?: string | null;
  unit?: string | null;
  published_date?: string | null;
  lod?: string | null;
  loq?: string | null;
  proficiency_test?: string | null;
  description?: string | null;
  price: number;
  user?: number;
  use_pc?: number;
  status?: string | null;
  category?: {
    id: number;
    name: string;
  };
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
  subcontractor?: {
    id: number;
    lab_name: string;
  };
  analystType?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ServiceFormData {
  code: string;
  name: string;
  categoryId: number;
  parameterId: number;
  methodId: number;
  subcontractorId?: number | null;
  analystTypeId?: number | null;
  accreditation?: string;
  accreditationValidDate?: string;
  unit?: string;
  publishedDate?: string;
  lod?: string;
  loq?: string;
  proficiencyTest?: string;
  description?: string;
  price: number;
  user?: number;
  usePc?: number;
  status?: string;
}

export interface ServicesResponse {
  success: boolean;
  data: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceResponse {
  success: boolean;
  data: Service;
  message?: string;
}

export interface ServicesJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    code: string;
    name: string;
    category?: {
      id: number;
      name: string;
    };
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
    price: number;
    status?: string;
  }>;
  data?: Array<{
    id: number;
    code: string;
    name: string;
    category?: {
      id: number;
      name: string;
    };
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
    price: number;
    status?: string;
  }>;
}

export const serviceService = {
  // Get all services with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ServicesResponse> => {
    const response = await api.get<ServicesResponse>('/services', { params });
    return response.data;
  },

  // Get service by ID
  getById: async (id: number | string): Promise<ServiceResponse> => {
    const response = await api.get<ServiceResponse>(`/services/${id}`);
    return response.data;
  },

  // Create new service
  create: async (data: ServiceFormData): Promise<ServiceResponse> => {
    // Map frontend field names to backend field names
    const payload = {
      code: data.code,
      name: data.name,
      category_id: data.categoryId,
      parameter_id: data.parameterId,
      method_id: data.methodId,
      subcontractor_id: data.subcontractorId || null,
      analyst_type_id: data.analystTypeId || null,
      accreditation: data.accreditation || null,
      accreditation_valid_date: data.accreditationValidDate || null,
      unit: data.unit || null,
      published_date: data.publishedDate || null,
      lod: data.lod || null,
      loq: data.loq || null,
      proficiency_test: data.proficiencyTest || null,
      description: data.description || null,
      price: data.price,
      user: data.user || 1,
      use_pc: data.usePc || 0,
      status: data.status || null,
    };
    const response = await api.post<ServiceResponse>('/services', payload);
    return response.data;
  },

  // Update service
  update: async (id: number | string, data: Partial<ServiceFormData>): Promise<ServiceResponse> => {
    // Map frontend field names to backend field names
    const payload: any = {};
    if (data.code !== undefined) payload.code = data.code;
    if (data.name !== undefined) payload.name = data.name;
    if (data.categoryId !== undefined) payload.category_id = data.categoryId;
    if (data.parameterId !== undefined) payload.parameter_id = data.parameterId;
    if (data.methodId !== undefined) payload.method_id = data.methodId;
    if (data.subcontractorId !== undefined) payload.subcontractor_id = data.subcontractorId || null;
    if (data.analystTypeId !== undefined) payload.analyst_type_id = data.analystTypeId || null;
    if (data.accreditation !== undefined) payload.accreditation = data.accreditation || null;
    if (data.accreditationValidDate !== undefined) payload.accreditation_valid_date = data.accreditationValidDate || null;
    if (data.unit !== undefined) payload.unit = data.unit || null;
    if (data.publishedDate !== undefined) payload.published_date = data.publishedDate || null;
    if (data.lod !== undefined) payload.lod = data.lod || null;
    if (data.loq !== undefined) payload.loq = data.loq || null;
    if (data.proficiencyTest !== undefined) payload.proficiency_test = data.proficiencyTest || null;
    if (data.description !== undefined) payload.description = data.description || null;
    if (data.price !== undefined) payload.price = data.price;
    if (data.user !== undefined) payload.user = data.user;
    if (data.usePc !== undefined) payload.use_pc = data.usePc;
    if (data.status !== undefined) payload.status = data.status || null;

    const response = await api.put<ServiceResponse>(`/services/${id}`, payload);
    return response.data;
  },

  // Delete service (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/services/${id}`);
    return response.data;
  },

  // Get services JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<ServicesJsonResponse> => {
    const response = await api.get<ServicesJsonResponse>('/services/json', { params });
    return response.data;
  },

  // Get auto-generated code for new service
  getGeneratedCode: async (): Promise<{ success: boolean; data: { code: string } }> => {
    const response = await api.get<{ success: boolean; data: { code: string } }>('/services/generate-code');
    return response.data;
  },
};

