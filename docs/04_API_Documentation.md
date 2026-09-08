# API Documentation
## Recruiter Workspace

**Base URL:** `http://localhost:4000`  
**Authentication:** JWT Bearer Token (except auth endpoints and health check)  
**Content-Type:** `application/json` (except chunk upload which uses binary)

---

## Authentication

All endpoints except `/api/auth/register`, `/api/auth/login`, and `/health` require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are issued during login/registration and expire after **24 hours**.

---

## 1. Health & Metrics

### `GET /health`

Health check endpoint. No authentication required.

**Response:** `200 OK`
```json
{ "status": "ok" }
```

---

### `GET /search/metrics`

Query performance statistics including latency percentiles and cache hit rates.

**Response:** `200 OK`
```json
{
  "total_queries": 154,
  "avg_query_duration_ms": 12.5,
  "p95_query_duration_ms": 45.0,
  "p99_query_duration_ms": 120.0,
  "cache_hit_rate": 42.5,
  "queries_per_minute": 24,
  "slow_queries": 2
}
```

---

### `GET /events/stream/stats`

Active SSE subscriber count and event emission frequency.

**Response:** `200 OK`
```json
{
  "subscriberCount": 3,
  "eventFrequency": 12
}
```

---

### `GET /api/dashboard/stats`

Aggregated dashboard statistics including upload trends and storage usage.

**Response:** `200 OK`
```json
{
  "totalCandidates": 4523,
  "uploadedToday": 17,
  "processing": 2,
  "queued": 0,
  "completed": 312,
  "failed": 4,
  "successRate": 98.7,
  "avgProcessingTime": 3.2,
  "storageUsedMB": 145.6,
  "uploadsTrend": [
    { "date": "30 Jul", "count": 5 },
    { "date": "31 Jul", "count": 12 },
    { "date": "01 Aug", "count": 8 },
    { "date": "02 Aug", "count": 15 },
    { "date": "03 Aug", "count": 3 },
    { "date": "04 Aug", "count": 10 },
    { "date": "05 Aug", "count": 17 }
  ]
}
```

---

## 2. Authentication

### `POST /api/auth/register`

Create a new recruiter account.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Non-empty |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "Name, email, and password are required." }` | Missing required fields |
| `400` | `{ "error": "Invalid email format." }` | Invalid email |
| `400` | `{ "error": "Password must be at least 8 characters long." }` | Password too short |
| `409` | `{ "error": "Email is already registered." }` | Duplicate email |

**Example:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","password":"securepassword123"}'
```

---

### `POST /api/auth/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "Email and password are required." }` | Missing fields |
| `401` | `{ "error": "Invalid email or password." }` | Wrong credentials |

**Example:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"securepassword123"}'
```

---

## 3. Candidate CRUD

### `GET /api/candidates`

List candidates with keyset cursor pagination, filtering, and search.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `50` | Number of results per page |
| `cursor` | string | — | Base64-encoded cursor for next page |
| `search` | string | — | Full-text search query (prefix matching) |
| `status` | string | — | Filter by status (e.g., `Applied`, `Interviewing`, `Hired`, `Rejected`) |
| `skill` / `skills` | string | — | Comma-separated skill filter (e.g., `React,Node.js`) |
| `location` | string | — | Filter by location |
| `hasResume` | string | — | Set to `"true"` to filter candidates with resumes |

**Response:** `200 OK`
```json
{
  "candidates": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0123",
      "status": "Interviewing",
      "skills": ["React", "TypeScript", "Node.js"],
      "updated_at": "2026-08-04T14:30:00Z",
      "resume_s3_key": "uploads/resumes/a1b2c3d4.pdf",
      "experience": 5,
      "search_rank": 0.89,
      "resume_snippet": "...experienced <b>React</b> <b>developer</b> with..."
    }
  ],
  "nextCursor": "eyJpZCI6ImExYjJjM2Q0Li4uIiwic2VhcmNoX3JhbmsiOjAuODl9",
  "totalCount": 4523
}
```

> **Note:** `search_rank` and `resume_snippet` are only included when `search` parameter is provided. `totalCount` is only computed on the first page (no cursor).

**Example:**
```bash
# Basic list
curl http://localhost:4000/api/candidates \
  -H "Authorization: Bearer <token>"

# Search with filters
curl "http://localhost:4000/api/candidates?search=react+developer&status=Interviewing&limit=20" \
  -H "Authorization: Bearer <token>"

# Next page
curl "http://localhost:4000/api/candidates?cursor=eyJpZCI6Ii4uLiJ9" \
  -H "Authorization: Bearer <token>"
```

---

### `GET /api/candidates/:id`

Retrieve a single candidate by ID.

**Response:** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0123",
  "location": "San Francisco, CA",
  "skills": ["React", "TypeScript", "Node.js"],
  "status": "Interviewing",
  "source": "LinkedIn",
  "notes": "Strong candidate for senior role",
  "resume_s3_key": "uploads/resumes/a1b2c3d4.pdf",
  "version": 3,
  "experience": 5,
  "created_at": "2026-07-15T10:00:00Z",
  "updated_at": "2026-08-04T14:30:00Z"
}
```

