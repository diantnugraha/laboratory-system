import { z } from "zod";

// ===== Reusable Field Builders =====

/**
 * Creates a required string field with custom field name in error message
 */
export const requiredString = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`);

/**
 * Optional string that allows empty string
 */
export const optionalString = () =>
  z.string().optional().or(z.literal(''));

/**
 * Optional email field (allows empty string)
 */
export const emailField = z
  .string()
  .email('Invalid email address')
  .or(z.literal(''));

/**
 * Optional phone field with basic validation (allows empty string)
 */
export const phoneField = z
  .string()
  .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
  .or(z.literal(''));

/**
 * Required email field
 */
export const requiredEmail = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

/**
 * Required phone field with basic validation
 */
export const requiredPhone = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format');

// ===== Common Schemas =====

// Common status schema
const statusSchema = z.enum(["Active", "Inactive"]);

// Method Category Schema
const methodCategorySchema = z.enum(["In House", "Official"]);

// Method Schema
export const methodSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  category: methodCategorySchema,
  matrixId: z.string().min(1, "Matrix is required"),
  status: statusSchema.optional().default("Active"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  instruction: z.string().max(500, "Instruction must be less than 500 characters").optional(),
});

// Matrix Schema
export const matrixSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
});

// Parameter Schema
export const parameterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  laboratoryId: z.string().min(1, "Laboratory is required"),
});

// Laboratory Schema
export const laboratorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
});

// Unit Schema
export const unitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  laboratoryId: z.string().optional(),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
});

// Service Schema
export const serviceSchema = z.object({
  code: z.string().max(255, "Code must be less than 255 characters").optional(),
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  categoryId: z.string().min(1, "Category is required"),
  parameterId: z.string().min(1, "Parameter is required"),
  methodId: z.string().min(1, "Method is required"),
  price: z.coerce.number().min(0, "Price must be a non-negative number"),
  subcontractorId: z.string().optional(),
  analystTypeId: z.string().optional(),
  accreditation: z.string().max(255).optional(),
  accreditationValidDate: z.string().optional(),
  unit: z.string().max(255).optional(),
  publishedDate: z.string().optional(),
  lod: z.string().max(255).optional(),
  loq: z.string().max(255).optional(),
  proficiencyTest: z.string().max(255).optional(),
  description: z.string().max(500).optional(),
  user: z.coerce.number().optional().default(1),
  usePc: z.coerce.number().optional().default(0),
  status: z.string().optional(),
});

// Category Service Schema
export const categoryServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
});

// Subcontractor Schema
export const subcontractorSchema = z.object({
  lab_name: z.string().min(1, "Lab name is required").max(255, "Lab name must be less than 255 characters"),
  address_name: z.string().min(1, "Address is required").max(255, "Address must be less than 255 characters"),
  phone: z.string().min(1, "Phone is required").max(255, "Phone must be less than 255 characters"),
  fax: z.string().min(1, "Fax is required").max(255, "Fax must be less than 255 characters"),
  contact: z.string().min(1, "Contact is required").max(255, "Contact must be less than 255 characters"),
  email: z.string().min(1, "Email is required").max(255, "Email must be less than 255 characters").email("Invalid email address"),
});

// Package Schema
export const packageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  customerId: z.number().nullable().optional(),
  group: z.boolean().default(false),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

// Standard Detail Item Schema
export const standardDetailSchema = z.object({
  serviceId: z.coerce.number().min(1, "Service is required"),
  min: z.string().min(1, "Min value is required"),
  max: z.string().min(1, "Max value is required"),
  unit: z.string().min(1, "Unit is required"),
});

// Standard Schema (aligned with backend)
export const standardSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  categoryId: z.coerce.number().optional().nullable(),
  customerId: z.coerce.number().optional().nullable(),
  standartDetails: z.array(standardDetailSchema).min(1, "At least one service is required"),
});

// Customer Schema
export const customerSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  industry: z.string().min(1, "Industry is required").max(50, "Industry must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string().min(1, "Phone is required").max(20, "Phone must be less than 20 characters"),
  status: statusSchema,
});

// Contact Schema
export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string().min(1, "Phone is required").max(20, "Phone must be less than 20 characters"),
  position: z.string().min(1, "Position is required").max(50, "Position must be less than 50 characters"),
  customer: z.string().min(1, "Customer is required").max(50, "Customer must be less than 50 characters"),
  status: statusSchema,
});

// Analyst Type Schema
export const analystTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  status: statusSchema.optional().default("Active"),
});

// Internal User Schema
export const internalUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  display_name: z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
  role_id: z.string().min(1, "Role is required"),
  department: z.string().max(100, "Department must be less than 100 characters").optional(),
  analyst_type_id: z.string().optional(),
});

// External User Schema
export const externalUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  display_name: z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
  customer_id: z.string().min(1, "Customer is required"),
  contact_id: z.string().optional(),
});

// Contract Detail Schema (for services/packages in SELECTED mode)
export const contractDetailSchema = z.object({
  serviceId: z.coerce.number().optional().nullable(),
  packageId: z.coerce.number().optional().nullable(),
  discountNormal: z.coerce.number().min(0).max(100).default(0),
  discountUrgent: z.coerce.number().min(0).max(100).default(50),
  discountVeryUrgent: z.coerce.number().min(0).max(100).default(100),
}).refine((data) => data.serviceId || data.packageId, {
  message: "Either service or package must be selected",
});

// Contract Schema
export const contractSchema = z.object({
  code: z.string().min(1, "Code is required").max(255, "Code must be less than 255 characters"),
  customerId: z.coerce.number().min(1, "Customer is required"),
  period: z.string().min(1, "Period is required").max(255, "Period must be less than 255 characters"),
  periodFrom: z.string().min(1, "Period From is required"),
  periodTo: z.string().min(1, "Period To is required"),
  periodAlias: z.string().max(255).optional(),
  normalDay: z.coerce.number().min(1, "Normal day is required"),
  urgentDay: z.coerce.number().min(1, "Urgent day is required"),
  veryUrgentDay: z.coerce.number().min(1, "Very urgent day is required"),
  statusService: z.enum(["ALL", "SELECTED"]).default("ALL"),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  discountUrgent: z.coerce.number().min(0).max(100).optional().default(50),
  discountVeryUrgent: z.coerce.number().min(0).max(100).optional().default(100),
  remarks: z.string().max(255).optional(),
  details: z.array(contractDetailSchema).optional(),
});

// Analyst Type with Services Schema (enhanced version)
export const analystTypeWithServicesSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  services: z.array(z.object({
    serviceId: z.string(),
    serviceName: z.string(),
    parameter: z.string(),
  })).min(1, "At least one service is required"),
  status: statusSchema.optional().default("Active"),
});

// Analyst Rule Schema
export const analystRuleSchema = z.object({
  userId: z.string().min(1, "Internal User is required"),
  userName: z.string(),
  analystTypeId: z.string().min(1, "Analyst Type is required"),
  analystTypeName: z.string(),
  accessAnalystTypes: z.array(z.object({
    analystTypeId: z.string(),
    analystTypeName: z.string(),
  })),
  status: statusSchema.optional().default("Active"),
});

// Order Reject Schema (for Review Order)
export const orderRejectSchema = z.object({
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason must be at most 500 characters"),
});

// Type exports
export type OrderRejectFormData = z.infer<typeof orderRejectSchema>;
export type ContractDetailFormData = z.infer<typeof contractDetailSchema>;
export type ContractFormData = z.infer<typeof contractSchema>;
export type MethodFormData = z.infer<typeof methodSchema>;
export type MatrixFormData = z.infer<typeof matrixSchema>;
export type ParameterFormData = z.infer<typeof parameterSchema>;
export type LaboratoryFormData = z.infer<typeof laboratorySchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
export type CategoryServiceFormData = z.infer<typeof categoryServiceSchema>;
export type SubcontractorFormData = z.infer<typeof subcontractorSchema>;
export type PackageFormData = z.infer<typeof packageSchema>;
export type StandardDetailFormData = z.infer<typeof standardDetailSchema>;
export type StandardFormData = z.infer<typeof standardSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type AnalystTypeFormData = z.infer<typeof analystTypeSchema>;
export type AnalystTypeWithServicesFormData = z.infer<typeof analystTypeWithServicesSchema>;
export type AnalystRuleFormData = z.infer<typeof analystRuleSchema>;
export type InternalUserFormData = z.infer<typeof internalUserSchema>;
export type ExternalUserFormData = z.infer<typeof externalUserSchema>;
