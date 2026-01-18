import { z } from 'zod';

// ============================================
// Customer Query
// ============================================

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .optional(),
  months: z.string()
    .regex(/^\d+$/, 'Months must be a number')
    .transform(Number)
    .optional()
});

export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// ============================================
// Customer JSON Query
// ============================================

export const customerJsonQuerySchema = z.object({
  q: z.string().optional(),
  dataTable: z.string().optional()
});

export type CustomerJsonQuery = z.infer<typeof customerJsonQuerySchema>;

// ============================================
// Customer Create/Update Schemas
// ============================================

/**
 * Helper to transform null to undefined for DTO compatibility
 */
const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
  val === null ? undefined : val;

/**
 * Optional string that converts null to undefined
 */
const optionalString = (maxLength: number = 255) =>
  z.string().max(maxLength).optional().nullable().transform(nullToUndefined);

/**
 * Optional email that converts null to undefined
 */
const optionalEmail = (maxLength: number = 255) =>
  z.string().email('Invalid email format').max(maxLength).optional().nullable().transform(nullToUndefined);

/**
 * Optional number that converts null to undefined
 */
const optionalInt = () =>
  z.number().int().optional().nullable().transform(nullToUndefined);

/**
 * Optional flag that accepts boolean or number (0/1) and converts to number
 * Handles frontend sending true/false or 0/1
 */
const optionalFlag = () =>
  z.union([z.boolean(), z.number().int()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });

/**
 * Schema for creating a customer
 * Whitelisted fields only - prevents mass assignment vulnerability
 */
export const createCustomerSchema = z.object({
  code: z.string().min(1, 'Code is required').max(255),
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  business: z.string().min(1, 'Business is required').max(255),
  zahir_id: optionalString(20),
  npwp: optionalString(),
  legal_document: optionalString(),
  email: optionalEmail(),
  website: optionalString(),
  bank_name: optionalString(),
  account_name: optionalString(),
  account_number: optionalString(),
  bank_branch: optionalString(),
  bank_address: optionalString(),
  supplier_of: optionalString(),
  supplier_code: optionalString(),
  remarks: optionalString(),
  special_customer: optionalFlag(),
  top: optionalInt(),
  payment_middle: optionalFlag(),
  sales_incharge: optionalString(),
  sales_id: optionalInt(),
  ecoa: optionalFlag(),
  feeder: optionalString(),
  feeder_fee: optionalInt(),
  agency: optionalFlag(),
  sales_feeder: optionalFlag(),
  is_corporate: optionalFlag(),
  central_cust_id: optionalString(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/**
 * Schema for updating a customer
 * All fields are optional (partial update)
 */
export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ============================================
// Address Schema
// ============================================

export const addressSchema = z.object({
  address_type: z.string().min(1, 'Address type is required').max(255),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required').max(255),
  fax: optionalString(),
  city: z.string().min(1, 'City is required').max(255),
  state: z.string().min(1, 'State is required').max(255),
  country: z.string().min(1, 'Country is required').max(255),
  postal_code: z.union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined) return undefined;
      return String(val);
    }),
  npwp: optionalString(100),
  status: optionalString(45),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const updateAddressSchema = z.object({
  address_type: z.string().min(1).max(255).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).max(255).optional(),
  fax: optionalString(),
  city: z.string().min(1).max(255).optional(),
  state: z.string().min(1).max(255).optional(),
  country: z.string().min(1).max(255).optional(),
  postal_code: z.union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined) return undefined;
      return String(val);
    }),
  npwp: optionalString(100),
  status: optionalString(45),
});

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

// ============================================
// Contact Schema
// ============================================

export const contactSchema = z.object({
  address_id: z.number().int({ message: 'Address ID is required' }),
  title: z.string().min(1, 'Title is required').max(255),
  first_name: z.string().min(1, 'First name is required').max(255),
  middle_name: optionalString(),
  surname: z.string().min(1, 'Surname is required').max(255),
  username: z.string().min(1, 'Username is required').max(255),
  job_title: optionalString(),
  department: optionalString(),
  email: z.string().email('Invalid email format').max(255),
  phone: z.string().min(1, 'Phone is required').max(255),
  fax: optionalString(),
  mobile_phone: optionalString(),
  status: optionalString(45),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const updateContactSchema = z.object({
  address_id: z.number().int().optional(),
  title: z.string().min(1).max(255).optional(),
  first_name: z.string().min(1).max(255).optional(),
  middle_name: optionalString(),
  surname: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  job_title: optionalString(),
  department: optionalString(),
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: z.string().min(1).max(255).optional(),
  fax: optionalString(),
  mobile_phone: optionalString(),
  status: optionalString(45),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ============================================
// Manage Action Schema
// ============================================

export const manageActionSchema = z.enum(['create', 'update', 'delete']);

export type ManageAction = z.infer<typeof manageActionSchema>;
