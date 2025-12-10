# Deployment Guide

Complete guide for deploying E-Commerce API to production

## Prerequisites

- Node.js >= 16.0.0
- PostgreSQL (production database)
- Redis (production cache)
- Docker (optional, recommended)
- Cloud platform account (Heroku, AWS, DigitalOcean, etc.)

---

## Local Development Deployment

### 1. Environment Setup

Create `.env` file with production values:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (Local PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce_db"

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRATION=24h

# Redis
REDIS_URL="redis://localhost:6379"

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ecommerce.com
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
npm run prisma:db-push
```

Or with migrations:

```bash
npm run prisma:migrate
```

### 4. Start Services

Terminal 1 - API Server:

```bash
npm start
```

Terminal 2 - Email Worker:

```bash
npm run worker
```

Visit: http://localhost:3000/health

---

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run prisma:generate

# Runtime stage
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Create docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-ecommerce_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER:-user}:${DB_PASSWORD:-password}@postgres:5432/${DB_NAME:-ecommerce_db}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER:-user}:${DB_PASSWORD:-password}@postgres:5432/${DB_NAME:-ecommerce_db}
      REDIS_URL: redis://redis:6379
    command: npm run worker
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api
docker-compose logs -f worker

# Stop services
docker-compose down
```

---

## Heroku Deployment

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from: https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
heroku create ecommerce-api-prod
```

### 4. Add PostgreSQL

```bash
heroku addons:create heroku-postgresql:hobby-dev --app ecommerce-api-prod
```

### 5. Add Redis

```bash
heroku addons:create heroku-redis:premium-0 --app ecommerce-api-prod
```

### 6. Set Environment Variables

```bash
heroku config:set \
  JWT_SECRET="your-secret-key" \
  NODE_ENV="production" \
  --app ecommerce-api-prod
```

### 7. Create Procfile

```
web: npm start
worker: npm run worker
```

### 8. Deploy

```bash
git push heroku main
```

### 9. Check Logs

```bash
heroku logs --tail --app ecommerce-api-prod
```

---

## AWS Deployment (EC2)

### 1. Launch EC2 Instance

- AMI: Ubuntu Server 22.04 LTS
- Instance type: t3.medium (minimum)
- Security group: Allow ports 80, 443, 3000

### 2. Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 3. Clone Repository

```bash
cd /home/ubuntu
git clone <your-repo-url>
cd ecommerce-api
npm install
```

### 4. Setup Database

```bash
# Create PostgreSQL user and database
sudo -u postgres psql << EOF
CREATE USER ecommerce WITH PASSWORD 'strong-password';
CREATE DATABASE ecommerce_db OWNER ecommerce;
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce;
EOF

# Run migrations
npm run prisma:db-push
```

### 5. Create .env

```bash
cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://ecommerce:strong-password@localhost:5432/ecommerce_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION=24h
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password
EMAIL_FROM=noreply@ecommerce.com
EOF
```

### 6. Start with PM2

```bash
# Start API
pm2 start npm --name "api" -- start

# Start Worker
pm2 start npm --name "worker" -- run worker

# Save PM2 config
pm2 save

# Enable startup
pm2 startup
```

### 7. Setup Nginx Reverse Proxy

```bash
sudo apt install -y nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/ecommerce << EOF
upstream api {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Setup SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
sudo systemctl reload nginx
```

---

## DigitalOcean App Platform Deployment

### 1. Connect Repository

- Login to DigitalOcean
- Create new app
- Connect GitHub repository

### 2. Configure App Spec

```yaml
name: ecommerce-api
services:
  - name: api
    github:
      repo: your-username/ecommerce-api
      branch: main
    build_command: npm install && npm run prisma:generate && npm run prisma:db-push
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        scope: RUN_TIME
    http_port: 3000

  - name: worker
    github:
      repo: your-username/ecommerce-api
      branch: main
    build_command: npm install && npm run prisma:generate
    run_command: npm run worker
    envs:
      - key: NODE_ENV
        value: production

databases:
  - name: ecommerce_db
    engine: PG
    version: "15"

  - name: redis_cache
    engine: REDIS
    version: "7"
```

---

## Pre-Deployment Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Set NODE_ENV=production
- [ ] Configure email service credentials
- [ ] Setup database backups
- [ ] Configure Redis persistence
- [ ] Enable HTTPS/SSL
- [ ] Setup monitoring and logging
- [ ] Configure CI/CD pipeline
- [ ] Load test the application
- [ ] Create backup/disaster recovery plan
- [ ] Document deployment steps
- [ ] Setup health check monitoring

---

## Post-Deployment Checklist

- [ ] Verify all endpoints working
- [ ] Check database connectivity
- [ ] Test Redis caching
- [ ] Monitor error logs
- [ ] Verify email notifications
- [ ] Load test scenarios
- [ ] Test authentication flow
- [ ] Test concurrent operations
- [ ] Verify SSL/HTTPS
- [ ] Setup alerts and monitoring
- [ ] Document access procedures
- [ ] Train team on deployment

---

## Monitoring and Maintenance

### Health Checks

```bash
# API Health
curl https://your-api.com/health

# Database Check
curl https://your-api.com/health
```

### Logs

```bash
# Heroku
heroku logs --tail

# Docker
docker-compose logs -f api

# PM2
pm2 logs

# Systemd
journalctl -u ecommerce-api -f
```

### Backups

```bash
# PostgreSQL backup
pg_dump ecommerce_db > backup.sql

# Restore
psql ecommerce_db < backup.sql

# Redis backup
redis-cli BGSAVE
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Update database schema
npm run prisma:migrate

# Restart services
pm2 restart all
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U user -d ecommerce_db

# Check URL format
echo $DATABASE_URL
```

### Redis Connection Issues

```bash
# Test connection
redis-cli ping

# Check URL format
echo $REDIS_URL
```

### High Memory Usage

```bash
# Check Node processes
ps aux | grep node

# Enable memory monitoring
node --inspect server.js
```

### Email Not Sending

- Check EMAIL_USER and EMAIL_PASS
- Enable "Less secure app access" for Gmail
- Check email logs: `pm2 logs worker`

---

## Security Considerations

1. **Environment Variables**: Never commit `.env` to git
2. **JWT Secret**: Use 32+ character random string
3. **Database Credentials**: Use strong passwords
4. **HTTPS**: Always use SSL/TLS in production
5. **API Keys**: Rotate regularly
6. **Backups**: Automate daily backups
7. **Monitoring**: Setup alerts for errors
8. **Rate Limiting**: Consider adding in production
9. **CORS**: Configure for allowed origins only
10. **Dependencies**: Keep packages updated

---

**Last Updated**: December 9, 2025
