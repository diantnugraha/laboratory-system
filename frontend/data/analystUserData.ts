// Mock data for Analyst User pages (Analyst Type & Analyst Rules)

export interface AnalystTypeService {
  serviceId: string;
  serviceName: string;
  parameter: string;
}

export interface AnalystTypeWithServices {
  id: string;
  name: string;
  services: AnalystTypeService[];
  status: "Active" | "Inactive";
}

export interface AnalystRuleAccessType {
  analystTypeId: string;
  analystTypeName: string;
}

export interface AnalystRule {
  id: string;
  userId: string;
  userName: string;
  analystTypeId: string;
  analystTypeName: string;
  accessAnalystTypes: AnalystRuleAccessType[];
  status: "Active" | "Inactive";
}

// Mock Internal Users for Analyst Rule selection
export interface InternalUserOption {
  id: string;
  displayName: string;
  email: string;
  status: "Active" | "Inactive";
}

const generateInternalUsers = (): InternalUserOption[] => {
  return Array.from({ length: 20 }, (_, i) => ({
    id: `internal-${i + 1}`,
    displayName: `User ${i + 1}`,
    email: `user${i + 1}@labflow.com`,
    status: i % 5 === 0 ? "Inactive" as const : "Active" as const,
  }));
};

const generateAnalystTypes = (): AnalystTypeWithServices[] => {
  const analystTypeData = [
    {
      name: "Water Quality Analyst",
      services: [
        { serviceId: "svc-1", serviceName: "pH Analysis", parameter: "pH Level" },
        { serviceId: "svc-2", serviceName: "BOD Analysis", parameter: "BOD" },
        { serviceId: "svc-3", serviceName: "COD Analysis", parameter: "COD" },
      ]
    },
    {
      name: "Microbiology Analyst",
      services: [
        { serviceId: "svc-6", serviceName: "Total Coliform", parameter: "Coliform" },
        { serviceId: "svc-7", serviceName: "E.Coli Test", parameter: "E.Coli" },
      ]
    },
    {
      name: "Heavy Metals Analyst",
      services: [
        { serviceId: "svc-9", serviceName: "Lead (Pb) Analysis", parameter: "Lead" },
        { serviceId: "svc-10", serviceName: "Mercury (Hg) Analysis", parameter: "Mercury" },
        { serviceId: "svc-11", serviceName: "Arsenic (As) Analysis", parameter: "Arsenic" },
      ]
    },
    {
      name: "Food Safety Analyst",
      services: [
        { serviceId: "svc-13", serviceName: "Moisture Content", parameter: "Moisture" },
        { serviceId: "svc-14", serviceName: "Ash Content", parameter: "Ash" },
        { serviceId: "svc-15", serviceName: "Protein Analysis", parameter: "Protein" },
      ]
    },
    {
      name: "Soil Analyst",
      services: [
        { serviceId: "svc-19", serviceName: "Soil pH", parameter: "pH" },
        { serviceId: "svc-20", serviceName: "Nitrogen Content", parameter: "Nitrogen" },
      ]
    },
    {
      name: "Air Quality Analyst",
      services: [
        { serviceId: "svc-21", serviceName: "PM2.5 Analysis", parameter: "PM2.5" },
        { serviceId: "svc-22", serviceName: "PM10 Analysis", parameter: "PM10" },
        { serviceId: "svc-23", serviceName: "CO Analysis", parameter: "Carbon Monoxide" },
        { serviceId: "svc-24", serviceName: "SO2 Analysis", parameter: "Sulfur Dioxide" },
      ]
    },
  ];

  return analystTypeData.map((item, i) => ({
    id: `analyst-type-${i + 1}`,
    name: item.name,
    services: item.services,
    status: i === 4 ? "Inactive" as const : "Active" as const,
  }));
};

