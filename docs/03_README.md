# README
## Recruiter Workspace

**A real-time, collaborative candidate management platform with automated resume parsing, full-text search, and offline-first synchronization — built to handle 100,000+ candidate profiles.**

---

## Project Overview

Recruiter Workspace is a full-stack recruitment operations platform that lets teams upload, parse, search, and collaboratively manage candidate profiles at scale. It replaces manual data entry with NLP-driven resume extraction (PDF and DOCX), provides instant ranked search powered by PostgreSQL full-text indexing, and keeps multiple concurrent recruiters synchronized in real time via WebSocket broadcasts with offline conflict resolution.

### Feature Highlights

- **Virtualized Candidate List** — Smooth scrolling through 100K+ rows via fixed-height row virtualization
- **Automated Resume Parsing** — Upload PDF/DOCX; NLP pipeline auto-extracts name, email, phone, skills, location, experience
- **Resumable Chunked Uploads** — Large files split into chunks with session tracking, concurrent upload, and SHA-256 deduplication
- **Full-Text Search** — GIN-indexed PostgreSQL `tsvector` with ranked results, highlighted snippets, and cursor pagination
- **Real-Time Collaboration** — WebSocket broadcasts with echo suppression, 50ms batching, and sequence-ordered delivery
- **Offline-First Editing** — IndexedDB queue with sync replay and field-level conflict resolution
- **Metrics Dashboard** — Query latency percentiles, cache hit rates, upload trends, and storage monitoring

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | Required for both client and server |
| **PostgreSQL** | 14+ (16 recommended) | Must be running and accessible |
| **Redis** | 7+ | Required for Bull queues; can be skipped (see below) |
| **Docker** *(optional)* | 20+ | Only needed for Docker Compose deployment |
| **Git** | 2.30+ | For cloning the repository |

> **To skip Redis:** Set `REDIS_URL=mock` in `server/.env`. This uses an in-memory queue — no Redis installation needed. Suitable for development and single-instance deployments.

---

## Setup / Installation

### Option A: Docker Compose (Recommended)

Spins up PostgreSQL, Redis, API server, pipeline workers, and React client behind an Nginx reverse proxy.

```bash
# Clone the repository
git clone <repository-url>
cd recruiter-workspace

# Start all services
docker-compose up -d --build
```

The application is available at **`http://localhost`** (port 80).

| Container | Port | Role |
|-----------|------|------|
| `rw-nginx` | 80 | Reverse proxy (entry point) |
| `rw-server` | 3000 | Express API + WebSocket |
| `rw-upload-orchestrator` | 3001 | Upload credential validation |
| `rw-processor` | 3002 | Bull queue workers |
| `rw-search-service` | 3003 | Full-text search service |
| `rw-event-system` | 3004 | SSE event broker |
| `rw-postgres` | 5432 | PostgreSQL database |
| `rw-redis` | 6379 | Redis |

---

### Option B: Manual Local Setup

#### 1. Clone and install dependencies

```bash
git clone <repository-url>
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

Edit `server/.env` with your database credentials:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/recruiter_workspace
JWT_SECRET=replace_with_a_strong_random_secret
REDIS_URL=mock
LOG_LEVEL=info
```

The client reads a minimal `.env`:

```env
VITE_API_URL=http://localhost:4000
```

#### 3. Create the database

```bash
# Using psql
createdb recruiter_workspace

# Or via psql CLI
psql -U postgres -c "CREATE DATABASE recruiter_workspace;"
```

#### 4. Run database migrations

```bash
cd server
npm run db:migrate
```

This executes migrations `000` through `014`, creating all tables, indexes, and triggers.

#### 5. (Optional) Seed sample data

```bash
npm run db:seed          # Populates ~10,000 mock candidate profiles
```

---

## How to Run the Project Locally

You need **two terminals** — one for the server, one for the client.

### Terminal 1 — Server

```bash
cd server
npm run dev
```

The API starts on **`http://localhost:4000`**. All services run in a single process:

