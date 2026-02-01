import api from './api';

// ===== Interfaces =====

export interface Address {
  id: number;
  address_type: string;
  address: string;
  phone: string;
  fax: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: number | null;
  npwp: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: number;
  title: string;
  first_name: string;
  middle_name: string | null;
  surname: string;
  username: string;
  job_title: string | null;
  department: string | null;
  email: string;
  phone: string;
  fax: string | null;
  mobile_phone: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  address?: {
    id: number;
    address_type: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
}

export interface Customer {
  id: number;
  code: string;
  zahir_id: string | null;
  customer_name: string;
  business: string;
  npwp: string | null;
  legal_document: string | null;
  email: string | null;
  website: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_branch: string | null;
  bank_address: string | null;
  supplier_of: string | null;
  supplier_code: string | null;
  remarks: string | null;
  special_customer: number;
  top: number;
  payment_middle: number;
  sales_incharge: string | null;
  ecoa: number;
  feeder: string | null;
  feeder_fee: number;
  agency: number;
  sales_feeder: number;
  sales_id: string | null;
  central_cust_id: string | null;
  is_corporate: number;
  created_at?: string;
  updated_at?: string;
  addresses: Address[];
  contacts: Contact[];
}

export interface CustomerListItem {
  id: number;
  code: string;
  customer_name: string;
  business: string;
  email: string | null;
  special_customer: number;
  payment_middle: number;
  sales_incharge: string | null;
  created_at?: string;
  addresses: Array<{
    id: number;
    address_type: string;
    city: string;
    state: string;
    country: string;
  }>;
  contacts: Array<{
    id: number;
    first_name: string;
    middle_name: string | null;
    surname: string;
    email: string;
    phone: string;
  }>;
}

export interface CustomerFormData {
  code: string;
  customer_name: string;
  business: string;
  npwp?: string;
  legal_document?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_branch?: string;
  bank_address?: string;
  supplier_of?: string;
  supplier_code?: string;
  remarks?: string;
  special_customer?: boolean;
  top?: number;
  payment_middle?: boolean;
  sales_incharge?: string;
  ecoa?: number;
  feeder?: string;
  feeder_fee?: number;
  agency?: number;
  sales_feeder?: number;
  sales_id?: string;
  central_cust_id?: string;
  is_corporate?: number;
  address?: AddressFormData;
  contact?: ContactFormData;
}

export interface AddressFormData {
  address_type: string;
  address: string;
  phone: string;
  fax?: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  npwp?: string;
  status?: string;
}

export interface ContactFormData {
  title?: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  job_title?: string;
  department?: string;
  email: string;
  phone: string;
  fax?: string;
  mobile_phone?: string;
  status?: string;
}

// ===== Response Interfaces =====

export interface CustomersResponse {
  success: boolean;
  data: CustomerListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerResponse {
  success: boolean;
  data: Customer;
  message?: string;
}

export interface CustomersJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    customer_name: string;
    code: string;
    addresses: Address[];
    contacts: Contact[];
  }>;
  data?: Array<{
    id: number;
    customer_name: string;
    code: string;
    addresses: Address[];
    contacts: Contact[];
  }>;
}

export interface ManageResponse {
  success: boolean;
  message: string;
  data?: Address | Contact;
}

// ===== Customer Service =====

export const customerService = {
  // Get all customers with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    months?: number;
  }, signal?: AbortSignal): Promise<CustomersResponse> => {
    // Convert page to offset for backend
    const { page = 1, limit = 30, ...otherParams } = params || {};
    const offset = (page - 1) * limit;

    const response = await api.get<CustomersResponse>('/customers', {
      params: {
        offset,
        limit,
        ...otherParams
      },
      signal
    });
    return response.data;
  },

  // Get customer by ID with full details
  getById: async (id: number | string, signal?: AbortSignal): Promise<CustomerResponse> => {
    const response = await api.get<CustomerResponse>(`/customers/${id}`, { signal });
    return response.data;
  },

  // Create new customer
  create: async (data: CustomerFormData): Promise<CustomerResponse> => {
    const response = await api.post<CustomerResponse>('/customers', data);
    return response.data;
  },

  // Update customer
  update: async (id: number | string, data: Partial<CustomerFormData>): Promise<CustomerResponse> => {
    const response = await api.put<CustomerResponse>(`/customers/${id}`, data);
    return response.data;
  },

  // Delete customer (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/customers/${id}`);
    return response.data;
  },

  // Get customers JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
  }): Promise<CustomersJsonResponse> => {
    const response = await api.get<CustomersJsonResponse>('/customers/json', { params });
    return response.data;
  },

  // Manage address (create/update/delete)
  manageAddress: async (data: {
    action: 'create' | 'update' | 'delete';
    id?: number;
    customer_id?: number;
    address_type?: string;
    address?: string;
    phone?: string;
    fax?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    npwp?: string;
    status?: string;
  }): Promise<ManageResponse> => {
    const response = await api.post<ManageResponse>('/customers/addresses', data);
    return response.data;
  },

  // Manage contact (create/update/delete)
  manageContact: async (data: {
    action: 'create' | 'update' | 'delete';
    id?: number;
    customer_id?: number;
    address_id?: number;
    title?: string;
    first_name?: string;
    middle_name?: string;
    surname?: string;
    job_title?: string;
    department?: string;
    email?: string;
    phone?: string;
    fax?: string;
    mobile_phone?: string;
    status?: string;
  }): Promise<ManageResponse> => {
    const response = await api.post<ManageResponse>('/customers/contacts', data);
    return response.data;
  },

  // Get contacts for a customer
  getContacts: async (params: {
    customer_id: number | string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: Contact[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const response = await api.get('/customers/contacts', { params });
    return response.data;
  },

  // Get regions (cities, states, countries)
  getRegions: async (params?: {
    type?: 'city' | 'state' | 'country';
    search?: string;
  }): Promise<{ success: boolean; data: string[] }> => {
    const response = await api.get('/customers/regions', { params });
    return response.data;
  },
};
