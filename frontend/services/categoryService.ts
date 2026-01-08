import api from './api';

export interface Category {
  id: number;
  name: string;
  trash?: number | null;
}

export interface CategoryFormData {
  name: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CategoryResponse {
  success: boolean;
  data: Category;
  message?: string;
}

export const categoryService = {
  // Get all categories with pagination and search
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<CategoriesResponse> => {
    const response = await api.get<CategoriesResponse>('/categories', { params });
    return response.data;
  },

  // Get category by ID
  getById: async (id: number | string): Promise<CategoryResponse> => {
    const response = await api.get<CategoryResponse>(`/categories/${id}`);
    return response.data;
  },

  // Create new category
  create: async (data: CategoryFormData): Promise<CategoryResponse> => {
    const response = await api.post<CategoryResponse>('/categories', data);
    return response.data;
  },

  // Update category
  update: async (id: number | string, data: Partial<CategoryFormData>): Promise<CategoryResponse> => {
    const response = await api.put<CategoryResponse>(`/categories/${id}`, data);
    return response.data;
  },

  // Delete category (soft delete)
  delete: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/categories/${id}`);
    return response.data;
  },
};

