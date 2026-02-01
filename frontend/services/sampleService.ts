import api from './api';

// ===== Interfaces =====

export interface SampleListItem {
  id: number;
  code: string;
  name: string;
  sample_status: string;
  due_date: string | null;
  received_date: string | null;
  order: {
    id: number;
    code: string;
    order_status: string;
    priority: string | null;
    customer: {
      id: number;
      code: string;
      customer_name: string;
    };
  } | null;
}

export interface SampleListResponse {
  data: SampleListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SampleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface SampleWorksheet {
  id: number;
  code: string;
  status: string;
  result: string | null;
  unit: string | null;
  parameter: string;
  method: string;
  packageId: number | null;
  packageName: string | null;
  finishDate: string | null;
  min: string | null;
  max: string | null;
  analystId: number | null;
  analystName: string | null;
  dueDate: string | null;
}

export interface SampleOrder {
  id: number;
  code: string;
  status: string;
  priority: string | null;
  customerId: number | null;
  customerName: string | null;
}

export interface WorksheetProgress {
  completed: number;
  total: number;
}

export interface SampleDetail {
  id: number;
  code: string;
  name: string;
  description: string | null;
  volume: string | null;
  sampleStorage: string | null;
  quantity: number | null;
  priority: string;
  sampleStatus: string;
  leadTime: string;
  verificationStatusMicro: number | null;
  verificationStatusChem: number | null;
  receivedDate: string | null;
  dueDate: string | null;
  coaReleaseDueDate: string | null;
  analysisFinishedDate: string | null;
  coaReleasedDate: string | null;
  retainDate: string | null;
  resultSummary: string | null;
  price: number | null;
  discount: number | null;
  standardId: number | null;
  standardName: string | null;
  standardCode: string | null;
  order: SampleOrder;
  worksheets: SampleWorksheet[];
  worksheetProgress: WorksheetProgress;
  createdAt: string;
  updatedAt: string | null;
}

// ===== API Functions =====

/**
 * Get all samples with pagination and filters
 */
export const getAll = async (params: SampleListParams = {}, signal?: AbortSignal): Promise<SampleListResponse> => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.fromDate) queryParams.append('date_from', params.fromDate);
  if (params.toDate) queryParams.append('date_to', params.toDate);

  const response = await api.get(`/samples?${queryParams.toString()}`, { signal });
  return response.data;
};

/**
 * Get sample detail by ID with worksheets and progress
 */
export const getSampleDetail = async (id: number, signal?: AbortSignal): Promise<SampleDetail> => {
  const response = await api.get(`/samples/${id}/detail`, { signal });
  return response.data.data;
};

/**
 * Update sample status
 */
export const updateSampleStatus = async (id: number, status: string): Promise<void> => {
  await api.patch(`/samples/${id}/status`, { status });
};

/**
 * Get sample by ID (basic info)
 */
export const getSampleById = async (id: number): Promise<any> => {
  const response = await api.get(`/samples/${id}`);
  return response.data.data;
};

/**
 * Update sample
 */
export const updateSample = async (id: number, data: Partial<{
  name: string;
  description: string | null;
  volume: string | null;
  sample_storage: string | null;
  quantity: number | null;
  priority: string;
  status: string;
  due_date: string | null;
  received_date: string | null;
  lead_time: string;
}>): Promise<void> => {
  await api.put(`/samples/${id}`, data);
};

export default {
  getAll,
  getSampleDetail,
  updateSampleStatus,
  getSampleById,
  updateSample,
};
