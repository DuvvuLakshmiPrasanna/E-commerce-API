# E-Commerce API Architecture

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                   │
│                  (Web/Mobile Applications)                            │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                       HTTP/HTTPS
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER                                    │
│                    (API Gateway)                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           REQUEST PROCESSING PIPELINE                       │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 1. Middleware Stack                                         │   │
│  │    ├─ Helmet (Security Headers)                            │   │
│  │    ├─ CORS (Cross-Origin)                                  │   │
│  │    ├─ Body Parser (JSON)                                   │   │
│  │    └─ Authentication Middleware                            │   │
│  │                                                              │   │
│  │ 2. Route Dispatcher                                         │   │
│  │    ├─ /auth/register                                        │   │
│  │    ├─ /auth/login                                           │   │
│  │    ├─ /products (GET, POST, PUT, DELETE)                   │   │
│  │    ├─ /cart (GET, POST, DELETE)                            │   │
│  │    └─ /orders (GET, POST)                                  │   │
│  │                                                              │   │
│  │ 3. Controller Layer                                         │   │
│  │    ├─ AuthController                                        │   │
│  │    ├─ ProductController                                     │   │
│  │    ├─ CartController                                        │   │
│  │    └─ OrderController                                       │   │
│  │                                                              │   │
│  │ 4. Validation Layer                                         │   │
│  │    └─ express-validator (Input Validation)                  │   │
│  │                                                              │   │
│  │ 5. Error Handling Middleware                                │   │
│  │    ├─ Global Error Handler                                  │   │
│  │    ├─ Custom Error Classes                                  │   │
│  │    └─ 404 Handler                                           │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐      ┌────────────┐
    │ Services │        │  Config  │      │ Middleware │
    ├──────────┤        ├──────────┤      ├────────────┤
    │ Business │        │ Database │      │ JWT Auth   │
    │ Logic    │        │ Redis    │      │ RBAC       │
    │ Trans-   │        │ Queue    │      │ Validation │
    │ actions  │        │ Settings │      │ Errors     │
    └──────────┘        └──────────┘      └────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────┐
    │         REPOSITORIES LAYER                       │
    ├──────────────────────────────────────────────────┤
    │ UserRepository                                   │
    │ ProductRepository                                │
    │ CartRepository                                   │
    │ OrderRepository                                  │
    │ (Prisma ORM - Database Abstraction)             │
    └──────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐      ┌────────────┐
    │PostgreSQL│        │ Redis    │      │ BullMQ     │
    │ Database │        │ Cache    │      │ Queue      │
    │          │        │          │      │            │
    │ ACID     │        │ 1-Hour   │      │ Email      │
    │ Trans    │        │ TTL      │      │ Jobs       │
    │ Optim.   │        │          │      │            │
    │ Locking  │        │ Products │      │ Worker     │
    │          │        │ Cache    │      │ Process    │
    └──────────┘        └──────────┘      └────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  EXTERNAL SERVICES
                    ├──────────────────┤
                    │ Email Service    │
                    │ (Nodemailer)     │
                    └──────────────────┘
```

## Layered Architecture Components

### 1. **Controller Layer**

**Purpose**: Handle HTTP requests and responses

```
AuthController
├── register()        → POST /auth/register
└── login()          → POST /auth/login

ProductController
├── getProducts()    → GET /products
├── getProductById() → GET /products/:id
├── createProduct()  → POST /products
├── updateProduct()  → PUT /products/:id
└── deleteProduct()  → DELETE /products/:id

CartController
├── getCart()        → GET /cart
├── addToCart()      → POST /cart/items
├── removeFromCart() → DELETE /cart/items/:id
└── clearCart()      → DELETE /cart

OrderController
├── createOrder()    → POST /orders
├── getOrderById()   → GET /orders/:id
└── getUserOrders()  → GET /orders
```

**Key Responsibilities**:

- Parse HTTP requests
- Call service methods
- Format HTTP responses
- Delegate validation to middleware

---

### 2. **Service Layer**

**Purpose**: Implement business logic and data processing

```
AuthService
├── register()       → User registration + JWT generation
└── login()         → User authentication