| Status | Condition |
|--------|-----------|
| `400` | Invalid UUID format |
| `404` | Candidate not found |

---

### `POST /api/candidates`

Create a new candidate profile.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0456",
  "location": "New York, NY",
  "skills": ["Python", "Django", "PostgreSQL"],
  "status": "Applied",
  "source": "Referral",
  "notes": "Referred by current employee",
  "experience": 3
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | **Yes** | — |
| `email` | string | **Yes** | — |
| `phone` | string | No | `null` |
| `location` | string | No | `null` |
| `skills` | string[] | No | `[]` |
| `status` | string | No | `"Applied"` |
| `source` | string | No | `null` |
| `notes` | string | No | `null` |
| `experience` | number | No | `null` |

**Response:** `201 Created`
```json
{
  "id": "f7e8d9c0-b1a2-3456-7890-abcdef123456",
  "name": "John Doe",
  "email": "john@example.com",
  "version": 1,
  "...": "..."
}
```

| Status | Condition |
|--------|-----------|
| `400` | Missing name or email |
| `409` | Duplicate email or phone |

**Example:**
```bash
curl -X POST http://localhost:4000/api/candidates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","skills":["Python","Django"]}'
```

---

### `PUT /api/candidates/:id`

Update a candidate with optimistic concurrency control.

**Request Body:**
```json
{
  "expectedVersion": 3,
  "name": "Jane Smith-Johnson",
  "status": "Hired",
  "skills": ["React", "TypeScript", "Node.js", "GraphQL"],
  "notes": "Accepted offer — start date Sept 1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expectedVersion` | integer | **Yes** | Must match current DB version to prevent concurrent overwrites |
| All candidate fields | various | No | Only provided fields are updated |

**Response:** `200 OK` — Updated candidate object

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "expectedVersion is a required field..." }` | Missing version |
| `404` | `{ "error": "Candidate not found" }` | Invalid ID |
| `409` | `{ "error": "Conflict: The record has been modified...", "currentVersion": 4 }` | Version mismatch |
| `409` | `{ "error": "A candidate with this email address already exists." }` | Duplicate email |

**Example:**
```bash
curl -X PUT http://localhost:4000/api/candidates/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"expectedVersion":3,"status":"Hired","notes":"Accepted offer"}'
```

---

### `DELETE /api/candidates/:id`

Delete a candidate and all related data (uploads, events, resume content, audit logs).

**Response:** `200 OK`
```json
{ "success": true, "message": "Candidate deleted successfully." }
```

| Status | Condition |
|--------|-----------|
| `400` | Invalid UUID format |
| `404` | Candidate not found |

---

### `GET /api/candidates/:id/parsed-resume`

Retrieve parsed resume JSONB data and extraction metadata.

**Response:** `200 OK`
```json
{
  "candidate_id": "a1b2c3d4-...",
  "extraction_metadata": {
    "confidence": 0.85,
    "extracted_fields": ["name", "email", "skills", "experience"],
    "parser_version": "1.0"
  },
  "parsed_data": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1-555-0123",
    "skills": ["React", "TypeScript"],
    "experience": 5
  }
}
```

---

### `GET /api/locations`

Retrieve all unique candidate locations for filter dropdowns.

**Response:** `200 OK`
```json
["Austin, TX", "New York, NY", "San Francisco, CA", "Seattle, WA"]
```

---

### `GET /api/files/resume/:candidateId`

Preview or download a candidate's resume.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `download` | string | Set to `"true"` to force download instead of preview |

**Response:**
- DOCX files: Rendered as styled HTML for in-browser preview
- PDF files: Served inline with `application/pdf` content type
- Fallback: Raw text from `resume_content` table rendered as HTML

---

## 4. Search

### `GET /search/candidates`

Full-text search with ranking, highlighting, and cursor pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `limit` | integer | Results per page (default: 20) |
| `cursor` | string | Pagination cursor |

**Response:** `200 OK`
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

**Example:**
```bash
curl "http://localhost:4000/search/candidates?q=react+developer&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

## 5. Upload Pipeline

### `POST /orchestrator/credentials`

Request a secure upload token for a specific candidate.

**Request Body:**
```json
{
  "candidateId": "a1b2c3d4-...",
  "fileName": "jane_smith_resume.pdf"
}
```

**Response:** `200 OK`
```json
{
  "token": "upload_token_abc123...",
  "expiresAt": "2026-08-05T04:00:00Z"
}
```

---

### `POST /orchestrator/validate`

Validate upload token and file metadata.

**Request Body:**
```json
{
  "token": "upload_token_abc123...",
  "fileName": "jane_smith_resume.pdf",
  "fileSize": 2048576
}
```

**Response:** `200 OK`
```json
{
  "uploadId": "session-uuid-...",
  "status": "received"
}
```

---

### `POST /api/uploads/start`

Initialize a chunked upload session.

**Request Body:**
```json
{
  "candidateId": "a1b2c3d4-...",
  "fileName": "resume.pdf",
  "totalChunks": 5
}
```

