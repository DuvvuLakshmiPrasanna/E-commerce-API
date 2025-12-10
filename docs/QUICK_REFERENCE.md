# Quick Reference Guide

Fast lookup for common tasks and commands

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with your values
# Important: Set DATABASE_URL, REDIS_URL, JWT_SECRET

# 4. Setup database
npm run prisma:db-push

# 5. Start API server
npm start

# 6. In another terminal, start worker
npm run worker

# 7. Verify health
curl http://localhost:3000/health
```

---

## 📝 Common Commands

### Development

```bash
npm start              # Start API server (dev mode)
npm run dev          # Start with auto-reload (requires nodemon)
npm run worker       # Start email worker
npm run prisma:studio # Open Prisma database GUI
```

### Database

```bash
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Create migration
npm run prisma:db-push         # Push schema to database
npm run prisma:db-seed         # Seed database (if seed.js exists)
```

### Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

### Docker

```bash
docker-compose up -d                    # Start services
docker-compose down                     # Stop services
docker-compose logs -f api              # View API logs
docker-compose logs -f worker           # View worker logs
docker-compose ps                       # Show running containers
```

---

## 🔐 Authentication

### Register User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'

# Save TOKEN from response
```

### Login User

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Copy token for subsequent requests
```

### Use Token in Requests

```bash
curl http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📦 Products API

### Get All Products

```bash
curl "http://localhost:3000/products"

# With filters:
curl "http://localhost:3000/products?category=electronics&sortBy=price&sortOrder=asc&page=1&limit=10"
```

### Create Product (Admin)

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "Laptop",
    "description": "Gaming laptop",
    "price": 1299.99,
    "category": "electronics",
    "stockQuantity": 50
  }'
```

### Update Product (Admin)

```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "price": 1199.99,
    "stockQuantity": 40
  }'
```

### Delete Product (Admin)

```bash
curl -X DELETE http://localhost:3000/products/1 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🛒 Shopping Cart API

### View Cart

```bash
curl http://localhost:3000/cart \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Add to Cart

```bash
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "productId": 1,
    "quantity": 2
  }'
```

### Remove from Cart

```bash
curl -X DELETE http://localhost:3000/cart/items/CART_ITEM_ID \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Clear Cart

```bash
curl -X DELETE http://localhost:3000/cart \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

---

## 📦 Orders API

### Create Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Get User Orders

```bash
curl http://localhost:3000/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# With pagination:
curl "http://localhost:3000/orders?page=1&limit=10" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Get Order Details

```bash
curl http://localhost:3000/orders/1 \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

---

## 🗄️ Database

### Connection Info

Check `.env` for:

- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection

### Common Queries

**View users table**:

```bash
npm run prisma:studio
# Navigate to User model
```

**Reset database**:

```bash
# Careful! This deletes all data
npx prisma migrate reset
```

**View logs**:

```bash
# PostgreSQL logs
docker logs postgres-ecommerce

# Redis logs
docker logs redis-ecommerce
```

---

## 🐛 Debugging

### Enable Debug Logging

Add to `.env`:

```env
DEBUG=ecommerce:*
```

Or in code:

```javascript
const debug = require("debug")("ecommerce:service");
debug("Message:", data);
```

### Check Server Health

```bash
curl http://localhost:3000/health
```

### View API Logs

```bash
# Terminal where API is running shows logs
# Or use pm2 (if using PM2):
pm2 logs api
```

### View Worker Logs

```bash
# Terminal where worker is running shows logs
# Or use pm2:
pm2 logs worker
```

### Test Database Connection

```bash
psql -h localhost -U user -d ecommerce_db
# Then type \dt to see tables
```

### Test Redis Connection

```bash
redis-cli ping
# Should respond: PONG
```

---

## 🔑 Environment Variables

### Required

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db
JWT_SECRET=your-secret-key-min-32-chars
```

### Optional (with defaults)

```env
PORT=3000
NODE_ENV=development
JWT_EXPIRATION=24h
REDIS_URL=redis://localhost:6379
```

### For Email (if enabled)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ecommerce.com
```

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    /* actual data */
  }
}
```

### Error Response

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Validation Error

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid"
    }
  ]
}
```

---

## 🚨 Common Errors & Solutions

### Error: "DATABASE_URL not set"

**Solution**: Add to `.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db
```

### Error: "Redis connection failed"

**Solution**: Verify Redis is running

```bash
redis-cli ping
# Should respond: PONG
```

### Error: "Port 3000 already in use"

**Solution**: Use different port

```bash
PORT=3001 npm start
```

### Error: "Permission denied" on Unix

**Solution**: Make file executable

```bash
chmod +x server.js
```

### Error: "Cannot find module"

**Solution**: Install dependencies

```bash
npm install
```

### Error: "VERSION_MISMATCH" on order

**Solution**: This is expected with concurrent purchases

- The first order succeeds
- Subsequent orders fail with version mismatch
- User can retry with refreshed data

---

## 📱 Testing with cURL

### Save Token to Variable

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' | jq -r '.data.token')

echo $TOKEN
```

### Use Saved Token

```bash
curl http://localhost:3000/cart \
  -H "Authorization: Bearer $TOKEN"
```

### Pretty Print JSON

```bash
curl http://localhost:3000/products | jq '.'
```

---

## 🔄 Git Workflow

### Initial Setup

```bash
git init
git add .
git commit -m "Initial commit: E-commerce API"
git remote add origin <repo-url>
git push -u origin main
```

### Regular Development

```bash
git status
git add .
git commit -m "Feature: Add X"
git push origin main
```

### Create Feature Branch

```bash
git checkout -b feature/product-search
# Make changes
git add .
git commit -m "Add product search"
git push origin feature/product-search
```

---

## 📋 Checklist for New Feature

1. **Create route** in `src/routes/`
2. **Create controller** in `src/controllers/`
3. **Create service** in `src/services/`
4. **Create repository** in `src/repositories/` (if needed)
5. **Add validation rules** in controller
6. **Add tests** in `tests/` folder
7. **Update documentation** in `docs/`
8. **Test endpoint** with cURL or Postman
9. **Commit to git** with clear message
10. **Push to repository**

---

## 🎯 Performance Tips

1. **Enable caching** for frequently accessed products
2. **Use pagination** for large lists
3. **Add indexes** for frequently filtered columns
4. **Monitor logs** for slow queries
5. **Use Redis** for session data
6. **Batch operations** when possible
7. **Limit concurrent connections** in production

---

## 🔒 Security Tips

1. **Change JWT_SECRET** in production
2. **Use HTTPS** always in production
3. **Validate all inputs** (already implemented)
4. **Hash passwords** (already implemented)
5. **Limit rate** of API calls
6. **Monitor logs** for suspicious activity
7. **Backup data** regularly
8. **Update dependencies** regularly: `npm update`

---

## 📞 Getting Help

- **Setup Issues**: See `README.md`
- **API Questions**: See `docs/API.md`
- **Testing Help**: See `docs/TESTING.md`
- **Deployment**: See `docs/DEPLOYMENT.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Database**: See `docs/ERD.md`

---

**Last Updated**: December 9, 2025
