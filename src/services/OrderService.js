// Order service - Core transactional logic
const prisma = require('../config/database');
const CartRepository = require('../repositories/CartRepository');
const ProductRepository = require('../repositories/ProductRepository');
const OrderRepository = require('../repositories/OrderRepository');
const CartService = require('./CartService');
const { emailQueue } = require('../config/queue');
const {
  NotFoundError,
  ValidationError,
  VersionMismatchError,
  InsufficientStockError,
} = require('../utils/errors');

class OrderService {
  /**
   * Create order with ACID transaction and optimistic locking
   * Steps:
   * 1. Validate cart and stock
   * 2. Update product stock with version check (optimistic locking)
   * 3. Create order and order items
   * 4. Clear cart
   * If any step fails, entire transaction rolls back
   */
  async createOrder(userId) {
    // Get user's cart
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    // Validate cart for checkout
    const cartItems = await CartService.validateCartForCheckout(cart.id);

    // Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      throw new ValidationError('Cannot checkout with empty cart');
    }

    // Fetch current product data with version info
    const productVersions = {};
    for (const item of cartItems) {
      const product = await ProductRepository.findByIdWithVersion(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`);
      }
      productVersions[item.productId] = product;
    }

    // TRANSACTION START
    const transaction = await prisma.$transaction(async (tx) => {
      let totalPrice = 0;
      const orderItems = [];

      // Step 1: Update stock for each product with optimistic locking
      for (const item of cartItems) {
        const product = productVersions[item.productId];

        // Attempt optimistic locking update with stock check
        // Only decrement if version still matches AND stockQuantity >= requested quantity
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: product.version,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
            version: {
              increment: 1,
            },
          },
        });

        // Prisma returns { count: number } for updateMany
        if (!updateResult || updateResult.count === 0) {
          // Re-read current product inside the transaction to determine cause
          const current = await tx.product.findUnique({ where: { id: item.productId } });
          if (!current) {
            throw new NotFoundError(`Product ${item.productId} not found during checkout`);
          }

          if (current.version !== product.version) {
            throw new VersionMismatchError(
              `Product ${product.name} was modified. Please refresh and try again.`
            );
          }

          if (current.stockQuantity < item.quantity) {
            throw new InsufficientStockError(
              `Insufficient stock for ${product.name}. Available: ${current.stockQuantity}`
            );
          }

          // Fallback generic error
          throw new VersionMismatchError(
            `Failed to update product ${product.name}. Please retry.`
          );
        }

        // Calculate total price and prepare order item
        const itemTotal = Number(parseFloat(product.price) * item.quantity);
        totalPrice += itemTotal;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: product.price,
        });
      }

      // Step 2: Create order
      const order = await tx.order.create({
        data: {
          userId,
          totalPrice: Number(totalPrice.toFixed(2)),
          status: 'COMPLETED',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Step 3: Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    // TRANSACTION END

    // Queue email notification (non-blocking)
    try {
      await emailQueue.add('sendOrderConfirmation', {
        orderId: transaction.id,
        userId: transaction.userId,
        userEmail: transaction.user.email,
        userName: transaction.user.name,
        totalPrice: transaction.totalPrice,
        itemCount: transaction.items.length,
      });
    } catch (error) {
      console.error('Failed to queue email:', error.message);
      // Don't fail the order if email queueing fails
    }

    return transaction;
  }

  /**
   * Get order by ID
   */
  async getOrderById(id) {
    const order = await OrderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, page = 1, limit = 10) {
    return await OrderRepository.findByUserId(userId, page, limit);
  }
}

module.exports = new OrderService();
