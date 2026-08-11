# ClassSight

ClassSight is a classroom monitoring system with two microservices:

- **backend-spring**: Spring Boot backend service (Java 17, Maven)
- **face-service-fastapi**: FastAPI face recognition service (Python)

## Prerequisites

- Docker and Docker Compose
- Java 17+ (for local development of backend)
- Python 3.11+ (for local development of face service)

## Quick Start with Docker Compose

1. Copy environment variables:
```bash
cp .env.example .env
```

2. Start all services:
```bash
docker-compose up --build
```

3. Verify health endpoints:
```bash
curl http://localhost:8080/health
curl http://localhost:8000/health
```

## Services

### Backend Spring Service
- **Port**: 8080
- **Health Endpoint**: `GET http://localhost:8080/health`
- **Tech Stack**: Spring Boot 3.2.0, Java 17, Maven

### Face Service FastAPI
- **Port**: 8000
- **Health Endpoint**: `GET http://localhost:8000/health`
- **Tech Stack**: FastAPI, Python 3.11, Uvicorn

### PostgreSQL
- **Port**: 5432
- **Default credentials**: See `.env.example`

## Local Development

### Backend Spring
```bash
cd backend-spring
mvn spring-boot:run
```

### Face Service FastAPI
```bash
cd face-service-fastapi
pip install -r requirements.txt
uvicorn main:app --reload
```

## Environment Variables

See `.env.example` for all required environment variables.

## Recognition Benchmarks

### Enrollment Performance

To benchmark student enrollment time:

1. Ensure a student record exists in the database (with a valid roll number)
2. Use the enrollment endpoint with a reference photo:
```bash
curl -X POST http://localhost:8080/students/{rollNumber}/enroll \
  -F "photo=@/path/to/student_photo.jpg"
```

3. The response includes `enrollmentTimeMs` showing total processing time

**Benchmark Results:**
- Single-face photo enrollment: 386ms

**Test Environment:**
- CPU: Intel/AMD x86_64
- RAM: 16GB
- Face detection model: dlib HOG (CPU-friendly)
- Embedding dimension: 128 (face_recognition default)
