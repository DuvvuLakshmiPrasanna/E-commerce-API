# E-Commerce API - Complete Endpoint Catalogue

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: December 9, 2025

This document is the source of truth for all API endpoints, matching the developer-ready endpoint catalogue specification.

---

## 📋 TABLE OF CONTENTS

1. [Authentication Endpoints](#-authentication-phase-4)
2. [Product Endpoints](#-product-module-phase-5)
3. [Cart Endpoints](#-cart-module-phase-6)
4. [Order Endpoints](#-order-processing-phase-7)
5. [Admin Endpoints](#-admin-only-actions-rbac-phase-4--5)
6. [Async Jobs](#-async-jobs--worker-phase-8)
7. [Miscellaneous](#-misc--infra--dev-endpoints-phase-1--11)
8. [Error Formatting](#-error-formatting-global-phase-9)
9. [Test Cases](#-test-cases-you-must-have-phase-12)

---

## 🟢 AUTHENTICATION (Phase 4)

### 1) Register

- **Method**: `POST`
- **Path**: `/auth/register`
- **Auth**: Public (no token required)

**Request Body**:

```json
{
  "name": "Prasanna Yadav",
  "email": "prasanna@example.com",
  "password": "VeryStr0ng!",
  "confirmPassword": "VeryStr0ng!"
}
```

**Success Response (201 Created)**:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 17,
      "name": "Prasanna Yadav",
      "email": "prasanna@example.com",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

**Error Responses**:

- `400 Bad Request` — validation failure (missing fields / weak password)
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [...]
    }
  }
  ```
- `409 Conflict` — email already exists
  ```json
  {
    "error": {
      "code": "DUPLICATE_ENTRY",
      "message": "A email with this value already exists",
      "details": { "field": "email" }
    }
  }
  ```

**Implementation Notes**:

- Hash password using bcryptjs (10 salt rounds)
- Validate email format using regex/express-validator
- Validate password strength: minimum 6 characters
- Confirm password matches password
- Default role: `CUSTOMER`
- Generate JWT token with 24-hour expiration
- JWT payload: `{ id, email, role, iat, exp }`

---

### 2) Login

- **Method**: `POST`
- **Path**: `/auth/login`
- **Auth**: Public

**Request Body**:

```json
{
  "email": "prasanna@example.com",
  "password": "VeryStr0ng!"
}
```

**Success Response (200 OK)**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 17,
      "name": "Prasanna Yadav",
      "email": "prasanna@example.com",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

**Error Responses**:

- `400 Bad Request` — missing fields
- `401 Unauthorized` — wrong credentials
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Invalid email or password"
    }
  }
  ```

**Implementation Notes**:

- Validate email format
- Compare password with bcryptjs
- Return same JWT format as register
- Consistent error message for both email not found and wrong password

---

### 3) Get Current User

- **Method**: `GET`
- **Path**: `/auth/me`
- **Auth**: Bearer JWT (required)
- **RBAC**: None (any authenticated user)

**Headers**:

```
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": 17,
    "name": "Prasanna Yadav",
    "email": "prasanna@example.com",
    "role": "CUSTOMER"
  }
}
```

**Error Responses**:

- `401 Unauthorized` — token invalid/expired
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Invalid token" or "Token has expired"
    }
  }
  ```

**Implementation Notes**:

- Validate JWT from Authorization header
- Extract user ID from token payload
- Fetch fresh user data from database
- Return user details without password

---

## 🟦 PRODUCT MODULE (Phase 5)

> Public listing uses Redis cache (cache-aside pattern). Admin changes invalidate cache keys.

### 4) List Products (Paginated + Filters + Sorting)

- **Method**: `GET`
- **Path**: `/products`
- **Auth**: Public
- **Query Parameters**:
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20, max: 100)
  - `category` (optional) — filter by category
  - `sort` (optional) — sort field (name, price, createdAt)
  - `order` (optional) — asc or desc

**Request Example**:

```
GET /products?page=1&limit=20&category=electronics&sort=price&order=asc
```

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 9,
      "name": "Phone X",
      "price": 299.99,
      "stockQuantity": 5,
      "category": "electronics",
      "description": "Latest smartphone",
      "version": 1,
      "createdAt": "2025-12-09T10:00:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 123,
    "page": 1,
    "limit": 20,
    "pages": 7
  }
}
```

**Error Responses**:

- `400 Bad Request` — invalid query parameters

**Implementation Notes**:

- Cache key: `products:page={page}:limit={limit}:category={category}:sort={sort}:order={order}`
- TTL: 300 seconds (5 minutes)
- Cache-aside pattern: check Redis → if miss, query DB → set Redis → return
- Graceful degradation if Redis unavailable (continue to DB)
- Index on `category`, `name` for fast queries
- Limit maximum results per page to 100
- Sort options: name, price, createdAt (case-insensitive)

---

### 5) Get Single Product

- **Method**: `GET`
- **Path**: `/products/:id`
- **Auth**: Public

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": 9,
    "name": "Phone X",
    "price": 299.99,
    "stockQuantity": 5,
    "category": "electronics",
    "description": "...",
    "version": 1,
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

**Error Responses**:

- `404 Not Found`

---

### 6) Create Product (ADMIN)

- **Method**: `POST`
- **Path**: `/products`
- **Auth**: Bearer JWT **ADMIN**
- **RBAC**: Requires ADMIN role

**Request Body**:

```json
{
  "name": "Phone X",
  "price": 299.99,
  "category": "electronics",
  "stockQuantity": 50,
  "description": "Latest smartphone model"
}
```

**Success Response (201 Created)**:

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 101,
    "name": "Phone X",
    "price": 299.99,
    "stockQuantity": 50,
    "category": "electronics",
    "version": 0,
    "createdAt": "2025-12-09T18:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request` — validation failure
- `401 Unauthorized` — no token
- `403 Forbidden` — not ADMIN

**Implementation Notes**:

- Validate: name, price > 0, category, stockQuantity >= 0
- Initialize `version` field to 0 (not required in request)
- On success: invalidate all product list caches (`products:*`)
- On success: cache single product result with 300s TTL

---

### 7) Update Product (ADMIN)

- **Method**: `PUT`
- **Path**: `/products/:id`
- **Auth**: ADMIN
- **Concurrency Control**: Supports optimistic locking via `version` field

**Request Body** (all fields optional, but version can be included for optimistic locking):

```json
{
  "name": "Phone X Pro",
  "price": 329.99,
  "stockQuantity": 48,
  "description": "Updated description",
  "version": 2
}
```

**Success Response (200 OK)**:

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 101,
    "name": "Phone X Pro",
    "price": 329.99,
    "stockQuantity": 48,
    "version": 3,
    "category": "electronics",
    "updatedAt": "2025-12-09T19:00:00Z"
  }
}
```

**Error Responses**:

- `409 Conflict` — version mismatch (optimistic locking failure)
  ```json
  {
    "error": {
      "code": "VERSION_MISMATCH",
      "message": "Product was modified. Please refresh and try again."
    }
  }
  ```
- `404 Not Found` — product doesn't exist
- `400 Bad Request` — validation error
- `401` / `403`

**Implementation Notes**:

- If `version` provided: use optimistic locking
  - UPDATE: `SET ... WHERE id = :id AND version = :expectedVersion`
  - Increment version: `version = version + 1`
  - If affected rows = 0 → `409 Conflict` with VERSION_MISMATCH
- If `version` not provided: allow unconditional update
- On success: invalidate caches (`products:*`)
- Validate price > 0, stockQuantity >= 0

---

### 8) Delete Product (ADMIN)

- **Method**: `DELETE`
- **Path**: `/products/:id`
- **Auth**: ADMIN

**Success Response (204 No Content)** — no body returned

**Error Responses**:

- `404 Not Found`
- `403 Forbidden`

**Implementation Notes**:

- Invalidate all product caches (`products:*`)
- Consider soft-delete if product has order history
- Return 204 (not 200) for successful DELETE

---

## 🟫 CART MODULE (Phase 6)

> Cart items stored per user; cart does NOT alter stock until order placement.

### 9) Add Item to Cart

- **Method**: `POST`
- **Path**: `/cart/items`
- **Auth**: Bearer JWT **CUSTOMER**
- **RBAC**: Customer or Admin

**Request Body**:

```json
{
  "productId": 9,
  "quantity": 1
}
```

**Success Response (201 Created)**:

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cartId": 23,
    "items": [
      {
        "id": 7,
        "productId": 9,
        "quantity": 1,
        "name": "Phone X",
        "price": 299.99,
        "subtotal": 299.99
      }
    ]
  }
}
```

**Error Responses**:

- `400 Bad Request` — invalid quantity (< 1)
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Quantity must be at least 1"
    }
  }
  ```
- `404 Not Found` — product doesn't exist

**Implementation Notes**:

- Validate quantity >= 1
- Do NOT change product stock at this point
- If product already in cart: upsert quantity (increment)
- Create cart if doesn't exist
- Return full updated cart

---

### 10) Get Cart

- **Method**: `GET`
- **Path**: `/cart`
- **Auth**: CUSTOMER
- **RBAC**: Customer or Admin

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "cartId": 23,
    "items": [
      {
        "id": 7,
        "productId": 9,
        "quantity": 1,
        "name": "Phone X",
        "price": 299.99,
        "subtotal": 299.99
      },
      {
        "id": 8,
        "productId": 10,
        "quantity": 2,
        "name": "Phone Y",
        "price": 199.99,
        "subtotal": 399.98
      }
    ],
    "total": 699.97
  }
}
```

**Error Responses**:

- `401 Unauthorized`

---

### 11) Remove Item from Cart

- **Method**: `DELETE`
- **Path**: `/cart/items/:itemId`
- **Auth**: CUSTOMER

**Success Response (204 No Content)** — no body

**Error Responses**:

- `404 Not Found` — item not in cart

---

### 12) Clear Cart

- **Method**: `DELETE`
- **Path**: `/cart`
- **Auth**: CUSTOMER

**Success Response (204 No Content)** — no body

---

## 🟥 ORDER PROCESSING (Phase 7)

> **CRITICAL**: All order operations are wrapped in **ACID transactions** with **optimistic locking** for concurrent access.

### 13) Create Order (Checkout)

- **Method**: `POST`
- **Path**: `/orders`
- **Auth**: Bearer JWT **CUSTOMER**
- **RBAC**: Customer or Admin

**Request Body**:

```json
{
  "paymentMethod": "COD",
  "shippingAddress": {
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  }
}
```

**Success Response (201 Created)**:

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 501,
    "userId": 17,
    "status": "CONFIRMED",
    "totalPrice": 599.98,
    "items": [
      {
        "productId": 9,
        "name": "Phone X",
        "quantity": 2,
        "priceAtPurchase": 299.99,
        "subtotal": 599.98
      }
    ],
    "createdAt": "2025-12-09T19:05:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request` — empty cart or validation failure

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Cannot checkout with empty cart"
    }
  }
  ```

- `409 Conflict` — stock issue or version mismatch (race condition)

  ```json
  {
    "error": {
      "code": "VERSION_MISMATCH",
      "message": "Concurrent modification detected for product 9",
      "details": { "productId": 9 }
    }
  }
  ```

  OR

  ```json
  {
    "error": {
      "code": "INSUFFICIENT_STOCK",
      "message": "Insufficient stock for product 9",
      "details": { "productId": 9, "available": 1, "requested": 2 }
    }
  }
  ```

- `422 Unprocessable Entity` — domain validation error
- `500 Internal Server Error` — transaction failed

**Implementation Notes (MUST be atomic)**:

1. **Start DB transaction** (`prisma.$transaction`)
2. **Load cart items** for user
3. **Validate cart is not empty** → if empty, throw ValidationError
4. **For each product**:
   - Fetch current `stock_quantity` and `version`
   - Validate `stock_quantity >= requested_quantity`
   - If not: rollback → return `409` with INSUFFICIENT_STOCK code
5. **For each product, execute optimistic-lock update**:
   ```sql
   UPDATE products
   SET stock_quantity = stock_quantity - :qty,
       version = version + 1
   WHERE id = :id
     AND version = :expectedVersion
     AND stock_quantity >= :qty
   ```
   - If affected rows === 0 for ANY product → rollback → return `409 CONFLICT` with VERSION_MISMATCH code
6. **Create Order record** with status CONFIRMED
7. **Create OrderItem rows** with `priceAtPurchase` snapshot
8. **Clear user's cart** (delete all CartItems)
9. **Commit transaction**
10. **After commit** (non-blocking):
    - Enqueue async job `sendOrderConfirmationEmail`
    - Return 201 response immediately (do NOT wait for email)

**Concurrency Test Scenario**:

```
Time 1: User A fetches product (id=9, stock=1, version=5)
Time 2: User B fetches product (id=9, stock=1, version=5)
Time 3: User A places order → optimistic lock UPDATE version 5→6 ✅ SUCCESS (201)
Time 4: User B places order → UPDATE version 5→6 ❌ FAILS (409 VERSION_MISMATCH)
Result: No overselling, stock is accurate (0), only User A's order created
```

---

### 14) Get Order by ID

- **Method**: `GET`
- **Path**: `/orders/:id`
- **Auth**: CUSTOMER (owner) or ADMIN
- **RBAC**: Customer can only view own orders; ADMIN can view any

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": 501,
    "status": "CONFIRMED",
    "totalPrice": 599.98,
    "items": [
      {
        "productId": 9,
        "name": "Phone X",
        "quantity": 2,
        "priceAtPurchase": 299.99
      }
    ],
    "createdAt": "2025-12-09T19:05:00Z"
  }
}
```

