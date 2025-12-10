# Entity Relationship Diagram (ERD)

## Database Schema Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         E-Commerce Database                          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐          ┌──────────────────┐
│     USERS       │          │   PRODUCTS       │
├─────────────────┤          ├──────────────────┤
│ id (PK)         │◄────┐    │ id (PK)          │
│ name            │     │    │ name             │
│ email (UNIQUE)  │     │    │ description      │
│ password        │     │    │ price            │
│ role            │     │    │ category (INDEX) │
│ createdAt       │     │    │ stockQuantity    │
│ updatedAt       │     │    │ version          │◄─┐
│                 │     │    │ createdAt        │  │
└─────────────────┘     │    │ updatedAt        │  │
        │               │    │                  │  │
        │               │    └──────────────────┘  │
        │1          1..M│                          │
        │               │              ┌───────────┘
        │         ┌─────┴─────────┐    │
        │         │               │    │
        │     ┌───────────┐   ┌──────────────┐
        └────►│   CARTS   │   │  CART_ITEMS  │
        1   M │───────────┤   ├──────────────┤
              │ id (PK)   │   │ id (PK)      │
              │ userId(FK)│   │ cartId (FK)  │───┐
              │ createdAt │   │ productId(FK)├───┼──┐
              │ updatedAt │   │ quantity     │   │  │
              └───────────┘   │ createdAt    │   │  │
                    ▲         │ updatedAt    │   │  │
                    │         └──────────────┘   │  │
                    │              │             │  │
                    └──────────────┘1       M────┘  │
                          1:M              │       │
                                           └───────┘
                                               M:1

        ┌──────────────────┐
        │     ORDERS       │
        ├──────────────────┤
        │ id (PK)          │
        │ userId (FK)      │────────┐
        │ totalPrice       │        │
        │ status           │        │
        │ createdAt (INDEX)│        │
        │ updatedAt        │        │
        └──────────────────┘        │
               │                    │
               │1          ┌────────┴────┐
               │          M│             │
               │    ┌──────────────────┐ │
               └───►│  ORDER_ITEMS     │ │
                    ├──────────────────┤ │
                    │ id (PK)          │ │
                    │ orderId (FK)     │ │ 1:M
                    │ productId (FK)   │ │
                    │ quantity         │ │
                    │ priceAtPurchase  │ │
                    │ createdAt        │ │
                    └──────────────────┘ │
                            │            │
                         M  │      1     │
                    ┌───────┴──────────┬─┘
                    │
                    └─ PRODUCTS
