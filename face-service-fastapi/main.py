from fastapi import FastAPI

app = FastAPI(title="Face Service FastAPI")

@app.get("/health")
def health():
    return {"status": "UP", "service": "face-service-fastapi"}
