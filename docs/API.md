# E-Commerce API - Postman Collection

This document provides a complete Postman collection for testing all API endpoints.

## Import Instructions

1. Copy the JSON collection below
2. In Postman: Click "Import" → Paste raw text
3. Select the imported collection
4. Set environment variables:
   - `BASE_URL`: http://localhost:3000
   - `TOKEN`: (obtained after login)

## Environment Variables

Create a Postman environment with these variables:

```json
{
  "BASE_URL": "http://localhost:3000",
  "TOKEN": "",
  "USER_ID": "",
  "PRODUCT_ID": "",
  "CART_ID": "",
  "ORDER_ID": "",
  "CART_ITEM_ID": ""
}
```

## API Collection (Postman Format)

```json
{
  "info": {
    "name": "E-Commerce API",
    "description": "Complete API collection for testing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"confirmPassword\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{BASE_URL}}/auth/register",
              "host": ["{{BASE_URL}}"],
              "path": ["auth", "register"]
            }
          },
          "response": []
        },
        {
          "name": "Login User",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "  const response = pm.response.json();",
                  "  pm.environment.set(\"TOKEN\", response.data.token);",
                  "  pm.environment.set(\"USER_ID\", response.data.user.id);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{BASE_URL}}/auth/login",
              "host": ["{{BASE_URL}}"],
              "path": ["auth", "login"]
            }
          },
          "response": []
        }
      ]
    },
    {
      "name": "Products",
      "item": [
        {
          "name": "Get All Products",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{BASE_URL}}/products?category=&sortBy=name&sortOrder=asc&page=1&limit=10",
              "host": ["{{BASE_URL}}"],
              "path": ["products"],
              "query": [
                {
                  "key": "category",
                  "value": "",
                  "disabled": true
                },
                {
                  "key": "sortBy",
                  "value": "name"
                },
                {
                  "key": "sortOrder",
                  "value": "asc"
                },
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "10"
                }
              ]
            }
          },
          "response": []
        },
        {
          "name": "Get Single Product",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{BASE_URL}}/products/1",
              "host": ["{{BASE_URL}}"],
              "path": ["products", "1"]
            }
          },
          "response": []
        },
        {
          "name": "Create Product (Admin)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "  const response = pm.response.json();",
                  "  pm.environment.set(\"PRODUCT_ID\", response.data.id);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Laptop\",\n  \"description\": \"High-performance laptop\",\n  \"price\": 999.99,\n  \"category\": \"electronics\",\n  \"stockQuantity\": 50\n}"
            },
            "url": {
              "raw": "{{BASE_URL}}/products",
              "host": ["{{BASE_URL}}"],
              "path": ["products"]
            }
          },
          "response": []
        },
        {
          "name": "Update Product (Admin)",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"price\": 899.99,\n  \"stockQuantity\": 40\n}"
            },
            "url": {
              "raw": "{{BASE_URL}}/products/{{PRODUCT_ID}}",
              "host": ["{{BASE_URL}}"],
              "path": ["products", "{{PRODUCT_ID}}"]
            }
          },
          "response": []
        },
        {
          "name": "Delete Product (Admin)",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/products/{{PRODUCT_ID}}",
              "host": ["{{BASE_URL}}"],
              "path": ["products", "{{PRODUCT_ID}}"]
            }
          },
          "response": []
        }
      ]
    },
    {
      "name": "Cart",
      "item": [
        {
          "name": "Get Cart",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/cart",
              "host": ["{{BASE_URL}}"],
              "path": ["cart"]
            }
          },
          "response": []
        },
        {
          "name": "Add to Cart",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "  const response = pm.response.json();",
                  "  pm.environment.set(\"CART_ITEM_ID\", response.data.id);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"productId\": 1,\n  \"quantity\": 2\n}"
            },
            "url": {
              "raw": "{{BASE_URL}}/cart/items",
              "host": ["{{BASE_URL}}"],
              "path": ["cart", "items"]
            }
          },
          "response": []
        },
        {
          "name": "Remove from Cart",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/cart/items/{{CART_ITEM_ID}}",
              "host": ["{{BASE_URL}}"],
              "path": ["cart", "items", "{{CART_ITEM_ID}}"]
            }
          },
          "response": []
        },
        {
          "name": "Clear Cart",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/cart",
              "host": ["{{BASE_URL}}"],
              "path": ["cart"]
            }
          },
          "response": []
        }
      ]
    },
    {
      "name": "Orders",
      "item": [
        {
          "name": "Create Order",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 201) {",
                  "  const response = pm.response.json();",
                  "  pm.environment.set(\"ORDER_ID\", response.data.id);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/orders",
              "host": ["{{BASE_URL}}"],
              "path": ["orders"]
            }
          },
          "response": []
        },
        {
          "name": "Get User Orders",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/orders?page=1&limit=10",
              "host": ["{{BASE_URL}}"],
              "path": ["orders"],
              "query": [
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "10"
                }
              ]
            }
          },
          "response": []
        },
        {
          "name": "Get Order Details",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/orders/{{ORDER_ID}}",
              "host": ["{{BASE_URL}}"],
              "path": ["orders", "{{ORDER_ID}}"]
            }
          },
          "response": []
        }
      ]
    }
  ]
}
```

