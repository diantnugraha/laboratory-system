import { z } from "zod";

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
  code: z.string().min(1, "Code is required").max(255, "Code must be less than 255 characters"),
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
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  contact: z.string().min(1, "Contact is required").max(100, "Contact must be less than 100 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  status: statusSchema,
});

// Package Schema
export const packageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  customerId: z.string().min(1, "Customer is required"),
  groupPrice: z.boolean().default(false),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  services: z.coerce.number().min(0, "Services count must be at least 0"),
  price: z.coerce.number().min(0, "Price must be positive"),
});

// Standard Schema
export const standardSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  version: z.string().min(1, "Version is required").max(20, "Version must be less than 20 characters"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  status: statusSchema,
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

// Type exports
export type MethodFormData = z.infer<typeof methodSchema>;
export type MatrixFormData = z.infer<typeof matrixSchema>;
export type ParameterFormData = z.infer<typeof parameterSchema>;
export type LaboratoryFormData = z.infer<typeof laboratorySchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
export type CategoryServiceFormData = z.infer<typeof categoryServiceSchema>;
export type SubcontractorFormData = z.infer<typeof subcontractorSchema>;
export type PackageFormData = z.infer<typeof packageSchema>;
export type StandardFormData = z.infer<typeof standardSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type AnalystTypeFormData = z.infer<typeof analystTypeSchema>;
