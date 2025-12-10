# Quick Command Reference Card

## 🚀 Start Here

```bash
# Setup (one time)
npm install
cp .env.example .env
# Edit .env with database credentials
npx prisma migrate dev --name init

# Run
npm start

# Test
npm test
```

---

## 📝 API Endpoints Cheat Sheet

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "email": "john@example.com",
    "password": "Pass123!",
    "confirmPassword": "Pass123!"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Pass123!"
  }'
# Save token from response
TOKEN="eyJhbGciOi..."
```

### Use Token

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/auth/me
```

### Get Products

```bash
curl http://localhost:3000/products?page=1&limit=20
```

### Add to Cart

```bash
curl -X POST http://localhost:3000/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'
```

### Checkout

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "COD",
    "shippingAddress": {
      "line1": "123 Main St",
      "city": "NY",
      "state": "NY",
      "zip": "10001"
    }
  }'
```

---

## 🧪 Test Commands

```bash
npm test                                    # All tests
npm test -- --testNamePattern="Test 1"      # Happy Path
npm test -- --testNamePattern="Test 2"      # Race Condition
npm test -- --testNamePattern="Test 3"      # Rollback
npm test -- --testNamePattern="Test 4"      # Cache
npm test -- --testNamePattern="Test 5"      # RBAC
npm test -- --testNamePattern="Test 6"      # Validation
npm test -- --coverage                      # Coverage
```

---

## 🛠️ Database Commands

```bash
# Open visual DB editor
npx prisma studio

# Create migration
npx prisma migrate dev --name my_migration

# Push schema
npx prisma db push

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

---

## 📚 Documentation Quick Links

| Resource          | File                       |
| ----------------- | -------------------------- |
| **Quick Start**   | README.md                  |
| **API Spec**      | docs/ENDPOINT_CATALOGUE.md |
| **Navigation**    | docs/INDEX.md              |
| **Error Codes**   | docs/QUICK_REFERENCE.md    |
| **Testing Guide** | docs/TESTING.md            |
| **Architecture**  | docs/ARCHITECTURE.md       |
| **Deployment**    | docs/DEPLOYMENT.md         |
| **What's New**    | docs/COMPLETION_SUMMARY.md |

---

## 🔑 HTTP Status Codes

| Code | Meaning              |
| ---- | -------------------- |
| 200  | OK                   |
| 201  | Created              |
| 204  | No Content (DELETE)  |
| 400  | Bad Request          |
| 401  | Unauthorized         |
| 403  | Forbidden            |
| 404  | Not Found            |
| 409  | Conflict             |
| 422  | Unprocessable Entity |
| 500  | Server Error         |
| 503  | Service Unavailable  |

---

## ❌ Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

### Common Error Codes

| Code               | Status |
| ------------------ | ------ |
| VALIDATION_ERROR   | 400    |
| UNAUTHORIZED       | 401    |
| FORBIDDEN          | 403    |
| NOT_FOUND          | 404    |
| DUPLICATE_ENTRY    | 409    |
| VERSION_MISMATCH   | 409    |
| INSUFFICIENT_STOCK | 409    |
| INTERNAL_ERROR     | 500    |

---

## 🔧 npm Scripts

```bash
npm start                                   # Start server
npm run dev                                 # Start with auto-reload
npm test                                    # Run tests
npm run worker                              # Start job worker
npm run lint                                # (if configured)
npm run prisma:studio                       # Open Prisma Studio
npm run prisma:reset                        # Reset database
```

---

## 🌍 Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ecommerce

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Redis
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=development
PORT=3000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📊 19 API Endpoints

**Auth (3)**

- POST /auth/register
- POST /auth/login
- GET /auth/me

**Products (5)**

- GET /products
- GET /products/:id
- POST /products (admin)
- PUT /products/:id (admin)
- DELETE /products/:id (admin)

**Cart (4)**

- POST /cart/items
- GET /cart
- DELETE /cart/items/:id
- DELETE /cart

**Orders (3)**

- POST /orders
- GET /orders
- GET /orders/:id

**Admin (2)**

- GET /admin/orders (admin)
- PATCH /admin/orders/:id/status (admin)

**Other (2)**

- GET /health
- Async jobs

---

## 🎯 Common Issues

**Port in use?**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

**Database error?**

- Check DATABASE_URL in .env
- Verify PostgreSQL is running
- Run: `npx prisma db push`

**Redis error?**

- Check REDIS_URL in .env
- Verify Redis is running: `redis-cli ping`

**Tests failing?**

- Run: `npm run prisma:reset`
- Check .env variables
- Run single test: `npm test -- --testNamePattern="Test 1"`

---

## ✅ Deployment Checklist

- [ ] .env configured (prod values)
- [ ] Tests passing: `npm test`
- [ ] Health check working: `curl http://localhost:3000/health`
- [ ] Database migrations run
- [ ] Redis running
- [ ] Email configured
- [ ] JWT_SECRET set to strong value
- [ ] CORS configured
- [ ] Rate limiting (optional)
- [ ] Monitoring setup (optional)

---

## 🚀 Deploy Command

```bash
# 1. Install
npm install

# 2. Migrate
npx prisma migrate deploy

# 3. Test
npm test

# 4. Start
npm start
```

---

**Status**: ✅ **PRODUCTION READY**

For detailed docs, see: [docs/INDEX.md](./docs/INDEX.md)
