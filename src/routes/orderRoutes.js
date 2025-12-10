// Order routes
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getUserOrders,
} = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// POST /orders - Create order from cart
router.post('/', authorize('CUSTOMER', 'ADMIN'), createOrder);

// GET /orders - Get user's orders
router.get('/', authorize('CUSTOMER', 'ADMIN'), getUserOrders);

// GET /orders/:id - Get single order
router.get('/:id', authorize('CUSTOMER', 'ADMIN'), getOrderById);

module.exports = router;
