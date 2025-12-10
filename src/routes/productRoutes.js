// Product routes
const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductValidationRules,
  updateProductValidationRules,
} = require('../controllers/ProductController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');

// GET /products - Public
router.get('/', getProducts);

// GET /products/:id - Public
router.get('/:id', getProductById);

// POST /products - Admin only
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  createProductValidationRules(),
  validateRequest,
  createProduct
);

// PUT /products/:id - Admin only
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  updateProductValidationRules(),
  validateRequest,
  updateProduct
);

// DELETE /products/:id - Admin only
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  deleteProduct
);

module.exports = router;
