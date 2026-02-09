import api from './api';

// ===== List Interfaces =====

export interface WorksheetListItem {
  id: number;
  code: string;
  status: string;
  result: string | null;
  nResult: string | null;
  unit: string | null;
  remarks: string | null;
  worksheetDate: string | null;
  finishDate: string | null;
  analystId: number | null;
  discount: number | null;
  sample: {
    id: number;
    code: string;
    name: string;
    status: string;
    dueDate: string | null;
    receivedDate: string | null;
    order: {
      id: number;
      code: string;
      status: string;
      priority: string;
      customer: {
        id: number;
        code: string;
        customer_name: string;
      };
    };
  };
  service: {
    id: number;
    code: string;
    name: string;
    unit: string | null;
    status: string | null;
    price: number;
    analystType: {
      id: number;
      name: string;
    } | null;
    subcontractor: {
      id: number;
      lab_name: string;
    } | null;
    parameter: {
      id: number;
      name: string;
    };
    method: {
      id: number;
      name: string;
    };
  };
  analyst?: {
    id: number;
    display_name: string;
  } | null;
}

export interface WorksheetListResponse {
  success: boolean;
  data: WorksheetListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WorksheetCursorResponse {
  success: boolean;
  data: WorksheetListItem[];
  cursor: number | null;
  hasMore: boolean;
}

export interface WorksheetListParams {
  page?: number;
  limit?: number;
  search?: string;
  sample_id?: number;
  order_id?: number;
  status?: string;
  is_subcontract?: boolean;
}

// ===== Detail Interfaces =====

export interface WorksheetSample {
  id: number;
  code: string;
  name: string;
  status: string;
  dueDate: string | null;
  receivedDate: string | null;
}

export interface WorksheetOrder {
  id: number;
  code: string;
  status: string;
  priority: string | null;
  customerName: string | null;
}

export interface WorksheetDetail {
  id: number;
  code: string;
  status: string;
  result: string | null;
  nResult: string | null;
  unit: string | null;
  percentPc: number | null;
  price: number | null;
  discount: number | null;
  remarks: string | null;
  document: string | null;
  worksheetDate: string | null;
  finishDate: string | null;
  verifyQcDate: string | null;
  // User assignments
  analystId: number | null;
  analystName: string | null;
  supervisorId: number | null;
  supervisorName: string | null;
  qcId: number | null;
  qcName: string | null;
  managerId: number | null;
  managerName: string | null;
  // Retest/Revision tracking
  totalRetest: number | null;
  totalRevision: number | null;
  totalCustomerRetest: number | null;
  retestReason: string | null;
  reviseReason: string | null;
  resultHistory: string | null;
  // Subcontract info
  airWayBill: string | null;
  subconSendDate: string | null;
  subconReceivedDate: string | null;
  subconEndDate: string | null;
  // Service info
  parameter: string | null;
  parameterId: number | null;
  method: string | null;
  methodId: number | null;
  packageId: number | null;
  packageName: string | null;
  standardId: number | null;
  standardName: string | null;
  serviceCode: string | null;
  serviceName: string | null;
  serviceUnit: string | null;
  servicePrice: number | null;
  isSubcontracted: boolean;
  subcontractorName: string | null;
  analystType: string | null;
  // Related entities
  sample: WorksheetSample;
  order: WorksheetOrder;
  createdAt: string;
  updatedAt: string | null;
}

// ===== Worksheet Service =====

export const worksheetService = {
  // ===== List Operations =====

  /**
   * Get all worksheets with pagination and filters
   */
  getAll: async (params?: WorksheetListParams, signal?: AbortSignal): Promise<WorksheetListResponse> => {
    const response = await api.get<WorksheetListResponse>('/worksheets', { params, signal });
    return response.data;
  },

  /**
   * Get all worksheets with cursor-based pagination (optimized for large datasets)
   */
  getAllCursor: async (params?: {
    cursor?: number;
    limit?: number;
    search?: string;
    status?: string;
    sample_id?: number;
    order_id?: number;
  }, signal?: AbortSignal): Promise<WorksheetCursorResponse> => {
    const response = await api.get<WorksheetCursorResponse>('/worksheets/cursor', { params, signal });
    return response.data;
  },

  /**
   * Get delayed worksheets (due_date < today)
   */
  getDelayed: async (params?: { page?: number; limit?: number }, signal?: AbortSignal): Promise<WorksheetListResponse> => {
    const response = await api.get<WorksheetListResponse>('/worksheets/delay', { params, signal });
    return response.data;
  },

  /**
   * Get today's worksheets (due_date = today)
   */
  getToday: async (params?: { page?: number; limit?: number }, signal?: AbortSignal): Promise<WorksheetListResponse> => {
    const response = await api.get<WorksheetListResponse>('/worksheets/today', { params, signal });
    return response.data;
  },

  /**
   * Get retest worksheets (Internal Retest / Customer Retest status)
   */
  getRetest: async (params?: { page?: number; limit?: number }, signal?: AbortSignal): Promise<WorksheetListResponse> => {
    const response = await api.get<WorksheetListResponse>('/worksheets/retest', { params, signal });
    return response.data;
  },

  /**
   * Get revision worksheets (Need to Revised status)
   */
  getRevision: async (params?: { page?: number; limit?: number }, signal?: AbortSignal): Promise<WorksheetListResponse> => {
    const response = await api.get<WorksheetListResponse>('/worksheets/revision', { params, signal });
    return response.data;
  },

  // ===== Detail Operations =====

  /**
   * Get worksheet detail by ID with user names and history
   */
  getDetail: async (id: number, signal?: AbortSignal): Promise<WorksheetDetail> => {
    const response = await api.get(`/worksheets/${id}/detail`, { signal });
    return response.data.data;
  },

  /**
   * Get worksheet by ID (basic info)
   */
  getById: async (id: number, signal?: AbortSignal): Promise<WorksheetListItem> => {
    const response = await api.get(`/worksheets/${id}`, { signal });
    return response.data.data;
  },

  // ===== Update Operations =====

  /**
   * Update worksheet result
   */
  updateResult: async (id: number, data: {
    result: string;
    n_result?: string;
    unit?: string;
    remarks?: string;
  }): Promise<void> => {
    await api.patch(`/worksheets/${id}`, data);
  },

  /**
   * Verify worksheet (QC)
   */
  verify: async (id: number, message?: string): Promise<void> => {
    await api.post(`/worksheets/${id}/verify`, { message });
  },

  /**
   * Approve worksheet (TM)
   */
  approve: async (id: number, message?: string): Promise<void> => {
    await api.post(`/worksheets/${id}/approve`, { message });
  },

  /**
   * Request revision
   */
  requestRevision: async (id: number, message: string): Promise<void> => {
    await api.post(`/worksheets/${id}/revision`, { message });
  },

  /**
   * Request internal retest
   */
  requestInternalRetest: async (id: number, message: string): Promise<void> => {
    await api.post(`/worksheets/${id}/internal-retest`, { message });
  },

  /**
   * Request customer retest
   */
  requestCustomerRetest: async (id: number, message: string): Promise<void> => {
    await api.post(`/worksheets/${id}/customer-retest`, { message });
  },

  /**
   * Cancel worksheet
   */
  cancel: async (id: number, reason: string): Promise<void> => {
    await api.post(`/worksheets/${id}/cancel`, { reason });
  },
};

// Legacy exports for backward compatibility
export const getWorksheetDetail = worksheetService.getDetail;
export const getWorksheetById = worksheetService.getById;
export const updateWorksheetResult = worksheetService.updateResult;
export const verifyWorksheet = worksheetService.verify;
export const approveWorksheet = worksheetService.approve;
export const requestRevision = worksheetService.requestRevision;
export const requestInternalRetest = worksheetService.requestInternalRetest;
export const requestCustomerRetest = worksheetService.requestCustomerRetest;

export default worksheetService;
