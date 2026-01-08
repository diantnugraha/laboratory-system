// Mock data for Master Data pages

export interface Method {
  id: string;
  code: string;
  name: string;
  category: "In House" | "Official";
  matrixId: string;
  matrix: string;
  description: string;
  status: "Active" | "Inactive";
}

export interface Matrix {
  id: string;
  code: string;
  name: string;
  category: string;
  status: "Active" | "Inactive";
}

export interface Parameter {
  id: string;
  code: string;
  name: string;
  laboratoryId: string;
  laboratory: string;
  status: "Active" | "Inactive";
}

export interface Laboratory {
  id: string;
  code: string;
  name: string;
  location: string;
  accreditation: string;
  status: "Active" | "Inactive";
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  laboratoryId: string;
  laboratory: string;
  description: string;
  status: "Active" | "Inactive";
}

export interface Service {
  id: string;
  code: string;
  name: string;
  parameterId: string;
  parameter: string;
  methodId: string;
  method: string;
  price: number;
  status: "Active" | "Inactive";
}

export interface CategoryService {
  id: string;
  code: string;
  name: string;
  status: "Active" | "Inactive";
}

export interface Subcontractor {
  id: string;
  code: string;
  name: string;
  contact: string;
  email: string;
  status: "Active" | "Inactive";
}

export interface Package {
  id: string;
  code: string;
  name: string;
  services: number;
  price: number;
  status: "Active" | "Inactive";
}

export interface Standard {
  id: string;
  code: string;
  name: string;
  version: string;
  effectiveDate: string;
  status: "Active" | "Inactive";
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  businessLine: string;
  industry: string;
  email: string;
  phone: string;
  status: "Contract" | "Whitelist";
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  customer: string;
  status: "Active" | "Inactive";
}

export interface AnalystType {
  id: string;
  name: string;
  list_service?: string;
}

// Generate mock data
const generateMethods = (): Method[] => {
  const categories: ("In House" | "Official")[] = ["In House", "Official"];
  const matrixNames = ["Matrix 1", "Matrix 2", "Matrix 3", "Matrix 4", "Matrix 5"];
  return Array.from({ length: 25 }, (_, i) => ({
    id: `method-${i + 1}`,
    code: `MTD-${String(i + 1).padStart(3, "0")}`,
    name: `Method ${i + 1}`,
    category: categories[i % 2],
    matrixId: `matrix-${(i % 5) + 1}`,
    matrix: matrixNames[i % 5],
    description: `Description for method ${i + 1}`,
    status: i % 5 === 0 ? "Inactive" : "Active",
  }));
};

const generateMatrices = (): Matrix[] => {
  const categories = ["Water", "Soil", "Air", "Food", "Chemical"];
  return Array.from({ length: 20 }, (_, i) => ({
    id: `matrix-${i + 1}`,
    code: `MTX-${String(i + 1).padStart(3, "0")}`,
    name: `Matrix ${i + 1}`,
    category: categories[i % categories.length],
    status: i % 4 === 0 ? "Inactive" : "Active",
  }));
};

const generateParameters = (): Parameter[] => {
  const labNames = ["Laboratory 1", "Laboratory 2", "Laboratory 3", "Laboratory 4", "Laboratory 5"];
  return Array.from({ length: 30 }, (_, i) => ({
    id: `param-${i + 1}`,
    code: `PRM-${String(i + 1).padStart(3, "0")}`,
    name: `Parameter ${i + 1}`,
    laboratoryId: `lab-${(i % 5) + 1}`,
    laboratory: labNames[i % labNames.length],
    status: i % 6 === 0 ? "Inactive" : "Active",
  }));
};

const generateLaboratories = (): Laboratory[] => {
  const locations = ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang"];
  return Array.from({ length: 15 }, (_, i) => ({
    id: `lab-${i + 1}`,
    code: `LAB-${String(i + 1).padStart(3, "0")}`,
    name: `Laboratory ${i + 1}`,
    location: locations[i % locations.length],
    accreditation: `ISO ${17025 + (i % 3)}`,
    status: i % 5 === 0 ? "Inactive" : "Active",
  }));
};

const generateUnits = (): Unit[] => {
  const labNames = ["Laboratory 1", "Laboratory 2", "Laboratory 3", "Laboratory 4", "Laboratory 5"];
  return Array.from({ length: 18 }, (_, i) => ({
    id: `unit-${i + 1}`,
    code: `UNT-${String(i + 1).padStart(3, "0")}`,
    name: `mg/L`,
    laboratoryId: `lab-${(i % 5) + 1}`,
    laboratory: labNames[i % labNames.length],
    description: `Description for unit ${i + 1}`,
    status: i % 4 === 0 ? "Inactive" : "Active",
  }));
};

