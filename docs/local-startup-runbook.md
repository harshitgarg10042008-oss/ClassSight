# ClassSight Local Startup Runbook

This guide starts the version currently pushed to `main` in `harshitgarg10042008-oss/ClassSight`. The normal local mode is **synchronous recognition**, which preserves the existing behavior. RabbitMQ is available and can be enabled explicitly for asynchronous recognition.

> The current `docker-compose.yml` intentionally uses Docker host networking. Therefore the service ports below must be free on your computer, and containers reach each other through `127.0.0.1` rather than Compose service DNS names.

## 1. Required software

Install the following first:

| Software | Check command | Purpose |
|---|---|---|
| Git | `git --version` | Clone and update the repository |
| Docker Engine | `docker --version` | Run the services |
| Docker Compose v2 | `docker compose version` | Build and orchestrate the stack |
| At least 8 GB RAM recommended | `free -h` on Linux | The FastAPI image compiles dlib and may be memory-intensive |

On Ubuntu, install Docker with Docker’s official instructions, then verify:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

If Docker commands require `sudo`, use `sudo docker ...` consistently. If you want to run Docker without `sudo`, add your user to the Docker group and start a new login shell:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker version
docker compose version
```

## 2. Clone or update the repository

For a new local checkout:

```bash
gh repo clone harshitgarg10042008-oss/ClassSight
cd ClassSight
```

If GitHub CLI is not installed, use:

```bash
git clone https://github.com/harshitgarg10042008-oss/ClassSight.git
cd ClassSight
```

For an existing checkout:

```bash
cd /path/to/ClassSight
git fetch origin
git checkout main
git pull --ff-only origin main
```

Confirm that the upgrade commits are present:

```bash
git log --oneline -7
git status --short --branch
```

The working tree should be clean and the branch should track `origin/main`.

## 3. Create the local environment file

Copy the repository template. Compose automatically reads `.env` from the project root.

```bash
cp .env.example .env
```

The default local values are suitable for development. To inspect them:

```bash
sed -n '1,220p' .env
```

For the normal synchronous mode, ensure these values exist:

```bash
RECOGNITION_MODE=sync
RABBITMQ_WORKER_ENABLED=false
ATTENDANCE_CAPTURE_STORAGE_BACKEND=minio
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=classsight-captures
RABBITMQ_USER=classsight
RABBITMQ_PASSWORD=classsight_rabbit_password
```

Do not use the example JWT or database credentials for a public deployment. They are intended only for local development.

## 4. Check that required ports are free

The host-networked Compose stack uses these ports:

| Port | Service |
|---:|---|
| 3000 | Next.js faculty frontend |
| 5432 | PostgreSQL |
| 5672 | RabbitMQ AMQP |
| 8000 | FastAPI face service |
| 8080 | Spring Boot backend |
| 9000 | MinIO S3 API |
| 9001 | MinIO console |
| 15672 | RabbitMQ management UI |

Check them all:

```bash
for port in 3000 5432 5672 8000 8080 9000 9001 15672; do
  if ss -ltn "sport = :$port" | grep -q LISTEN; then
    echo "PORT $port IN USE"
  else
    echo "PORT $port FREE"
  fi
done
```

If an old ClassSight stack is already running, stop it before starting a new one:

```bash
sudo docker compose down
```

Do **not** use `down -v` unless you intentionally want to delete the local Postgres, MinIO, and RabbitMQ volumes.

## 5. Build and start the normal synchronous stack

From the repository root, run:

```bash
sudo docker compose config
sudo docker compose build
sudo docker compose up -d
```

The first build can take several minutes because the FastAPI image installs face-recognition dependencies, including dlib. Watch the startup status:

```bash
sudo docker compose ps
```

Wait until `postgres`, `minio`, `rabbitmq`, `face-service-fastapi`, and `backend-spring` are healthy, and until `frontend-next` is started or healthy. You can watch all logs with:

```bash
sudo docker compose logs -f
```

Press `Ctrl+C` to stop following logs; this does not stop the containers.

## 6. Verify every local service

Run the following health checks:

```bash
curl -fsS http://127.0.0.1:8080/health && echo
curl -fsS http://127.0.0.1:8000/health && echo
curl -fsS http://127.0.0.1:9000/minio/health/live && echo
curl -fsS http://127.0.0.1:3000 | grep -E 'CLASSSIGHT / FACULTY|Capture attendance with confidence'
echo 'Frontend and HTTP health checks passed'
```

Verify PostgreSQL:

```bash
sudo docker exec classsight-postgres-1 pg_isready -U classsight -d classsight
```

The container name may have a project prefix. If the command reports that the name does not exist, find the actual name:

```bash
sudo docker ps --format '{{.Names}}'
```

Verify RabbitMQ and its queues:

```bash
sudo docker exec classsight-rabbitmq-1 rabbitmq-diagnostics -q ping
sudo docker exec classsight-rabbitmq-1 rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

