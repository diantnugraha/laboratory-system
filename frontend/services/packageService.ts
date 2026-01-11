import api from './api';

// ===== Interfaces =====

export interface PackageCustomer {
  id: number;
  code: string;
  customer_name: string;
}

export interface Package {
  id: number;
  code: string;
  name: string;
  description: string | null;
  totalPrice: number;
  promotionFrom: string | null;
  promotionTo: string | null;
  percentDiscount: number;
  listService: string;
  customerId: number | null;
  group: number;
  serviceIds: number[];
  customer?: PackageCustomer;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageListItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  totalPrice: number;
  listService: string;
  customerId: number | null;
  group: number;
  customer?: PackageCustomer;
}

export interface PackageFormData {
  code?: string;
  name: string;
  description?: string;
  total_price?: number;
  promotion_from?: string;
  promotion_to?: string;
  percent_discount?: number;
  serviceIds: number[];
  customer_id?: number | null;
  group?: number;
}

// ===== Response Interfaces =====

export interface PackagesResponse {
  success: boolean;
  data: PackageListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PackageResponse {
  success: boolean;
  data: Package;
  message?: string;
}

export interface PackageSelectItem {
  id: number;
  code: string;
  name: string;
}

export interface PackageSelectResponse {
  success: boolean;
  data: PackageSelectItem[];
}

export interface PackagesJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    code: string;
    name: string;
    description: string | null;
    price: {
      value: number;
      currency: string;
      discount: number;
    };
    group: number;
    services: Array<{
      id: number;
      code: string;
      name: string;
      price: {
        value: number;
        currency: string;
        discount: number;
      };
    }>;
  }>;
  data?: Array<{
    id: number;
    code: string;
    name: string;
    description: string | null;
    price: {
      value: number;
      currency: string;
      discount: number;
    };
    group: number;
    services: Array<{
      id: number;
      code: string;
      name: string;
      price: {
        value: number;
        currency: string;
        discount: number;
      };
    }>;
  }>;
}

// ===== Package Service =====

export const packageService = {
  // Get all packages with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    select?: boolean;
  }): Promise<PackagesResponse | PackageSelectResponse> => {
    const response = await api.get<PackagesResponse | PackageSelectResponse>('/packages', { params });
    return response.data;
  },

  // Get package by ID with full details
  getById: async (id: number | string): Promise<PackageResponse> => {
    const response = await api.get<PackageResponse>(`/packages/${id}`);
    return response.data;
  },

  // Create new package
  create: async (data: PackageFormData): Promise<PackageResponse> => {
    const response = await api.post<PackageResponse>('/packages', data);
    return response.data;
  },

  // Update package
  update: async (id: number | string, data: Partial<PackageFormData>): Promise<PackageResponse> => {
    const response = await api.put<PackageResponse>(`/packages/${id}`, data);
    return response.data;
  },

  // Delete package (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/packages/${id}`);
    return response.data;
  },

  // Get packages JSON for autocomplete (with contract pricing support)
  getJson: async (params?: {
    q?: string;
    group?: boolean;
    contract_id?: number;
    dataTable?: boolean;
  }): Promise<PackagesJsonResponse> => {
    const response = await api.get<PackagesJsonResponse>('/packages/json', { params });
    return response.data;
  },
};