ProductService
├── getProducts()    → Query + cache lookup
├── getProductById() → Single product fetch
├── createProduct()  → Validation + creation
├── updateProduct()  → Update + cache invalidation
└── deleteProduct()  → Delete + cache invalidation

CartService
├── getCart()         → Retrieve cart with items
├── addToCart()       → Add item + validation
├── removeFromCart()  → Remove specific item
├── clearCart()       → Remove all items
└── validateCartForCheckout() → Stock validation

OrderService
├── createOrder()     → ACID transaction
│   ├─ Validate cart
│   ├─ Check stock
│   ├─ Optimistic locking update
│   ├─ Create order record
│   ├─ Clear cart
│   └─ Queue email job
├── getOrderById()    → Fetch with items
└── getUserOrders()   → Paginated history
```

**Key Responsibilities**:

- Business logic implementation
- Data validation
- Transaction management
- Cache coordination
- Job queuing

---

### 3. **Repository Layer**

**Purpose**: Database abstraction using Prisma ORM

```
UserRepository
├── findByEmail()
├── findById()
├── create()
├── update()
└── delete()

ProductRepository
├── findAll()                    → With filtering
├── findById()
├── create()
├── update()
├── delete()
├── updateStockWithVersionCheck() → Optimistic locking
└── findByIdWithVersion()        → For lock checks

CartRepository
├── findByUserId()
├── getOrCreateCart()
├── addItem()
├── removeItem()
├── clearCart()
└── getCartItems()

OrderRepository
├── findById()       → With nested items/user
├── findByUserId()   → Paginated
├── create()         → With items
└── updateStatus()
```

**Key Responsibilities**:

- Database query execution
- Prisma client usage
- Query optimization
- Data retrieval/manipulation

---

### 4. **Middleware Layer**

**Purpose**: Cross-cutting concerns

```
Authentication Middleware (auth.js)
├── authenticate()    → Verify JWT token
└── authorize()      → Check role permissions

Validation Middleware (validation.js)
└── validateRequest() → Process validation results

Error Handler Middleware (errorHandler.js)
├── errorHandler()    → Global error handling
└── notFoundHandler() → 404 responses
```

**Key Responsibilities**:

- Request pre-processing
- Response post-processing
- Error handling
- Cross-cutting logic

---

### 5. **Configuration Layer**

**Purpose**: External service integration

```
database.js  → Prisma Client initialization
redis.js     → Redis connection setup
queue.js     → BullMQ queue creation
```

**Key Responsibilities**:

- Service connections
- Configuration management
- Connection pooling
- Graceful shutdown

---

## Data Flow Diagrams

### Authentication Flow

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ POST /auth/login
       │ {email, password}
       ▼
┌────────────────────────────┐
│ AuthController.login()     │
│  ├─ Extract email/password │
│  └─ Call AuthService       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ AuthService.login()        │
│  ├─ Validate input         │
│  ├─ Call UserRepository    │
│  └─ Compare passwords      │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ UserRepository.findByEmail()
│  └─ Prisma query           │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ PostgreSQL Database        │
│  └─ Return user record     │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ bcryptjs.compare()         │
│  └─ Password validation    │
└────────┬───────────────────┘
         │ ✓ Valid
         ▼
┌────────────────────────────┐
│ JWT.generateToken()        │
│  └─ Create JWT token       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Response 200 OK            │
│ {token, user}              │
└────────┬───────────────────┘
         │
         ▼
┌─────────────┐
│   User      │
│  (Stores    │
│   Token)    │
└─────────────┘
```

### Order Creation Flow (with ACID Transaction)