const generateAnalystRules = (): AnalystRule[] => {
  const types = generateAnalystTypes();
  const users = generateInternalUsers();

  return [
    {
      id: "rule-1",
      userId: users[1].id,
      userName: users[1].displayName,
      analystTypeId: types[0].id,
      analystTypeName: types[0].name,
      accessAnalystTypes: [
        { analystTypeId: types[1].id, analystTypeName: types[1].name },
        { analystTypeId: types[2].id, analystTypeName: types[2].name },
      ],
      status: "Active",
    },
    {
      id: "rule-2",
      userId: users[2].id,
      userName: users[2].displayName,
      analystTypeId: types[1].id,
      analystTypeName: types[1].name,
      accessAnalystTypes: [],
      status: "Active",
    },
    {
      id: "rule-3",
      userId: users[3].id,
      userName: users[3].displayName,
      analystTypeId: types[2].id,
      analystTypeName: types[2].name,
      accessAnalystTypes: [
        { analystTypeId: types[0].id, analystTypeName: types[0].name },
      ],
      status: "Active",
    },
    {
      id: "rule-4",
      userId: users[5].id,
      userName: users[5].displayName,
      analystTypeId: types[3].id,
      analystTypeName: types[3].name,
      accessAnalystTypes: [
        { analystTypeId: types[4].id, analystTypeName: types[4].name },
      ],
      status: "Inactive",
    },
    {
      id: "rule-5",
      userId: users[6].id,
      userName: users[6].displayName,
      analystTypeId: types[5].id,
      analystTypeName: types[5].name,
      accessAnalystTypes: [
        { analystTypeId: types[0].id, analystTypeName: types[0].name },
        { analystTypeId: types[1].id, analystTypeName: types[1].name },
        { analystTypeId: types[2].id, analystTypeName: types[2].name },
      ],
      status: "Active",
    },
  ];
};

// Mock services for selection in Analyst Type form
export interface ServiceOption {
  id: string;
  code: string;
  name: string;
  parameter: string;
  status: "Active" | "Inactive";
}

const generateServiceOptions = (): ServiceOption[] => {
  const serviceData = [
    { code: "SVC-001", name: "pH Analysis", parameter: "pH Level" },
    { code: "SVC-002", name: "BOD Analysis", parameter: "BOD" },
    { code: "SVC-003", name: "COD Analysis", parameter: "COD" },
    { code: "SVC-004", name: "TSS Analysis", parameter: "Total Suspended Solids" },
    { code: "SVC-005", name: "TDS Analysis", parameter: "Total Dissolved Solids" },
    { code: "SVC-006", name: "Total Coliform", parameter: "Coliform" },
    { code: "SVC-007", name: "E.Coli Test", parameter: "E.Coli" },
    { code: "SVC-008", name: "Salmonella Test", parameter: "Salmonella" },
    { code: "SVC-009", name: "Lead (Pb) Analysis", parameter: "Lead" },
    { code: "SVC-010", name: "Mercury (Hg) Analysis", parameter: "Mercury" },
    { code: "SVC-011", name: "Arsenic (As) Analysis", parameter: "Arsenic" },
    { code: "SVC-012", name: "Cadmium (Cd) Analysis", parameter: "Cadmium" },
    { code: "SVC-013", name: "Moisture Content", parameter: "Moisture" },
    { code: "SVC-014", name: "Ash Content", parameter: "Ash" },
    { code: "SVC-015", name: "Protein Analysis", parameter: "Protein" },
    { code: "SVC-016", name: "Fat Analysis", parameter: "Fat" },
    { code: "SVC-017", name: "Carbohydrate Analysis", parameter: "Carbohydrate" },
    { code: "SVC-018", name: "Fiber Analysis", parameter: "Fiber" },
    { code: "SVC-019", name: "Soil pH", parameter: "pH" },
    { code: "SVC-020", name: "Nitrogen Content", parameter: "Nitrogen" },
    { code: "SVC-021", name: "PM2.5 Analysis", parameter: "PM2.5" },
    { code: "SVC-022", name: "PM10 Analysis", parameter: "PM10" },
    { code: "SVC-023", name: "CO Analysis", parameter: "Carbon Monoxide" },
    { code: "SVC-024", name: "SO2 Analysis", parameter: "Sulfur Dioxide" },
    { code: "SVC-025", name: "NO2 Analysis", parameter: "Nitrogen Dioxide" },
  ];

  return serviceData.map((item, i) => ({
    id: `svc-${i + 1}`,
    code: item.code,
    name: item.name,
    parameter: item.parameter,
    status: i % 8 === 0 ? "Inactive" as const : "Active" as const,
  }));
};

export const internalUsers = generateInternalUsers();
export const analystTypesWithServices = generateAnalystTypes();
export const analystRules = generateAnalystRules();
export const serviceOptions = generateServiceOptions();
