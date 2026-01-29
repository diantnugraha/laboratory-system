import { Type, Static } from '@sinclair/typebox';

// ============================================
// Common TypeBox Schemas
// ============================================

/**
 * ID Parameter Schema - validates and coerces string ID to integer
 */
export const IdParamSchema = Type.Object({
  id: Type.Integer({ minimum: 1 })
});
export type IdParam = Static<typeof IdParamSchema>;

/**
 * Pagination Query Schema
 */
export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String())
});
export type PaginationQuery = Static<typeof PaginationQuerySchema>;

/**
 * Sort Direction Schema
 */
export const SortDirectionSchema = Type.Union([
  Type.Literal('ASC'),
  Type.Literal('DESC'),
  Type.Literal('asc'),
  Type.Literal('desc')
]);
export type SortDirection = Static<typeof SortDirectionSchema>;