```
┌─────────────────────┐
│  User Request       │
│ POST /orders        │
│ Authorization: JWT  │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ OrderController.createOrder()    │
│  ├─ Extract userId from JWT      │
│  └─ Call OrderService            │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ OrderService.createOrder()       │
│  ├─ Get cart from CartRepository │
│  ├─ Validate cart (non-empty)    │
│  └─ Check stock availability     │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ ═══════ TRANSACTION START ═══════ │
│  [All-or-Nothing Database Block]  │
├──────────────────────────────────┤
│                                  │
│  For each CartItem:              │
│  1. Get Product with version     │
│  2. Update stock (version check) │
│     UPDATE products              │
│     SET stock = stock - qty,     │
│         version = version + 1    │
│     WHERE id = ? AND             │
│           version = ? ← KEY      │
│                                  │
│     IF affected_rows == 0:       │
│        THROW VersionMismatch     │
│        ROLLBACK                  │
│                                  │
│  3. Create OrderItem record      │
│     (with price snapshot)        │
│                                  │
│  4. Create Order record          │
│  5. Clear CartItems              │
│                                  │
│  6. COMMIT TRANSACTION           │
│ ═════════════════════════════════ │
└────────┬─────────────────────────┘
         │
         ▼ (Success)
┌──────────────────────────────────┐
│ Queue Email Job                  │
│  emailQueue.add(                 │
│    'sendOrderConfirmation',      │
│    {orderId, userEmail, ...}    │
│  )                               │
│  ※ Non-blocking                  │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Response 201 Created             │
│ {                                │
│   orderId: 123,                  │
│   totalPrice: 199.98,            │
│   items: [...]                   │
│ }                                │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ [In Background]                  │
│ Email Worker processes job       │
│ └─ Sends order confirmation      │
└──────────────────────────────────┘
```

### Concurrent Checkout Scenario (Race Condition Prevention)

```
┌──────────────────────────────────┐
│  Scenario: 2 Users, 1 Item Left  │
└──────────────────────────────────┘

Initial State:
Product ID=1, Stock=1, Version=5


USER A                              USER B
│                                   │
├─ GET /products/1                  ├─ GET /products/1
│  └─ Price: $99                    │  └─ Price: $99
│     Stock: 1                      │     Stock: 1
│     Version: 5                    │     Version: 5
│                                   │
├─ POST /cart/items                 ├─ POST /cart/items
│  ProductID=1, Qty=1               │  ProductID=1, Qty=1
│                                   │
├─ POST /orders                      ├─ POST /orders
│  ▼                                 │  ▼
│  Transaction Start                │  Transaction Start
│  │                                │  │
│  ├─ Update Products               │  ├─ Update Products
│  │  SET stock=0, version=6        │  │  SET stock=0, version=6
│  │  WHERE id=1 AND version=5      │  │  WHERE id=1 AND version=5
│  │  ✓ UPDATED (1 row)             │  │  ✗ NOT UPDATED (0 rows)
│  │                                │  │
│  ├─ Create Order A ✓              │  ├─ Version Mismatch!
│  ├─ Create OrderItems A ✓         │  │  ROLLBACK!
│  ├─ Clear Cart A ✓                │  │
│  │                                │  │
│  └─ COMMIT ✓                       │  └─ ROLLBACK ✓
│                                   │
└─ Response 201                     └─ Response 409 Conflict
   Order Created!                      {
   Order ID: 100                       "code": "VERSION_MISMATCH",
   Items: [...]                        "message": "Product was modified..."
   Total: $99                          }

Result:
┌──────────────────────────────────┐
│ User A: ✓ Successfully Purchased  │
│ User B: ✗ Conflict Error (Fair)   │
└──────────────────────────────────┘

User B can retry or choose another product
```

---

## Key Design Patterns

### 1. **Repository Pattern**

Database abstraction layer to allow easy switching of data sources.

```javascript
// Service doesn't know about database
ProductService.getProducts() {
  return ProductRepository.findAll();
}

// Repository handles all database logic
ProductRepository.findAll() {
  return prisma.product.findMany();
}
```

