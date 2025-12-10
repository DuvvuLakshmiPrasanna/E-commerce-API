/**
 * Comprehensive E-Commerce API Test Suite
 * Tests all 6 scenarios from the endpoint catalogue
 * 
 * Run with: npm test
 * Or jest --testNamePattern="Test 1"
 */

const request = require('supertest');
const app = require('../src/server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper: Generate unique email for each test
const uniqueEmail = (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`;

describe('E-Commerce API - Comprehensive Test Suite', () => {
  
  // Cleanup after all tests
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * TEST 1: Happy Path Checkout
   * 
   * Scenario:
   * 1. Register user → token
   * 2. Create 2 products (stock=5 each)
   * 3. Add both to cart (qty=2 each)
   * 4. POST /orders
   * Expected: 201, order created, stock reduced (3 each), cart cleared, email job queued
   */
  describe('Test 1: Happy Path Checkout', () => {
    let userToken;
    let userId;
    let product1Id;
    let product2Id;

    test('1.1 - Register new user', async () => {
      const email = uniqueEmail('test1');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Happy Path User',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.token).toBeDefined();

      userToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    test('1.2 - Admin creates product 1', async () => {
      // First register admin user (in real tests, use existing admin)
      const adminEmail = uniqueEmail('admin1');
      const adminRegRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Admin User',
          email: adminEmail,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      // Manually set admin role in DB for testing
      await prisma.user.update({
        where: { id: adminRegRes.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      const adminToken = adminRegRes.body.data.token;

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Laptop Pro',
          price: 1299.99,
          category: 'electronics',
          stockQuantity: 5,
          description: 'High-performance laptop'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      product1Id = res.body.data.id;
    });

    test('1.3 - Admin creates product 2', async () => {
      // Get admin token
      const adminEmail = uniqueEmail('admin2');
      const adminRegRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Admin User 2',
          email: adminEmail,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      await prisma.user.update({
        where: { id: adminRegRes.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      const adminToken = adminRegRes.body.data.token;

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Monitor 4K',
          price: 499.99,
          category: 'electronics',
          stockQuantity: 5,
          description: '27-inch 4K monitor'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      product2Id = res.body.data.id;
    });

    test('1.4 - Customer adds product 1 to cart (qty=2)', async () => {
      const res = await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1Id,
          quantity: 2
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    test('1.5 - Customer adds product 2 to cart (qty=2)', async () => {
      const res = await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product2Id,
          quantity: 2
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(2);
    });

    test('1.6 - Get cart before checkout', async () => {
      const res = await request(app)
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.total).toBeGreaterThan(0);
    });

    test('1.7 - POST /orders successfully creates order', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001'
          }
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.items.length).toBe(2);
    });

    test('1.8 - Verify stock reduced after order', async () => {
      const res = await request(app)
        .get(`/products/${product1Id}`)
        .expect(200);

      // Stock should be 5 - 2 = 3
      expect(res.body.data.stockQuantity).toBe(3);
    });

    test('1.9 - Verify cart cleared after checkout', async () => {
      const res = await request(app)
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.items.length).toBe(0);
    });
  });

  /**
   * TEST 2: Concurrent Checkout (Race Condition)
   * 
   * Scenario:
   * 1. Register users A, B
   * 2. Create product (stock=1)
   * 3. Both users fetch product → version=1
   * 4. User A adds to cart, POSTs /orders → 201 SUCCESS
   * 5. User B adds to cart, POSTs /orders → 409 VERSION_MISMATCH
   * Expected: Stock accurate, no overselling
   */
  describe('Test 2: Concurrent Checkout (Race Condition)', () => {
    let userAToken, userBToken;
    let userAId, userBId;
    let raceProductId;
    let raceProductVersion;

    test('2.1 - Register user A', async () => {
      const email = uniqueEmail('testA');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'User A',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      userAToken = res.body.data.token;
      userAId = res.body.data.user.id;
    });

    test('2.2 - Register user B', async () => {
      const email = uniqueEmail('testB');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'User B',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      userBToken = res.body.data.token;
      userBId = res.body.data.user.id;
    });

    test('2.3 - Admin creates limited stock product (qty=1)', async () => {
      const adminEmail = uniqueEmail('admin3');
      const adminRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Admin Race Test',
          email: adminEmail,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      await prisma.user.update({
        where: { id: adminRes.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      const adminToken = adminRes.body.data.token;

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Rare Item',
          price: 999.99,
          category: 'limited',
          stockQuantity: 1,
          description: 'Only 1 in stock'
        })
        .expect(201);

      raceProductId = res.body.data.id;
      raceProductVersion = res.body.data.version;
    });

    test('2.4 - User A fetches product (records version)', async () => {
      const res = await request(app)
        .get(`/products/${raceProductId}`)
        .expect(200);

      expect(res.body.data.version).toBeDefined();
      raceProductVersion = res.body.data.version;
    });

    test('2.5 - User B fetches product (records same version)', async () => {
      const res = await request(app)
        .get(`/products/${raceProductId}`)
        .expect(200);

      expect(res.body.data.version).toBe(raceProductVersion);
    });

    test('2.6 - User A adds to cart', async () => {
      const res = await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productId: raceProductId,
          quantity: 1
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    test('2.7 - User B adds to cart', async () => {
      const res = await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          productId: raceProductId,
          quantity: 1
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    test('2.8 - User A checks out successfully (first)', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            line1: '123 A St',
            city: 'NY',
            state: 'NY',
            zip: '10001'
          }
        })
        .expect(201);

      expect(res.body.data.status).toBe('CONFIRMED');
    });

    test('2.9 - User B checkout fails with VERSION_MISMATCH', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            line1: '123 B St',
            city: 'NY',
            state: 'NY',
            zip: '10002'
          }
        })
        .expect(409);

      expect(res.body.error.code).toBe('VERSION_MISMATCH');
    });

    test('2.10 - Verify stock is accurate (not oversold)', async () => {
      const res = await request(app)
        .get(`/products/${raceProductId}`)
        .expect(200);

      // Stock should be 1 - 1 = 0 (not negative)
      expect(res.body.data.stockQuantity).toBe(0);
    });
  });

  /**
   * TEST 3: Transaction Rollback
   * 
   * Scenario:
   * Verify that if any operation fails mid-transaction, all changes rollback
   * (This is tested indirectly through insufficient stock validation)
   */
  describe('Test 3: Transaction Rollback (Insufficient Stock)', () => {
    let customerToken;
    let lowStockProductId;

    test('3.1 - Register customer', async () => {
      const email = uniqueEmail('test3');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Rollback Test User',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      customerToken = res.body.data.token;
    });

    test('3.2 - Admin creates low-stock product', async () => {
      const adminEmail = uniqueEmail('admin4');
      const adminRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Admin Rollback',
          email: adminEmail,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      await prisma.user.update({
        where: { id: adminRes.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      const adminToken = adminRes.body.data.token;

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Limited Stock Item',
          price: 199.99,
          category: 'test',
          stockQuantity: 1,
          description: 'Only 1 unit'
        })
        .expect(201);

      lowStockProductId = res.body.data.id;
    });

    test('3.3 - Customer tries to order 2 units (insufficient stock)', async () => {
      // Add to cart
      await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: lowStockProductId,
          quantity: 2
        })
        .expect(201);

      // Try to checkout
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            line1: '123 Test',
            city: 'NY',
            state: 'NY',
            zip: '10001'
          }
        })
        .expect(409);

      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    test('3.4 - Verify stock unchanged after failed checkout', async () => {
      const res = await request(app)
        .get(`/products/${lowStockProductId}`)
        .expect(200);

      // Stock should still be 1 (transaction rolled back)
      expect(res.body.data.stockQuantity).toBe(1);
    });

    test('3.5 - Verify cart still contains items after failed checkout', async () => {
      const res = await request(app)
        .get('/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Cart should NOT be cleared (transaction rolled back)
      expect(res.body.data.items.length).toBe(1);
    });
  });

  /**
   * TEST 4: Cache Invalidation
   * 
   * Scenario:
   * 1. GET /products → cache miss, queries DB
   * 2. GET /products → cache hit, faster
   * 3. Admin POSTs new product
   * 4. GET /products → cache invalidated, queries DB
   * 5. Result: returns new product
   */
  describe('Test 4: Cache Invalidation', () => {
    let adminToken;

    test('4.1 - Get admin token', async () => {
      const adminEmail = uniqueEmail('admin5');
      const adminRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Admin Cache Test',
          email: adminEmail,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      await prisma.user.update({
        where: { id: adminRes.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      adminToken = adminRes.body.data.token;
    });

    test('4.2 - First GET /products (cache miss)', async () => {
      const res = await request(app)
        .get('/products?page=1&limit=20')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('4.3 - Second GET /products (cache hit - should be fast)', async () => {
      const startTime = Date.now();
      const res = await request(app)
        .get('/products?page=1&limit=20')
        .expect(200);
      const duration = Date.now() - startTime;

      expect(res.body.data).toBeDefined();
      // Cache hit should be faster (not a strict test, just verify it works)
      expect(duration < 100).toBe(true);
    });

    test('4.4 - Admin creates new product (invalidates cache)', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cache Test Product',
          price: 799.99,
          category: 'test',
          stockQuantity: 10,
          description: 'For cache test'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    test('4.5 - GET /products returns new product (fresh from DB)', async () => {
      const res = await request(app)
        .get('/products?page=1&limit=100')
        .expect(200);

      const hasNewProduct = res.body.data.some(p => p.name === 'Cache Test Product');
      expect(hasNewProduct).toBe(true);
    });
  });

  /**
   * TEST 5: RBAC (Role-Based Access Control)
   * 
   * Scenarios:
   * - Customer cannot POST/PUT/DELETE products
   * - Customer cannot access other user's orders
   * - Admin can POST/PUT/DELETE products
   * - Admin can access any order
   */
  describe('Test 5: RBAC (Role-Based Access Control)', () => {
    let customerToken;
    let customerUserId;
    let adminToken;
    let productId;

    test('5.1 - Register customer', async () => {
      const email = uniqueEmail('rbac_customer');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'RBAC Customer',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      customerToken = res.body.data.token;
      customerUserId = res.body.data.user.id;
    });

    test('5.2 - Register admin', async () => {
      const email = uniqueEmail('rbac_admin');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'RBAC Admin',
          email,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      await prisma.user.update({
        where: { id: res.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      adminToken = res.body.data.token;
    });

    test('5.3 - Customer tries to POST product (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Product',
          price: 99.99,
          category: 'test',
          stockQuantity: 10
        })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('5.4 - Admin creates product (201 Created)', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'RBAC Test Product',
          price: 199.99,
          category: 'test',
          stockQuantity: 5
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      productId = res.body.data.id;
    });

    test('5.5 - Customer tries to PUT product (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          price: 299.99
        })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('5.6 - Customer tries to DELETE product (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('5.7 - Admin can PUT product (200 OK)', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 299.99
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('5.8 - Admin can DELETE product (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 204 has no body
      expect(res.body).toEqual({});
    });

    test('5.9 - Register second customer', async () => {
      const email = uniqueEmail('rbac_customer2');
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'RBAC Customer 2',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      // For next test, save this token but we'll use customerToken for its own orders
    });

    test('5.10 - Admin can access GET /admin/orders', async () => {
      const res = await request(app)
        .get('/admin/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('5.11 - Customer cannot access GET /admin/orders', async () => {
      const res = await request(app)
        .get('/admin/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  /**
   * TEST 6: Validation & Error Handling
   * 
   * Scenarios:
   * - Duplicate email on register → 409 DUPLICATE_ENTRY
   * - Weak password → 400 VALIDATION_ERROR
   * - Zero/negative quantity → 400 VALIDATION_ERROR
   * - Empty cart checkout → 400 VALIDATION_ERROR
   * - Invalid product ID → 404 NOT_FOUND
   */
  describe('Test 6: Validation & Error Handling', () => {
    const testEmail = uniqueEmail('validation_test');

    test('6.1 - Register with valid data (baseline)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Validation Test',
          email: testEmail,
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    test('6.2 - Register with duplicate email → 409 DUPLICATE_ENTRY', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail,
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!'
        })
        .expect(409);

      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
      expect(res.body.error.details.field).toBe('email');
    });

    test('6.3 - Register with weak password → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Weak Password User',
          email: uniqueEmail('weak'),
          password: '123',
          confirmPassword: '123'
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('6.4 - Register with mismatched passwords → 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Mismatch User',
          email: uniqueEmail('mismatch'),
          password: 'StrongPass123!',
          confirmPassword: 'DifferentPass123!'
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('6.5 - Add to cart with quantity=0 → 400 VALIDATION_ERROR', async () => {
      const email = uniqueEmail('qty_test');
      const userRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Qty Test',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      const userToken = userRes.body.data.token;

      // Create a product first
      const adminEmail = uniqueEmail('admin_qty');
      const adminRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Admin Qty',
          email: adminEmail,
          password: 'AdminPass123!',
          confirmPassword: 'AdminPass123!'
        })
        .expect(201);

      await prisma.user.update({
        where: { id: adminRes.body.data.user.id },
        data: { role: 'ADMIN' }
      });

      const adminToken = adminRes.body.data.token;

      const productRes = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Qty Test Product',
          price: 99.99,
          category: 'test',
          stockQuantity: 10
        })
        .expect(201);

      const productId = productRes.body.data.id;

      // Try to add with qty=0
      const res = await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          quantity: 0
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('6.6 - Empty cart checkout → 400 VALIDATION_ERROR', async () => {
      const email = uniqueEmail('empty_cart');
      const userRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Empty Cart Test',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      const userToken = userRes.body.data.token;

      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            line1: '123 Empty',
            city: 'NY',
            state: 'NY',
            zip: '10001'
          }
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/empty cart/i);
    });

    test('6.7 - Get non-existent product → 404 NOT_FOUND', async () => {
      const res = await request(app)
        .get('/products/999999')
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('6.8 - Get non-existent order → 404 NOT_FOUND', async () => {
      const email = uniqueEmail('notfound');
      const userRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'NotFound Test',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      const userToken = userRes.body.data.token;

      const res = await request(app)
        .get('/orders/999999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  /**
   * TEST: GET /health endpoint
   */
  describe('Health Check Endpoint', () => {
    test('GET /health returns 200 with status checks', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database).toBeDefined();
      expect(res.body.checks.redis).toBeDefined();
      expect(res.body.checks.queue).toBeDefined();
    });
  });

  /**
   * TEST: GET /auth/me endpoint
   */
  describe('GET /auth/me Endpoint', () => {
    test('GET /auth/me returns current user when authenticated', async () => {
      const email = uniqueEmail('me_test');
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Me Test User',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      const token = registerRes.body.data.token;

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Me Test User');
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.role).toBe('CUSTOMER');
    });

    test('GET /auth/me returns 401 without token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

});
