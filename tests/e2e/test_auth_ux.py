import json
import os

from playwright.sync_api import sync_playwright

FRONTEND = os.getenv("CLASSSIGHT_FRONTEND_URL", "http://localhost:3000")


def new_page(playwright):
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    return browser, context, context.new_page()


def test_password_eye_toggle_works_with_keyboard_and_mouse():
    with sync_playwright() as playwright:
        browser, _context, page = new_page(playwright)
        page.goto(f"{FRONTEND}/login", wait_until="networkidle")
        password = page.locator("#login-password")
        toggle = page.locator(".password-toggle")

        toggle.focus()
        toggle.press("Enter")
        assert password.get_attribute("type") == "text"
        assert toggle.get_attribute("aria-pressed") == "true"
        assert toggle.get_attribute("aria-label") == "Hide password"

        toggle.press("Space")
        assert password.get_attribute("type") == "password"
        assert toggle.get_attribute("aria-pressed") == "false"

        toggle.click()
        assert password.get_attribute("type") == "text"
        toggle.click()
        assert password.get_attribute("type") == "password"
        browser.close()


def test_remember_me_stores_only_the_username():
    with sync_playwright() as playwright:
        browser, context, page = new_page(playwright)
        page.goto(f"{FRONTEND}/login", wait_until="networkidle")
        page.locator("input[autocomplete='username']").fill("teacher")
        page.locator("input[autocomplete='current-password']").fill("teacher123")
        page.get_by_role("checkbox", name="Remember username only").check()
        with page.expect_response(lambda response: response.url.endswith("/auth/login"), timeout=30000) as login:
            page.get_by_role("button", name="Sign in").click()
        assert login.value.status == 200
        page.wait_for_url("**/app", wait_until="networkidle")

        stored = page.evaluate("Object.fromEntries(Object.entries(localStorage))")
        assert stored.get("classsight_username") == "teacher"
        assert "classsight_password" not in stored
        assert "teacher123" not in json.dumps(stored)

        fresh = context.new_page()
        fresh.goto(f"{FRONTEND}/login", wait_until="networkidle")
        assert fresh.locator("input[autocomplete='username']").input_value() == "teacher"
        browser.close()
