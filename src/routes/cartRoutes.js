// Cart routes
const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  addToCartValidationRules,
  updateCartItemValidationRules,
} = require('../controllers/CartController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');

// All routes require customer authentication
router.use(authenticate);
router.use(authorize('CUSTOMER', 'ADMIN'));

// GET /cart
router.get('/', getCart);

// POST /cart/items
router.post(
  '/items',
  addToCartValidationRules(),
  validateRequest,
  addToCart
);

// PUT /cart/items/:cartItemId
router.put(
  '/items/:cartItemId',
  updateCartItemValidationRules(),
  validateRequest,
  updateCartItem
);

// DELETE /cart/items/:cartItemId
router.delete('/items/:cartItemId', removeFromCart);

// DELETE /cart
router.delete('/', clearCart);

module.exports = router;
