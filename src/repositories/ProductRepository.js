// Product repository
const prisma = require('../config/database');

class ProductRepository {
  async findAll(filters = {}) {
    const { category, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 10 } = filters;

    const where = {};
    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id) {
    return await prisma.product.findUnique({
      where: { id },
    });
  }

  async create(data) {
    return await prisma.product.create({
      data,
    });
  }

  async update(id, data) {
    return await prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return await prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Update product stock with optimistic locking
   * Returns the updated product or null if version mismatch
   */
  async updateStockWithVersionCheck(id, quantityChange, currentVersion) {
    return await prisma.product.updateMany({
      where: {
        id,
        version: currentVersion,
      },
      data: {
        stockQuantity: {
          increment: quantityChange,
        },
        version: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get product by ID with version info for optimistic locking
   */
  async findByIdWithVersion(id) {
    return await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        stockQuantity: true,
        version: true,
      },
    });
  }
}

module.exports = new ProductRepository();
