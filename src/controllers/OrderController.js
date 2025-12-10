// Order controller
const OrderService = require('../services/OrderService');

/**
 * Create order from cart items
 * POST /orders
 */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const order = await OrderService.createOrder(userId);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 * GET /orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(parseInt(id));

    // Verify user owns this order
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's orders
 * GET /orders?page=1&limit=10
 */
const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;

    const result = await OrderService.getUserOrders(userId, parseInt(page) || 1, parseInt(limit) || 10);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
};
