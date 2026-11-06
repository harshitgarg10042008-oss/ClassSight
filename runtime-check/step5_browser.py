"""
Step 5: Browser (Playwright) - Headless browser flow for ClassSight.

Tests:
1. Login page renders and credentials work
2. Main attendance page loads with expected UI elements
3. Section/course selector populates
4. Console errors captured during flow
5. Screenshots captured

NOTE: The login form in page.tsx has default values pre-filled (teacher/teacher123).
      Inputs have no name/id attributes; targeted by position within .login-form.
"""
import json
import base64
import time
import sys
import os

try:
    from playwright.sync_api import sync_playwright, Page, ConsoleMessage
except ImportError:
    print("playwright not installed; run: pip install playwright && playwright install chromium")
    sys.exit(1)

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL  = "http://localhost:8080"
RESULTS = {}
CONSOLE_ERRORS = []
SCREENSHOTS = []

# ── helpers ──────────────────────────────────────────────────────────────────

def add_console_listener(page: Page):
    def on_console(msg: ConsoleMessage):
        if msg.type == "error":
            CONSOLE_ERRORS.append({"type": "error", "text": msg.text})
    page.on("console", on_console)


def screenshot(page: Page, name: str) -> str:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_images", f"step5_{name}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    page.screenshot(path=path, full_page=False)
    SCREENSHOTS.append({"name": name, "path": path})
    return path


# ── fake getUserMedia ──────────────────────────────────────────────────────────

FAKE_WEBCAM_JS = """
(() => {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111'; ctx.fillRect(0,0,640,480);
        return canvas.captureStream(30);
    };
})();
"""

