# Recruiter Workspace — Setup Guide

## Running the Project

You only need **2 terminals** — one for the server, one for the client.

### Terminal 1 — Server (API + all pipelines)

```bash
cd "r:\Novelski\Recruiter Workspace\server"
npm run dev
```

Runs everything on **`http://localhost:4000`**:

| Service | URL |
|---|---|
| REST API | `http://localhost:4000/api/*` |
| Events SSE | `http://localhost:4000/events/*` |
| Orchestrator | `http://localhost:4000/orchestrator/*` |
| Search | `http://localhost:4000/search/*` |
| WebSocket | `ws://localhost:4000` |
| Processor Workers | Bull queues (background, same process) |

---

### Terminal 2 — Client (React frontend)

```bash
cd "r:\Novelski\Recruiter Workspace\client"
npm run dev
```

Opens the UI at **`http://localhost:5173`**

---

## First-Time Setup

Run these **once** before starting for the first time:

```bash
# Install server dependencies
cd "r:\Novelski\Recruiter Workspace\server"
npm install

# Run all DB migrations (creates all tables)
npm run db:migrate

# Install client dependencies
cd "r:\Novelski\Recruiter Workspace\client"
npm install
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js** 18+ | Required |
| **PostgreSQL** | Must be running locally. Configure `DATABASE_URL` in `server/.env` |
| **Redis** | Required for Bull queues. See note below to skip |

> **To skip Redis:** Open `server/.env` and set:
> ```
> REDIS_URL=mock
> ```
> This uses an in-memory queue — no Redis installation needed.

---

## Environment Variables

The server reads from `server/.env`. Key variables:

```env
# Server
PORT=4000

# PostgreSQL
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/recruiter_workspace

# JWT Auth
JWT_SECRET=your_secret_key

# Redis (Bull queues) — set to 'mock' to disable Redis
REDIS_URL=redis://127.0.0.1:6379

# Logging
LOG_LEVEL=info

# AWS (optional — for S3 resume storage)
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

---

## Architecture

All pipeline services run **in a single process** on port 4000:

```
server/
├── src/
│   ├── index.js              ← Main Express server
│   ├── pipeline/
│   │   ├── eventSystem.js    ← In-process event bus (SSE)
│   │   ├── orchestrator.js   ← Upload lifecycle management
│   │   ├── search.js         ← Full-text candidate search
│   │   ├── queues.js         ← Bull queue definitions
│   │   ├── processor.js      ← Worker bootstrap
│   │   └── workers/
│   │       ├── validation.worker.js
│   │       ├── processing.worker.js
│   │       ├── indexing.worker.js
│   │       └── deadletter.worker.js
│   └── ...
└── migrations/               ← SQL migrations (001–012)
```
