// Cart controller
const { param, body } = require('express-validator');
const CartService = require('../services/CartService');

/**
 * Get user's cart
 * GET /cart
 */
const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cart = await CartService.getCart(userId);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart
 * POST /cart/items
 */
const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const cartItem = await CartService.addToCart(userId, parseInt(productId), parseInt(quantity));
    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: cartItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update item in cart
 * PUT /cart/items/:cartItemId
 */
const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    const updatedItem = await CartService.updateCartItem(userId, parseInt(cartItemId), parseInt(quantity));
    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 * DELETE /cart/items/:cartItemId
 */
const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    await CartService.removeFromCart(userId, parseInt(cartItemId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Clear cart
 * DELETE /cart
 */
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await CartService.clearCart(userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Validation rules for add to cart
 */
const addToCartValidationRules = () => [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a valid integer'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

/**
 * Validation rules for update cart item
 */
const updateCartItemValidationRules = () => [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  addToCartValidationRules,
  updateCartItemValidationRules,
};
