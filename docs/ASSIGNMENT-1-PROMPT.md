# Assignment 1: Development Environment & Initial Project Structure — Reusable Prompt

Use this prompt to set up the development environment and implement the first assignment for the professional networking application.

---

## Goal

Set up the development environment and create the initial project structure for a professional networking application.

## Learning Outcomes

- Set up development environment
- Initialize project structure
- Configure basic dependencies
- Create initial documentation
- Understand project architecture
- Set up version control

---

## Tasks

### 1. Git: Create and switch to a new branch

**Never work directly on master.** Create a new branch for this assignment.

```bash
git checkout master
git pull origin master
git checkout -b assignment-1-setup-and-auth-ui
```

### 2. Install dependencies

**Frontend** (one terminal):

```bash
cd app/frontend
npm install
```

**Backend** (another terminal):

```bash
cd app/backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend implementation

**Login page/component**

- Inputs: username (or email) and password
- Action: "Login" button to submit credentials
- Navigation: link to redirect to "Signup" page
- Validation: client-side checks so required fields are not empty

**Signup page/component**

- Inputs: username, email, password, confirm_password
- Action: "Signup" button to register a new user
- Navigation: link to redirect to "Login" page
- Validation:
  - Required field checks for all inputs
  - Password length ≥ 8 characters
  - password and confirm_password must match

### 4. Run the application

**Backend** (one terminal):

```bash
cd app/backend
source venv/bin/activate
flask run
```

**Frontend** (another terminal):

```bash
cd app/frontend
npm run dev
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000  

### 5. Testing

- Test form validation (required fields, password length, password match)
- Test responsive design

---

## Git workflow

**Develop and save progress:**

```bash
git status
git add .
git commit -m "Assignment 1: Brief description of changes"
```

**Push to remote:**

```bash
git push -u origin assignment-1-setup-and-auth-ui
```

**After assignment is complete:**

```bash
git checkout master
git pull origin master
git merge assignment-1-setup-and-auth-ui
git push origin master
```

---

## One-shot prompt (copy-paste for an AI)

```
Set up the development environment and implement Assignment 1 for the professional networking app in this repo.

1. Create and switch to branch assignment-1-setup-and-auth-ui (do not work on master).
2. Install dependencies: in app/frontend run npm install; in app/backend create a venv, activate it, and pip install -r requirements.txt.
3. Implement Login page: username/email and password inputs, Login button, link to Signup, client-side validation (required fields not empty).
4. Implement Signup page: username, email, password, confirm_password inputs, Signup button, link to Login, validation: all required, password min 8 chars, password and confirm_password must match.
5. Ensure the app runs with backend (flask run in app/backend) and frontend (npm run dev in app/frontend). Frontend at localhost:3000, backend at localhost:5000.
6. Add brief instructions for testing form validation and responsive design.

Follow the Git workflow: commit with descriptive messages, push the branch, and document how to merge into master after completion.
```

---

*Paths in this document assume frontend and backend live under `app/frontend` and `app/backend`.*
