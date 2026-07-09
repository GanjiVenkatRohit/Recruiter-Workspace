# Technical Decision Log

## AWS Cloud Infrastructure Substitution

### Context
The original architecture called for deploying resume storage on AWS S3, serving resume downloads/previews via Amazon CloudFront Signed URLs, and deploying microservices to AWS EC2 or ECS.

### Decision
For local development, ease of setup, and this submission, AWS S3 has been substituted with **local filesystem storage**, and AWS deployment targets have been replaced with a **Docker Compose stack** routed through an **Nginx reverse proxy**.

### Implementation Details
1. **Shared Volume Mount**: The `uploads/` directory on the host is mounted as a bind mount into the `rw-server` and `rw-processor` containers.
2. **File Assembly**: Chunks are uploaded to `uploads/tmp/{sessionId}/`, and then concatenated into `uploads/resumes/` as completed resumes.
3. **Text Extraction**: The processor worker reads from the shared `uploads/resumes/` folder, extracts text asynchronously using `fs.promises.readFile` and write to `uploads/processed/{uploadId}.txt`.
4. **Download Endpoint**: A secure API route (`GET /api/files/resume/:candidateId`) reads files from local disk and streams them to authorized JWT clients.
5. **Nginx Reverse Proxy**: Replaces AWS Application Load Balancer (ALB) and routes traffic to respective services, disabling buffering for SSE (`/events/`) locations.

### Future Porting to AWS Cloud
- **S3 Storage**: Replace `fs.readFile` and `fs.writeFile` in `server/src/storage.js` and `pipeline/processor/src/workers/processing.worker.js` with AWS SDK S3 `PutObjectCommand` and `GetObjectCommand`.
- **Infrastructure as Code**: Terraform configuration stubs located under `infrastructure/terraform/` can be filled to spin up AWS ECS, RDS PostgreSQL, and ElastiCache Redis.
