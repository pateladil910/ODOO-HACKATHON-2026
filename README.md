# Hackathon Production-Ready Boilerplate

Welcome to your production-ready boilerplate for the hackathon. This repository is built as a generic, fully dockerized foundation implementing a Node.js + Express backend, PostgreSQL database adapter, and a responsive glassmorphic HTML5/CSS3/Vanilla JS dashboard.

It is structured to comply with **MVC architecture**, **SOLID design principles**, and **Clean Code patterns**. All infrastructure setup is complete, meaning you only need to write your schema migrations, models, and UI scripts once the problem statement is announced.

---

## 1. Folder Structure Explained

```
/
├── backend/                    # Node.js + Express MVC REST API application
│   ├── .env.example            # Environment variables configuration template
│   ├── Dockerfile              # Docker image build configuration for the backend
│   ├── package.json            # Backend NPM script commands and dependency locks
│   ├── server.js               # Express application entrypoint (boots DB and starts server)
│   └── src/
│       ├── app.js              # Express app setup (CORS, parsers, logging, routes mounting)
│       ├── config/
│       │   └── db.js           # PostgreSQL Connection Pool & utility wrappers
│       ├── controllers/
│       │   └── placeholder.controller.js # Request-response route controller handlers
│       ├── db/
│       │   ├── init.sql        # Database schema seed file executed by Docker on init
│       │   └── migrations/
│       │       └── 001_initial_schema.sql # Standard reusable schema migration scripts
│       ├── middlewares/
│       │   ├── auth.middleware.js   # JWT authentication & API Key verification guards
│       │   ├── error.middleware.js  # Global express central error formatting handler
│       │   └── logger.middleware.js # Customized console request tracing utility
│       ├── models/
│       │   └── placeholder.model.js # Pure database operations and parameterized queries
│       ├── routes/
│       │   ├── index.js        # Main API router gateway aggregator
│       │   ├── health.routes.js     # Health diagnostics endpoint (uptime & DB status)
│       │   └── placeholder.routes.js # Resource REST routers for items and auth
│       └── utils/
│           ├── apiError.js     # Custom error standardizer wrapping HTTP status codes
│           ├── apiResponse.js  # Clean structured JSON response wrapper for successes
│           └── asyncHandler.js # Express middleware promise catch wrapper for async routes
├── frontend/                   # Client-side static user interface (HTML5 / CSS3 / Vanilla JS)
│   ├── index.html              # Marketing/Welcome landing page
│   ├── login.html              # Sleek floating login & registration toggle card
│   ├── dashboard.html          # Responsive control panel dashboard grid layout
│   ├── css/
│   │   ├── variables.css       # Core HSL color variables, animations and layout tokens
│   │   ├── style.css           # Global resets, buttons, glassmorphic cards & inputs
│   │   └── dashboard.css       # Sidebar structure, metrics widgets and data table styles
│   └── js/
│       ├── api.js              # Fetch client wrapper with authentication interceptors
│       ├── auth.js             # Local session, state management and route security guards
│       └── dashboard.js        # Dashboard view operations, search filters and CRUD modals
├── docker-compose.yml          # Container configuration for backend app & PostgreSQL engine
├── .gitignore                  # Git repository ignores (node_modules, logs, volumes, .env)
└── README.md                   # Documentation guide (this file)
```

---

## 2. How to Run Locally (Standard Node.js)

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- PostgreSQL database engine installed and running locally

### Setup Steps
1. **Initialize Backend Environment File:**
   Copy the example environment file inside the `/backend` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and update the database credentials (`DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_NAME`) to match your local installation.

