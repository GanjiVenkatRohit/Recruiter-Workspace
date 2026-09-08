# Product Requirements Document (PRD)
## Recruiter Workspace

**Version:** 1.0  
**Date:** August 5, 2026  
**Status:** Active Development  

---

## 1. Problem Statement & Goals

### Problem
Recruitment teams managing large candidate pipelines (10,000–100,000+ profiles) face three critical operational failures with existing ATS platforms:

1. **Scale Collapse** — Most ATS tools degrade or become unusable beyond a few thousand candidate records, forcing recruiters to split data across systems or resort to spreadsheets.
2. **No Real-Time Collaboration** — When multiple recruiters edit candidate profiles simultaneously, existing tools either silently overwrite changes or require manual refresh cycles, causing data loss.
3. **Connectivity Fragility** — Recruiters working from career fairs, remote locations, or unreliable networks lose all in-progress work when connectivity drops.

### Goals

| Goal | Description |
|------|-------------|
| **G1 — Scale** | Deliver a virtualized candidate list that smoothly renders 100,000+ profiles without UI jank. |
| **G2 — Automation** | Eliminate manual data entry through NLP-driven resume parsing (PDF/DOCX). |
| **G3 — Real-Time Sync** | Enable multiple concurrent recruiters to collaborate in real time with instant update propagation. |
| **G4 — Offline Resilience** | Queue edits offline in IndexedDB and replay them on reconnect with conflict resolution. |
| **G5 — Search Performance** | Provide sub-100ms full-text search with relevance ranking across profiles and resume content. |

---

## 2. Target Users / Personas

### Persona 1: **The Hands-On Recruiter** (Primary)
- **Role:** Staffing Specialist or Talent Acquisition Partner
- **Context:** Manages 200–5,000 active candidates across multiple open requisitions
- **Pain Points:** Manual resume data entry, losing edits during poor WiFi, slow search across large databases
- **Goals:** Upload resumes and have profiles auto-populated; quickly find candidates by skill, location, or keyword; edit profiles knowing changes are safe

### Persona 2: **The Team Lead / Recruiting Manager** (Secondary)
- **Role:** TA Manager or Recruitment Operations Lead
- **Context:** Oversees a team of 3–15 recruiters working on the same candidate pool
- **Pain Points:** Two recruiters unknowingly overwriting each other's candidate notes; no visibility into pipeline processing status
- **Goals:** Trust that concurrent edits are safely merged; monitor upload throughput and system health via dashboards

### Persona 3: **The Event / Field Recruiter** (Secondary)
- **Role:** University / Event Recruiter operating from booths, campuses, and remote sites
- **Context:** Collects resumes offline and needs to batch-upload later
- **Pain Points:** Losing candidate updates made during connectivity outages
- **Goals:** Continue editing profiles offline; have edits automatically sync when back online with clear conflict indicators

---

## 3. Key Features & Functionality

### Must-Have (P0)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Virtualized Candidate List** | Fixed-height row virtualization supporting smooth scroll through 100K+ candidate records. |
| F2 | **Automated Resume Parsing** | Upload PDF/DOCX → NLP pipeline extracts name, email, phone, skills, location, experience. Multi-phase background processing via Bull queues. |
| F3 | **Resumable Chunked Uploads** | Large files split into chunks with concurrent upload (max 4), session tracking, and SHA-256 deduplication. Uploads resume from the last successfully received chunk. |
| F4 | **Full-Text Search** | PostgreSQL GIN-indexed `tsvector` search with ranked results, `ts_headline` snippet highlighting, and keyset cursor pagination. |
| F5 | **Real-Time Collaboration** | WebSocket-driven live broadcasts with echo suppression (`_originClientId`), 50ms message batching, and sequence-ordered event delivery. |
| F6 | **Offline-First Editing** | IndexedDB-backed mutation queue. On reconnect, sync replay engine applies changes with optimistic concurrency control and field-level conflict resolution. |
| F7 | **Candidate CRUD** | Create, read, update, and delete candidate profiles with version-checked optimistic concurrency. |
| F8 | **JWT Authentication** | Secure token-based auth for REST API and WebSocket connections. Registration and login flows for recruiter accounts. |
| F9 | **Conflict Resolution Modal** | Side-by-side comparison UI when overlapping fields are edited by multiple users, allowing manual field-level merge decisions. |

### Nice-to-Have (P1)

| # | Feature | Description |
|---|---------|-------------|
| F10 | **Metrics Dashboard** | Displays query latency percentiles (p95/p99), cache hit rates, queue throughput, upload trends, and storage usage. |
| F11 | **Filter Bar** | Status, location, skill, and resume-present filters on the candidate list. |
| F12 | **Resume Preview Modal** | In-browser preview of uploaded resumes (DOCX→HTML conversion via Mammoth, inline PDF rendering, raw text fallback). |
| F13 | **Connection Status Monitor** | Visual indicator blending REST `/health` pings and WebSocket heartbeats to show true connectivity state. |
| F14 | **Upload Progress Tracking** | SSE-streamed real-time status updates through the validation → extraction → NLP → indexing pipeline. |
| F15 | **Profile Page** | Dedicated candidate profile view with parsed resume data and extraction metadata. |
| F16 | **Settings Page** | Application-level configuration UI. |

