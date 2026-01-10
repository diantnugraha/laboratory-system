import api from './api';

// ===== Interfaces =====

export interface Role {
  id: number;
  name: string;
}

export interface Customer {
  id: number;
  customer_name: string;
}

export interface Contact {
  id: number;
  first_name: string;
  surname: string;
  email: string;
  customer_id?: number;
  customer?: Customer;
}

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role_id: number;
  customer_id: number | null;
  contact_id: number | null;
  list_customer?: string | null;
  list_contact?: string | null;
  profile_picture: string | null;
  department: string | null;
  created_at?: string;
  updated_at?: string;
  role: Role;
  customer?: Customer | null;
  contact?: Contact | null;
  // For Agency role (28) - parsed from list_customer/list_contact
  customer_ids?: number[];
  contact_ids?: number[];
  customers?: Customer[];
  contacts?: Contact[];
}

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role_id: number;
  customer_id: number | null;
  contact_id: number | null;
  department: string | null;
  created_at?: string;
  updated_at?: string;
  role: Role;
  customer?: Customer | null;
}

export interface UserFormData {
  username: string;
  email: string;
  display_name: string;
  role_id: number;
  customer_id?: number | null;
  contact_id?: number | null;
  department?: string | null;
  analyst_type_id?: number | null;
  // For Agency role (28)
  customer_ids?: number[];
  contact_ids?: number[];
}

export interface UserUpdateData extends Partial<UserFormData> {
  password?: string;
}

// Agency role ID constant
export const AGENCY_ROLE_ID = 28;
export const CUSTOMER_ROLE_ID = 16;

// ===== Response Interfaces =====

export interface UsersResponse {
  success: boolean;
  data: UserListItem[];
  message?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface CreateUserResponse {
  success: boolean;
  data: User & { password: string };
  message?: string;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsersJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Array<{
    id: number;
    name: string;
    login: string | null;
    role: Role;
    company: string;
  }>;
  data?: Array<{
    id: number;
    username: string;
    email: string;
    display_name: string;
    role_id: number;
    customer_id: number | null;
    role: Role;
    customer?: Customer | null;
  }>;
}

// External user roles (Customer = 16, Agency = 28)
const EXTERNAL_ROLE_IDS = [16, 28];

// ===== User Service =====

export const userService = {
  // Get all users with pagination, search, and role filtering
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    exclude_roles?: string;
    include_roles?: string;
  }): Promise<UsersResponse> => {
    const { page = 1, limit = 30, ...otherParams } = params || {};
    const offset = (page - 1) * limit;

    const response = await api.get<UsersResponse>('/users', {
      params: {
        offset,
        limit,
        ...otherParams
      }
    });
    return response.data;
  },

  // Get internal users (exclude external roles)
  getInternalUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UsersResponse> => {
    const { page = 1, limit = 30, search } = params || {};
    const offset = (page - 1) * limit;

    const response = await api.get<UsersResponse>('/users', {
      params: {
        offset,
        limit,
        search: search && search.length >= 2 ? search : undefined,
        exclude_roles: EXTERNAL_ROLE_IDS.join(','),
      }
    });
    return response.data;
  },

  // Get external users (only external roles)
  getExternalUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UsersResponse> => {
    const { page = 1, limit = 30, search } = params || {};
    const offset = (page - 1) * limit;

    const response = await api.get<UsersResponse>('/users', {
      params: {
        offset,
        limit,
        search: search && search.length >= 2 ? search : undefined,
        include_roles: EXTERNAL_ROLE_IDS.join(','),
      }
    });
    return response.data;
  },

  // Get user by ID
  getById: async (id: number | string): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  // Create new user
  create: async (data: UserFormData): Promise<CreateUserResponse> => {
    const response = await api.post<CreateUserResponse>('/users', data);
    return response.data;
  },

  // Update user
  update: async (id: number | string, data: UserUpdateData): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  // Delete user (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/users/${id}`);
    return response.data;
  },

  // Get users JSON for autocomplete
  getJson: async (params?: {
    q?: string;
    dataTable?: boolean;
    exclude_roles?: string;
    include_roles?: string;
  }): Promise<UsersJsonResponse> => {
    const response = await api.get<UsersJsonResponse>('/users/json', { params });
    return response.data;
  },

  // Resend welcome email
  resendWelcome: async (id: number | string): Promise<{ success: boolean; message: string; data?: { password: string } }> => {
    const response = await api.post<{ success: boolean; message: string; data?: { password: string } }>(`/users/resendWelcome/${id}`);
    return response.data;
  },

  // Get all roles
  getRoles: async (params?: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<RolesResponse> => {
    const response = await api.get<RolesResponse>('/roles', { params });
    return response.data;
  },
};
