# Local Setup Guide

This guide details instructions for spinning up the Recruiter Workspace application locally using Docker Compose, including running migrations, seeding the database, and mapping local service ports.

## Prerequisites
- **Docker Desktop** (version 20.10+)
- **Node.js** (version 20+)
- **Git**

---

## 1. Running the Stack
To build and start all containers (Postgres, Redis, Main Server, Upload Orchestrator, Processor, Search Service, Event System, and Nginx proxy):

```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up -d --build
```

---

## 2. Database Migrations & Seeds
After startup, run the database migrations inside the running service containers:

```bash
# Apply database schemas
docker exec rw-server node scripts/migrate.js
docker exec rw-upload-orchestrator node scripts/migrate.js
docker exec rw-processor node scripts/migrate.js
docker exec rw-event-system node scripts/migrate.js

# Seed test candidates and recruiter auth profiles
docker exec rw-server node scripts/seed.js
docker exec rw-server node scripts/seed_recruiters.js
```

---

## 3. Port Map & Endpoints
Once the stack is running, all services are routed through Nginx on port 80. You can access individual endpoints directly or via the gateway:

- **React Client / Nginx Proxy**: [http://localhost:80](http://localhost:80)
- **Server API**: [http://localhost:3000](http://localhost:3000)
- **Upload Orchestrator**: [http://localhost:3001](http://localhost:3001)
- **Processor**: [http://localhost:3002](http://localhost:3002)
- **Search Service**: [http://localhost:3003](http://localhost:3003)
- **Event System**: [http://localhost:3004](http://localhost:3004)
- **API Swagger Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)

---

## 4. Diagnostics & Maintenance

### View Logs
Stream active logs from a specific container:
```bash
docker compose logs -f <service-name>
# Example: docker compose logs -f rw-processor
```

### Stop Containers
Stop the stack without losing persistent data:
```bash
docker compose down
```

### Fresh Start (Wipe Data)
Stop containers and completely remove all volumes (wiping the database and Redis cache):
```bash
docker compose down -v
```

---

## 5. Storage Architecture Notes
AWS S3 cloud storage was substituted with local filesystem storage, and AWS cloud infrastructure was replaced with Docker Compose.
- **Shared Uploads Bind Mount**: The `uploads/` directory on the host machine is mapped directly to `/app/uploads` in both the `rw-server` and `rw-processor` containers.
- **Future Migration to AWS**:
  - Replace `fs.readFile` / `fs.writeFile` references with AWS SDK S3 calls (`PutObjectCommand`, `GetObjectCommand`) in the upload and processing worker services.
  - Swap `docker-compose.yml` for AWS ECS/EKS and RDS deployments (Terraform blueprints are stubbed under `infrastructure/terraform/`).