```

## Table Definitions

### USERS Table

| Column    | Type         | Constraint                  | Description            |
| --------- | ------------ | --------------------------- | ---------------------- |
| id        | INT          | PRIMARY KEY, AUTO INCREMENT | Unique user identifier |
| name      | VARCHAR(255) | NOT NULL                    | User's full name       |
| email     | VARCHAR(255) | UNIQUE, NOT NULL            | User's email           |
| password  | VARCHAR(255) | NOT NULL                    | Hashed password        |
| role      | ENUM         | DEFAULT 'CUSTOMER'          | CUSTOMER or ADMIN      |
| createdAt | TIMESTAMP    | NOT NULL, DEFAULT NOW()     | Account creation date  |
| updatedAt | TIMESTAMP    | NOT NULL, AUTO UPDATE       | Last update timestamp  |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE on `email`

---

### PRODUCTS Table

| Column        | Type          | Constraint                  | Description               |
| ------------- | ------------- | --------------------------- | ------------------------- |
| id            | INT           | PRIMARY KEY, AUTO INCREMENT | Unique product identifier |
| name          | VARCHAR(255)  | NOT NULL                    | Product name              |
| description   | TEXT          | NULLABLE                    | Product description       |
| price         | DECIMAL(10,2) | NOT NULL                    | Product price             |
| category      | VARCHAR(100)  | NOT NULL, INDEXED           | Product category          |
| stockQuantity | INT           | DEFAULT 0                   | Available stock           |
| version       | INT           | DEFAULT 0                   | Optimistic lock version   |
| createdAt     | TIMESTAMP     | NOT NULL, DEFAULT NOW()     | Creation date             |
| updatedAt     | TIMESTAMP     | NOT NULL, AUTO UPDATE       | Last update timestamp     |

**Indexes**:

- PRIMARY KEY on `id`
- INDEX on `category` (filtering)
- INDEX on `name` (searching)

**Special Feature**: `version` field enables optimistic locking to prevent race conditions during concurrent stock updates.

---

### CARTS Table

| Column    | Type      | Constraint                  | Description            |
| --------- | --------- | --------------------------- | ---------------------- |
| id        | INT       | PRIMARY KEY, AUTO INCREMENT | Unique cart identifier |
| userId    | INT       | UNIQUE, NOT NULL, FK        | Reference to USERS     |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW()     | Cart creation date     |
| updatedAt | TIMESTAMP | NOT NULL, AUTO UPDATE       | Last update timestamp  |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE on `userId` (one cart per user)
- FOREIGN KEY on `userId` → USERS.id (CASCADE DELETE)

**Relationship**: 1:1 relationship with USERS

- Each user has exactly one cart
- When user is deleted, cart is also deleted

---

### CART_ITEMS Table

| Column    | Type      | Constraint                  | Description                 |
| --------- | --------- | --------------------------- | --------------------------- |
| id        | INT       | PRIMARY KEY, AUTO INCREMENT | Unique cart item identifier |
| cartId    | INT       | NOT NULL, FK                | Reference to CARTS          |
| productId | INT       | NOT NULL, FK, INDEXED       | Reference to PRODUCTS       |
| quantity  | INT       | NOT NULL                    | Number of items             |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW()     | Item added date             |
| updatedAt | TIMESTAMP | NOT NULL, AUTO UPDATE       | Last update timestamp       |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE CONSTRAINT on (cartId, productId) (same product only once in cart)
- FOREIGN KEY on `cartId` → CARTS.id (CASCADE DELETE)
- FOREIGN KEY on `productId` → PRODUCTS.id (CASCADE DELETE)

**Relationship**: Many:1 with CARTS

- Multiple items can be in one cart
- Each item belongs to one cart

---

### ORDERS Table

| Column     | Type          | Constraint                       | Description                           |
| ---------- | ------------- | -------------------------------- | ------------------------------------- |
| id         | INT           | PRIMARY KEY, AUTO INCREMENT      | Unique order identifier               |
| userId     | INT           | NOT NULL, FK, INDEXED            | Reference to USERS                    |
| totalPrice | DECIMAL(10,2) | NOT NULL                         | Total order amount                    |
| status     | ENUM          | DEFAULT 'PENDING'                | PENDING, COMPLETED, FAILED, CANCELLED |
| createdAt  | TIMESTAMP     | NOT NULL, DEFAULT NOW(), INDEXED | Order creation date                   |
| updatedAt  | TIMESTAMP     | NOT NULL, AUTO UPDATE            | Last update timestamp                 |

**Indexes**:

- PRIMARY KEY on `id`
- INDEX on `userId` (user order history)
- INDEX on `createdAt` (time-based queries)
- INDEX on `status` (status queries)
- FOREIGN KEY on `userId` → USERS.id (CASCADE DELETE)

**Relationship**: Many:1 with USERS

- Each user can have multiple orders

---

### ORDER_ITEMS Table

| Column          | Type          | Constraint                  | Description                  |
| --------------- | ------------- | --------------------------- | ---------------------------- |
| id              | INT           | PRIMARY KEY, AUTO INCREMENT | Unique order item identifier |
| orderId         | INT           | NOT NULL, FK, INDEXED       | Reference to ORDERS          |
| productId       | INT           | NOT NULL, FK, INDEXED       | Reference to PRODUCTS        |
| quantity        | INT           | NOT NULL                    | Number of items ordered      |
| priceAtPurchase | DECIMAL(10,2) | NOT NULL                    | Price at time of purchase    |
| createdAt       | TIMESTAMP     | NOT NULL, DEFAULT NOW()     | Item creation date           |

**Indexes**:

- PRIMARY KEY on `id`
- FOREIGN KEY on `orderId` → ORDERS.id (CASCADE DELETE)
- FOREIGN KEY on `productId` → PRODUCTS.id (CASCADE DELETE)

**Special Feature**: `priceAtPurchase` stores the product price at the time of order creation. This allows accurate order history even if product prices change later.

**Relationship**: Many:1 with ORDERS

- Multiple items per order
- Multiple items per product across different orders

---

## Relationships Summary

```
User (1) ──────────────── (M) Cart
         1:1 relationship

User (1) ──────────────── (M) Order
         1:M relationship

Cart (1) ──────────────── (M) CartItem
         1:M relationship

Product (1) ────────────── (M) CartItem
           1:M relationship

Order (1) ──────────────── (M) OrderItem
         1:M relationship

Product (1) ────────────── (M) OrderItem
           1:M relationship
```

## Data Integrity Constraints

### Cascade Delete Rules

- When **User** is deleted:

  - Associated **Cart** is deleted
  - Associated **Orders** are deleted
  - Associated **OrderItems** are deleted

- When **Cart** is deleted:

  - Associated **CartItems** are deleted

- When **Product** is deleted:
  - Associated **CartItems** are deleted (order history preserved)
  - Associated **OrderItems** are preserved (historical data)

### Unique Constraints

- `email` in USERS (no duplicate emails)
- `(cartId, productId)` in CART_ITEMS (same product only once per cart)
- `userId` in CARTS (one cart per user)

## Indexing Strategy

### Why These Indexes?

1. **Products.category**: Most product queries filter by category
2. **Products.name**: Enables product search
3. **Products.version**: Used in optimistic locking checks
4. **Carts.userId**: Retrieve user's cart
5. **Orders.userId**: Retrieve user's order history
6. **Orders.createdAt**: Query orders by date range
7. **Orders.status**: Filter orders by status

### Query Performance Impacts

```sql
-- With index on category
SELECT * FROM products WHERE category = 'electronics'
→ Index scan: O(log N)

-- With index on userId
SELECT * FROM orders WHERE userId = 1
→ Index scan: O(log N)

-- Without proper indexes (scanning)
SELECT * FROM products WHERE category = 'electronics'
→ Full table scan: O(N)
```

## Optimistic Locking Mechanism

The `version` field in PRODUCTS enables optimistic locking:

```sql
-- Update succeeds (version matches)
UPDATE products
SET stockQuantity = stockQuantity - 1, version = version + 1
WHERE id = 1 AND version = 5;
-- Returns: 1 row affected

-- Update fails (version mismatch - someone else updated)
UPDATE products
SET stockQuantity = stockQuantity - 1, version = version + 1
WHERE id = 1 AND version = 5;
-- Returns: 0 rows affected
```

**Benefits**:

- Prevents overselling in concurrent checkout scenarios
- No locks needed (better performance than pessimistic locking)
- Automatic conflict detection

---

**Last Updated**: December 9, 2025
