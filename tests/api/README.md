# API tests

Run from the repository root after starting the stack:

```powershell
python -m pytest tests/api -v
```

Tests authenticate with the development teacher account and never modify production records. Scenario tests use the `RTC_` prefix and must clean up their records.
