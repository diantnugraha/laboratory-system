import { Type, Static } from '@sinclair/typebox';
import { PaginationQuerySchema, SortDirectionSchema } from './common.js';

// ============================================
// Quotation Enums
// ============================================

export const QuotationStatusSchema = Type.Union([
  Type.Literal('Created'),
  Type.Literal('Order')
]);
export type QuotationStatus = Static<typeof QuotationStatusSchema>;

export const LabTypeSchema = Type.Union([
  Type.Literal('1'),
  Type.Literal('2')
]);
export type LabType = Static<typeof LabTypeSchema>;

export const QuotationPrioritySchema = Type.Union([
  Type.Literal('normal'),
  Type.Literal('urgent'),
  Type.Literal('very urgent')
]);
export type QuotationPriority = Static<typeof QuotationPrioritySchema>;

// ============================================
// Query Schemas
// ============================================

/**
 * Generate Code Query Schema
 */
export const GenerateCodeQuerySchema = Type.Object({
  lab: Type.Optional(Type.String())
});
export type GenerateCodeQuery = Static<typeof GenerateCodeQuerySchema>;

/**
 * Quotation List Query Schema
 */
export const QuotationQuerySchema = Type.Object({
  ...PaginationQuerySchema.properties,
  per_page: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  q: Type.Optional(Type.String()),
  q_code: Type.Optional(Type.String()),
  customer_id: Type.Optional(Type.Integer({ minimum: 1 })),
  contact_id: Type.Optional(Type.Integer({ minimum: 1 })),
  status: Type.Optional(Type.String()),
  search_status: Type.Optional(Type.String()),
  search_sales: Type.Optional(Type.Integer({ minimum: 1 })),
  date_start: Type.Optional(Type.String()),
  date_end: Type.Optional(Type.String()),
  lab: Type.Optional(Type.String()),
  sort_subtotal: Type.Optional(SortDirectionSchema),
  order_by: Type.Optional(Type.String())
});
export type QuotationQuery = Static<typeof QuotationQuerySchema>;

/**
 * Quotation JSON/Autocomplete Query Schema
 */
export const QuotationJsonQuerySchema = Type.Object({
  q: Type.Optional(Type.String()),
  customer_id: Type.Optional(Type.Integer({ minimum: 1 })),
  dataTable: Type.Optional(Type.String()),
  pretty: Type.Optional(Type.String())
});
export type QuotationJsonQuery = Static<typeof QuotationJsonQuerySchema>;

/**
 * Fetch JSON Query Schema (Standard Lab)
 */
export const FetchJsonQuerySchema = Type.Object({
  q_code: Type.Optional(Type.String()),
  customer_id: Type.Optional(Type.Integer({ minimum: 1 })),
  search_status: Type.Optional(Type.String()),
  search_sales: Type.Optional(Type.Integer({ minimum: 1 })),
  date_start: Type.Optional(Type.String()),
  date_end: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  page: Type.Optional(Type.Integer({ minimum: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  sort_subtotal: Type.Optional(SortDirectionSchema),
  pretty: Type.Optional(Type.String())
});
export type FetchJsonQuery = Static<typeof FetchJsonQuerySchema>;

/**
 * Fetch JSON Env Query Schema (Environmental Lab)
 */
export const FetchJsonEnvQuerySchema = Type.Object({
  q_code: Type.Optional(Type.String()),
  customer_id: Type.Optional(Type.Integer({ minimum: 1 })),
  search_status: Type.Optional(Type.String()),
  date_start: Type.Optional(Type.String()),
  date_end: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  page: Type.Optional(Type.Integer({ minimum: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  order_by: Type.Optional(Type.String()),
  pretty: Type.Optional(Type.String())
});
export type FetchJsonEnvQuery = Static<typeof FetchJsonEnvQuerySchema>;

/**
 * Report Query Schema
 */
export const ReportQuerySchema = Type.Object({
  start: Type.Optional(Type.String()),
  end: Type.Optional(Type.String()),
  trash: Type.Optional(Type.String())
});
export type ReportQuery = Static<typeof ReportQuerySchema>;

/**
 * PDF Preview Query Schema
 */
export const PdfPreviewQuerySchema = Type.Object({
  format: Type.Optional(Type.Union([
    Type.Literal('pdf'),
    Type.Literal('html')
  ]))
});
export type PdfPreviewQuery = Static<typeof PdfPreviewQuerySchema>;

// ============================================
// Body Schemas
// ============================================

/**
 * Service Input Schema
 */
export const ServiceInputSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
  quantity: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.String()])),
  discount: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.String()])),
  id_detail: Type.Optional(Type.Integer({ minimum: 1 })),
  order: Type.Optional(Type.Integer({ minimum: 0 }))
});
export type ServiceInput = Static<typeof ServiceInputSchema>;