### Planned (P2 — Roadmap)

| # | Feature | Description |
|---|---------|-------------|
| F17 | **AWS S3 Storage** | Migrate resume files from local disk to S3 (schema already includes `resume_s3_key`). |
| F18 | **Role-Based Permissions** | Admin, Team Lead, Recruiter permission tiers. |
| F19 | **LLM-Augmented Parsing** | Optional OpenAI/Gemini/Anthropic integration for higher-accuracy entity extraction. |
| F20 | **Bulk CSV/Excel Export** | Export filtered candidate lists. |
| F21 | **Email Notifications** | Automated alerts for pipeline failures and conflict resolutions. |

---

## 4. User Stories / Use Cases

### UC1: Resume Upload & Auto-Parse
> **As a** recruiter, **I want to** drag-and-drop a candidate's resume into the application **so that** the system automatically creates/updates a candidate profile with extracted contact info, skills, and experience — without me typing anything manually.

**Acceptance Criteria:**
- PDF and DOCX files accepted
- File is chunked, uploaded with resumability, validated, and parsed in background
- Extracted fields (name, email, phone, skills, location, experience) are merged into the candidate record
- Duplicate resumes are detected by SHA-256 checksum
- Real-time progress is streamed to the client via SSE
- If a candidate with the same email already exists, the new data is merged into the existing profile

### UC2: Full-Text Search
> **As a** recruiter, **I want to** search across all candidate profiles and resume content by keyword **so that** I can instantly find relevant candidates for a new position.

**Acceptance Criteria:**
- Search queries execute against GIN-indexed `tsvector` columns
- Results are ranked by relevance score
- Matching snippets from resume text are highlighted
- Keyset cursor pagination supports browsing large result sets
- Search results are cached (LRU, 500 queries, 30s TTL) for repeat queries

### UC3: Real-Time Collaborative Editing
> **As a** recruiting team member, **I want to** see changes made by my colleagues appear instantly on my screen **so that** we stay synchronized without manually refreshing.

**Acceptance Criteria:**
- Candidate profile edits broadcast via WebSocket within 50ms batching window
- My own edits are not echoed back to me (echo suppression via `_originClientId`)
- Events are processed in order by `sequence_id`
- On reconnection, missed events are caught up via `GET /api/events/since/:sequenceId`

### UC4: Offline Edit & Sync
> **As a** field recruiter at an event with unreliable WiFi, **I want to** continue editing candidate profiles offline **so that** my changes are automatically applied when I'm back online.

**Acceptance Criteria:**
- Edits are queued in IndexedDB with the candidate's `base_version`
- On reconnection, `POST /api/sync/replay` replays all queued actions
- Non-overlapping field changes are auto-merged; overlapping changes trigger the Conflict Resolution Modal
- Each action result is categorized: `applied`, `merged`, or `conflict`

### UC5: Metrics & Monitoring
> **As a** team lead, **I want to** monitor system health and processing throughput **so that** I can identify bottlenecks and ensure the pipeline is running smoothly.

**Acceptance Criteria:**
- Dashboard shows total candidates, upload counts, success rate, average processing time, storage usage
- Search metrics provide p95/p99 latency and cache hit rates
- Upload trend chart shows the last 7 days

---

## 5. Success Metrics / KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Candidate List Render** | <16ms per frame at 100K rows | Browser DevTools FPS profiling |
| **Search Latency (p95)** | <50ms | `GET /search/metrics` endpoint |
| **Resume Parse Throughput** | Process 100 resumes/hour (single worker) | Upload pipeline audit logs |
| **WebSocket Broadcast Latency** | <100ms from edit to remote render | Sequence event timestamps |
| **Offline Sync Success Rate** | >95% auto-merged (no conflict modal) | `offline_action_log.conflict = false` ratio |
| **Upload Resumability** | 100% of interrupted uploads resume successfully | Upload session `chunks_received` completeness |
| **Cache Hit Rate** | >40% for repeated search queries | `GET /search/metrics` endpoint |

---

## 6. Out-of-Scope Items

The following are explicitly **not** part of the current release:

| Item | Reason |
|------|--------|
| **Multi-tenancy / Organization accounts** | Single-tenant deployment for now; planned for P2 |
| **Native mobile apps (iOS/Android)** | The web app is responsive, but native apps are not targeted |
| **Interview scheduling / Calendar integration** | Candidate management scope only; no ATS pipeline beyond profile management |
| **Email/SMS communication from the platform** | Future roadmap; currently no outbound messaging |
| **Advanced analytics / BI reporting** | Basic metrics dashboard only; no advanced data warehousing |
| **Third-party ATS integrations** | No import/export with Greenhouse, Lever, Workday, etc. |
| **Internationalization (i18n)** | English-only interface |
| **GDPR/SOC2 compliance features** | No data retention policies, right-to-erasure workflows, or audit-grade logging beyond pipeline audit |
| **Cloud deployment automation** | Docker Compose provided; no Terraform/CDK/Kubernetes manifests |
