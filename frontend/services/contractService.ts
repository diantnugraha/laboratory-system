import api from './api';

// ===== Interfaces =====

export interface ContractDetail {
  id: number;
  contractId: number;
  serviceId: number | null;
  packageId: number | null;
  discountNormal: number;
  discountUrgent: number;
  discountVeryUrgent: number;
  service?: {
    id: number;
    code: string;
    name: string;
    price: number;
  };
  package?: {
    id: number;
    name: string;
    totalPrice?: number;
  };
}

export interface Contract {
  id: number;
  code: string;
  customerId: number;
  period: string;
  periodFrom: string;
  periodTo: string;
  periodAlias: string | null;
  documents: any | null;
  normalDay: number;
  urgentDay: number;
  veryUrgentDay: number;
  statusService: 'ALL' | 'SELECTED';
  discount: number | null;
  discountUrgent: number | null;
  discountVeryUrgent: number | null;
  promotionId: number | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedAt: string | null;
  customer: {
    id: number;
    code: string;
    customer_name: string;
    special_customer: number;
    top: number;
  };
  details: ContractDetail[];
}

export interface ContractListItem {
  id: number;
  code: string;
  customerId: number;
  period: string;
  periodFrom: string;
  periodTo: string;
  periodAlias: string | null;
  normalDay: number;
  urgentDay: number;
  veryUrgentDay: number;
  statusService: 'ALL' | 'SELECTED';
  discount: number | null;
  discountUrgent: number | null;
  discountVeryUrgent: number | null;
  remarks: string | null;
  createdAt: string;
  customer: {
    id: number;
    code: string;
    customer_name: string;
    special_customer: number;
    top: number;
  };
  details: ContractDetail[];
}

export interface ContractServiceItem {
  service_id: number;
  discount: number;
  'pc-urgent': number;
  'pc-very-urgent': number;
}

export interface ContractPackageItem {
  package_id: number;
  discount: number;
  'pc-urgent': number;
  'pc-very-urgent': number;
}

export interface ContractFormData {
  code: string;
  customer_id: number;
  period: string;
  periode_from: string;
  periode_to: string;
  period_alias?: string;
  normal_day: number;
  urgent_day: number;
  very_urgent_day: number;
  status_service?: 'all' | 'selected';
  discount?: number;
  dsc_urgent?: number;
  dsc_very_urgent?: number;
  promotion_id?: number;
  remarks?: string;
  contract_document?: any;
  services?: ContractServiceItem[];
  packages?: ContractPackageItem[];
}

// ===== Response Interfaces =====

export interface ContractsResponse {
  success: boolean;
  data: ContractListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContractResponse {
  success: boolean;
  data: Contract;
  message?: string;
}

export interface ContractsJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    id: number;
    name: string;
    customer: {
      id: number;
      name: string;
    };
    periode_from: string;
    periode_to: string;
  }>;
}

// ===== Contract Service =====

export const contractService = {
  // Get all contracts with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customer_id?: number;
    period_to_start?: string;
    period_to_end?: string;
    priority?: number;
  }): Promise<ContractsResponse> => {
    // Convert page to offset for backend
    const { page = 1, limit = 30, ...otherParams } = params || {};
    const offset = (page - 1) * limit;

    const response = await api.get<ContractsResponse>('/contracts', {
      params: {
        offset,
        limit,
        ...otherParams
      }
    });
    return response.data;
  },

  // Get contract by ID with full details
  getById: async (id: number | string): Promise<ContractResponse> => {
    const response = await api.get<ContractResponse>(`/contracts/${id}`);
    return response.data;
  },

  // Create new contract
  create: async (data: ContractFormData): Promise<ContractResponse> => {
    const response = await api.post<ContractResponse>('/contracts', data);
    return response.data;
  },

  // Update contract
  update: async (id: number | string, data: Partial<ContractFormData>): Promise<ContractResponse> => {
    const response = await api.put<ContractResponse>(`/contracts/${id}`, data);
    return response.data;
  },

  // Delete contract (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/contracts/${id}`);
    return response.data;
  },

  // Get contracts JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<ContractsJsonResponse> => {
    const response = await api.get<ContractsJsonResponse>('/contracts/json', { params });
    return response.data;
  },

  // Get active contracts with filters
  getFetchJson: async (params?: {
    page?: number;
    per_page?: number;
    customer_id?: number;
    priority?: number;
    periode_to_start?: string;
    periode_to_end?: string;
  }): Promise<ContractsResponse> => {
    const response = await api.get<ContractsResponse>('/contracts/fetch-json', { params });
    return response.data;
  },
};
