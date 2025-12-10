// Product service
const ProductRepository = require('../repositories/ProductRepository');
const { NotFoundError, ValidationError } = require('../utils/errors');
const redis = require('../config/redis');

const CACHE_PREFIX = 'products:';
const CACHE_TTL = 3600; // 1 hour

class ProductService {
  /**
   * Get all products with caching
   */
  async getProducts(filters) {
    // Create cache key from filters
    const cacheKey = `${CACHE_PREFIX}list:${JSON.stringify(filters)}`;

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log('[Cache Hit] Products fetched from Redis:', cacheKey);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis get error:', error.message);
    }

    // Get from database
    console.log('[DB Hit] Products fetched from database:', cacheKey);
    const result = await ProductRepository.findAll(filters);

    // Cache the result
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      console.warn('Redis set error:', error.message);
    }

    return result;
  }

  /**
   * Get single product by ID
   */
  async getProductById(id) {
    const product = await ProductRepository.findById(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  /**
   * Create new product (Admin only)
   */
  async createProduct(data) {
    const { name, price, category, stockQuantity } = data;

    // Validation
    if (!name || !price || !category) {
      throw new ValidationError('Name, price, and category are required');
    }

    if (price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    if (stockQuantity < 0) {
      throw new ValidationError('Stock quantity cannot be negative');
    }

    const product = await ProductRepository.create({
      name,
      price: parseFloat(price),
      category,
      stockQuantity: parseInt(stockQuantity) || 0,
      version: 0,
    });

    // Invalidate cache
    await this.invalidateCache();

    return product;
  }

  /**
   * Update product (Admin only)
   */
  async updateProduct(id, data) {
    // Check if product exists
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Validate data
    if (data.price && data.price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    if (data.stockQuantity !== undefined && data.stockQuantity < 0) {
      throw new ValidationError('Stock quantity cannot be negative');
    }

    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.price) updateData.price = parseFloat(data.price);
    if (data.category) updateData.category = data.category;
    if (data.stockQuantity !== undefined) updateData.stockQuantity = parseInt(data.stockQuantity);

    const updated = await ProductRepository.update(id, updateData);

    // Invalidate cache
    await this.invalidateCache();

    return updated;
  }

  /**
   * Delete product (Admin only)
   */
  async deleteProduct(id) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await ProductRepository.delete(id);

    // Invalidate cache
    await this.invalidateCache();

    return { message: 'Product deleted successfully' };
  }

  /**
   * Invalidate all product caches
   */
  async invalidateCache() {
    try {
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log('[Cache Invalidated] Cleared ' + keys.length + ' product cache keys');
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error.message);
    }
  }
}

module.exports = new ProductService();