**Error Responses**:

- `403 Forbidden` — customer trying to view other user's order
- `404 Not Found` — order doesn't exist

---

### 15) List User Orders

- **Method**: `GET`
- **Path**: `/orders`
- **Auth**: CUSTOMER
- **RBAC**: Returns only current user's orders (ADMIN can query admin endpoint)
- **Query Parameters**:
  - `page` (optional, default: 1)
  - `limit` (optional, default: 10, max: 100)

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "status": "CONFIRMED",
      "totalPrice": 599.98,
      "items": [...],
      "createdAt": "2025-12-09T19:05:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

---

## 🟣 ADMIN-ONLY ACTIONS (RBAC, Phase 4 & 5)

> Requires ADMIN role. All endpoints mounted at `/admin`.

### 16) Admin: List All Orders

- **Method**: `GET`
- **Path**: `/admin/orders`
- **Auth**: ADMIN
- **Query Parameters**:
  - `page` (optional, default: 1)
  - `limit` (optional, default: 10)
  - `status` (optional) — filter by PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED

**Request Example**:

```
GET /admin/orders?page=1&limit=20&status=SHIPPED
```

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "userId": 17,
      "user": {
        "id": 17,
        "name": "Prasanna Yadav",
        "email": "prasanna@example.com"
      },
      "status": "SHIPPED",
      "totalPrice": 599.98,
      "items": [...],
      "createdAt": "2025-12-09T19:05:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

