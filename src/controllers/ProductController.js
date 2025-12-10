// Product controller
const { query, param, body } = require('express-validator');
const ProductService = require('../services/ProductService');

/**
 * Get all products with filtering and pagination
 * GET /products?category=electronics&sortBy=price&sortOrder=asc&page=1&limit=10
 */
const getProducts = async (req, res, next) => {
  try {
    const { category, sortBy, sortOrder, page, limit } = req.query;

    const filters = {
      category: category || null,
      sortBy: sortBy || 'name',
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 10, 100),
    };

    const result = await ProductService.getProducts(filters);
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
 * Get single product by ID
 * GET /products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductService.getProductById(parseInt(id));
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product (Admin only)
 * POST /products
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Admin only)
 * PUT /products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductService.updateProduct(parseInt(id), req.body);
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (Admin only)
 * DELETE /products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ProductService.deleteProduct(parseInt(id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Validation rules for create/update product
 */
const createProductValidationRules = () => [
  body('name').notEmpty().trim().withMessage('Product name is required'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),
  body('category').notEmpty().trim().withMessage('Category is required'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('description').optional().trim(),
];

const updateProductValidationRules = () => [
  body('name').optional().notEmpty().trim().withMessage('Product name cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),
  body('category')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Category cannot be empty'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('description').optional().trim(),
];

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductValidationRules,
  updateProductValidationRules,
};
