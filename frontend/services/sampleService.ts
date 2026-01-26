import api from './api';

// ===== Interfaces =====

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
 * Get sample detail by ID with worksheets and progress
 */
export const getSampleDetail = async (id: number): Promise<SampleDetail> => {
  const response = await api.get(`/samples/${id}/detail`);
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
  getSampleDetail,
  updateSampleStatus,
  getSampleById,
  updateSample,
};
