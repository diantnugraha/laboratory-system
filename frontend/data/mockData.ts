// Mock data for LIMS demo

export type SampleStatus = 'Received' | 'In Progress' | 'Completed' | 'Released';
export type TestStatus = 'Pending' | 'In Progress' | 'Completed';
export type Priority = 'Normal' | 'Urgent' | 'STAT';

export interface Sample {
  id: string;
  patientName: string;
  sampleType: string;
  collectionDate: string;
  receivedDate: string;
  status: SampleStatus;
  priority: Priority;
  source: string;
  tests: string[];
}

export interface Test {
  id: string;
  name: string;
  category: string;
  turnaroundTime: string;
  price: number;
}

export interface TestResult {
  id: string;
  sampleId: string;
  testId: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  status: TestStatus;
  performedBy: string;
  performedAt: string;
  flag?: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface Activity {
  id: string;
  type: 'sample_received' | 'test_completed' | 'result_released' | 'sample_registered';
  message: string;
  timestamp: string;
}

export const samples: Sample[] = [
  {
    id: 'SMP-2024-001',
    patientName: 'John Smith',
    sampleType: 'Blood',
    collectionDate: '2024-01-15',
    receivedDate: '2024-01-15',
    status: 'In Progress',
    priority: 'Normal',
    source: 'Emergency Room',
    tests: ['Complete Blood Count', 'Basic Metabolic Panel'],
  },
  {
    id: 'SMP-2024-002',
    patientName: 'Sarah Johnson',
    sampleType: 'Urine',
    collectionDate: '2024-01-15',
    receivedDate: '2024-01-15',
    status: 'Received',
    priority: 'Urgent',
    source: 'Outpatient Clinic',
    tests: ['Urinalysis'],
  },
  {
    id: 'SMP-2024-003',
    patientName: 'Michael Davis',
    sampleType: 'Blood',
    collectionDate: '2024-01-14',
    receivedDate: '2024-01-14',
    status: 'Completed',
    priority: 'STAT',
    source: 'ICU',
    tests: ['Comprehensive Metabolic Panel', 'Lipid Panel'],
  },
  {
    id: 'SMP-2024-004',
    patientName: 'Emily Wilson',
    sampleType: 'Tissue',
    collectionDate: '2024-01-14',
    receivedDate: '2024-01-14',
    status: 'Released',
    priority: 'Normal',
    source: 'Surgery',
    tests: ['Histopathology'],
  },
  {
    id: 'SMP-2024-005',
    patientName: 'Robert Brown',
    sampleType: 'Blood',
    collectionDate: '2024-01-15',
    receivedDate: '2024-01-15',
    status: 'In Progress',
    priority: 'Normal',
    source: 'Primary Care',
    tests: ['Thyroid Panel', 'Complete Blood Count'],
  },
  {
    id: 'SMP-2024-006',
    patientName: 'Lisa Anderson',
    sampleType: 'Swab',
    collectionDate: '2024-01-15',
    receivedDate: '2024-01-15',
    status: 'Received',
    priority: 'Urgent',
    source: 'Emergency Room',
    tests: ['COVID-19 PCR'],
  },
];

export const tests: Test[] = [
  { id: 'TST-001', name: 'Complete Blood Count', category: 'Hematology', turnaroundTime: '2 hours', price: 25 },
  { id: 'TST-002', name: 'Basic Metabolic Panel', category: 'Chemistry', turnaroundTime: '4 hours', price: 45 },
  { id: 'TST-003', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', turnaroundTime: '4 hours', price: 65 },
  { id: 'TST-004', name: 'Lipid Panel', category: 'Chemistry', turnaroundTime: '4 hours', price: 35 },
  { id: 'TST-005', name: 'Thyroid Panel', category: 'Endocrinology', turnaroundTime: '6 hours', price: 55 },
  { id: 'TST-006', name: 'Urinalysis', category: 'Urinalysis', turnaroundTime: '1 hour', price: 15 },
  { id: 'TST-007', name: 'COVID-19 PCR', category: 'Molecular', turnaroundTime: '24 hours', price: 100 },
  { id: 'TST-008', name: 'Histopathology', category: 'Pathology', turnaroundTime: '72 hours', price: 200 },
  { id: 'TST-009', name: 'Liver Function Tests', category: 'Chemistry', turnaroundTime: '4 hours', price: 40 },
  { id: 'TST-010', name: 'Cardiac Enzymes', category: 'Chemistry', turnaroundTime: '2 hours', price: 80 },
];

export const testResults: TestResult[] = [
  {
    id: 'RES-001',
    sampleId: 'SMP-2024-001',
    testId: 'TST-001',
    testName: 'Complete Blood Count',
    result: '14.2',
    unit: 'g/dL',
    referenceRange: '12.0-16.0',
    status: 'Completed',
    performedBy: 'Dr. Jane Miller',
    performedAt: '2024-01-15 10:30',
    flag: 'Normal',
  },
  {
    id: 'RES-002',
    sampleId: 'SMP-2024-003',
    testId: 'TST-003',
    testName: 'Comprehensive Metabolic Panel',
    result: '142',
    unit: 'mEq/L',
    referenceRange: '136-145',
    status: 'Completed',
    performedBy: 'Dr. Tom Wilson',
    performedAt: '2024-01-14 14:00',
    flag: 'Normal',
  },
  {
    id: 'RES-003',
    sampleId: 'SMP-2024-003',
    testId: 'TST-004',
    testName: 'Lipid Panel',
    result: '245',
    unit: 'mg/dL',
    referenceRange: '<200',
    status: 'Completed',
    performedBy: 'Dr. Tom Wilson',
    performedAt: '2024-01-14 14:30',
    flag: 'High',
  },
  {
    id: 'RES-004',
    sampleId: 'SMP-2024-004',
    testId: 'TST-008',
    testName: 'Histopathology',
    result: 'Benign tissue, no malignancy detected',
    unit: '',
    referenceRange: 'N/A',
    status: 'Completed',
    performedBy: 'Dr. Sarah Chen',
    performedAt: '2024-01-14 16:00',
    flag: 'Normal',
  },
];

export const recentActivities: Activity[] = [
  { id: '1', type: 'sample_received', message: 'Sample SMP-2024-006 received from Emergency Room', timestamp: '5 mins ago' },
  { id: '2', type: 'test_completed', message: 'CBC completed for sample SMP-2024-001', timestamp: '15 mins ago' },
  { id: '3', type: 'result_released', message: 'Results released for sample SMP-2024-004', timestamp: '30 mins ago' },
  { id: '4', type: 'sample_registered', message: 'New sample SMP-2024-005 registered', timestamp: '1 hour ago' },
  { id: '5', type: 'test_completed', message: 'Lipid Panel completed for SMP-2024-003', timestamp: '2 hours ago' },
];

export const dashboardStats = {
  pendingSamples: 2,
  testsInProgress: 4,
  completedToday: 8,
  releasedToday: 3,
  turnaroundAvg: '3.2 hrs',
  urgentQueue: 2,
};