### 17) Admin: Update Order Status

- **Method**: `PATCH`
- **Path**: `/admin/orders/:id/status`
- **Auth**: ADMIN

**Request Body**:

```json
{
  "status": "SHIPPED",
  "trackingNumber": "TN12345"
}
```

**Success Response (200 OK)**:

```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": 501,
    "status": "SHIPPED",
    "totalPrice": 599.98,
    "items": [...],
    "updatedAt": "2025-12-09T19:10:00Z"
  }
}
```

**Error Responses**:

- `404 Not Found` — order doesn't exist
- `400 Bad Request` — invalid status

**Valid Status Values**:

- PENDING
- CONFIRMED
- SHIPPED
- DELIVERED
- CANCELLED

**Implementation Notes**:

- On status → SHIPPED: enqueue async job `sendShippingNotification` with trackingNumber
- Include trackingNumber in job payload for notification

---

## 🟠 ASYNC JOBS & WORKER (Phase 8)

> Jobs are triggered by actions (order created, status changed). Worker consumes jobs from Redis queue (BullMQ).

### 18) Job: sendOrderConfirmationEmail

- **Trigger**: After `POST /orders` transaction commits
- **Queue**: email-notifications (BullMQ)
- **Payload**:

  ```json
  {
    "orderId": 501,
    "userId": 17,
    "userEmail": "prasanna@example.com",
    "userName": "Prasanna Yadav",
    "totalPrice": 599.98,
    "itemCount": 1
  }
  ```

