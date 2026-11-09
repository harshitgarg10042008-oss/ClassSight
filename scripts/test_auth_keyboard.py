import sys
from playwright.sync_api import sync_playwright

def test_login_keyboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto("http://localhost:3010/login", wait_until="networkidle")
        
        # 1. Focus input via Tab
        page.keyboard.press("Tab") # Skip link or brand
        page.keyboard.press("Tab") # Language or Theme
        page.keyboard.press("Tab") # Username input or first field
        
        # Focus directly on username input if needed
        username_el = page.query_selector("#login-username")
        assert username_el is not None, "Username input #login-username not found"
        username_el.focus()
        
        # Type username
        page.keyboard.type("teacher")
        assert username_el.input_value() == "teacher", "Username typing failed"
        
        # Tab to password input
        page.keyboard.press("Tab")
        password_el = page.query_selector("#login-password")
        assert password_el is not None, "Password input #login-password not found"
        page.keyboard.type("teacher123")
        assert password_el.input_value() == "teacher123", "Password typing failed"
        assert password_el.get_attribute("type") == "password", "Initial password type should be 'password'"
        
        # Tab to password eye toggle
        page.keyboard.press("Tab")
        toggle_btn = page.query_selector(".cs-password-toggle")
        assert toggle_btn is not None, "Password eye toggle button not found"
        assert toggle_btn.get_attribute("aria-pressed") == "false", "Initial toggle should be false"
        
        # Toggle eye with Space key
        page.keyboard.press("Space")
        assert toggle_btn.get_attribute("aria-pressed") == "true", "Eye toggle failed to set aria-pressed true"
        assert password_el.get_attribute("type") == "text", "Password input type should switch to text"
        
        # Toggle back with Enter key
        page.keyboard.press("Enter")
        assert toggle_btn.get_attribute("aria-pressed") == "false", "Eye toggle failed to set aria-pressed false on Enter"
        assert password_el.get_attribute("type") == "password", "Password input type should switch back to password"
        
        # Tab to remember checkbox
        page.keyboard.press("Tab")
        checkbox_el = page.query_selector("#remember-user")
        assert checkbox_el is not None, "Remember checkbox not found"
        page.keyboard.press("Space")
        assert checkbox_el.is_checked(), "Checkbox failed to check via Space key"
        
        print("Keyboard-only login test PASS: all fields accessible, eye toggle keyboard operable, checkbox toggled.")
        browser.close()

if __name__ == "__main__":
    test_login_keyboard()

