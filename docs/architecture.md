# ClassSight architecture

```mermaid
flowchart LR
    Browser[Teacher browser] --> Spring[Spring Boot backend\nAuth, sessions, review, analytics, ERP]
    Spring --> Face[FastAPI face service\nMTCNN detection and FaceNet embeddings]
    Spring --> DB[(PostgreSQL\nstudents, sessions, records, audits)]
    Spring --> Files[(Local capture and ERP-export volumes)]
    Spring --> Cam[Camera adapter boundary]
    Cam --> RTSP[RTSP camera or simulated GStreamer stream]
    Spring --> ERP[ErpProvider boundary]
    ERP --> CSV[Local provisional CSV provider]
```

The Spring service owns authentication, authorization, enrollment orchestration, capture persistence, attendance records, manual review, analytics/PDF reporting, ERP synchronization, and camera health state. The FastAPI service performs MTCNN detection, FaceNet embedding, and tiered matching. PostgreSQL persists business state, MinIO stores private photos, and RabbitMQ supports asynchronous recognition work.