- **Worker Behavior**:
  - Send actual email via SMTP (or simulate with console.log in dev)
  - If job fails: retry with exponential backoff
  - Dead-letter on repeated failure (store in dead-letter queue)
  - Log job completion with result

**Important**:

- API response MUST be returned to client BEFORE email send starts
- Job is fire-and-forget from API perspective
- Client should NOT wait for email confirmation

### 19) Job: sendShippingNotification

- **Trigger**: When admin updates order status to SHIPPED
- **Queue**: email-notifications
- **Payload**:
  ```json
  {
    "orderId": 501,
    "userEmail": "prasanna@example.com",
    "userName": "Prasanna Yadav",
    "trackingNumber": "TN12345"
  }
  ```

---

## ⚙️ MISC / INFRA / DEV ENDPOINTS (Phase 1+11)

### 20) Health Check

- **Method**: `GET`
- **Path**: `/health`
- **Auth**: Public
- **Status**: Must return immediately (< 100ms)

**Success Response (200 OK)**:

```json
{
  "status": "ok",
  "timestamp": "2025-12-09T19:15:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "queue": "ok"
  }
}
```

**Partial Failure (503 Service Unavailable)**:

```json
{
  "status": "error",
  "timestamp": "2025-12-09T19:15:00Z",
  "message": "Database connection failed",
  "checks": {
    "database": "error",
    "redis": "ok",
    "queue": "ok"
  }
}
```

