# Testing Guide

Complete testing scenarios for the E-Commerce API

## Quick Start Tests

### 1. Server Health Check

```bash
curl http://localhost:3000/health
```

Expected: `200 OK` with server status

---

## Full Testing Workflow

### Phase 1: Authentication Tests

#### Test 1.1: Register New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**Expected Response (201)**:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGc..."
  }
}
```

**Save**: `TOKEN`, `USER_ID`

#### Test 1.2: Register Duplicate Email

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**Expected Response (409)**: Conflict error - email already registered

#### Test 1.3: Login User

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected Response (200)**: JWT token returned

#### Test 1.4: Login with Wrong Password

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response (401)**: Unauthorized

---

### Phase 2: Product Management Tests

#### Test 2.1: Get All Products (Public)

```bash
curl http://localhost:3000/products
```

**Expected Response (200)**: Empty list initially

#### Test 2.2: Create Product (Admin Only)

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Laptop",
    "description": "High-performance gaming laptop",
    "price": 1299.99,
    "category": "electronics",
    "stockQuantity": 100
  }'
```

**Expected Response (201)**: Product created with ID

**Save**: `PRODUCT_ID`

#### Test 2.3: Create Product Without Admin Role

First create a customer user:

```bash
# Register as customer (default role)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer",
    "email": "customer@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

Then try to create product:

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "name": "Phone",
    "price": 599.99,
    "category": "electronics",
    "stockQuantity": 50
  }'
```

**Expected Response (403)**: Forbidden - insufficient permissions

#### Test 2.4: Get All Products with Filters

```bash
curl "http://localhost:3000/products?category=electronics&sortBy=price&sortOrder=asc&page=1&limit=10"
```

**Expected Response (200)**: Filtered products list with pagination

#### Test 2.5: Get Single Product

```bash
curl http://localhost:3000/products/1
```

**Expected Response (200)**: Product details

#### Test 2.6: Update Product

```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "price": 1199.99,
    "stockQuantity": 80
  }'
```

**Expected Response (200)**: Updated product

#### Test 2.7: Delete Product

```bash
curl -X DELETE http://localhost:3000/products/1 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response (200)**: Product deleted

#### Test 2.8: Get Non-Existent Product

```bash
curl http://localhost:3000/products/9999
```

**Expected Response (404)**: Not found

---

### Phase 3: Shopping Cart Tests

#### Test 3.1: Get Empty Cart

```bash
curl http://localhost:3000/cart \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (200)**: Cart with empty items array

#### Test 3.2: Add Item to Cart

```bash
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "productId": 1,
    "quantity": 2
  }'
```

**Expected Response (201)**: Cart item created

**Save**: `CART_ITEM_ID`

#### Test 3.3: Add Invalid Quantity

```bash
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "productId": 1,
    "quantity": 0
  }'
```

**Expected Response (400)**: Validation error

#### Test 3.4: Get Cart with Items

```bash
curl http://localhost:3000/cart \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (200)**: Cart with items and product details

#### Test 3.5: Remove Item from Cart

```bash
curl -X DELETE http://localhost:3000/cart/items/CART_ITEM_ID \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (200)**: Item removed

#### Test 3.6: Clear Cart

```bash
curl -X DELETE http://localhost:3000/cart \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (200)**: Cart cleared

---

### Phase 4: Order Processing Tests

#### Test 4.1: Create Order (Basic)

First, add items to cart:

```bash
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "productId": 1,
    "quantity": 2
  }'
```

Then create order:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (201)**:

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "totalPrice": "2599.98",
    "status": "COMPLETED",
    "items": [
      {
        "id": 1,
        "productId": 1,
        "quantity": 2,
        "priceAtPurchase": "1299.99"
      }
    ]
  }
}
```

**Verify**:

- Stock reduced: `stockQuantity` should be 98 (was 100)
- Cart cleared
- Email job queued (check worker output)

#### Test 4.2: Create Order with Empty Cart

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (400)**: Cart is empty

#### Test 4.3: Create Order with Insufficient Stock

Setup:

```bash
# Create product with stock = 1
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "Limited Edition",
    "price": 499.99,
    "category": "electronics",
    "stockQuantity": 1
  }'

# Save as PRODUCT_LIMITED_ID

# Add 2 items to cart
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "productId": PRODUCT_LIMITED_ID,
    "quantity": 2
  }'
```

Then try to order:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (400)**: Insufficient stock

#### Test 4.4: Get User Orders

```bash
curl http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (200)**: List of user's orders with pagination

#### Test 4.5: Get Order Details

```bash
curl http://localhost:3000/orders/1 \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

**Expected Response (200)**: Order with full details including items

#### Test 4.6: Get Another User's Order

Create second user and try to access first user's order:

```bash
curl http://localhost:3000/orders/1 \
  -H "Authorization: Bearer DIFFERENT_USER_TOKEN"
```

**Expected Response (403)**: Forbidden

