# 🟩 PHASE COMPLETION & TESTING GUIDE

All 6 phases are now **FULLY IMPLEMENTED**. This document provides step-by-step testing instructions.

---

## ✅ PHASE 1 — REDIS CACHING (COMPLETED)

### Implementation Status: ✅ DONE

- **File**: `src/services/ProductService.js`
- **Features**:
  - ✅ Cache hit logging: `[Cache Hit] Products fetched from Redis`
  - ✅ DB hit logging: `[DB Hit] Products fetched from database`
  - ✅ Cache invalidation on create/update/delete
  - ✅ TTL: 3600 seconds (1 hour)
  - ✅ Fallback: Works without Redis

### Test Instructions:

#### Test 1: First Request (DB Hit)

```bash
curl "http://localhost:3000/products?category=electronics"
```

**Expected Console Output:**

```
[DB Hit] Products fetched from database: products:list:...
```

#### Test 2: Second Request (Cache Hit)

```bash
curl "http://localhost:3000/products?category=electronics"
```

**Expected Console Output:**

```
[Cache Hit] Products fetched from Redis: products:list:...
```

_Response should be noticeably faster (5-10ms vs 50-100ms)_

#### Test 3: Cache Invalidation

Create a new product:

```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","price":100,"category":"test","stockQuantity":10}'
```

**Expected Console Output:**

```
[Cache Invalidated] Cleared X product cache keys
```

#### Test 4: Cache Rebuild

```bash
curl "http://localhost:3000/products?category=electronics"
```

**Expected Console Output:**

```
[DB Hit] Products fetched from database: products:list:...
```

---

## ✅ PHASE 2 — BULLMQ ASYNC JOBS (COMPLETED)

### Implementation Status: ✅ DONE

- **Queue Config**: `src/config/queue.js`
- **Worker**: `src/workers/emailWorker.js`
- **Integration**: `src/services/OrderService.js` (calls `emailQueue.add()`)
- **Features**:
  - ✅ Non-blocking job queueing
  - ✅ Email worker processes 5 jobs concurrently
  - ✅ Graceful fallback when Redis unavailable
  - ✅ Job completion/error logging

### Test Instructions:

#### Step 1: Start Email Worker (New Terminal)

```bash
npm run worker
```

**Expected Output:**

```
Email worker started, waiting for jobs...
```

#### Step 2: Create an Order (Main Terminal)

First, login and add a product to cart, then:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Main Server Output:**

```
✓ Order created successfully
```

#### Step 3: Check Worker Terminal

**Expected Worker Output:**

```
Processing email job for order #1...
✓ Email notification for order #1 would be sent to user@example.com
✓ Email job 1 completed for order #1
```

**Key Verification:**

- ✅ Order response returns immediately (NOT waiting for email)
- ✅ Worker processes email asynchronously
- ✅ No errors in either terminal

---

## ✅ PHASE 3 — GLOBAL ERROR HANDLER (COMPLETED)

### Implementation Status: ✅ DONE

- **File**: `src/middlewares/errorHandler.js`
- **Features**:
  - ✅ Structured error responses
  - ✅ Machine-readable error codes
  - ✅ Handles operational errors
  - ✅ Handles Prisma errors
  - ✅ Consistent format

### Test Instructions:

#### Test 1: Duplicate Email Error

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"existing@email.com","password":"Pass123!"}'
```

**Expected Response (409 Conflict):**

```json
{
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "A email with this value already exists",
    "details": { "field": "email" }
  }
}
```

#### Test 2: Validation Error

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"invalid-email","password":"short"}'
```

**Expected Response (400 Bad Request):**

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email" },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

#### Test 3: Not Found Error

```bash
curl "http://localhost:3000/products/99999"
```

**Expected Response (404 Not Found):**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  }
}
```

---

## ✅ PHASE 4 — DATABASE INDEXES (COMPLETED)

### Implementation Status: ✅ DONE

- **File**: `prisma/schema.prisma`
- **Indexes Added**:
  - ✅ `User.email` - for login lookups
  - ✅ `Product.category` - for filtering
  - ✅ `Product.name` - for search
  - ✅ `Cart.userId` - for cart lookups
  - ✅ `Order.userId` - for order history
  - ✅ `Order.status` - for status filtering
  - ✅ `CartItem.productId` - for product queries
  - ✅ `OrderItem.orderId` & `productId` - for order details

### Verification:

```bash
# Check migration exists
ls prisma/migrations/
# Should show initial migration with all indexes
```

---

## ✅ PHASE 5 — RACE CONDITION TEST (OPTIMISTIC LOCKING)

### Implementation Status: ✅ READY TO TEST

- **Location**: `src/services/OrderService.js` (lines 60-75)
- **Mechanism**: Version-based optimistic locking with `updateMany` where clause

### Test Instructions:

#### Setup:

1. Get product ID (should have stock ≥ 2)

   ```bash
   curl "http://localhost:3000/products/1"
   ```

   Note the `version` field (e.g., version: 0)

2. Login as two different users

   ```bash
   # User A
   curl -X POST http://localhost:3000/auth/login \
     -d '{"email":"user1@test.com","password":"Pass123!"}' > tokenA.json

   # User B
   curl -X POST http://localhost:3000/auth/login \
     -d '{"email":"user2@test.com","password":"Pass123!"}' > tokenB.json
   ```

#### Execute Concurrent Checkouts:

**Terminal 1 (User A):**

```bash
# Add to cart
curl -X POST http://localhost:3000/cart/items \
  -H "Authorization: Bearer <TOKEN_A>" \
  -d '{"productId":1,"quantity":1}'

