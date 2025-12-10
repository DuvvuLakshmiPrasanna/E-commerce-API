// Admin controller
const { body } = require('express-validator');
const AdminService = require('../services/AdminService');

/**
 * Get all orders (admin view with user details)
 * GET /admin/orders?page=1&limit=10&status=COMPLETED
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await AdminService.getAllOrders(
      parseInt(page) || 1,
      Math.min(parseInt(limit) || 10, 100),
      status || null
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (admin only)
 * PATCH /admin/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await AdminService.updateOrderStatus(
      parseInt(id),
      status,
      trackingNumber || null
    );

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validation rules for update order status
 */
const updateOrderStatusValidationRules = () => [
  body('status')
    .isIn(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid order status'),
  body('trackingNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tracking number cannot be empty'),
];

module.exports = {
  getAllOrders,
  updateOrderStatus,
  updateOrderStatusValidationRules,
};