### 2. **Service Pattern**

Encapsulates business logic separately from request handling.

```javascript
// Controller delegates to service
const order = await OrderService.createOrder(userId);

// Service contains complex logic
OrderService.createOrder() {
  // 1. Validation
  // 2. Transaction management
  // 3. Job queuing
}
```

### 3. **Middleware Pattern**

Cross-cutting concerns applied to request pipeline.

```javascript
app.use(authenticate); // JWT verification
app.use(validate); // Input validation
app.use(errorHandler); // Error handling
```

### 4. **Strategy Pattern**

Different caching strategies can be implemented:

```javascript
// Cache-aside pattern
const cached = await redis.get(key);
if (cached) return cached;

const result = await db.fetch();
await redis.set(key, result);
return result;
```

### 5. **Transaction Pattern**

Database-level atomicity:

```javascript
const result = await prisma.$transaction(async (tx) => {
  // All operations succeed or all fail
});
```

### 6. **Optimistic Locking Pattern**

Prevent concurrent modification conflicts:

```javascript
UPDATE products
SET version = version + 1
WHERE id = ? AND version = currentVersion;
// If 0 rows affected: conflict detected
```

---

## Error Handling Architecture

```
Request
   │
   ▼
┌─────────────────┐
│ Try Block       │
├─────────────────┤
│ Business Logic  │
└─────────────────┘
   │ Error
   ▼
┌──────────────────────────┐
│ Error Classification      │
├──────────────────────────┤
│ ├─ AppError             │ ← Custom errors
│ ├─ ValidationError      │ ← Input validation
│ ├─ NotFoundError        │ ← Resource missing
│ ├─ UnauthorizedError    │ ← Auth failed
│ ├─ VersionMismatchError │ ← Optimistic locking
│ └─ Prisma Errors        │ ← Database errors
└──────────────────────────┘
   │
   ▼
┌──────────────────────────┐
│ Error Handler Middleware │
├──────────────────────────┤
│ ├─ Log error            │
│ ├─ Format response      │
│ └─ Send HTTP response   │
└──────────────────────────┘
   │
   ▼
User (JSON Response with
     error code and message)
```

---

## Performance Optimization Strategies

### 1. **Database Indexing**

```
Products.category    → Fast category filtering
Orders.userId        → Fast order lookup
Orders.createdAt     → Fast date range queries
```

### 2. **Caching Strategy**

```
Redis Cache
├─ Products list (1 hour TTL)
├─ Cache invalidation on updates
└─ Reduces database load
```

### 3. **Async Processing**

```
Email notifications
├─ Queued immediately
├─ Processed in background
└─ Non-blocking API response
```

### 4. **Query Optimization**

```
Prisma queries
├─ N+1 query prevention (include relations)
├─ Pagination (skip, take)
└─ Selective fields (select)
```

---

## Security Architecture

```
┌──────────────────────────────────────┐
│ Input Validation Layer               │
│  ├─ express-validator               │
│  ├─ Type checking                   │
│  └─ Whitelist patterns              │
└──────────────────────────────────────┘
           ▼
┌──────────────────────────────────────┐
│ Authentication Layer                 │
│  ├─ JWT verification                │
│  ├─ Token expiration check          │
│  └─ Payload validation              │
└──────────────────────────────────────┘
           ▼
┌──────────────────────────────────────┐
│ Authorization Layer                  │
│  ├─ Role-based access control       │
│  ├─ Resource ownership checks       │
│  └─ Permission verification         │
└──────────────────────────────────────┘
           ▼
┌──────────────────────────────────────┐
│ Database Security                    │
│  ├─ Parameterized queries (Prisma)  │
│  ├─ Password hashing (bcryptjs)     │
│  ├─ SQL injection prevention        │
│  └─ Data encryption (at rest)       │
└──────────────────────────────────────┘
```

---

**Last Updated**: December 9, 2025