## Testing Workflow

### 1. User Registration and Login

```
1. Run: Register User
   - Creates a new user account

2. Run: Login User
   - Stores TOKEN in environment
   - Stores USER_ID in environment
```

### 2. Product Management

```
3. Run: Create Product (Admin)
   - Requires TOKEN
   - Stores PRODUCT_ID

4. Run: Get All Products
   - Public endpoint (no auth)

5. Run: Get Single Product
   - Retrieves created product

6. Run: Update Product
   - Requires PRODUCT_ID
   - Updates price/stock

7. Run: Delete Product
   - Removes product
```

### 3. Shopping Cart

```
8. Run: Add to Cart
   - Adds product to cart
   - Stores CART_ITEM_ID

9. Run: Get Cart
   - Shows all items in cart

10. Run: Remove from Cart
    - Removes specific item
```

### 4. Order Creation

```
11. Run: Create Order
    - Processes payment
    - Clears cart
    - Stores ORDER_ID
    - Triggers email job

12. Run: Get User Orders
    - Shows order history

13. Run: Get Order Details
    - Shows order with items
```

## Test Cases

### Test Case 1: Happy Path (Successful Order)

```
✓ Register new user
✓ Login and get token
✓ Create product (as admin)
✓ Get products list
✓ Add product to cart
✓ Get cart contents
✓ Create order (checkout)
✓ Verify order created
✓ Check email job queued
```

### Test Case 2: Validation Errors

```
✓ Register with invalid email → 400
✓ Login with wrong password → 401
✓ Create product without name → 400
✓ Add to cart with invalid quantity → 400
✓ Order with empty cart → 400
```

### Test Case 3: Authorization Errors

```
✓ Try to create product as customer → 403
✓ Try to view another user's order → 403
✓ Access with expired token → 401
✓ Access without token → 401
```

### Test Case 4: Not Found Errors

```
✓ Get non-existent product → 404
✓ Get non-existent order → 404
✓ Remove non-existent cart item → 404
```

### Test Case 5: Concurrency (Race Condition)

```
1. Create product with quantity = 1
2. User A and B both add to cart
3. Both users submit orders simultaneously
4. Expected: One succeeds (201), one gets VERSION_MISMATCH (409)
```

## Expected Responses

### Successful Register (201)

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "Test User",
      "email": "test@example.com",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Successful Login (200)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Test User",
      "email": "test@example.com",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Successful Product Creation (201)

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 1,
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": "999.99",
    "category": "electronics",
    "stockQuantity": 50,
    "version": 0,
    "createdAt": "2025-12-09T12:00:00.000Z",
    "updatedAt": "2025-12-09T12:00:00.000Z"
  }
}
```

### Successful Order Creation (201)

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "totalPrice": "1999.98",
    "status": "COMPLETED",
    "items": [
      {
        "id": 1,
        "orderId": 1,
        "productId": 1,
        "quantity": 2,
        "priceAtPurchase": "999.99"
      }
    ],
    "user": {
      "id": 1,
      "name": "Test User",
      "email": "test@example.com"
    },
    "createdAt": "2025-12-09T12:00:00.000Z",
    "updatedAt": "2025-12-09T12:00:00.000Z"
  }
}
```

### Validation Error (400)

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ]
}
```

### Version Mismatch Error (409)

```json
{
  "success": false,
  "code": "VERSION_MISMATCH",
  "message": "Product Laptop was modified. Please refresh and try again."
}
```

### Insufficient Stock Error (400)

```json
{
  "success": false,
  "code": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for product 1. Available: 0, Requested: 2"
}
```

### Unauthorized Error (401)

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid email or password"
}
```

### Forbidden Error (403)

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions for this action"
}
```

### Not Found Error (404)

```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "Product not found"
}
```

---

**Last Updated**: December 9, 2025
