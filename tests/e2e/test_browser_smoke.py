import os
from pathlib import Path

from playwright.sync_api import sync_playwright


def test_teacher_login_and_dashboard():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=[
            "--no-sandbox",
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
        ])
        context = browser.new_context(permissions=["camera", "microphone"])
        page = context.new_page()
        errors = []
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.goto(os.getenv("CLASSSIGHT_FRONTEND_URL", "http://localhost:3000/app"), wait_until="networkidle")
        page.locator("input:not([type]), input[type='text']").first.fill("teacher")
        page.locator("input[type='password']").fill("teacher123")
        with page.expect_response(lambda response: response.url.endswith("/auth/login"), timeout=30000) as login_response:
            page.locator("button.login-btn").click()
        assert login_response.value.status == 200
        page.wait_for_timeout(2500)
        assert page.locator(".login-card").count() == 0
        assert page.get_by_text("Select Class & Room").count() == 1
        assert not errors
        browser.close()
