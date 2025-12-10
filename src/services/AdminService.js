// Admin service
const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

class AdminService {
  /**
   * Get all orders with user details (admin view)
   */
  async getAllOrders(page = 1, limit = 10, status = null) {
    const where = {};
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, trackingNumber = null) {
    // Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        // You could add tracking number field if needed
        // trackingNumber: trackingNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    // Queue notification job if status is SHIPPED
    if (status === 'SHIPPED') {
      try {
        const { emailQueue } = require('../config/queue');
        await emailQueue.add('sendShippingNotification', {
          orderId: updatedOrder.id,
          userEmail: updatedOrder.user.email,
          userName: updatedOrder.user.name,
          trackingNumber: trackingNumber || 'N/A',
        });
      } catch (error) {
        console.error('Failed to queue shipping notification:', error.message);
      }
    }

    return updatedOrder;
  }
}

module.exports = new AdminService();