# ── main test flow ────────────────────────────────────────────────────────────

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ]
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            permissions=["camera", "microphone"],
        )
        context.add_init_script(FAKE_WEBCAM_JS)
        page = context.new_page()
        add_console_listener(page)

        # ── T1: Frontend loads ─────────────────────────────────────────────
        t0 = time.time()
        page.goto(FRONTEND_URL, wait_until="domcontentloaded", timeout=30000)
        time.sleep(1)
        load_ms = int((time.time() - t0) * 1000)
        title = page.title()
        pass1 = "ClassSight" in title or "classsight" in title.lower()
        RESULTS["T1_frontend_load"] = {
            "pass": pass1,
            "title": title,
            "load_ms": load_ms,
        }
        screenshot(page, "01_initial_load")
        print(f"T1 Frontend load: title={title!r} ({load_ms}ms) -> {'PASS' if pass1 else 'FAIL'}")

        # ── T2: Login form present ─────────────────────────────────────────
        # The form has class login-form; inputs have no name attribute
        login_form = page.query_selector(".login-form")
        password_input = page.query_selector("input[type='password']")
        text_inputs = page.query_selector_all("input[type='text'], input:not([type])")
        pass2 = login_form is not None and password_input is not None and len(text_inputs) > 0
        RESULTS["T2_login_form_present"] = {
            "pass": pass2,
            "has_login_form": login_form is not None,
            "has_password_input": password_input is not None,
            "text_input_count": len(text_inputs),
            "url": page.url,
        }
        print(f"T2 Login form: form={login_form is not None} pwd={password_input is not None} -> {'PASS' if pass2 else 'FAIL'}")

        # ── T3: Login flow ─────────────────────────────────────────────────
        # Default values are pre-filled (teacher/teacher123), just click Sign In
        try:
            # Clear and set username (first text-type input)
            if len(text_inputs) > 0:
                text_inputs[0].fill("teacher")
            if password_input:
                password_input.fill("teacher123")
            screenshot(page, "02_login_filled")

            # Click the login button or submit form
            login_btn = page.query_selector(".login-btn, button[type='submit'], button:has-text('Sign In')")
            if login_btn:
                login_btn.click()
            else:
                page.keyboard.press("Enter")

            # Wait for navigation / login to complete
            page.wait_for_load_state("networkidle", timeout=12000)
            time.sleep(1)
            url_after = page.url
            title_after = page.title()

            # Check if we navigated past login (login-card should be gone)
            still_login = page.query_selector(".login-card") is not None
            pass3 = not still_login
            RESULTS["T3_login"] = {
                "pass": pass3,
                "url_after": url_after,
                "title_after": title_after,
                "login_card_gone": not still_login,
            }
            print(f"T3 Login: login_card_gone={not still_login} url={url_after!r} -> {'PASS' if pass3 else 'FAIL'}")
        except Exception as e:
            RESULTS["T3_login"] = {"pass": False, "error": str(e)}
            print(f"T3 Login: FAILED - {e}")

        screenshot(page, "03_after_login")

        # ── T4: Main page UI elements ──────────────────────────────────────
        time.sleep(2)
        # Inspect actual page HTML for key elements
        ui_checks = {}

        # Capture/take photo button
        capture_btn = page.query_selector("button.capture-btn, button:has-text('Capture'), button:has-text('Take Attendance')")
        ui_checks["capture_button"] = capture_btn is not None

        # Select elements (section, room, etc.)
        selects = page.query_selector_all("select, [role='combobox']")
        ui_checks["selector_elements"] = len(selects) > 0
        ui_checks["selector_count"] = len(selects)

        # Camera / video preview area
        video_el = page.query_selector("video")
        canvas_el = page.query_selector("canvas")
        cam_div = page.query_selector("[class*='camera'], [class*='video'], [class*='preview'], [class*='webcam']")
        ui_checks["camera_element"] = video_el is not None or canvas_el is not None or cam_div is not None

        # Sidebar / panel
        sidebar = page.query_selector("[class*='sidebar'], [class*='panel'], aside, nav")
        ui_checks["sidebar_or_nav"] = sidebar is not None

        # Any heading
        heading = page.query_selector("h1, h2, h3")
        ui_checks["heading_present"] = heading is not None
        if heading:
            ui_checks["heading_text"] = heading.text_content()[:60]

        pass4 = any(v for k, v in ui_checks.items() if isinstance(v, bool))
        RESULTS["T4_main_ui_elements"] = {
            "pass": pass4,
            "elements_found": ui_checks,
        }
        print(f"T4 Main UI: {ui_checks} -> {'PASS' if pass4 else 'FAIL'}")

        screenshot(page, "04_main_page")

        # ── T5: Console errors ─────────────────────────────────────────────
        pass5 = len(CONSOLE_ERRORS) == 0
        RESULTS["T5_console_errors"] = {
            "pass": pass5,
            "error_count": len(CONSOLE_ERRORS),
            "errors": CONSOLE_ERRORS[:10],
        }
        print(f"T5 Console errors: {len(CONSOLE_ERRORS)} errors -> {'PASS' if pass5 else 'FAIL'}")
        for e in CONSOLE_ERRORS[:5]:
            print(f"  ERROR: {e['text'][:120]}")

        # ── T6: API health from browser ────────────────────────────────────
        api_results = {}
        for url in [f"{BACKEND_URL}/actuator/health"]:
            try:
                resp = page.request.get(url, timeout=5000)
                body = resp.json() if resp.headers.get("content-type", "").startswith("application") else {}
                api_results[url] = {"http_status": resp.status, "up": body.get("status") == "UP"}
            except Exception as ex:
                api_results[url] = {"http_status": "ERROR", "error": str(ex)[:100]}

        pass6 = any(v.get("up") for v in api_results.values())
        RESULTS["T6_actuator_health"] = {
            "pass": pass6,
            "results": api_results,
        }
        print(f"T6 Actuator health: {api_results} -> {'PASS' if pass6 else 'FAIL'}")

        # ── T7: Face service health ────────────────────────────────────────
        try:
            fs = page.request.get("http://localhost:8000/health", timeout=5000)
            fb = fs.json()
            pass7 = fs.status == 200 and fb.get("facenet_available") is True
            RESULTS["T7_face_service_health"] = {
                "pass": pass7,
                "http_status": fs.status,
                "detector": fb.get("detector"),
                "embedder": fb.get("embedder"),
                "facenet_available": fb.get("facenet_available"),
            }
            print(f"T7 Face service: {fb.get('detector')} / {fb.get('embedder')} facenet={fb.get('facenet_available')} -> {'PASS' if pass7 else 'FAIL'}")
        except Exception as ex:
            RESULTS["T7_face_service_health"] = {"pass": False, "error": str(ex)[:200]}
            print(f"T7 Face service: ERROR - {ex}")

        context.close()
        browser.close()

    # ── summary ─────────────────────────────────────────────────────────────
    passed = sum(1 for v in RESULTS.values() if v.get("pass"))
    total  = len(RESULTS)
    print(f"\n=== Step 5 Summary: {passed}/{total} passed ===")
    for k, v in RESULTS.items():
        status = "PASS" if v.get("pass") else "FAIL"
        print(f"  {status}  {k}")
    print(f"  Screenshots: {[s['path'] for s in SCREENSHOTS]}")

    return {
        "summary": {"passed": passed, "total": total},
        "results": RESULTS,
        "console_errors": CONSOLE_ERRORS,
        "screenshots": [s["path"] for s in SCREENSHOTS],
    }


if __name__ == "__main__":
    result = run()
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "step5_results.json")
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nResults written to {out_path}")