| Service | URL |
|---------|-----|
| REST API | `http://localhost:4000/api/*` |
| Upload Orchestrator | `http://localhost:4000/orchestrator/*` |
| Search | `http://localhost:4000/search/*` |
| Events (SSE) | `http://localhost:4000/events/*` |
| WebSocket | `ws://localhost:4000` |
| Health Check | `http://localhost:4000/health` |
| Processor Workers | Bull queues (background, same process) |

### Terminal 2 — Client

```bash
cd client
npm run dev
```

The UI opens at **`http://localhost:5173`**.

### Common Workflows

**Upload a resume:**
1. Open the dashboard at `http://localhost:5173`
2. Log in or register a recruiter account
3. Select a candidate or create a new one
4. Drag and drop a `.pdf` or `.docx` file into the Upload Panel
5. The file is chunked, uploaded, validated, parsed, and indexed automatically — progress streams via SSE

**Search candidates:**
1. Navigate to the Search page
2. Type a query (e.g., `React senior developer`)
3. Results are ranked by relevance with highlighted matching snippets

**Collaborative editing:**
1. Open the application in two browser windows
2. Edit a candidate profile in one window — the change appears instantly in the other
3. If both windows edit the same field simultaneously, a conflict resolution modal appears

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | HTTP port for Express server |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (`postgresql://user:pass@host:port/db`) |
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing (use a strong random value) |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis URL for Bull queues; set to `mock` for in-memory queues |
| `LOG_LEVEL` | No | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `AWS_REGION` | No | `us-east-1` | AWS region (for future S3 integration) |
| `S3_BUCKET_NAME` | No | — | S3 bucket name (for future cloud resume storage) |

---

## Folder / File Structure

