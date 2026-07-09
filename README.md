# recruiter-workspace

Monorepo containing the client and server for the Recruiter Workspace application.

## Project Structure

```
recruiter-workspace/
├── client/   — React front-end (Vite)
├── server/   — Node.js back-end (Express)
└── README.md
```

---

## client/

A React application scaffolded with **Vite**. Uses function components and hooks exclusively. React Router is installed for page navigation.

### Getting Started

```bash
cd client
npm install
npm run dev
```

The dev server starts at **http://localhost:5173** by default.

---

## server/

A Node.js application built with **Express**. Includes:

- **pg** — PostgreSQL client
- **ws** — WebSocket support
- **@aws-sdk/client-s3** & **@aws-sdk/lib-storage** — AWS S3 integration

### Getting Started

1. Copy `.env.example` to `.env` and fill in your connection details (especially `DATABASE_URL`):
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run migrations to initialize the database:
   ```bash
   npm run db:migrate
   ```

4. (Optional) Seed the database with 10,000 candidate records:
   ```bash
   npm run db:seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

The server starts at **http://localhost:4000** by default.

### Health Check

```
GET /health  →  { "status": "ok" }
```
