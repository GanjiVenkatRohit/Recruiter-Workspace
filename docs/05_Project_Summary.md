# Project Summary
## Recruiter Workspace

---

## What It Is

Recruiter Workspace is a **full-stack, real-time candidate management platform** that enables recruitment teams to upload, parse, search, and collaboratively manage candidate profiles at scale — handling 100,000+ records with smooth UI performance, automated NLP-driven resume parsing, and offline-first editing with conflict resolution.

---

## Why It Matters

Existing ATS platforms fail recruitment teams in three critical ways:

1. **They don't scale.** Most tools degrade beyond a few thousand records, forcing data fragmentation across spreadsheets and systems.
2. **They don't collaborate.** When multiple recruiters edit the same candidate simultaneously, changes are silently overwritten.
3. **They don't handle connectivity loss.** Field recruiters at career fairs and events lose all in-progress work when WiFi drops.

Recruiter Workspace solves all three with virtualized rendering (100K+ row scrolling), WebSocket-powered real-time sync (with field-level conflict resolution), and an IndexedDB offline queue that replays changes on reconnect.

---

## Who It's For

| Persona | Role | Primary Need |
|---------|------|-------------|
| **Hands-On Recruiter** | TA Specialist | Upload resumes → auto-populate profiles; fast keyword search |
| **Team Lead** | TA Manager | Trust that concurrent team edits are safely merged; monitor pipeline health |
| **Field Recruiter** | Event/University Recruiter | Continue editing offline; auto-sync on reconnect |

---

## How It Works (Technical Overview)

### Architecture
- **Frontend:** React 19 SPA (Vite 8) with custom row virtualization, IndexedDB offline queue, and WebSocket client with echo suppression and 50ms event batching
- **Backend:** Monolithic Node.js/Express 5 process combining REST API, WebSocket gateway, SSE event broker, and Bull queue workers
- **Database:** PostgreSQL 16 with GIN-indexed full-text search (`tsvector`), 12 tables, optimistic concurrency control via row versioning
- **Queue:** Bull (Redis-backed) with 4 worker stages: validation → text extraction → NLP parsing → search indexing
- **Infrastructure:** Docker Compose with Nginx reverse proxy for production; single-process mode for development

### Key Data Flows

| Flow | Description |
|------|-------------|
| **Resume Upload** | Client chunks file → server assembles → SHA-256 dedup → enqueues validation job → NLP parses name/email/skills/experience → updates search index → SSE streams progress |
| **Collaborative Sync** | Edit broadcasts via WebSocket → all clients receive (echo suppressed) → events ordered by `sequence_id` → missed events caught up on reconnect |
| **Offline Edit** | Edits queued in IndexedDB with `base_version` → on reconnect, `POST /api/sync/replay` → auto-merge non-overlapping fields; conflict modal for overlapping fields |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7, Lucide Icons, Vanilla CSS (HSL) |
| Backend | Node.js 18+, Express 5, `ws` WebSocket, JWT + bcrypt |
| Database | PostgreSQL 16 (FTS, GIN indexes, triggers) |
| Queue | Bull 4.16 (Redis 7 or in-memory mock) |
| NLP | Compromise.js 14, Natural 8, Mammoth.js, pdf-parse |
| Infrastructure | Docker Compose, Nginx, Pino logging |

### API Surface

The system exposes **25+ REST endpoints** organized across 7 domains:

| Domain | Key Endpoints |
|--------|--------------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login` |
| **Candidates** | `GET/POST/PUT/DELETE /api/candidates`, `/api/candidates/:id/parsed-resume` |
| **Search** | `GET /search/candidates?q=...` |
| **Upload** | `POST /orchestrator/credentials`, `/api/uploads/start`, `PUT chunk/:index`, `POST /complete` |
| **Sync** | `POST /api/sync/replay`, `GET /api/events/since/:sequenceId` |
| **Events** | `GET /events/stream` (SSE) |
| **Metrics** | `GET /api/dashboard/stats`, `GET /search/metrics` |

Plus a **WebSocket** protocol (`ws://localhost:4000`) for real-time event broadcasting.

---

## Current Status

### What's Working
- ✅ Full candidate CRUD with optimistic concurrency control
- ✅ JWT authentication (register, login, protected routes)
- ✅ Resumable chunked file uploads with SHA-256 deduplication
- ✅ Multi-phase NLP resume parsing (PDF + DOCX)
- ✅ PostgreSQL full-text search with GIN indexes, ranking, and highlighting
- ✅ WebSocket real-time sync with echo suppression and batching
- ✅ Offline-first editing with IndexedDB queue and sync replay
- ✅ Conflict resolution modal (side-by-side field-level merge)
- ✅ Metrics dashboard (upload stats, search performance, storage)
- ✅ Docker Compose deployment configuration
- ✅ Server and client test suites (Jest + Testing Library)
- ✅ 15 database migrations (000–014)

### Known Limitations
- NLP resume parser uses heuristic rules and a static skill dictionary (~80 entries) — extraction accuracy varies with non-standard resume formats
- `REDIS_URL=mock` mode does not persist jobs across server restarts
- Docker Compose uses default database credentials (not production-safe)
- CORS is currently permissive (`*`) — needs production restriction
- No rate limiting on authentication endpoints

---

## Next Steps (Roadmap)

| Priority | Item | Description |
|----------|------|-------------|
| **P1** | AWS S3 Integration | Migrate resume storage from local filesystem to S3 (schema already supports `resume_s3_key`) |
| **P1** | Role-Based Permissions | Admin, Team Lead, Recruiter permission tiers with access controls |
| **P2** | LLM-Augmented Parsing | Optional OpenAI/Gemini/Anthropic integration for higher NLP accuracy |
| **P2** | Bulk CSV/Excel Export | Export filtered candidate lists |
| **P2** | Email Notifications | Automated alerts for pipeline failures and conflict resolutions |
| **P3** | CORS Hardening | Restrict to known origins |
| **P3** | Rate Limiting | Add rate limiting to auth and upload endpoints |
| **P3** | Production Secrets | Externalize JWT_SECRET and DB credentials via secrets management |

---

> **Full documentation set:**
> - [01_PRD.md](file:///C:/Users/ganji/.gemini/antigravity-ide/brain/fbd201b6-d643-4fa8-befa-4bd839181201/01_PRD.md) — Product Requirements Document
> - [02_Architecture.md](file:///C:/Users/ganji/.gemini/antigravity-ide/brain/fbd201b6-d643-4fa8-befa-4bd839181201/02_Architecture.md) — Architecture Document
> - [03_README.md](file:///C:/Users/ganji/.gemini/antigravity-ide/brain/fbd201b6-d643-4fa8-befa-4bd839181201/03_README.md) — README
> - [04_API_Documentation.md](file:///C:/Users/ganji/.gemini/antigravity-ide/brain/fbd201b6-d643-4fa8-befa-4bd839181201/04_API_Documentation.md) — API Documentation
> - [05_Project_Summary.md](file:///C:/Users/ganji/.gemini/antigravity-ide/brain/fbd201b6-d643-4fa8-befa-4bd839181201/05_Project_Summary.md) — This document
