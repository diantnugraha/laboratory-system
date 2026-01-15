import express, { Router } from 'express';
import {
  getAllOrders,
  getOrderById,
  getOrdersJson,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getGeneratedCode,
} from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
} from '../validators';
import {
  orderQuerySchema,
  orderJsonQuerySchema,
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from '../validators/order';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// ===== Utility endpoints (before parameterized routes) =====

// JSON API endpoint - for autocomplete/dropdown
router.get('/json', validate(orderJsonQuerySchema, 'query'), getOrdersJson);

// Generate code endpoint - for creating new orders
router.get('/generate-code', authorize(1, 2, 3), getGeneratedCode);

// ===== CRUD operations =====

// GET /api/orders - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
router.get('/', authorize(1, 2, 3, 8), validate(orderQuerySchema, 'query'), getAllOrders);

// GET /api/orders/:id - Get detail
router.get('/:id', authorize(1, 2, 3, 8), validate(idParamSchema, 'params'), getOrderById);

// POST /api/orders - Create (role-based: SuperAdmin, Admin, Sales)
router.post('/', authorize(1, 2, 3), validate(createOrderSchema), createOrder);

// PUT /api/orders/:id - Update
router.put('/:id', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateOrderSchema,
}), updateOrder);

// PATCH /api/orders/:id/status - Update status
router.patch('/:id/status', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateOrderStatusSchema,
}), updateOrderStatus);

// DELETE /api/orders/:id - Delete
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteOrder);

export default router;