**Response:** `200 OK`
```json
{ "sessionId": "upload-session-uuid" }
```

---

### `PUT /api/uploads/:sessionId/chunk/:index`

Upload a single binary chunk.

**Headers:**
```
Content-Type: application/octet-stream
```

**Body:** Raw binary data (chunk bytes)

**Response:** `200 OK`
```json
{ "chunksReceived": [0, 1, 2] }
```

---

### `POST /api/uploads/:sessionId/complete`

Finalize and assemble all chunks into the final file.

**Response:** `200 OK`
```json
{ "filePath": "uploads/resumes/a1b2c3d4_resume.pdf" }
```

This triggers the background processing pipeline (validation → extraction → NLP → indexing).

---

### `GET /api/uploads/:sessionId/status`

Fetch upload progress details.

**Response:** `200 OK`
```json
{
  "chunksReceived": [0, 1, 2, 3, 4],
  "totalChunks": 5,
  "status": "completed"
}
```

---

### `GET /orchestrator/audit/:uploadId`

Retrieve the complete parsing audit trail for an upload.

**Response:** `200 OK`
```json
{
  "auditLog": [
    { "stage": "validation", "event_type": "started", "created_at": "..." },
    { "stage": "validation", "event_type": "completed", "created_at": "..." },
    { "stage": "processing", "event_type": "started", "created_at": "..." },
    { "stage": "processing", "event_type": "completed", "created_at": "..." },
    { "stage": "indexing", "event_type": "completed", "created_at": "..." }
  ]
}
```

---

## 6. Sync & Events

### `POST /api/sync/replay`

Replay offline-queued mutations with conflict detection.

**Request Body:** Array of offline actions
```json
[
  {
    "client_action_id": "uuid-...",
    "candidate_id": "a1b2c3d4-...",
    "base_version": 3,
    "changes": {
      "status": "Interviewing",
      "notes": "Updated during offline session"
    }
  }
]
```

**Response:** `200 OK`
```json
[
  {
    "client_action_id": "uuid-...",
    "status": "applied"
  }
]
```

**Possible status values per action:**

| Status | Meaning |
|--------|---------|
| `"applied"` | Version matched; changes applied directly |
| `"merged"` | Version mismatch but no field overlap; auto-merged |
| `"conflict"` | Overlapping field changes; includes `conflicts` and `currentServerValues` |
| `"error"` | Processing error |

**Conflict response example:**
```json
{
  "client_action_id": "uuid-...",
  "status": "conflict",
  "conflicts": {
    "status": "Hired"
  },
  "currentServerValues": {
    "status": "Hired",
    "notes": "Accepted offer",
    "version": 5
  }
}
```

---

### `GET /api/events/since/:sequenceId`

Fetch all events since a given sequence ID (for WebSocket reconnection catch-up).

**Response:** `200 OK`
```json
[
  {
    "id": 1042,
    "candidate_id": "a1b2c3d4-...",
    "event_type": "candidate_updated",
    "payload": { "name": "Jane Smith", "status": "Hired", "version": 4 },
    "sequence_id": 1042,
    "created_at": "2026-08-05T03:00:00Z"
  }
]
```

---

### `GET /events/stream`

Server-Sent Events (SSE) stream for pipeline progress.

**Headers:**
```
Accept: text/event-stream
```

**Response:** `200 OK` (streaming)
```
data: {"event_type":"ResumeUploaded","aggregate_id":"a1b2c3d4-...","payload":{...}}

data: {"event_type":"CandidateUpdated","aggregate_id":"a1b2c3d4-...","payload":{...}}
```

---

## 7. WebSocket Protocol

**URL:** `ws://localhost:4000`

### Connection & Authentication

1. Client connects to `ws://localhost:4000`
2. Client must send an auth message within **5 seconds** or connection is closed (code `4001`)
3. Auth message format:
```json
{ "type": "auth", "token": "<jwt_token>" }
```

4. Successful auth response:
```json
{ "type": "authenticated", "clientId": "uuid-..." }
```

### Heartbeat

```json
// Client sends:
{ "type": "ping" }

// Server responds:
{ "type": "pong" }
```

### Event Messages

Server broadcasts events to all authenticated clients:

```json
{
  "type": "event",
  "event": {
    "id": 1042,
    "sequenceId": 1042,
    "candidateId": "a1b2c3d4-...",
    "eventType": "candidate_updated",
    "payload": {
      "id": "a1b2c3d4-...",
      "name": "Jane Smith",
      "status": "Hired",
      "version": 4,
      "_originClientId": "client-uuid-..."
    },
    "createdAt": "2026-08-05T03:00:00Z"
  }
}
```

**Event Types:**
| Event | Trigger |
|-------|---------|
| `candidate_created` | New candidate profile created |
| `candidate_updated` | Candidate fields modified |
| `candidate_deleted` | Candidate profile deleted |

> **Echo Suppression:** The `_originClientId` field in the payload allows the originating client to drop its own broadcast events, preventing double-renders.

---

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid JWT) |
| `404` | Not Found |
| `409` | Conflict (duplicate data or version mismatch) |
| `500` | Internal Server Error |