2. **Initialize Local Database:**
   Log into your local PostgreSQL client and execute the SQL statements in [backend/src/db/init.sql](file:///e:/Odoo%20Hackathon%202026/backend/src/db/init.sql) to create the schema and seed mock values.

3. **Install Dependencies and Run Development Server:**
   Navigate into the backend folder, install npm libraries, and boot the server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The backend dev server will start using `nodemon` on `http://localhost:5000` with hot-reloading enabled.

4. **Access the Frontend App:**
   - **Method A (Integrated Static Server):** Open `http://localhost:5000` in your web browser. The Express server automatically serves the frontend directory static files out of the box.
   - **Method B (Separate Dev Server):** Open the `frontend` folder using any live-server extension (like VS Code's Live Server running on port 5500). The frontend `api.js` client automatically detects the port discrepancy and routes fetch requests directly to the backend at `http://localhost:5000/api/v1`.

---

## 3. How to Run with Docker (Recommended)

Docker Compose boots the entire stack (Node application + PostgreSQL database) with a single command, ensuring identical runtimes.

### Command Execution
1. Ensure Docker Desktop is running on your machine.
2. In the root directory, start the services:
   ```bash
   docker-compose up --build
   ```
3. To run containers in the background (detached mode):
   ```bash
   docker-compose up -d
   ```

### Verification & Management
- **Check Status Logs:**
  ```bash
  docker-compose logs -f
  ```
- **Stop Containers:**
  ```bash
  docker-compose down
  ```
- **Destroy Volume Cache (Wipe DB and rebuild fresh):**
  ```bash
  docker-compose down -v
  ```

---

## 4. How to Connect and Query PostgreSQL

Database logic resides within the `backend/src/config/db.js` connector. It utilizes `pg.Pool` to manage database client allocations.

### Execute Parameterized Queries (CRUD)
Always use parameterized values (`$1`, `$2`, etc.) to prevent SQL Injection vulnerabilities.
```javascript
const db = require('../config/db');

// Example SELECT query
const fetchItemById = async (itemId) => {
  const queryText = 'SELECT * FROM items WHERE id = $1;';
  const { rows } = await db.query(queryText, [itemId]);
  return rows[0] || null;
};
```

### Run Multi-Query Database Transactions
Use `getClient()` to check out an isolated client connection. Ensure you release it within a `finally` block to prevent socket leakage.
```javascript
const db = require('../config/db');

const createTransactionExample = async (title, email) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN'); // Start transaction
    
    // Query 1: Create User
    const userResult = await client.query('INSERT INTO users(email) VALUES($1) RETURNING id;', [email]);
    const userId = userResult.rows[0].id;
    
    // Query 2: Create Item linked to User
    await client.query('INSERT INTO items(title, created_by) VALUES($1, $2);', [title, userId]);
    
    await client.query('COMMIT'); // Commit all database edits
  } catch (error) {
    await client.query('ROLLBACK'); // Cancel changes on failure
    throw error;
  } finally {
    client.release(); // Return client back to the pool
  }
};
```

---

## 5. How to Deploy (Production)

1. **Host Backend Application:**
   Deploy the `backend` folder to platform hosts (Render, Heroku, AWS Elastic Beanstalk, DigitalOcean App Platform).
   Set `NODE_ENV=production` inside your configuration environment panel. The database connection pooling will automatically configure SSL connectivity handles for safety.

2. **Host Database Instance:**
   Spin up a managed PostgreSQL database (e.g. Supabase, Render PostgreSQL, AWS RDS, Neon DB).
   Copy the database connection URI string into your environment variables under `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT`.

3. **Host Frontend Static Client:**
   - **Option A (Integrated):** The backend hosts static files under `/api/v1` and static page indexes automatically via `express.static`. You only need to deploy the backend, and the entire app runs under one host.
   - **Option B (Decentralized):** Deploy the `frontend` folder to specialized static host providers (Netlify, Vercel, Cloudflare Pages, GitHub Pages) for ultra-fast CDN page caching. In `frontend/js/api.js`, you can modify or force the target URL to point to your live hosted Express domain name.

---

## 6. Recommended Git Workflow for a 4-Person Team

In an intense 8-hour hackathon, code conflicts can waste valuable time. Follow this structured branching workflow to coordinate developer tasks cleanly:

### Division of Roles (Example)
- **Developer 1 (Database / Devops):** Manages docker setups, SQL table migrations, models, and external API hooks.
- **Developer 2 (Backend APIs):** Writes controllers, middleware setups, and routing scripts.
- **Developer 3 (Frontend Layout/Design):** Integrates and styles core pages, views, charts, and modal assets.
- **Developer 4 (Frontend Logic/Integration):** Handles api wrappers, auth scripts, local session state, and form submissions.

### Branch Strategy
- **`main`**: The deployment branch. Only merge fully-tested, compilation-passing code.
- **`dev`**: The collaboration integration branch. Feature branches merge into `dev`.
- **`feature/xxx`**: Dedicated developer branches. Never write code directly to `main` or `dev`.

### Git Command Checklist
1. **Initialize Feature branch:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/user-profile-routes
   ```
2. **Commit Code incrementally:**
   Write descriptive commit tags:
   ```bash
   git add .
   git commit -m "feat(api): add profile endpoint and auth validation"
   ```
3. **Keep branches updated:**
   Rebase or merge `dev` daily into your feature branch before pushing to resolve conflicts early on your local machine:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout feature/user-profile-routes
   git merge dev
   ```
4. **Publish Branch & Submit Pull Request (PR):**
   Push the local branch to GitHub:
   ```bash
   git push origin feature/user-profile-routes
   ```
   Open a PR from `feature/user-profile-routes` into `dev` on GitHub. At least one teammate must inspect and approve it before merging.

---

## 7. Common Debugging Tips

### Postgres Container Boot Fails
- **Symptom:** `backend` container crashes or prints database connection attempts timeout warnings.
- **Cause:** Local Postgres engine is running on port 5432, causing a port conflict with Docker.
- **Fix:** Stop your local Postgres system service (`pg_ctl stop` or check Windows Services) or change `DB_PORT` in your root `.env` to `5433` to map Docker's database port separately.

### File changes do not hot-reload
- **Symptom:** Modifying backend JS files does not trigger nodemon refresh inside the running container.
- **Cause:** Volumes are not mounted properly, or Docker cached file metadata.
- **Fix:** Restart containers using `docker-compose down && docker-compose up --build`.

### Access Denied / CORS Errors
- **Symptom:** Frontend console shows blocking errors referencing `Access-Control-Allow-Origin`.
- **Fix:** Inspect `backend/src/app.js` and verify `cors()` config allows your client's hosting domain origin. In local development, the wildcard `*` is active, which should prevent these blockages.

### Admin Actions Fail (HTTP 403 Forbidden)
- **Symptom:** Deleting an item triggers a `403 Forbidden` response.
- **Fix:** Only users with `role: 'admin'` are allowed to execute delete endpoints. Log out and register a new user choosing **Administrator** in the signup role dropdown.

---

## 8. Security Best Practices for the Hackathon

1. **Do Not Commit Credentials:**
   Never commit your `.env` or raw password strings to GitHub. Ensure `.gitignore` ignores these.
2. **Use Parameterized SQL:**
   Never stitch query string variables together using template literals:
   - **Incorrect (Vulnerable to SQL Injection):** `db.query("SELECT * FROM users WHERE email = '" + req.body.email + "'")`
   - **Correct (Secure):** `db.query('SELECT * FROM users WHERE email = $1;', [req.body.email])`
3. **Secure Passwords (Salting):**
   Always salt and hash passwords using `bcryptjs` before inserting them into tables. Never save plain text passwords.
4. **JWT Verification:**
   Store the `JWT_SECRET` in `.env` configurations. Verify signature expiration dates before trust-parsing client payloads.
5. **Escape UI Content:**
   Use HTML escaping functions (provided in `dashboard.js`) when drawing user-generated data to prevent Cross-Site Scripting (XSS) injections in tables.
