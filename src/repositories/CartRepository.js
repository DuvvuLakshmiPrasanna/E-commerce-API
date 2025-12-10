// Cart repository
const prisma = require('../config/database');

class CartRepository {
  async findByUserId(userId) {
    return await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getOrCreateCart(userId) {
    return await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async addItem(userId, productId, quantity) {
    const cart = await this.getOrCreateCart(userId);

    return await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      include: {
        product: true,
      },
    });
  }

  async updateItem(cartId, cartItemId, quantity) {
    return await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: {
        product: true,
      },
    });
  }

  async removeItem(cartId, cartItemId) {
    return await prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async clearCart(cartId) {
    return await prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async getCartItems(cartId) {
    return await prisma.cartItem.findMany({
      where: { cartId },
      include: {
        product: true,
      },
    });
  }
}

module.exports = new CartRepository();