const generateServices = (): Service[] => {
  const paramNames = ["Parameter 1", "Parameter 2", "Parameter 3", "Parameter 4", "Parameter 5"];
  const methodNames = ["Method 1", "Method 2", "Method 3", "Method 4", "Method 5"];
  return Array.from({ length: 22 }, (_, i) => ({
    id: `svc-${i + 1}`,
    code: `SVC-${String(i + 1).padStart(3, "0")}`,
    name: `Service ${i + 1}`,
    parameterId: `param-${(i % 5) + 1}`,
    parameter: paramNames[i % paramNames.length],
    methodId: `method-${(i % 5) + 1}`,
    method: methodNames[i % methodNames.length],
    price: Math.floor(Math.random() * 500 + 100) * 1000,
    status: i % 5 === 0 ? "Inactive" : "Active",
  }));
};

const generateCategoryServices = (): CategoryService[] => {
  return Array.from({ length: 28 }, (_, i) => ({
    id: `cat-${i + 1}`,
    code: `CAT-${String(i + 1).padStart(3, "0")}`,
    name: `Category Service ${i + 1}`,
    status: i % 4 === 0 ? "Inactive" : "Active",
  }));
};

const generateSubcontractors = (): Subcontractor[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `sub-${i + 1}`,
    code: `SUB-${String(i + 1).padStart(3, "0")}`,
    name: `Subcontractor ${i + 1}`,
    contact: `Contact Person ${i + 1}`,
    email: `subcontractor${i + 1}@example.com`,
    status: i % 3 === 0 ? "Inactive" : "Active",
  }));
};

const generatePackages = (): Package[] => {
  return Array.from({ length: 16 }, (_, i) => ({
    id: `pkg-${i + 1}`,
    code: `PKG-${String(i + 1).padStart(3, "0")}`,
    name: `Package ${i + 1}`,
    services: Math.floor(Math.random() * 10 + 3),
    price: Math.floor(Math.random() * 2000 + 500) * 1000,
    status: i % 4 === 0 ? "Inactive" : "Active",
  }));
};

const generateStandards = (): Standard[] => {
  return Array.from({ length: 14 }, (_, i) => ({
    id: `std-${i + 1}`,
    code: `STD-${String(i + 1).padStart(3, "0")}`,
    name: `Standard ${i + 1}`,
    version: `v${Math.floor(i / 3) + 1}.${i % 3}`,
    effectiveDate: `2024-${String((i % 12) + 1).padStart(2, "0")}-01`,
    status: i % 5 === 0 ? "Inactive" : "Active",
  }));
};

const generateCustomers = (): Customer[] => {
  const industries = ["Pharmaceutical", "Food & Beverage", "Chemical", "Manufacturing", "Environmental"];
  const businessLines = ["Laboratory Testing", "Quality Assurance", "Research & Development", "Consulting", "Certification"];
  const statuses: ("Contract" | "Whitelist")[] = ["Contract", "Whitelist"];
  return Array.from({ length: 24 }, (_, i) => ({
    id: `cust-${i + 1}`,
    code: `CUS-${String(i + 1).padStart(3, "0")}`,
    name: `Customer ${i + 1}`,
    businessLine: businessLines[i % businessLines.length],
    industry: industries[i % industries.length],
    email: `customer${i + 1}@example.com`,
    phone: `+62 812 ${String(1000000 + i).slice(-7)}`,
    status: statuses[i % 2],
  }));
};

const generateContacts = (): Contact[] => {
  const positions = ["Manager", "Supervisor", "Director", "Coordinator", "Analyst"];
  return Array.from({ length: 35 }, (_, i) => ({
    id: `contact-${i + 1}`,
    name: `Contact ${i + 1}`,
    email: `contact${i + 1}@example.com`,
    phone: `+62 813 ${String(2000000 + i).slice(-7)}`,
    position: positions[i % positions.length],
    customer: `CUS-${String((i % 24) + 1).padStart(3, "0")}`,
    status: i % 6 === 0 ? "Inactive" : "Active",
  }));
};

const generateAnalystTypes = (): AnalystType[] => {
  const names = [
    "Senior Analyst",
    "Junior Analyst",
    "Quality Analyst",
    "Research Analyst",
    "Technical Analyst",
    "Environmental Analyst",
    "Chemical Analyst",
    "Microbiology Analyst",
  ];
  return Array.from({ length: 15 }, (_, i) => ({
    id: `analyst-type-${i + 1}`,
    name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ""),
    list_service: i % 3 === 0 ? `Service list for ${names[i % names.length]}` : undefined,
  }));
};

export const methods = generateMethods();
export const matrices = generateMatrices();
export const parameters = generateParameters();
export const laboratories = generateLaboratories();
export const units = generateUnits();
export const services = generateServices();
export const categoryServices = generateCategoryServices();
export const subcontractors = generateSubcontractors();
export const packages = generatePackages();
export const standards = generateStandards();
export const customers = generateCustomers();
export const contacts = generateContacts();
export const analystTypes = generateAnalystTypes();