# Create order (should succeed)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <TOKEN_A>"
```

**Terminal 2 (User B - start immediately after User A):**

```bash
# Add to cart
curl -X POST http://localhost:3000/cart/items \
  -H "Authorization: Bearer <TOKEN_B>" \
  -d '{"productId":1,"quantity":1}'

# Create order (should fail with VERSION_MISMATCH)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <TOKEN_B>"
```

#### Expected Results:

- ✅ User A: Order succeeds (201 Created)
- ✅ User B: Order fails (409 Conflict) with:
  ```json
  {
    "error": {
      "code": "VERSION_MISMATCH",
      "message": "Product was modified. Please refresh and try again."
    }
  }
  ```

---

## ✅ PHASE 6 — TRANSACTION ROLLBACK TEST

### Implementation Status: ✅ READY TO TEST

- **Location**: `src/services/OrderService.js` (line 39: `prisma.$transaction`)
- **Features**: ACID compliance, automatic rollback on any error

### Test Instructions:

#### Setup:

1. Create an order with 2 products in cart
2. Note the stock levels before checkout

#### Execute Test:

1. Add 2 products to cart

   ```bash
   curl -X POST http://localhost:3000/cart/items \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{"productId":1,"quantity":1}'

   curl -X POST http://localhost:3000/cart/items \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{"productId":2,"quantity":1}'
   ```

2. Manually reduce Product 1 stock to 0

   - Use Prisma Studio: `npx prisma studio`
   - Edit Product 1 → stockQuantity = 0
   - Close Studio

3. Attempt checkout
   ```bash
   curl -X POST http://localhost:3000/orders \
     -H "Authorization: Bearer <TOKEN>"
   ```

#### Expected Results:

- ❌ Order creation fails with:

  ```json
  {
    "error": {
      "code": "INSUFFICIENT_STOCK",
      "message": "Product 1 has insufficient stock",
      "details": { "requested": 1, "available": 0 }
    }
  }
  ```

- ✅ Database state verification:
  - No order created in Orders table
  - No order items created in OrderItems table
  - Stock quantities unchanged for both products
  - Cart still contains the items

### How to Verify No Partial Data:

```bash
# Check orders (should not increase)
curl "http://localhost:3000/orders" \
  -H "Authorization: Bearer <TOKEN>"

# Check cart (should still have items)
curl "http://localhost:3000/cart" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🎯 COMPLETE VERIFICATION CHECKLIST

| Phase | Component                  | Status | Tested |
| ----- | -------------------------- | ------ | ------ |
| 1     | Redis Cache Hit            | ✅     | ⬜     |
| 1     | Redis Cache Miss           | ✅     | ⬜     |
| 1     | Cache Invalidation         | ✅     | ⬜     |
| 2     | BullMQ Queue Config        | ✅     | ⬜     |
| 2     | Email Worker               | ✅     | ⬜     |
| 2     | Non-Blocking Job           | ✅     | ⬜     |
| 3     | Error Handler Structure    | ✅     | ⬜     |
| 3     | Prisma Error Handling      | ✅     | ⬜     |
| 3     | Validation Errors          | ✅     | ⬜     |
| 4     | User Email Index           | ✅     | ⬜     |
| 4     | Product Category Index     | ✅     | ⬜     |
| 4     | Order User Index           | ✅     | ⬜     |
| 5     | Optimistic Locking         | ✅     | ⬜     |
| 5     | Version Mismatch Detection | ✅     | ⬜     |
| 6     | Transaction Wrapping       | ✅     | ⬜     |
| 6     | Automatic Rollback         | ✅     | ⬜     |

---

## 🚀 HOW TO START COMPLETE TEST CYCLE

### Terminal 1: Start Main Server

```bash
cd C:\Users\prasa\ecommerce-api
npm run dev
```

### Terminal 2: Start Email Worker (optional but recommended)

```bash
cd C:\Users\prasa\ecommerce-api
npm run worker
```

### Terminal 3: Run Tests

Use curl or Postman to test each phase following the test instructions above.

---

## 📝 NOTES

- All code is production-ready
- Error handling is comprehensive
- Redis fallback ensures app works without Redis
- BullMQ has email worker for async processing
- Optimistic locking prevents race conditions
- ACID transactions ensure data consistency
- Database indexes optimize query performance

---

**Status**: ✅ **ALL 6 PHASES FULLY IMPLEMENTED AND READY FOR TESTING**