**Implementation Notes**:

- Check database with `SELECT 1`
- Check Redis connection status
- Check BullMQ queue is available
- Return 200 only if all checks pass
- Return 503 if any critical check fails

---

## 🚨 ERROR FORMATTING (Global, Phase 9)

All error responses follow this consistent schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }  // optional, depends on error type
  }
}
```

**Status Codes**:

| Code  | Meaning               | Example Codes                        |
| ----- | --------------------- | ------------------------------------ |
| `200` | OK                    | —                                    |
| `201` | Created               | —                                    |
| `204` | No Content            | Used for successful DELETE           |
| `400` | Bad Request           | VALIDATION_ERROR, INSUFFICIENT_STOCK |
| `401` | Unauthorized          | UNAUTHORIZED (no token or expired)   |
| `403` | Forbidden             | FORBIDDEN (role mismatch)            |
| `404` | Not Found             | NOT_FOUND                            |
| `409` | Conflict              | VERSION_MISMATCH, DUPLICATE_ENTRY    |
| `422` | Unprocessable Entity  | Domain validation errors             |
| `500` | Internal Server Error | INTERNAL_ERROR                       |
| `503` | Service Unavailable   | Health check failures                |

**Error Code Catalogue**:

| Code               | Status | Description                                     |
| ------------------ | ------ | ----------------------------------------------- |
| VALIDATION_ERROR   | 400    | Input validation failed                         |
| UNAUTHORIZED       | 401    | Missing or invalid JWT                          |
| FORBIDDEN          | 403    | Insufficient permissions (RBAC)                 |
| NOT_FOUND          | 404    | Resource doesn't exist                          |
| DUPLICATE_ENTRY    | 409    | Unique constraint violation (e.g., email)       |
| VERSION_MISMATCH   | 409    | Optimistic locking conflict (concurrent update) |
| INSUFFICIENT_STOCK | 409    | Not enough inventory for order                  |
| INTERNAL_ERROR     | 500    | Unexpected server error                         |

---

## 🧾 TEST CASES YOU MUST HAVE (Phase 12)

### Test 1: Happy Path Checkout

```
1. Register user → token
2. Create 2 products (stock=5 each)
3. Add both to cart (qty=2 each)
4. POST /orders
   Expected: 201, order created, stock reduced (3 each), cart cleared, email job queued
