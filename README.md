# Recruiter Workspace

**A real-time, collaborative candidate management platform with automated resume parsing, full-text search, and offline-first synchronization — built to handle 100,000+ candidate profiles.**

![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Overview

Recruiter Workspace is a full-stack recruitment operations platform that lets teams upload, parse, search, and collaboratively manage candidate profiles at scale. It replaces manual data entry with NLP-driven resume extraction (PDF and DOCX), provides instant prefix search powered by PostgreSQL full-text indexing, and keeps multiple concurrent recruiters synchronized in real time via WebSocket broadcasts with offline conflict resolution.

The system exists because existing ATS tools either collapse under large datasets, lack real-time collaboration, or force recruiters to lose work when connectivity drops. Recruiter Workspace solves all three.

---

## Demo / Screenshots

> **[ADD: link to live demo or hosted staging environment]**
>
> **[ADD: GIF or screenshot of the candidate dashboard, search page, and upload panel]**

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Folder Structure](#folder-structure)
- [Roadmap / Known Issues](#roadmap--known-issues)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments / Credits](#acknowledgments--credits)
- [Contact / Support](#contact--support)

---

## Features

- **Virtualized Candidate List** — Smoothly scroll through 100,000+ candidate profiles using fixed-height row virtualization with zero jank.
- **Automated Resume Parsing** — Upload PDF or DOCX resumes; the NLP pipeline (Compromise.js + Natural) auto-extracts name, email, phone, skills, location, and years of experience.
- **Resumable Chunked Uploads** — Large files are split into chunks with concurrent upload, session tracking, and SHA-256 deduplication. Uploads resume from where they left off.
- **PostgreSQL Full-Text Search** — Instant ranked search across candidate profiles and resume content using GIN-indexed `tsvector` columns, with text highlighting and keyset cursor pagination.
- **Real-Time Collaboration** — WebSocket-driven live updates across all connected clients with echo suppression, 50ms message batching, and sequence-ordered event delivery.
- **Offline-First Editing** — Edits are queued in IndexedDB when offline. On reconnection, a sync replay engine merges changes using optimistic concurrency control with field-level conflict resolution.
- **Multi-Phase Background Pipeline** — Bull queue workers handle validation → text extraction → NLP parsing → search indexing, with dead-letter recovery and SSE progress streaming.
- **Search Performance Metrics** — Built-in metrics dashboard showing query latency percentiles (p95/p99), cache hit rates, and queue throughput.

---

## Tech Stack

| Layer                | Technology                           | Purpose                                                              |
| -------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| **Frontend**         | React 19, Vite 8                     | Component-based SPA with fast HMR dev server                         |
| **Styling**          | Vanilla CSS (HSL custom properties)  | Dark/light theming, micro-animations, zero framework overhead        |
| **Icons**            | Lucide React                         | Lightweight SVG icon library                                         |
| **Routing**          | React Router DOM v7                  | Client-side navigation across dashboard, search, metrics, profile    |
| **Backend**          | Node.js, Express 5                   | REST API, SSE streams, chunked upload handling                       |
| **Real-Time**        | WebSocket (`ws`)                     | Low-latency bidirectional sync across clients                        |
| **Database**         | PostgreSQL 16                        | Relational storage, full-text search (GIN indexes), triggers         |
| **Queue System**     | Bull (Redis-backed)                  | Async job processing with retries, backoff, and dead-letter queues   |
| **NLP / Extraction** | Compromise.js, Natural, Mammoth, pdf-parse | Resume text extraction and heuristic entity parsing            |
| **Auth**             | JWT + bcrypt                         | Token-based authentication for REST and WebSocket connections        |
| **Logging**          | Pino                                 | Structured JSON logging with configurable levels                     |
| **Containerization** | Docker Compose, Nginx                | Multi-service orchestration with reverse proxy routing               |

---

## Architecture

The application is structured as a **React SPA** communicating with a **monolithic Node.js backend** that combines REST APIs, WebSocket gateway, SSE event streams, and Bull queue workers in a single process, backed by **PostgreSQL** and **Redis**.

```
┌─────────────────────────────┐     ┌──────────────────────────────────────────┐
│     React Client (Vite)     │     │       Node.js Backend (Express)          │
│                             │     │                                          │
│  ┌────────────────────────┐ │     │  ┌──────────┐  ┌───────────────────────┐ │
│  │ Virtualized Candidate  │ │REST │  │ REST API │  │  Pipeline Workers     │ │
│  │ List + Detail Panel    │◄├────►│  │ (CRUD,   │  │  ┌─────────────────┐  │ │
│  └────────────────────────┘ │     │  │  Search, │  │  │ Validation      │  │ │
│  ┌────────────────────────┐ │     │  │  Sync)   │  │  │ Processing/NLP  │  │ │
│  │ Offline Queue          │ │ WS  │  └──────────┘  │  │ Indexing        │  │ │
│  │ (IndexedDB)            │◄├────►│  ┌──────────┐  │  │ Dead-Letter     │  │ │
│  └────────────────────────┘ │     │  │WebSocket │  │  └─────────────────┘  │ │
│  ┌────────────────────────┐ │     │  │ Gateway  │  └───────────────────────┘ │
│  │ Sync Manager +         │ │ SSE │  └──────────┘  ┌───────────────────────┐ │
│  │ Conflict Resolution    │◄├────►│  ┌──────────┐  │  Storage Manager      │ │
│  └────────────────────────┘ │     │  │SSE Broker│  │  (Chunked Uploads)    │ │
│  ┌────────────────────────┐ │     │  └──────────┘  └───────────────────────┘ │
│  │ Connectivity Monitor   │ │     └──────────┬───────────────┬───────────────┘
│  └────────────────────────┘ │                │               │
└─────────────────────────────┘                ▼               ▼
                                    ┌──────────────┐  ┌────────────────┐
                                    │ PostgreSQL   │  │ Redis          │
                                    │ (FTS, GIN    │  │ (Bull Queues)  │
                                    │  indexes)    │  │                │
                                    └──────────────┘  └────────────────┘
```

### Key Data Flows

1. **Resume Upload** — Client splits file into chunks → server writes to temp directory → assembles on completion → enqueues validation job.
2. **Parsing Pipeline** — Validation worker → text extraction (mammoth/pdf-parse) → NLP parsing (name, email, skills, experience) → search indexing → SSE progress updates.
3. **Collaborative Sync** — Edits broadcast via WebSocket → offline edits queued in IndexedDB → replayed on reconnect → version-checked with field-level merge or conflict modal.

> For the complete system design with Mermaid diagrams, see [DESIGN.md](./DESIGN.md).

---

## Prerequisites

| Requirement       | Version | Notes                                                             |
| ----------------- | ------- | ----------------------------------------------------------------- |
| **Node.js**       | 18+     | Required for both client and server                               |
| **PostgreSQL**    | 14+     | Must be running and accessible (16 recommended)                   |
| **Redis**         | 7+      | Required for Bull queues. Can be skipped — see [Configuration](#configuration) |
| **Docker** *(optional)* | 20+  | Only needed for Docker Compose deployment                         |
| **Git**           | 2.30+   | For cloning the repository                                        |

---

## Installation

### Option A: Docker Compose (Recommended)

This spins up PostgreSQL, Redis, the API server, and the React client behind an Nginx reverse proxy — all in one command.

```bash
# Clone the repository
git clone [ADD: your repository URL here]
cd recruiter-workspace

# Start all services
docker-compose up -d --build
```

The application is available at **`http://localhost`**.

---

### Option B: Manual Local Setup

#### 1. Clone and install dependencies

```bash
git clone [ADD: your repository URL here]
cd recruiter-workspace

# Server
cd server
npm install

# Client
cd ../client
npm install
```

#### 2. Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your database credentials (see [Configuration](#configuration)).

#### 3. Run database migrations

```bash
cd server
npm run db:migrate
```

#### 4. (Optional) Seed sample data

```bash
# Populates ~10,000 mock candidate profiles
npm run db:seed
```

#### 5. Start the server

```bash
cd server
npm run dev
```

The API starts on **`http://localhost:4000`**.

#### 6. Start the client

```bash
cd client
npm run dev
```

The UI opens at **`http://localhost:5173`**.

---

## Configuration

All server-side configuration is managed through `server/.env`. Copy from `.env.example` to get started.

| Variable           | Required | Default               | Description                                                                 |
| ------------------ | -------- | --------------------- | --------------------------------------------------------------------------- |
| `PORT`             | No       | `4000`                | HTTP port for the Express server                                            |
| `DATABASE_URL`     | **Yes**  | —                     | PostgreSQL connection string. Format: `postgresql://user:password@host:port/dbname` |
| `JWT_SECRET`       | **Yes**  | —                     | Secret key for signing and verifying JWT tokens. Use a strong random value  |
| `REDIS_URL`        | No       | `redis://127.0.0.1:6379` | Redis connection URL for Bull queues. Set to `mock` to use in-memory queues without a Redis installation |
| `LOG_LEVEL`        | No       | `info`                | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)         |
| `AWS_REGION`       | No       | `us-east-1`           | AWS region for future S3 integration                                        |
| `S3_BUCKET_NAME`   | No       | —                     | S3 bucket name for future cloud resume storage                              |

**Example `server/.env`:**

```env
PORT=4000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/recruiter_workspace
JWT_SECRET=replace_with_a_strong_random_secret
REDIS_URL=mock
LOG_LEVEL=info
```

> **Tip:** Set `REDIS_URL=mock` to run without Redis. This uses an in-memory queue — suitable for development and single-instance deployments.

The client reads a minimal `.env` for the API base URL:

```env
VITE_API_URL=http://localhost:4000
```

---

## Usage

### Running the Application

After completing [Installation](#installation), you need two terminals:

**Terminal 1 — Server:**

```bash
cd server
npm run dev
```

**Terminal 2 — Client:**

```bash
cd client
npm run dev
```

### Server Endpoints

Once running, the server exposes the following service endpoints on port 4000:

| Service          | URL                              |
| ---------------- | -------------------------------- |
| REST API         | `http://localhost:4000/api/*`     |
| Upload Orchestrator | `http://localhost:4000/orchestrator/*` |
| Search           | `http://localhost:4000/search/*`  |
| Events (SSE)     | `http://localhost:4000/events/*`  |
| WebSocket        | `ws://localhost:4000`            |
| Health Check     | `http://localhost:4000/health`   |

### Common Workflows

**Upload a resume:**
1. Open the dashboard at `http://localhost:5173`.
2. Select a candidate or create a new one.
3. Drag and drop a `.pdf` or `.docx` file into the Upload Panel.
4. The file is chunked, uploaded, validated, parsed, and indexed automatically — progress is streamed via SSE.

**Search candidates:**
1. Navigate to the Search page.
2. Type a query (e.g., `React senior developer`).
3. Results are ranked by relevance with highlighted matching snippets from resume content.

**Collaborative editing:**
1. Open the application in two browser windows.
2. Edit a candidate profile in one window — the change appears instantly in the other.
3. If both windows edit the same field simultaneously, a conflict resolution modal appears.

---

## API Reference

### Health & Metrics

| Method | Endpoint                        | Description                                     |
| ------ | ------------------------------- | ----------------------------------------------- |
| `GET`  | `/health`                       | Returns `{ "status": "ok" }`                    |
| `GET`  | `/search/metrics`               | Query performance stats (p95, p99, cache rates)  |
| `GET`  | `/events/stream/stats`          | Active SSE subscriber count and event frequency  |

### Candidate CRUD

| Method   | Endpoint                        | Description                                     |
| -------- | ------------------------------- | ----------------------------------------------- |
| `GET`    | `/api/candidates`               | List candidates (supports keyset cursor pagination) |
| `POST`   | `/api/candidates`               | Create a new candidate profile                  |
| `GET`    | `/api/candidates/:id`           | Retrieve a single candidate by ID               |
| `PUT`    | `/api/candidates/:id`           | Update candidate fields (version-checked)       |
| `DELETE` | `/api/candidates/:id`           | Delete a candidate profile                      |

### Search

| Method | Endpoint                        | Description                                     |
| ------ | ------------------------------- | ----------------------------------------------- |
| `GET`  | `/search/candidates?q=<query>`  | Full-text search with ranking, highlighting, and cursor pagination |

### Upload Pipeline

| Method | Endpoint                                        | Description                                     |
| ------ | ------------------------------------------------ | ----------------------------------------------- |
| `POST` | `/orchestrator/credentials`                      | Request a secure upload token                   |
| `POST` | `/orchestrator/validate`                         | Validate token and file metadata                |
| `POST` | `/api/uploads/start`                             | Initialize a chunked upload session             |
| `PUT`  | `/api/uploads/:sessionId/chunk/:index`           | Upload a single binary chunk                    |
| `POST` | `/api/uploads/:sessionId/complete`               | Finalize and assemble all chunks                |
| `GET`  | `/orchestrator/audit/:uploadId`                  | Retrieve full parsing audit trail for an upload |

### Sync & Events

| Method | Endpoint                                  | Description                                     |
| ------ | ----------------------------------------- | ----------------------------------------------- |
| `POST` | `/api/sync/replay`                        | Replay offline-queued mutations with conflict detection |
| `GET`  | `/api/events/since/:sequenceId`           | Fetch missed events since a given sequence ID   |
| `GET`  | `/events/stream`                          | SSE stream for pipeline progress events         |

### Example: Search Request

```bash
curl "http://localhost:4000/search/candidates?q=react+developer&limit=20"
```

```json
{
  "candidates": [
    {
      "id": "a1b2c3d4-...",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "skills": ["React", "TypeScript", "Node.js"],
      "experience": 5,
      "headline": "...experienced <b>React</b> <b>developer</b> with...",
      "search_rank": 0.89
    }
  ],
  "next_cursor": "eyJ1cGRhdGVkX2F0Ijo...",
  "total": 142
}
```

---

## Running Tests

### Server Tests

```bash
cd server
npm test
```

Runs Jest tests covering API route handlers, pipeline worker logic, and utility functions.

### Client Tests

```bash
cd client
npm test
```

Runs Jest tests with `@testing-library/react` covering component rendering, connectivity status logic, offline queue behavior, and WebSocket client functions.

### Linting (Client)

```bash
cd client
npm run lint
```

---

## Deployment

### Docker Compose (Production-like)

The `docker-compose.yml` orchestrates all services:

```bash
docker-compose up -d --build
```

| Container              | Port | Role                                   |
| ---------------------- | ---- | -------------------------------------- |
| `rw-nginx`             | 80   | Reverse proxy (entry point)            |
| `rw-server`            | 3000 | Express API + WebSocket                |
| `rw-upload-orchestrator` | 3001 | Upload credential validation         |
| `rw-processor`         | 3002 | Bull queue workers                     |
| `rw-search-service`    | 3003 | Full-text search service               |
| `rw-event-system`      | 3004 | SSE event broker                       |
| `rw-postgres`          | 5432 | PostgreSQL database                    |
| `rw-redis`             | 6379 | Redis (Bull queue backing store)       |

Nginx routes traffic based on URL path:

- `/api/*`, `/ws` → `rw-server`
- `/orchestrator/*` → `rw-upload-orchestrator`
- `/search/*` → `rw-search-service`
- `/events/*` → `rw-event-system`

> **Note:** For production deployments, replace default credentials in `docker-compose.yml` and use proper secrets management for `JWT_SECRET` and database passwords.

---

## Folder Structure

```
recruiter-workspace/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthPages.jsx        # Login & registration UI
│   │   │   ├── CandidateList.jsx    # Virtualized candidate table (100k+ rows)
│   │   │   ├── CandidateDetailPanel.jsx  # Slide-out profile editor
│   │   │   ├── ConflictResolutionModal.jsx  # Side-by-side merge conflict UI
│   │   │   ├── FilterBar.jsx        # Status/location/skills filtering
│   │   │   ├── MetricsDashboardPage.jsx  # Search & queue performance charts
│   │   │   ├── SearchPage.jsx       # Full-text search interface
│   │   │   ├── SettingsPage.jsx     # Application settings
│   │   │   ├── UploadPanel.jsx      # Drag-and-drop resume upload
│   │   │   ├── UploadStatusTracker.jsx  # Real-time pipeline progress
│   │   │   └── __tests__/           # Component unit tests
│   │   ├── utils/
│   │   │   ├── connectivityStatus.js  # Network state detection
│   │   │   ├── offlineQueue.js      # IndexedDB offline mutation queue
│   │   │   ├── resumableUpload.js   # Chunked upload client logic
│   │   │   ├── syncManager.js       # Offline replay & conflict handling
│   │   │   ├── webSocketClient.js   # WS connection, batching, echo suppression
│   │   │   └── __tests__/           # Utility unit tests
│   │   ├── contexts/                # React context providers
│   │   ├── App.jsx                  # Root component (routing, auth, themes)
│   │   ├── index.css                # CSS custom properties & theme tokens
│   │   └── main.jsx                 # Vite entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Node.js backend (Express)
│   ├── src/
│   │   ├── index.js                 # Express server, route setup, DB boot
│   │   ├── websocket.js             # WebSocket gateway (auth, broadcast, audit)
│   │   ├── storage.js               # File chunk assembly & disk management
│   │   ├── db.js                    # PostgreSQL connection pool
│   │   ├── config.js                # Environment variable loader
│   │   ├── events.js                # Domain event helpers
│   │   ├── pipeline/
│   │   │   ├── orchestrator.js      # Upload lifecycle (tokens, validation)
│   │   │   ├── processor.js         # Bull worker bootstrap
│   │   │   ├── queues.js            # Bull queue definitions & listeners
│   │   │   ├── resumeParser.js      # NLP entity extraction (name, skills, exp)
│   │   │   ├── search.js            # FTS query builder, caching, pagination
│   │   │   ├── eventSystem.js       # SSE broker for pipeline events
│   │   │   └── workers/
│   │   │       ├── validation.worker.js   # File integrity checks
│   │   │       ├── processing.worker.js   # Text extraction + NLP + DB merge
│   │   │       ├── indexing.worker.js     # Search vector computation
│   │   │       └── deadletter.worker.js   # Failed job recovery
│   │   └── __tests__/               # Server unit tests
│   ├── migrations/                  # SQL migrations (000–014)
│   │   ├── 001_init.sql             # Core candidates & events tables
│   │   ├── 002_auth.sql             # Recruiters auth table
│   │   ├── 011_search_indexes.sql   # GIN & composite indexes
│   │   ├── 012_update_candidates_trigger.sql  # Search vector trigger
│   │   └── ...
│   ├── scripts/
│   │   ├── migrate.js               # Migration runner
│   │   ├── seed.js                  # 10k mock candidate seeder
│   │   └── seed_recruiters.js       # Demo recruiter accounts
│   └── package.json
│
├── infrastructure/
│   └── docs/                        # Infrastructure documentation
│
├── uploads/                         # Resume file storage (gitignored)
├── docker-compose.yml               # Multi-service Docker orchestration
├── nginx.conf                       # Reverse proxy configuration
├── DESIGN.md                        # Detailed HLD/LLD system design
├── setup.md                         # Quick-start setup guide
└── .gitignore
```

---

## Roadmap / Known Issues

### Planned

- [ ] **AWS S3 Integration** — Migrate resume storage from local filesystem to S3 (schema already supports `resume_s3_key`).
- [ ] **Multi-Tenant Role Permissions** — Admin, team lead, and recruiter permission tiers.
- [ ] **LLM-Powered Parsing** — Optional integration with OpenAI/Gemini/Anthropic APIs to augment the local NLP parser for higher extraction accuracy.
- [ ] **Bulk Export** — CSV/Excel export of filtered candidate lists.
- [ ] **Email Notifications** — Automated alerts for pipeline failures and conflict resolutions.

### Known Limitations

- The NLP resume parser uses heuristic rules and a static skill dictionary (~80 entries). Extraction accuracy varies with non-standard resume formats.
- `REDIS_URL=mock` mode (in-memory queues) does not persist jobs across server restarts. Use a real Redis instance for production.
- The Docker Compose configuration uses default database credentials — not suitable for production without modification.

---

## Contributing

Contributions are welcome. Here's how to get started:

### Process

1. **Fork** the repository.
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** — ensure they follow the existing code style.
4. **Write or update tests** for any new functionality.
5. **Run the test suites** to verify nothing is broken:
   ```bash
   cd server && npm test
   cd ../client && npm test
   ```
6. **Commit** with a clear, descriptive message:
   ```bash
   git commit -m "feat: add bulk candidate export to CSV"
   ```
7. **Push** and open a **Pull Request** against `main`.

### Coding Standards

- **JavaScript** — CommonJS (`require`) on the server, ES Modules (`import`) on the client.
- **CSS** — Vanilla CSS with HSL custom properties. No CSS frameworks.
- **Naming** — `camelCase` for variables/functions, `PascalCase` for React components, `snake_case` for database columns.
- **Commits** — Use [Conventional Commits](https://www.conventionalcommits.org/) format (`feat:`, `fix:`, `docs:`, `refactor:`, etc.).

### Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/Node.js version
- Relevant logs or screenshots

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments / Credits

- **[Compromise.js](https://github.com/spencermountain/compromise)** — Lightweight NLP library for name and entity extraction.
- **[Natural](https://github.com/NaturalNode/natural)** — Tokenization and NLP utilities for Node.js.
- **[Bull](https://github.com/OptimalBits/bull)** — Redis-backed job queue for reliable async processing.
- **[Mammoth.js](https://github.com/mwilliamson/mammoth.js)** — DOCX-to-text conversion.
- **[pdf-parse](https://gitlab.com/nicolo.antoniazzi/pdf-parse)** — PDF text extraction.
- **[Lucide](https://lucide.dev/)** — Icon set used throughout the UI.
- **[Pino](https://github.com/pinojs/pino)** — Fast structured JSON logger.

---

## Contact / Support

- **Maintainer:** [ADD: your name]
- **Email:** [ADD: your email address]
- **Issues:** [ADD: link to repository issues page]

For bugs, feature requests, or questions, please [open an issue](ADD: link to issues).