/**
 * Package Input Schema
 */
export const PackageInputSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
  quantity: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.String()])),
  discount: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.String()])),
  id_detail: Type.Optional(Type.String()),
  order: Type.Optional(Type.Integer({ minimum: 0 }))
});
export type PackageInput = Static<typeof PackageInputSchema>;

/**
 * Sample Input Schema
 */
export const SampleInputSchema = Type.Object({
  name: Type.String(),
  quantity: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.String()])),
  priority: Type.Optional(Type.String()),
  services: Type.Optional(Type.Array(ServiceInputSchema)),
  packages: Type.Optional(Type.Array(PackageInputSchema))
});
export type SampleInput = Static<typeof SampleInputSchema>;

/**
 * Product Input Schema
 */
export const ProductInputSchema = Type.Object({
  name: Type.String(),
  quantity: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.String()])),
  price: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.String()])),
  discount: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.String()])),
  id_detail: Type.Optional(Type.Integer({ minimum: 1 }))
});
export type ProductInput = Static<typeof ProductInputSchema>;

/**
 * Create Quotation Body Schema
 */
export const CreateQuotationBodySchema = Type.Object({
  quo_status: Type.Optional(QuotationStatusSchema),
  quo_date: Type.String({ minLength: 1 }),
  sampling_request: Type.Optional(Type.Union([Type.Boolean(), Type.String(), Type.Number()])),
  sampling_date: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  customer_id: Type.Integer({ minimum: 1 }),
  contact_id: Type.Integer({ minimum: 1 }),
  address_id: Type.Integer({ minimum: 1 }),
  volume: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  remarks: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  min_volume_sample: Type.Optional(Type.String()),
  sub_total: Type.Optional(Type.Number({ minimum: 0 })),
  percent_discount: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  percent_vat: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  percent_pc: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()])),
  price_group: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  priority: Type.Optional(QuotationPrioritySchema),
  lab: Type.Optional(LabTypeSchema),
  samples: Type.Optional(Type.Array(SampleInputSchema)),
  products: Type.Optional(Type.Array(ProductInputSchema))
});
export type CreateQuotationBody = Static<typeof CreateQuotationBodySchema>;

/**
 * Update Quotation Body Schema
 */
export const UpdateQuotationBodySchema = Type.Object({
  quo_status: Type.Optional(QuotationStatusSchema),
  quo_date: Type.Optional(Type.String()),
  sampling_request: Type.Optional(Type.Union([Type.Boolean(), Type.String(), Type.Number()])),
  sampling_date: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  customer_id: Type.Optional(Type.Integer({ minimum: 1 })),
  contact_id: Type.Optional(Type.Integer({ minimum: 1 })),
  address_id: Type.Optional(Type.Integer({ minimum: 1 })),
  volume: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  remarks: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  min_volume_sample: Type.Optional(Type.String()),
  sub_total: Type.Optional(Type.Number({ minimum: 0 })),
  percent_discount: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  percent_vat: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  percent_pc: Type.Optional(Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()])),
  price_group: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  priority: Type.Optional(QuotationPrioritySchema),
  lab: Type.Optional(LabTypeSchema),
  samples: Type.Optional(Type.Array(SampleInputSchema)),
  products: Type.Optional(Type.Array(ProductInputSchema))
});
export type UpdateQuotationBody = Static<typeof UpdateQuotationBodySchema>;

// ============================================
// Re-export common schemas for convenience
// ============================================
export { IdParamSchema, type IdParam } from './common.js';