Verify MinIO and the capture bucket:

```bash
sudo docker run --rm --network host --entrypoint /bin/sh minio/mc:latest -c \
  'mc alias set local http://127.0.0.1:9000 minioadmin minioadmin && mc ls local/classsight-captures'
```

If the generated container names differ, use `sudo docker ps` and substitute the actual names.

## 7. Open the local applications

Open these URLs in a browser:

| URL | Use |
|---|---|
| [http://localhost:3000](http://localhost:3000) | New Next.js faculty flow |
| [http://localhost:8080/login](http://localhost:8080/login) | Existing Thymeleaf login |
| [http://localhost:9001](http://localhost:9001) | MinIO console |
| [http://localhost:15672](http://localhost:15672) | RabbitMQ management UI |

Local seeded credentials are:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `teacher` | `teacher123` | Faculty/teacher |

Use `teacher / teacher123` for the faculty capture flow. Use `admin / admin123` for administrative, ERP, camera, and retention operations.

MinIO console credentials are `minioadmin / minioadmin`. RabbitMQ management credentials are `classsight / classsight_rabbit_password`.

## 8. Test the new Next.js faculty flow

Open [http://localhost:3000](http://localhost:3000), then:

1. Sign in with `teacher` and `teacher123`.
2. Select a room.
3. Select the subject/class assignment.
4. Upload a real classroom image through the capture screen.
5. Wait for recognition polling to reach `REVIEW_REQUIRED`, `PRESENT`, or `FINALIZED`.
6. Mark each review item as Present or Absent.
7. Select **Finalize attendance**.

The Next.js app keeps the JWT in memory and sends it in the `Authorization` header. It does not store the token in localStorage.

To verify the page without a browser:

```bash
curl -fsS http://127.0.0.1:3000 | grep -E 'CLASSSIGHT / FACULTY|Capture attendance with confidence'
```

## 9. Enable and test RabbitMQ asynchronous recognition

The normal stack uses synchronous recognition. To enable the additive asynchronous path, edit `.env`:

```bash
sed -i 's/^RECOGNITION_MODE=.*/RECOGNITION_MODE=async/' .env
sed -i 's/^RABBITMQ_WORKER_ENABLED=.*/RABBITMQ_WORKER_ENABLED=true/' .env
```

If `RABBITMQ_WORKER_ENABLED` is not already present, append it:

```bash
grep -q '^RABBITMQ_WORKER_ENABLED=' .env || echo 'RABBITMQ_WORKER_ENABLED=true' >> .env
```

Recreate the affected services:

```bash
sudo docker compose up -d --build face-service-fastapi backend-spring
```

Check the worker and Spring logs:

```bash
sudo docker compose logs -f face-service-fastapi backend-spring
```

In another terminal, inspect the queue counts:

```bash
sudo docker exec classsight-rabbitmq-1 rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

Capture through the Next.js UI or an existing capture client. In async mode the initial HTTP response can arrive before recognition completes. Poll the review URL until the session leaves `CAPTURED`/`PROCESSING` and reaches `REVIEW_REQUIRED`, `PRESENT`, or `FINALIZED`.

To return to the safe default synchronous mode:

```bash
sed -i 's/^RECOGNITION_MODE=.*/RECOGNITION_MODE=sync/' .env
sed -i 's/^RABBITMQ_WORKER_ENABLED=.*/RABBITMQ_WORKER_ENABLED=false/' .env
sudo docker compose up -d backend-spring face-service-fastapi
```

## 10. Run backend tests

Run the Spring tests inside the Maven builder image:

```bash
sudo docker run --rm \
  -v "$PWD/backend-spring:/app" \
  -w /app \
  --network host \
  maven:3.9-eclipse-temurin-17 \
  mvn -B test
```

Run the FastAPI tests. The simplest container-based command is:

```bash
sudo docker run --rm \
  -v "$PWD/face-service-fastapi:/app" \
  -w /app \
  --network host \
  classsight-face-service-fastapi:latest \
  pytest -q
```

Run the repository golden-set regression:

```bash
python3 golden-set/run-regression.py
```

Run the CPU benchmark:

```bash
python3 docs/a4-benchmark/benchmark_cpu.py
```

Run the edge-detection spike comparison already included in the upgrade:

```bash
sudo docker run --rm --network host \
  -e EDGE_ENROLLED_JSON="$(sudo docker exec classsight-postgres-1 psql -U classsight -d classsight -At -F $'\t' -c \"select roll_number, array_to_string(face_embedding, ',') from students where face_embedding is not null order by id\" | python3 -c 'import json,sys; print(json.dumps([{\"student_id\":i,\"roll_number\":x.split(chr(9),1)[0],\"embedding\":[float(v) for v in x.split(chr(9),1)[1].split(\",\")] } for i,x in enumerate(sys.stdin.read().splitlines(),1)]))')" \
  -v "$PWD:/repo" \
  -w /repo \
  classsight-face-service-fastapi:latest \
  sh -c 'pip install --no-cache-dir requests >/dev/null && python /repo/scripts/edge_detection_spike.py'
```

The spike writes results to `docs/edge-spike/results.json` and crops to `docs/edge-spike/crops/`.

## 11. Useful operational commands

Show service status:

```bash
sudo docker compose ps
```

Follow one service:

```bash
sudo docker compose logs -f backend-spring
sudo docker compose logs -f face-service-fastapi
sudo docker compose logs -f frontend-next
sudo docker compose logs -f rabbitmq
```

Restart without rebuilding:

```bash
sudo docker compose restart
```

Rebuild only changed services:

```bash
sudo docker compose build backend-spring face-service-fastapi frontend-next
sudo docker compose up -d backend-spring face-service-fastapi frontend-next
```

Inspect database rows:

```bash
sudo docker exec -it classsight-postgres-1 psql -U classsight -d classsight
```

Inside `psql`, useful queries are:

```sql
select id, status, captured_photo_path from attendance_sessions order by id desc limit 10;
select id, roll_number from students order by id;
\q
```

Inspect MinIO objects:

```bash
sudo docker run --rm --network host --entrypoint /bin/sh minio/mc:latest -c \
  'mc alias set local http://127.0.0.1:9000 minioadmin minioadmin && mc find local/classsight-captures'
```

Inspect RabbitMQ queues:

```bash
sudo docker exec classsight-rabbitmq-1 rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

## 12. Stop the stack safely

Stop containers but preserve all named volumes and local data:

```bash
sudo docker compose down
```

Start the already-built stack again:

```bash
sudo docker compose up -d
```

To remove containers, networks, and volumes permanently, use this only if you intentionally want to delete the local database, MinIO objects, and RabbitMQ state:

```bash
sudo docker compose down -v
```

## 13. Troubleshooting

If Docker reports that a port is already allocated, identify the process and stop the conflicting service:

```bash
sudo ss -ltnp | grep -E ':(3000|5432|5672|8000|8080|9000|9001|15672)'
```

If a service is unhealthy, inspect its logs:

```bash
sudo docker compose ps
sudo docker compose logs --tail=200 SERVICE_NAME
```

If the backend starts before dependencies are ready, restart it after the dependency healthchecks pass:

```bash
sudo docker compose restart backend-spring
sudo docker compose ps
curl -fsS http://127.0.0.1:8080/health && echo
```

If the FastAPI image build is killed during dlib compilation, close unrelated containers and retry with more memory available:

```bash
sudo docker compose down
sudo docker system prune -f
sudo docker compose build --no-cache face-service-fastapi
sudo docker compose up -d
```

Do not run `docker system prune --volumes` unless you intentionally want to remove Docker volumes. The application’s Postgres, MinIO, and RabbitMQ data are stored in named volumes.

If the Next.js page loads but API calls fail, confirm that Spring is healthy and that the page is using the correct API base URL:

```bash
grep '^NEXT_PUBLIC_API_BASE_URL=' .env || true
curl -fsS http://127.0.0.1:8080/health && echo
```

For production, replace the example credentials and JWT secret, use a normal Docker bridge or Kubernetes network instead of host networking, and obtain a real ERP provider contract, real classroom-photo dataset, and real IP-camera configuration.
