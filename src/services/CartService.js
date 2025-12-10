// Cart service
const CartRepository = require('../repositories/CartRepository');
const ProductRepository = require('../repositories/ProductRepository');
const { NotFoundError, ValidationError, InsufficientStockError } = require('../utils/errors');

class CartService {
  /**
   * Get user's cart
   */
  async getCart(userId) {
    const cart = await CartRepository.getOrCreateCart(userId);
    return cart;
  }

  /**
   * Add item to cart
   */
  async addToCart(userId, productId, quantity) {
    // Validate quantity
    if (!quantity || quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    // Check if product exists
    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Add to cart
    const cartItem = await CartRepository.addItem(userId, productId, quantity);

    return cartItem;
  }

  /**
   * Update item quantity in cart
   */
  async updateCartItem(userId, cartItemId, quantity) {
    // Validate quantity
    if (!quantity || quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    // Get cart to verify ownership
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    const cartItem = cart.items.find((item) => item.id === cartItemId);
    if (!cartItem) {
      throw new NotFoundError('Cart item not found');
    }

    // Check stock availability
    const product = await ProductRepository.findById(cartItem.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (quantity > product.stockQuantity) {
      throw new InsufficientStockError(
        product.id,
        product.stockQuantity,
        quantity
      );
    }

    // Update the cart item
    const updatedItem = await CartRepository.updateItem(cart.id, cartItemId, quantity);

    return updatedItem;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId, cartItemId) {
    // Get cart to verify ownership
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    const cartItem = cart.items.find((item) => item.id === cartItemId);
    if (!cartItem) {
      throw new NotFoundError('Cart item not found');
    }

    // Remove item
    await CartRepository.removeItem(cart.id, cartItemId);

    return { message: 'Item removed from cart' };
  }

  /**
   * Clear cart
   */
  async clearCart(userId) {
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    await CartRepository.clearCart(cart.id);

    return { message: 'Cart cleared' };
  }

  /**
   * Validate cart for checkout (check stock availability)
   */
  async validateCartForCheckout(cartId) {
    const cartItems = await CartRepository.getCartItems(cartId);

    if (cartItems.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    // Check stock for all items
    for (const item of cartItems) {
      if (item.quantity > item.product.stockQuantity) {
        throw new InsufficientStockError(
          item.product.id,
          item.product.stockQuantity,
          item.quantity
        );
      }
    }

    return cartItems;
  }
}

module.exports = new CartService();
