# Output — Login & Signup UI and API

What you see when you run the app and use the auth flow.

---

## 1. Login page (http://localhost:5173/ or /login)

```
        ┌─────────────────────────────────────────┐
        │                                         │
        │              Login                      │
        │     Sign in to your Prok account        │
        │                                         │
        │  Username                               │
        │  ┌─────────────────────────────────┐   │
        │  │ Your username                    │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  Email                                  │
        │  ┌─────────────────────────────────┐   │
        │  │ you@example.com                   │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  Password                               │
        │  ┌─────────────────────────────────┐   │
        │  │ ••••••••                         │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  ┌─────────────────────────────────┐   │
        │  │           Login                  │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  Don't have an account? Sign up         │
        │                                         │
        └─────────────────────────────────────────┘
```

- **Fields:** Username, Email, Password (use at least one of Username or Email).
- **Button:** Login.
- **Link:** “Don’t have an account? **Sign up**” → goes to Sign up page.

---

## 2. Sign up page (http://localhost:5173/signup)

```
        ┌─────────────────────────────────────────┐
        │                                         │
        │              Sign Up                    │
        │     Create your Prok account            │
        │                                         │
        │  Username                               │
        │  ┌─────────────────────────────────┐   │
        │  │ johndoe                          │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  Email                                  │
        │  ┌─────────────────────────────────┐   │
        │  │ you@example.com                   │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  Password                               │
        │  ┌─────────────────────────────────┐   │
        │  │ ••••••••                         │   │
        │  └─────────────────────────────────┘   │
        │  At least 8 characters                  │
        │                                         │
        │  Confirm password                       │
        │  ┌─────────────────────────────────┐   │
        │  │ ••••••••                         │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  ┌─────────────────────────────────┐   │
        │  │          Sign up                │   │
        │  └─────────────────────────────────┘   │
        │                                         │
        │  Already have an account? Login         │
        │                                         │
        └─────────────────────────────────────────┘
```

- **Fields:** Username, Email, Password, Confirm password.
- **Button:** Sign up.
- **Link:** “Already have an account? **Login**” → goes to Login page.

---

## 3. API output examples

### Login — success (200)

**Request:**
```http
POST http://localhost:5000/auth/login
Content-Type: application/json

{"email": "alice@example.com", "password": "securepass123"}
```

**Response:**
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

### Signup — success (201)

**Request:**
```http
POST http://localhost:5000/auth/signup
Content-Type: application/json

{"username": "alice", "email": "alice@example.com", "password": "securepass123"}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Validation error (e.g. 400)

**Example — empty password on login:**
```json
{"error": "Password is required."}
```

**Example — passwords don’t match on signup (frontend only):**
```
Password and Confirm password do not match.
```

---

## 4. How to run and see this output

**Terminal 1 — Backend**
```bash
cd app/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```
→ API at **http://localhost:5000**

**Terminal 2 — Frontend**
```bash
cd app/frontend
npm install
npm run dev
```
→ UI at **http://localhost:5173** (or the URL Vite prints)

Then open **http://localhost:5173** in your browser to see the Login page; click **Sign up** to see the Sign up page. Use the Network tab (or curl) to see the API output above.
