# Auth API Output — `api/auth.py`

Example **inputs** and **outputs** for each route in `app/backend/api/auth.py`.

---

## 1. POST `/auth/signup`

**Request**
```http
POST /auth/signup HTTP/1.1
Content-Type: application/json

{"username": "alice", "email": "alice@example.com", "password": "securepass123"}
```

**Success (201 Created)**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTczOTk0MjAwMCwianRpIjoiYWJjZGVmIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6MSwiZXhwIjoxNzM5OTQ1NjAwfQ.signature"
}
```

**Error — missing field (400)**
```json
{"error": "Email is required"}
```

**Error — short password (400)**
```json
{"error": "Password must be at least 8 characters"}
```

**Error — username taken (409)**
```json
{"error": "Username already taken"}
```

**Error — email already registered (409)**
```json
{"error": "Email already registered"}
```

---

## 2. POST `/auth/login`

**Request (by email)**
```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{"email": "alice@example.com", "password": "securepass123"}
```

**Request (by username)**
```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{"username": "alice", "password": "securepass123"}
```

**Success (200 OK)**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Error — missing credentials (400)**
```json
{"error": "Email or username is required"}
```
or
```json
{"error": "Password is required"}
```

**Error — wrong credentials (401)**
```json
{"error": "Invalid email/username or password"}
```

---

## 3. GET `/auth/me`

**Request**
```http
GET /auth/me HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Success (200 OK)**
```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Error — no/invalid token (401)**
```json
{"msg": "Missing Authorization Header"}
```
or
```json
{"msg": "Token has expired"}
```

**Error — user not found (404)**
```json
{"error": "User not found"}
```

---

## Quick curl examples

```bash
# Signup
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"securepass123"}'

# Login (save token from response)
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"securepass123"}'

# Me (replace YOUR_ACCESS_TOKEN)
curl http://localhost:5000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

This is the output you get from each handler in `auth.py` for the given inputs.
