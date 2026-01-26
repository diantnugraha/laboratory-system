import api from './api';

// ===== Interfaces =====

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

// ===== API Functions =====

/**
 * Get worksheet detail by ID with user names and history
 */
export const getWorksheetDetail = async (id: number): Promise<WorksheetDetail> => {
  const response = await api.get(`/worksheets/${id}/detail`);
  return response.data.data;
};

/**
 * Get worksheet by ID (basic info)
 */
export const getWorksheetById = async (id: number): Promise<any> => {
  const response = await api.get(`/worksheets/${id}`);
  return response.data.data;
};

/**
 * Update worksheet result
 */
export const updateWorksheetResult = async (id: number, data: {
  result: string;
  n_result?: string;
  unit?: string;
  remarks?: string;
}): Promise<void> => {
  await api.patch(`/worksheets/${id}/result`, data);
};

/**
 * Verify worksheet (QC)
 */
export const verifyWorksheet = async (id: number): Promise<void> => {
  await api.post(`/worksheets/${id}/verify`);
};

/**
 * Approve worksheet (TM)
 */
export const approveWorksheet = async (id: number): Promise<void> => {
  await api.post(`/worksheets/${id}/approve`);
};

/**
 * Request revision
 */
export const requestRevision = async (id: number, reason: string): Promise<void> => {
  await api.post(`/worksheets/${id}/request-revision`, { reason });
};

/**
 * Request internal retest
 */
export const requestInternalRetest = async (id: number, reason: string): Promise<void> => {
  await api.post(`/worksheets/${id}/request-internal-retest`, { reason });
};

/**
 * Request customer retest
 */
export const requestCustomerRetest = async (id: number, reason: string): Promise<void> => {
  await api.post(`/worksheets/${id}/request-customer-retest`, { reason });
};

export default {
  getWorksheetDetail,
  getWorksheetById,
  updateWorksheetResult,
  verifyWorksheet,
  approveWorksheet,
  requestRevision,
  requestInternalRetest,
  requestCustomerRetest,
};
