// Admin routes
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const AdminController = require('../controllers/AdminController');

// All routes require ADMIN authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /admin/orders - Get all orders (admin view)
router.get('/orders', AdminController.getAllOrders);

// PATCH /admin/orders/:id/status - Update order status
router.patch(
  '/orders/:id/status',
  AdminController.updateOrderStatusValidationRules(),
  validateRequest,
  AdminController.updateOrderStatus
);

module.exports = router;