```
recruiter-workspace/
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                      # Root component: routing, auth, themes, sidebar
│   │   ├── App.css                      # Application-wide styles & layouts
│   │   ├── main.jsx                     # Vite entry point
│   │   ├── index.css                    # CSS custom properties & theme tokens
│   │   ├── apiClient.js                 # Fetch wrapper with JWT auth header
│   │   ├── auth.js                      # Token management (localStorage)
│   │   ├── config.js                    # VITE_API_URL and env config
│   │   │
│   │   ├── components/
│   │   │   ├── AuthPages.jsx            # Login & registration UI
│   │   │   ├── CandidateList.jsx        # Virtualized candidate table (100K+ rows)
│   │   │   ├── CandidateDetailPanel.jsx # Slide-out profile editor
│   │   │   ├── AddCandidateForm.jsx     # New candidate creation modal
│   │   │   ├── ConflictResolutionModal.jsx # Side-by-side merge conflict UI
│   │   │   ├── FilterBar.jsx            # Status/location/skills filtering
│   │   │   ├── SearchPage.jsx           # Full-text search interface
│   │   │   ├── MetricsDashboardPage.jsx # Performance charts dashboard
│   │   │   ├── ProfilePage.jsx          # Candidate profile detail view
│   │   │   ├── SettingsPage.jsx         # Application settings
│   │   │   ├── UploadPanel.jsx          # Drag-and-drop resume upload
│   │   │   ├── UploadStatusTracker.jsx  # Real-time pipeline progress
│   │   │   ├── ConnectionStatus.jsx     # Online/offline indicator
│   │   │   ├── ResumeModal.jsx          # In-browser resume preview
│   │   │   ├── ShaderBackground.jsx     # WebGL animated background
│   │   │   ├── ToastContainer.jsx       # Toast notification system
│   │   │   ├── PanelRight.jsx           # Right sidebar component
│   │   │   ├── ProtectedRoute.jsx       # Auth guard wrapper
│   │   │   ├── Pagination.jsx           # Pagination controls
│   │   │   └── __tests__/              # Component unit tests
│   │   │
│   │   ├── utils/
│   │   │   ├── webSocketClient.js       # WS connection, batching, echo suppression
│   │   │   ├── offlineQueue.js          # IndexedDB offline mutation queue
│   │   │   ├── syncManager.js           # Offline replay & conflict handling
│   │   │   ├── resumableUpload.js       # Chunked upload client logic
│   │   │   ├── connectivityStatus.js    # Network state detection
│   │   │   ├── toast.js                 # Toast helper
│   │   │   └── __tests__/              # Utility unit tests
│   │   │
│   │   └── contexts/
│   │       └── WebSocketContext.jsx     # React context for WS client
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── jest.config.cjs
│   └── babel.config.cjs
│
├── server/                              # Node.js backend (Express)
│   ├── src/
│   │   ├── index.js                     # Express server, all routes, DB boot
│   │   ├── config.js                    # Environment variable loader
│   │   ├── db.js                        # PostgreSQL connection pool
│   │   ├── storage.js                   # File chunk assembly & disk management
│   │   ├── websocket.js                 # WebSocket gateway (auth, broadcast)
│   │   ├── events.js                    # Domain event helpers
│   │   │
│   │   ├── pipeline/
│   │   │   ├── orchestrator.js          # Upload lifecycle (tokens, validation)
│   │   │   ├── processor.js             # Bull worker bootstrap
│   │   │   ├── queues.js                # Bull queue definitions & listeners
│   │   │   ├── resumeParser.js          # NLP entity extraction (21KB of rules)
│   │   │   ├── search.js               # FTS query builder, LRU cache, pagination
│   │   │   ├── eventSystem.js           # SSE broker for pipeline events
│   │   │   └── workers/
│   │   │       ├── validation.worker.js # File integrity checks
│   │   │       ├── processing.worker.js # Text extraction + NLP + DB merge
│   │   │       ├── indexing.worker.js   # Search vector computation
│   │   │       └── deadletter.worker.js # Failed job recovery
│   │   │
│   │   └── __tests__/                   # Server unit tests
│   │
│   ├── migrations/                      # SQL migrations (000–014)
│   │   ├── 000_create_schema.sql
│   │   ├── 001_init.sql                 # Core candidates & events tables
│   │   ├── 002_auth.sql                 # Recruiters auth table
│   │   ├── 003_unique_candidates.sql
│   │   ├── ...
│   │   ├── 011_search_indexes.sql       # GIN & composite indexes
│   │   ├── 012_update_candidates_trigger.sql # Enhanced search vector trigger
│   │   ├── 013_add_parsed_data_to_resume_content.sql
│   │   └── 014_add_experience_column.sql
│   │
│   ├── scripts/
│   │   ├── migrate.js                   # Migration runner
│   │   ├── seed.js                      # 10K mock candidate seeder
│   │   └── seed_recruiters.js           # Demo recruiter accounts
│   │
│   └── package.json
│
├── infrastructure/
│   └── docs/                            # Infrastructure documentation
│
├── uploads/                             # Resume file storage (gitignored)
├── docker-compose.yml                   # Multi-service Docker orchestration
├── nginx.conf                           # Reverse proxy configuration
├── DESIGN.md                            # Detailed HLD/LLD system design
├── setup.md                             # Quick-start setup guide
└── .gitignore
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

## Contribution Guidelines

Contributions are welcome. Here's how to get started:

### Process

1. **Fork** the repository
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** — ensure they follow the existing code style
4. **Write or update tests** for any new functionality
5. **Run the test suites** to verify nothing is broken:
   ```bash
   cd server && npm test
   cd ../client && npm test
   ```
6. **Commit** with a clear, descriptive message:
   ```bash
   git commit -m "feat: add bulk candidate export to CSV"
   ```
7. **Push** and open a **Pull Request** against `main`

### Coding Standards

| Area | Convention |
|------|-----------|
| **Server JavaScript** | CommonJS (`require`) |
| **Client JavaScript** | ES Modules (`import`) |
| **CSS** | Vanilla CSS with HSL custom properties. No CSS frameworks. |
| **Variables/Functions** | `camelCase` |
| **React Components** | `PascalCase` |
| **Database Columns** | `snake_case` |
| **Commits** | [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, etc.) |

### Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/Node.js version
- Relevant logs or screenshots

---

## License

This project is licensed under the **ISC License**.
