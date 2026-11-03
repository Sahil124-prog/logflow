
# LogFlow

LogFlow is a centralized log monitoring platform. Services send log lines to a single ingestion endpoint. The platform stores them, watches for error bursts, raises alerts, pushes live updates to a dashboard, archives critical logs to S3, and exposes Prometheus metrics. Everything runs with one `docker compose up`, and the same services also have Kubernetes manifests, a Jenkins pipeline, and Terraform for AWS.

It was built as a DevOps learning project. The emphasis is on the operational parts: containers, message queues, rate limiting, health checks, CI/CD, infrastructure as code, and observability.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Services](#services)
4. [Request and event flows](#request-and-event-flows)
5. [Tech stack](#tech-stack)
6. [Repository layout](#repository-layout)
7. [Getting started (local, Docker Compose)](#getting-started-local-docker-compose)
8. [Configuration (environment variables)](#configuration-environment-variables)
9. [API reference](#api-reference)
10. [Alerting rules](#alerting-rules)
11. [Rate limiting](#rate-limiting)
12. [Authentication and authorization](#authentication-and-authorization)
13. [Reliability and failure behavior](#reliability-and-failure-behavior)
14. [Observability](#observability)
15. [Testing](#testing)
16. [CI/CD pipeline (Jenkins)](#cicd-pipeline-jenkins)
17. [Kubernetes deployment](#kubernetes-deployment)
18. [AWS infrastructure (Terraform)](#aws-infrastructure-terraform)
19. [Security notes](#security-notes)
20. [Known limitations and next steps](#known-limitations-and-next-steps)

---

## What it does

- **Ingests logs** over HTTP from any service that has an API key or a logged-in user token.
- **Stores logs** in MongoDB, with indexes for the dashboard queries.
- **Detects error bursts.** When a service produces 2 or more error or critical logs inside a 5-minute window, the alert service opens one alert for that service.
- **Keeps one open alert per service.** A partial unique index in MongoDB makes this guarantee hold even when several alert workers race each other.
- **Notifies downstream.** Alerts are published as events, and a notification service consumes them. Delivery is currently a log line, with a clear swap point for a real channel such as email, Slack, or SMS.
- **Archives critical logs.** A `critical` log triggers a Lambda function, which writes the log to S3.
- **Streams live updates** to the React dashboard over Socket.IO.
- **Exports and retains logs.** An admin can export logs as a file. A nightly job archives logs older than the retention window to S3 and then deletes them from MongoDB.
- **Exposes Prometheus metrics** for the platform itself, and a dashboard card queries Prometheus directly.
- **Simulates traffic.** A simulator sends fake logs from three services, with different error rates, so the dashboard always has data to show.

---

## Architecture

```
                         ┌──────────────────────────── browser ─────────────────────────────┐
                         │  React dashboard (Vite build, served by the client container)     │
                         └───────────────┬───────────────────────────────┬──────────────────┘
                                         │ HTTP /api/*, /metrics          │ WebSocket /socket.io
                                         ▼                                ▼
                              ┌──────────────────────────────────────────────────┐
                              │   Nginx (port 8081 → 80)  reverse proxy          │
                              │   POST /api/logs  →  ingestion                   │
                              │   /api/*, /socket.io → api                       │
                              │   /metrics → 403 (blocked from outside)          │
                              └───────┬─────────────────────────┬────────────────┘
                                      │                         │
                 ┌────────────────────▼──────┐        ┌─────────▼──────────────────────┐
  Simulator ───▶ │ log-ingestion-service     │        │  api (Express + Socket.IO)     │
  (or any svc)   │ port 5001                 │        │  port 5000                     │
                 │ auth, rate limit, save,   │        │  login/register, query logs,   │
                 │ publish event             │        │  alerts, stats, export, deploy │
                 └────┬───────────────┬──────┘        └──┬─────────────────────────┬───┘
                      │ save          │ publish          │ read/write              │ consume
                      ▼               ▼                  ▼                         ▼
                 ┌─────────┐   ┌────────────────────────────────────┐        (dashboardConsumer)
                 │ MongoDB │   │ RabbitMQ                           │
                 │ logs,   │   │ exchange: logflow.events (fanout)  │
                 │ alerts, │   │  ├─▶ alerts.queue ─────────┐       │
                 │ users,  │   │  ├─▶ notifications.queue   │       │
                 │ deploys │   │  └─▶ dashboard-realtime.q  │       │
                 └────▲────┘   └───────┬────────────────────┼───────┘
                      │                │                    │
                      │       ┌────────▼─────────┐  ┌───────▼──────────┐
                      └───────│ alert-service    │  │ notification-svc │
                              │ threshold, dedupe│  │ logs the alert   │
                              │ Lambda for crit. │  └──────────────────┘
                              └────────┬─────────┘
                                       ▼
                              ┌──────────────────┐        ┌───────────────┐
                              │ Lambda → S3      │───────▶│ S3 (LocalStack│
                              │ critical-logs/   │        │ locally, AWS  │
                              └──────────────────┘        │ in production)│
                                                          └───────────────┘
   Redis: fixed-window rate limiter (login, ingestion, Send-log) and a shared counter store.
   Prometheus: scrapes api:5000/metrics; the dashboard queries Prometheus.
```

Each box is a separate container with a single responsibility. They communicate through MongoDB (state), RabbitMQ (events), Redis (counters), and HTTP (requests).

---

## Services

| Service | Folder | Port | What it does |
|---|---|---|---|
| **api** | `src/` | 5000 | Dashboard API: auth, logs read, alerts, stats, services, exports, deploy history, `/metrics`, and Socket.IO. Also starts the dashboard consumer. |
| **log-ingestion-service** | `log-ingestion-service/` | 5001 | The only write path for logs. Authenticates, rate-limits, saves to Mongo, then publishes `log.created`. |
| **alert-service** | `alert-service/` | (none) | Consumes `alerts.queue`. Counts recent errors, opens or updates alerts, calls the Lambda for critical logs. Has a retry queue and a dead-letter queue. |
| **notification-service** | `notification-service/` | (none) | Consumes `notifications.queue` and reacts to `alert.created`. |
| **client** | `client/` | (internal) | React + Vite dashboard, built and served by Nginx. |
| **nginx** | `nginx/` | 8081 (host) | Reverse proxy. Single entry point for the browser. |
| **simulator** | `services/` | (none) | Generates fake logs from `payment-service`, `auth-service`, and `order-service`. |
| **mongodb** | image `mongo:6` | 27017 (internal) | Logs, alerts, users, deploys, processed events. |
| **redis** | image `redis:7-alpine` | 6379 (internal) | Rate-limit counters. |
| **rabbitmq** | image `rabbitmq:3-management-alpine` | 5672, 15672 (UI) | Event bus. Management UI at http://localhost:15672. |
| **prometheus** | image `prom/prometheus` | 9090 | Scrapes the API. |
| **localstack** | image `localstack/localstack:3.0.0` | 4566 | Local AWS emulator (S3, IAM, Lambda). |
| **localstack-init** | image `amazon/aws-cli` | (none) | One-shot job. Creates the S3 bucket and deploys the Lambda, then exits. |

---

## Request and event flows

### 1. A log arrives

1. A service (or the simulator) sends `POST /api/logs` with `x-api-key` or a Bearer token.
2. Nginx forwards it to **log-ingestion-service**.
3. The service checks the key or the JWT, then applies the rate limiter.
4. It validates and saves the log to MongoDB.
5. It publishes a `log.created` event to the `logflow.events` fanout exchange. The publish is fire-and-forget, so the HTTP response does not wait for RabbitMQ.
6. The client gets `201 Created`.

### 2. Alert evaluation

1. **alert-service** receives the event from `alerts.queue`. It acknowledges the message only after the work finishes.
2. It counts error and critical logs for that service in the last 5 minutes.
3. If the count is below 2, it does nothing.
4. If there is already an open alert for that service, it updates the open alert and publishes `alert.updated`. A 30-second cooldown stops it from spamming updates.
5. If there is no open alert, it creates one and publishes `alert.created`.
6. If the log is `critical`, it also invokes the Lambda, which writes the log to S3.
7. A failure goes to the retry queue. After 3 retries, the message goes to the dead-letter queue.

### 3. The dashboard updates live

1. **api** runs `dashboardConsumer`, which listens on its own queue, `dashboard-realtime.queue`, bound to the same fanout exchange.
2. It re-emits events over Socket.IO: `new-log`, `new-alert`, and `alert-updated`.
3. The React dashboard prepends new items and shows toasts. It also refetches alerts and stats every 15 seconds to correct any drift.

### 4. Retention

A nightly CronJob (in Kubernetes) or a scheduled cleanup runs `src/cleanup.js`. It exports logs older than `LOG_RETENTION_DAYS` (default 7) to S3 and then deletes them from MongoDB. An admin can also trigger `DELETE /api/logs/cleanup`.

---

## Tech stack

| Area | Technology |
|---|---|
| Runtime | Node.js 22 (Alpine images) |
| Web framework | Express 4 |
| Realtime | Socket.IO 4 |
| Database | MongoDB 6 via Mongoose 7 |
| Cache and rate limits | Redis 7 via `redis` 4 |
| Messaging | RabbitMQ 3 via `amqplib` |
| Auth | JWT (HS256, 24 h), bcryptjs (cost 10), API keys |
| Object storage | AWS S3 (SDK v3), LocalStack locally |
| Serverless | AWS Lambda (archives critical logs) |
| Metrics | prom-client, Prometheus, PromQL |
| Frontend | React, Vite |
| Reverse proxy | Nginx 1.29 |
| Containers | Docker (multi-stage builds), Docker Compose |
| Orchestration | Kubernetes (manifests + Kustomize), minikube overlay, EKS (Terraform) |
| CI/CD | Jenkins declarative pipeline (Windows agent) |
| IaC | Terraform (LocalStack and AWS variants) |
| Testing | Jest 30, supertest 7 |

---

## Repository layout

```
logflow/
├── src/                          # API service (Express + Socket.IO)
│   ├── index.js                  # app setup, CORS, /health, /ready, Socket.IO, shutdown
│   ├── metrics.js                # Prometheus metrics definitions
│   ├── s3.js                     # shared S3 client, bucket creation with retry
│   ├── cleanup.js                # archive-then-delete retention job
│   ├── consumers/dashboardConsumer.js
│   ├── middleware/auth.js        # JWT auth, requireAdmin
│   ├── middleware/rateLimiter.js # Redis fixed-window limiter
│   ├── models/                   # Log, Alert, User, Deploy
│   ├── routes/                   # auth, logs, alerts, stats, services, export, deploys, metrics
│   └── scripts/createAdmin.js    # create or promote an admin user
├── log-ingestion-service/        # log write path (auth, rate limit, save, publish)
│   ├── index.js
│   ├── publisher.js              # RabbitMQ publisher (fanout exchange)
│   ├── middleware/               # authOrApiKey, rateLimiter
│   ├── models/Log.js
│   └── test/ingest.test.js
├── alert-service/                # threshold evaluation and alert creation
│   ├── index.js                  # consumer, retry/DLQ, idempotency, shutdown
│   ├── publisher.js
│   ├── models/                   # Alert, Log, ProcessedEvent
│   └── test/alerts.test.js
├── notification-service/index.js # consumes notifications.queue
├── services/                     # simulator + fake service loggers
│   ├── simulator.js
│   ├── Dockerfile
│   └── {auth,order,payment}-service/logger.js
├── lambda/index.js               # archives critical logs to S3
├── client/                       # React + Vite dashboard
│   └── src/
│       ├── App.jsx, pages/{Login,Dashboard}.jsx
│       └── components/           # StatCards, LogFeed, AlertPanel, MetricsSummary, RateLimitPanel, …
├── nginx/nginx.conf              # reverse proxy routes
├── prometheus/prometheus.yml     # scrape config
├── k8s/                          # Kubernetes manifests (base) + kustomization.yaml
├── k8s-minikube/kustomization.yaml  # local overlay (1 replica, local image tags, no HPA)
├── k8s/examples/secrets.example.yml # Secret template (never commit real values)
├── terraform/
│   ├── main.tf                   # LocalStack variant
│   └── aws/                      # AWS variant: S3, ECR, Lambda, backend, *.tf.bak for VPC/EKS
├── scripts/
│   ├── test-deps.ps1             # starts test DBs and checks readiness (Windows)
│   └── localstack-init.sh        # creates the bucket and deploys the Lambda
├── test/api.test.js              # API integration tests
├── docker-compose.yml
├── Dockerfile                    # API image (multi-stage, non-root)
├── Jenkinsfile
└── .env                          # local secrets (not committed)
```

---

## Getting started (local, Docker Compose)

### Prerequisites

- Docker Desktop (Windows, with WSL 2 backend) with Compose v2
- Node.js 22 and npm (only needed for running tests outside Docker)
- Git

### 1. Clone and create `.env`

```powershell
git clone https://github.com/Sahil124-prog/logflow.git
cd logflow
```

Create a `.env` file in the project root. Fill in your own values. Do not commit this file.

```env
JWT_SECRET=<a long random string>
INGEST_API_KEY=<a long random string>
DEPLOY_KEY=<a long random string>
LOG_RETENTION_DAYS=7
```

The full list of variables is in [Configuration](#configuration-environment-variables).

### 2. Start the stack

```powershell
docker compose up --build -d
docker compose ps
```

Wait until every container is `running` or `healthy`. `localstack-init` should show `exited (0)`, which is correct for a one-shot job.

### 3. Create an admin user

```powershell
docker compose exec api node src/scripts/createAdmin.js
```

Registration always creates a `viewer`. Only an admin can change roles, so the first admin has to be created this way.

### 4. Open the dashboard

- Dashboard: http://localhost:8081
- RabbitMQ UI: http://localhost:15672 (`guest` / `guest`)
- Prometheus: http://localhost:9090

Log in with the admin account. The simulator starts sending logs after about 20 seconds and sends one every 8 seconds. Errors should start to appear within a minute.

### 5. Stop

```powershell
docker compose down          # keep data
docker compose down -v       # also delete the Mongo and LocalStack volumes
```

---

## Configuration (environment variables)

| Variable | Used by | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | api, ingestion | none (required) | Signs and verifies JWTs. Must match between services. |
| `INGEST_API_KEY` | ingestion, simulator | none (required) | Shared key for service-to-service log writes (`x-api-key`). |
| `DEPLOY_KEY` | api | none | Protects `POST /api/deploys` (`x-deploy-key`). |
| `MONGO_URI` | api, ingestion, alert | set in `docker-compose.yml` | MongoDB connection string. |
| `REDIS_URL` | api, ingestion | `redis://redis:6379` | Rate limiter store. If unreachable, rate limiting is skipped. |
| `RABBITMQ_URL` | api, ingestion, alert, notification | `amqp://rabbitmq` | Message broker. |
| `CORS_ORIGINS` | api | `http://localhost:8081,http://localhost:5173` | Comma-separated allow-list for browser origins. |
| `PORT` | api, ingestion | 5000 / 5001 | HTTP port. |
| `LOG_INGESTION_URL` | api | `http://log-ingestion-service:5001` | Where `POST /api/logs` is proxied. |
| `LOG_RETENTION_DAYS` | cleanup | 7 | Age after which logs are archived and deleted. |
| `S3_BUCKET` | api (s3.js), lambda | none (required) | Archive bucket name. |
| `AWS_REGION` | all AWS clients | `us-east-1` | Region for SDK calls. |
| `AWS_ENDPOINT` | all AWS clients | unset in AWS | Set to `http://localstack:4566` locally. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS clients | none | Credentials. Use fake values with LocalStack. |
| `LAMBDA_FUNCTION_NAME` | alert | none | Lambda invoked for `critical` logs. |
| `LAMBDA_ENDPOINT`, `LAMBDA_AWS_ACCESS_KEY_ID`, `LAMBDA_AWS_SECRET_ACCESS_KEY` | alert | none | Lambda client settings (LocalStack locally). |
| `API_URL` | simulator | `http://log-ingestion-service:5001` | Ingestion URL the simulator posts to. |
| `MONGO_TEST_URI`, `REDIS_TEST_URL` | tests | `27018`, `6381` on the host | Throwaway test databases. |

> **Never** commit real values. `k8s/examples/secrets.example.yml` is a template. Real Kubernetes Secrets are created with `kubectl create secret` and are not stored in Git.

---

## API reference

All protected routes need `Authorization: Bearer <JWT>` unless noted. The base path is `/api` through Nginx.

### Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | none | Creates a `viewer`. Returns `201` with a token. |
| POST | `/api/auth/login` | none | Limited to 5 requests per minute per client IP. Returns a uniform `401` for a wrong user or password. |

### Logs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/logs` | user | Newest 200 logs. `Cache-Control: no-store`. |
| GET | `/api/logs/stats` | user | Aggregation: counts grouped by service and level. |
| POST | `/api/logs` | user **or** `x-api-key` | Routed to ingestion. Rate limited (see below). |
| DELETE | `/api/logs/cleanup` | admin | Runs the retention job now. |
| POST | `/api/export` | admin | Exports logs as a file. Returns `502` if S3 fails. |

### Alerts

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/alerts` | user | Latest 50 alerts, newest first. |
| PATCH | `/api/alerts/:id/resolve` | admin | Closes an alert. |
| POST | `/api/alerts/trigger-check` | admin | Manually runs a threshold check. |

### Other

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/stats` | user | Dashboard totals. |
| GET | `/api/services` | user | Services seen in recent logs, with health. |
| GET | `/api/deploys` | user | Deploy history. |
| POST | `/api/deploys` | `x-deploy-key` | Called by Jenkins to record a deploy. |
| GET | `/health` | none | Liveness. Always `200` while the process is up. |
| GET | `/ready` | none | Readiness. `200` only when MongoDB is connected (ingestion also needs RabbitMQ). |
| GET | `/metrics` | none (blocked by Nginx from outside) | Prometheus text format. |
| DELETE | `/cleanup` (ingestion) | admin | Retention, on the ingestion service. |

### Example: send a log

```powershell
curl.exe -X POST http://localhost:8081/api/logs `
  -H "Content-Type: application/json" `
  -H "x-api-key: <INGEST_API_KEY>" `
  -d '{"service":"payment-service","level":"error","message":"card declined"}'
```

Expected response: `201 Created` with the saved log.

### Log object

```json
{
  "service": "payment-service",
  "level": "error",
  "message": "card declined",
  "timestamp": "2026-11-03T10:15:00.000Z"
}
```

Allowed `level` values: `info`, `warn`, `error`, `critical`.

---

## Alerting rules

| Rule | Value | Where it lives |
|---|---|---|
| Window | 5 minutes | `WINDOW_MINUTES` in `alert-service/index.js` |
| Threshold | 2 errors or criticals | `ERROR_THRESHOLD` |
| Cooldown on updates | 30 seconds | `ALERT_COOLDOWN_MS` |
| Retries | 3, 10 seconds apart | `MAX_RETRIES`, `RETRY_DELAY_MS` |
| One open alert per service | enforced by a partial unique index on `{ service: 1 }` where `resolved: false` | `alert-service/models/Alert.js` |
| Duplicate protection for events | `eventId` stored in `ProcessedEvent`, which expires after 24 hours | `alert-service/models/ProcessedEvent.js` |

Two layers prevent duplicate alerts:

1. **The unique index** guarantees that only one open alert exists per service, even when several alert workers evaluate the same service at the same time. A losing worker gets error `E11000` and falls back to updating the existing alert.
2. **`ProcessedEvent`** stops a redelivered RabbitMQ message from being counted twice.

---

## Rate limiting

The limiter is a fixed-window counter in Redis:

```
key    = rl:<name>:<identity>:<window index>
INCR key; EXPIRE key windowSec      (inside MULTI, so they run together)
if count > limit → 429 Too Many Requests
```

| Route | Limit | Identity |
|---|---|---|
| `POST /api/auth/login` | 5 per minute | client IP (`X-Real-IP` behind Nginx, otherwise `req.ip`) |
| `POST /api/logs` (ingestion) | 20 per minute for a logged-in user | user id |
| `POST /api/logs` (ingestion) | 100 per minute for an API-key service | key holder |

Every response includes `RateLimit-Limit` and `RateLimit-Remaining` headers.

**Fail open.** If Redis is down, the limiter logs a warning and lets the request through. The reasoning: a monitoring platform should keep ingesting logs during a cache outage, even if that means losing rate protection for a while.

---

## Authentication and authorization

| Mechanism | Used for | How it works |
|---|---|---|
| **JWT** (HS256, 24 hours) | dashboard users | Issued at login or register. Payload: `id`, `username`, `role`. Verified by `auth` middleware, which sets `req.user`. |
| **Passwords** | login | bcryptjs with cost 10. A uniform `401` avoids revealing whether a username exists. |
| **API key** (`x-api-key`) | service-to-service log writes | Compared with `INGEST_API_KEY`. Checked before JWT. |
| **Deploy key** (`x-deploy-key`) | Jenkins deploy records | Compared with `DEPLOY_KEY`. |
| **Roles** | authorization | `viewer` (default) and `admin`. `requireAdmin` returns `403` to viewers. |

Admin-only operations: resolve alerts, export logs, run cleanup, trigger a check, delete logs.

---

## Reliability and failure behavior

| Failure | What happens |
|---|---|
| MongoDB unreachable at startup | `connectMongoWithRetry` retries with capped exponential backoff, and `/ready` returns `503` until it succeeds. |
| RabbitMQ unreachable | The publisher and consumers reconnect every 5 seconds. Log ingestion still saves to Mongo. Events published during the outage are lost, which is the main known gap. |
| Redis unreachable | Rate limiting is skipped (fail open). Ingestion continues. |
| S3 unreachable | Export returns `502`. The archive step in cleanup fails before deletion, so no data is lost. |
| Lambda fails | The alert message is retried, then goes to the dead-letter queue. |
| Bad message on a queue | Rejected with `nack(false, false)`, so it is dropped instead of looping forever. |
| Alert worker crashes mid-message | The message is not acknowledged, so RabbitMQ redelivers it. The `ProcessedEvent` check prevents double counting. |
| `SIGTERM` (Kubernetes stop, `docker stop`) | The API and ingestion stop accepting new HTTP requests, close their connections, and exit 0. The alert service waits for in-flight messages (drain), then closes. A 10-second safety timer forces exit if draining hangs. |
| Unhandled promise rejection | Node 22 exits the process. Pods restart. Route handlers should therefore catch their own errors. |

Delivery is **at-least-once** from RabbitMQ. Consumers are written to handle duplicate messages.

---

## Observability

### Metrics exposed by the API (`/metrics`)

| Metric | Type | Meaning |
|---|---|---|
| `logs_received_total{service,level}` | counter | Logs accepted by ingestion. |
| `api_request_duration_seconds{method,route,status}` | histogram | Request latency. Buckets from 10 ms to 5 s. |
| `active_alerts` | gauge | Open alerts, computed from Mongo on each scrape. |
| `services_online` | gauge | Services with recent logs, computed from Mongo on each scrape. |

Useful PromQL:

```promql
rate(logs_received_total[5m])
histogram_quantile(0.95, sum(rate(api_request_duration_seconds_bucket[5m])) by (le))
active_alerts
```

### Dashboards

- The **MetricsSummary** card on the dashboard queries Prometheus directly every 15 seconds.
- Prometheus is at http://localhost:9090 locally.

### Health endpoints

- `/health`: liveness. Kubernetes restarts the pod if this fails.
- `/ready`: readiness. Kubernetes stops sending traffic to the pod if this fails. Each worker has its own readiness check using a TCP socket or a command.

---

## Testing

Tests use Jest and supertest. Each suite uses a throwaway database so it never touches real data.

| Suite | File | Count | What it covers |
|---|---|---|---|
| API | `test/api.test.js` | 6 | Auth required (401), admin-only routes (403), health and readiness. |
| Ingestion | `log-ingestion-service/test/ingest.test.js` | 9 | API-key and JWT paths, forged token (403), viewer blocked from writes, rate limit (20 → 429), retention cleanup. The publisher is mocked. |
| Alerts | `alert-service/test/alerts.test.js` | 8 | Threshold of 2, window of 5 minutes, cooldown, updates, and a **race test**: 5 parallel checks produce exactly 1 open alert. |

### Running the tests

The test databases must be running first. On Windows, the helper script starts them and waits for readiness:

```powershell
.\scripts\test-deps.ps1
npm ci
npm test
```

`test-deps.ps1` starts MongoDB on port 27018 and Redis on port 6381, then checks each one from the host. It uses a RESP `PING` for Redis, so it works even without `redis-cli` installed.

Run the suites that belong to a single service from that service's folder:

```powershell
cd alert-service
npm ci
npm test
```

---

## CI/CD pipeline (Jenkins)

The `Jenkinsfile` is a declarative pipeline for a Windows agent. It uses `bat` and `powershell` steps.

| Stage | What it does |
|---|---|
| **Checkout** | Gets the source from Git. |
| **Install** | `npm ci` in the root. |
| **Test** | Starts throwaway MongoDB and Redis containers named with `BUILD_NUMBER`, waits for readiness, runs each suite with `dir()`, then removes the containers in a `post` block. |
| **ECR Login** | Runs only when `PUSH_TO_ECR` is ticked. |
| **Build & Push Images** | Builds the six images and pushes them to ECR only when `PUSH_TO_ECR` is ticked. |
| **Deploy** | Placeholder for the deploy step. |
| **post** | On success or failure, sends a status to `POST /api/deploys` with the deploy key. |

The pipeline is reachable from GitHub through an ngrok tunnel (webhook).

---

## Kubernetes deployment

The `k8s/` folder holds the base manifests. `kustomization.yaml` lists 14 resources.

| Manifest | Resource |
|---|---|
| `deployment.yml` | API (3 replicas, probes, requests and limits) |
| `service.yml` | ClusterIP services |
| `log-ingestion-service.yml` | Ingestion (2 replicas) |
| `alert-service.yml`, `notification-service.yml` | Workers (1 replica each) |
| `client.yml` | Dashboard (2 replicas) |
| `simulator.yml` | Traffic generator |
| `mongodb.yml`, `redis.yml`, `rabbitmq.yml` | Stateful dependencies. MongoDB uses a PersistentVolumeClaim with the `Recreate` strategy. |
| `configmap.yml` | Non-secret settings, loaded with `envFrom`. |
| `hpa.yml` | HorizontalPodAutoscaler for the API: 2–10 replicas at 70% CPU. |
| `cronjob.yml` | Nightly retention job. |
| `ingress.yml` | Ingress rules for the dashboard and API. |

The **minikube overlay** (`k8s-minikube/kustomization.yaml`) reuses the base and changes the image tags to local builds, sets replicas to 1, and deletes the HPA.

### Deploying to minikube

```powershell
minikube start
minikube image load logflow-api:v3
kubectl create secret generic logflow-secrets --from-literal=JWT_SECRET=<value> --from-literal=INGEST_API_KEY=<value>
kubectl apply -k k8s-minikube
kubectl get pods
```

Use a new image tag for each build, because Kubernetes does not re-pull a tag it already has.

### Secrets

Secrets are not stored in Git. `k8s/examples/secrets.example.yml` shows the expected keys. Create the real Secret with `kubectl create secret`.

---

## AWS infrastructure (Terraform)

Two Terraform setups are in the repo:

| Folder | Target | Notes |
|---|---|---|
| `terraform/main.tf` | LocalStack | Same HCL as AWS, with the provider pointed at `127.0.0.1:4566` and fake credentials. |
| `terraform/aws/` | AWS | Remote state in S3 with versioning and encryption, DynamoDB state lock, ECR repositories, S3 archive bucket, Lambda, and IAM roles. |

Files marked `.bak` (`vpc.tf.bak`, `eks.tf.bak`, `subnets.tf.bak`, `route_table.tf.bak`) are kept but not active. They describe the VPC, subnets, and EKS cluster, which are disabled to avoid cost while the rest is tested.

```powershell
cd terraform\aws
terraform init
terraform plan
terraform apply
```

The state file (`terraform.tfstate`) and `.terraform/` are in `.gitignore`. Never commit them, because state can contain sensitive values.

---

## Security notes

- Secrets come from environment variables or Kubernetes Secrets. None are hard-coded.
- `/metrics` is blocked by Nginx from outside. Prometheus reaches it on the internal network.
- Containers run as the non-root `node` user, and images use multi-stage builds with `.dockerignore`.
- Registration always creates a `viewer`. Admins are created with a script.
- The login rate limit slows brute-force attempts.
- Dependency audit: `npm audit` reports advisories for Socket.IO/ws, `proxy-addr`, and Mongoose 7. Upgrading them is on the list below.
- The dashboard stores its token in `localStorage`. This is convenient, but readable by any script that runs in the page (XSS). An httpOnly cookie with CSRF protection would be the safer design.

---

## Known limitations and next steps

- Events published while RabbitMQ is down are lost. An outbox pattern would fix this.
- Notifications only write a log line. A real channel is needed.
- The simulator and notification service do not handle `SIGTERM` yet.
- EKS runs with one replica for some workloads. Adding a PodDisruptionBudget and more replicas is planned.
- The CronJob image is pinned to `latest`. It should use a fixed tag and a `secretRef`.
- Trivy image scanning and an SBOM are not yet a pipeline gate. Image signing with cosign is planned.
- Docker Compose uses `latest` for Prometheus and the AWS CLI. Pin them for reproducible builds.
- The ingress-nginx project is retiring, so the Ingress should move to the Gateway API.
- Upgrade Socket.IO, Mongoose, and `proxy-addr` to clear the audit warnings.

---

## License

Private learning project. Add a license before publishing it for others to use.