---

### Phase 5: Race Condition Test (Optimistic Locking)

This is the most critical test for concurrency control.

#### Setup

```bash
# 1. Create product with quantity = 1
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "Last Item",
    "price": 99.99,
    "category": "electronics",
    "stockQuantity": 1
  }'
# Save as RACE_PRODUCT_ID

# 2. Create two customer accounts
# Account A:
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer A",
    "email": "customer.a@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
# Save TOKEN_A and USER_ID_A

# Account B:
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer B",
    "email": "customer.b@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
# Save TOKEN_B and USER_ID_B

# 3. Both add item to cart
# Customer A:
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_A" \
  -d '{
    "productId": RACE_PRODUCT_ID,
    "quantity": 1
  }'

# Customer B:
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_B" \
  -d '{
    "productId": RACE_PRODUCT_ID,
    "quantity": 1
  }'
```

#### Test: Concurrent Checkout

Open two terminals and execute these commands almost simultaneously (within 1 second):

**Terminal 1 (Customer A)**:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer TOKEN_A"
```

**Terminal 2 (Customer B)**:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer TOKEN_B"
```

#### Expected Results

**One request succeeds (201)**:

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": ...,
    "status": "COMPLETED",
    ...
  }
}
```

**One request fails (409 Conflict)**:

```json
{
  "success": false,
  "code": "VERSION_MISMATCH",
  "message": "Product Last Item was modified. Please refresh and try again."
}
```

#### Verify

```bash
# Check stock was updated correctly
curl http://localhost:3000/products/RACE_PRODUCT_ID

# Should show: stockQuantity = 0 (not -1)
```

---

### Phase 6: Error Handling Tests

#### Test 6.1: Missing Authentication Token

```bash
curl http://localhost:3000/cart
```

**Expected Response (401)**: No token provided

#### Test 6.2: Invalid Token

```bash
curl http://localhost:3000/cart \
  -H "Authorization: Bearer invalid.token.here"
```

**Expected Response (401)**: Invalid token

#### Test 6.3: Expired Token

(Manually change JWT_EXPIRATION to "1s" and wait)

**Expected Response (401)**: Token has expired

#### Test 6.4: Missing Required Fields

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test"
  }'
```

**Expected Response (400)**: Validation error - missing email and password

#### Test 6.5: Invalid Email Format

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "not-an-email",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**Expected Response (400)**: Invalid email format

#### Test 6.6: Password Too Short

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "password": "123",
    "confirmPassword": "123"
  }'
```

**Expected Response (400)**: Password must be at least 6 characters

#### Test 6.7: Passwords Don't Match

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "different"
  }'
```

**Expected Response (400)**: Passwords do not match

---

### Phase 7: Caching Tests

#### Test 7.1: Check Cache Hit

```bash
# First request (cache miss)
time curl http://localhost:3000/products?category=electronics
# Note the response time

# Second request (cache hit)
time curl http://localhost:3000/products?category=electronics
# Should be faster
```

#### Test 7.2: Cache Invalidation

```bash
# Add product (should invalidate cache)
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "New Product",
    "price": 299.99,
    "category": "electronics",
    "stockQuantity": 50
  }'

# Verify new product in list
curl http://localhost:3000/products?category=electronics
```

---

### Phase 8: Async Jobs Test

#### Check Email Queue

```bash
# Create order to trigger email job
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# Check worker terminal for job processing
# Should see logs like:
# "Processing email job for order 1..."
# "✓ Email notification for order 1 would be sent to customer@example.com"
```

---

## Testing Checklist

### Functionality Tests

- [ ] User Registration
- [ ] User Login
- [ ] Product CRUD (Admin)
- [ ] Product List (Public)
- [ ] Cart Operations
- [ ] Order Creation
- [ ] Order History
- [ ] Email Notifications

### Authorization Tests

- [ ] Unauthorized access (401)
- [ ] Forbidden access (403)
- [ ] Admin-only endpoints
- [ ] Customer-only endpoints
- [ ] Cross-user access prevention

### Validation Tests

- [ ] Missing required fields
- [ ] Invalid data types
- [ ] Invalid email format
- [ ] Password requirements
- [ ] Quantity validation

### Concurrency Tests

- [ ] Race condition (optimistic locking)
- [ ] Stock accuracy
- [ ] No overselling
- [ ] Transaction rollback

### Caching Tests

- [ ] Cache hits on repeated requests
- [ ] Cache invalidation on updates
- [ ] Redis connectivity

### Error Handling Tests

- [ ] 400 Bad Request
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 409 Conflict (version mismatch)
- [ ] 500 Server Error

### Performance Tests

- [ ] Query response times
- [ ] Pagination performance
- [ ] Large data sets
- [ ] Concurrent connections

---

## Continuous Integration

For CI/CD pipelines, run:

```bash
npm test
npm run test:coverage
```

---

**Last Updated**: December 9, 2025
