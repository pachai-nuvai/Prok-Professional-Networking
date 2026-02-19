# Full-Stack Program & Output — Prok Professional Networking

This document describes the full-stack auth flow, how to run it, and example API inputs/outputs.

---

## 1. Project structure (relevant parts)

```
app/
├── backend/                 # Flask API
│   ├── main.py              # App entry, CORS, JWT, db, blueprints
│   ├── config.py            # SECRET_KEY, DB URL, JWT config
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py          # User model, password hashing
│   ├── api/
│   │   ├── __init__.py
│   │   └── auth.py          # POST /auth/signup, /auth/login, GET /auth/me
│   └── requirements.txt
│
└── frontend/                # React + Vite + TypeScript
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx   # user, token, login(), signup(), logout()
    │   ├── components/auth/
    │   │   ├── Login.tsx        # Email/username + password, validation, link to Signup
    │   │   ├── Signup.tsx       # Username, email, password, confirm, validation, link to Login
    │   │   └── api.ts           # authApi.login(), authApi.signup()
    │   └── routes/index.tsx     # /, /login, /signup, /profile, ...
    └── package.json
```

---

## 2. How to run

### Backend (Terminal 1)

```bash
cd app/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

- Server: **http://localhost:5000**
- DB: SQLite file `app/backend/prok.db` by default (set `DATABASE_URL` for MySQL).

### Frontend (Terminal 2)

```bash
cd app/frontend
npm install
npm run dev
```

- App: **http://localhost:5173** (Vite default) or **http://localhost:3000** if configured.

---

## 3. API endpoints and I/O

Base URL: `http://localhost:5000`

### 3.1 Signup — `POST /auth/signup`

**Request**

```http
POST /auth/signup HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Success response (201)**

```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Error examples**

- 400 — missing field or password &lt; 8 chars:

```json
{ "error": "Password must be at least 8 characters" }
```

- 409 — username or email already taken:

```json
{ "error": "Email already registered" }
```

---

### 3.2 Login — `POST /auth/login`

**Request (email)**

```http
POST /auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Request (username)**

```http
POST /auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "username": "johndoe",
  "password": "secret123"
}
```

**Success response (200)**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Error (401)**

```json
{ "error": "Invalid email/username or password" }
```

---

### 3.3 Current user — `GET /auth/me` (protected)

**Request**

```http
GET /auth/me HTTP/1.1
Host: localhost:5000
Authorization: Bearer <access_token>
```

**Success response (200)**

```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

---

## 4. Frontend behavior (output)

- **Login page (`/` or `/login`)**
  - Inputs: Email or username, Password.
  - Validation: both required (client-side).
  - Submit → `POST /auth/login` → on success: store token and user, redirect to `/profile`.
  - Link to Signup.

- **Signup page (`/signup`)**
  - Inputs: Username, Email, Password, Confirm password.
  - Validation: all required; password ≥ 8 characters; password === confirm (client-side).
  - Submit → `POST /auth/signup` → on success: store token and user, redirect to `/profile`.
  - Link to Login.

- **Auth state**
  - Stored in `AuthContext` and `localStorage` (token + user). After login/signup, user is considered logged in and can visit protected routes (e.g. `/profile`).

---

## 5. Quick test with curl

```bash
# Signup
curl -s -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","email":"john@example.com","password":"secret123"}'

# Login
curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'

# Use the returned access_token for /auth/me (replace TOKEN)
curl -s http://localhost:5000/auth/me -H "Authorization: Bearer TOKEN"
```

---

## 6. Summary

| Layer   | Tech              | Purpose                                      |
|--------|-------------------|----------------------------------------------|
| Backend| Flask, SQLAlchemy | User model, signup/login, JWT, SQLite/MySQL  |
| API    | JSON REST         | `/auth/signup`, `/auth/login`, `/auth/me`   |
| Frontend | React, Vite, TS | Login/Signup forms, validation, AuthContext |
| Output | Browser + curl   | UI at localhost:5173 (or 3000), API at :5000 |

This is the full-stack program and its expected output for the auth assignment.