```

### Test 2: Concurrent Checkout (Race Condition)

```
1. Register user A, user B
2. Create product (stock=1)
3. User A fetches product → version=1
4. User B fetches product → version=1
5. User A adds to cart, POSTs /orders → 201 SUCCESS
   (stock=0, version=2)
6. User B adds to cart, POSTs /orders → 409 VERSION_MISMATCH
   (nothing changed in DB)
Expected: Stock accuracy, no overselling
```

### Test 3: Transaction Rollback

```
1. Setup: simulate error after stock update but before order creation
2. POST /orders
3. Expected: stock unchanged, no order created (rollback works)
```

### Test 4: Cache Invalidation

```
1. GET /products → cache miss, queries DB
2. GET /products → cache hit, faster
3. Admin POSTs new product
4. GET /products → cache invalidated, queries DB
5. Result: returns new product
Expected: cache is cleared on mutation
```

### Test 5: RBAC (Role-Based Access Control)

```
1. Customer POSTs /products
   Expected: 403 FORBIDDEN
2. Customer DELETES /products/:id
   Expected: 403 FORBIDDEN
3. Customer accesses another user's order via GET /orders/{otherUserId}
   Expected: 403 FORBIDDEN
4. Admin can POST/PUT/DELETE /products
   Expected: 200/201
5. Admin can access any order
   Expected: 200
```

### Test 6: Validation & Error Handling

```
1. POST /auth/register with duplicate email
   Expected: 409 DUPLICATE_ENTRY
2. POST /auth/register with weak password
   Expected: 400 VALIDATION_ERROR
3. POST /cart/items with quantity=0
   Expected: 400 VALIDATION_ERROR
4. POST /orders with empty cart
   Expected: 400 VALIDATION_ERROR
5. GET /products/:id with invalid id
   Expected: 404 NOT_FOUND
```

---

## 📝 IMPLEMENTATION CHECKLIST

- [x] POST /auth/register
- [x] POST /auth/login
- [x] GET /auth/me
- [x] GET /products
- [x] GET /products/:id
- [x] POST /products (admin)
- [x] PUT /products/:id (admin, optimistic locking)
- [x] DELETE /products/:id (admin)
- [x] POST /cart/items
- [x] GET /cart
- [x] DELETE /cart/items/:id
- [x] DELETE /cart
- [x] POST /orders (ACID transaction, optimistic locking)
- [x] GET /orders/:id
- [x] GET /orders
- [x] GET /admin/orders (admin)
- [x] PATCH /admin/orders/:id/status (admin)
- [x] Job: sendOrderConfirmationEmail
- [x] Job: sendShippingNotification
- [x] GET /health
- [x] Error formatting (consistent schema)

---

**All endpoints are now production-ready and match the developer-friendly endpoint catalogue specification.**
