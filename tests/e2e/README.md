# Browser tests

Install Playwright once with `pip install playwright && playwright install chromium`, start the stack, then run:

```powershell
python -m pytest tests/e2e -v
```

The suite uses fake media permissions. It is not a real-webcam accuracy test.
