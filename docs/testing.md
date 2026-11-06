# Testing

Start the local services with `python scripts/dev.py up`.

```powershell
python -m pytest face-service-fastapi/tests -v
python -m pytest tests/api -v
python -m pytest tests/e2e -v
docker run --rm -v "${PWD}\backend-spring:/workspace" -w /workspace maven:3.9-eclipse-temurin-17 mvn test --no-transfer-progress
```

The API and browser suites use the development teacher account. Browser tests use fake media permissions and do not establish real-webcam accuracy.
