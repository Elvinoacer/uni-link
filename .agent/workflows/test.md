---
description: How to start and test the university social platform
---

# Testing Workflow

Follow these steps to start the entire system and verify it is working correctly.

## 1. Start Infrastructure (Databases)
Ensure Docker is running, then start all required databases:
// turbo
```bash
pnpm docker:up
```
Wait for about 30-60 seconds for all databases (PostgreSQL, MongoDB, Redis, etc.) to initialize properly.

## 2. Initialize Databases
Generate the Prisma client and push the schema to PostgreSQL:
// turbo
```bash
cd services/user-service && pnpm db:generate && pnpm db:push
```

## 3. Start Backend Services
You will need multiple terminal windows (or use background processes):

**Terminal 1: API Gateway**
```bash
pnpm dev:gateway
```

**Terminal 2: User Service**
```bash
pnpm dev:user-service
```

## 4. Verify Health Checks
Run these commands to check if the services are up:
```bash
# Check API Gateway
curl http://localhost:3000/health

# Check User Service (via Gateway)
curl http://localhost:3000/api/auth/health
```

## 5. Test Authentication
Register a test user to verify the database and auth flow:
```bash
curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "tester",
       "email": "test@uni.edu",
       "password": "password123",
       "displayName": "Test User"
     }'
```

## 6. Start Mobile App
Finally, start the Expo dev server:
```bash
pnpm dev:mobile
```
Scan the QR code with the Expo Go app on your phone or press `i` for iOS / `a` for Android simulator.
