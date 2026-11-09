import os
import re
import json
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3010"
OUTPUT_DIR = os.path.abspath(".work/screens")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Parse routes from routes.ts
with open("frontend-next/config/routes.ts", "r", encoding="utf-8") as f:
    routes_content = f.read()

# Extract paths
paths = re.findall(r"path:\s*['\"]([^'\"]+)['\"]", routes_content)
# Add some standard routes if not caught
core_routes = [
    "/", "/features", "/features/FT01", "/how-it-works", "/pricing",
    "/solutions", "/solutions/colleges", "/security", "/trust", "/integrations",
    "/about", "/contact", "/book-demo", "/faq", "/docs", "/changelog",
    "/resources", "/accessibility", "/status", "/sitemap", "/privacy",
    "/terms", "/cookies", "/dpa", "/refund", "/acceptable-use",
    "/student-data-notice", "/login", "/signup", "/forgot-password",
    "/reset-password", "/verify-email", "/accept-invite", "/two-factor",
    "/logout", "/onboarding", "/notifications", "/app", "/portal",
    "/admin", "/owner", "/dev/ui"
]
all_routes = sorted(list(set(paths + core_routes)))

viewports = [
    ("mobile", 360, 640),
    ("tablet", 768, 1024),
    ("desktop", 1280, 800),
]

# Key routes to screenshot at all 3 viewports
screenshot_routes = [
    "/", "/pricing", "/login", "/signup", "/app", "/portal",
    "/admin", "/owner", "/notifications", "/dev/ui", "/onboarding"
]

results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    for vp_name, width, height in viewports:
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        
        for route in all_routes:
            url = f"{BASE_URL}{route}"
            record = {"route": route, "viewport": vp_name, "width": width, "status": None, "h1_count": 0, "has_title": False, "has_main": False, "has_overflow": False, "error": None}
            try:
                response = page.goto(url, wait_until="domcontentloaded", timeout=15000)
                record["status"] = response.status if response else None
                
                # Check h1
                h1_elements = page.query_selector_all("h1")
                record["h1_count"] = len(h1_elements)
                
                # Check title
                title = page.title()
                record["has_title"] = bool(title and len(title.strip()) > 0)
                record["title"] = title
                
                # Check main landmark
                main_el = page.query_selector("main")
                record["has_main"] = main_el is not None
                
                # Check horizontal scroll / overflow
                scroll_width = page.evaluate("() => document.documentElement.scrollWidth")
                inner_width = page.evaluate("() => window.innerWidth")
                record["has_overflow"] = scroll_width > (inner_width + 1)
                
                # Screenshot if in screenshot_routes
                if route in screenshot_routes:
                    slug = route.strip("/").replace("/", "_") or "home"
                    ss_path = os.path.join(OUTPUT_DIR, f"{slug}_{vp_name}_{width}px.png")
                    page.screenshot(path=ss_path, full_page=True)
                    record["screenshot"] = ss_path

            except Exception as e:
                record["error"] = str(e)
            
            results.append(record)
            if vp_name == "desktop":
                print(f"[{record['status']}] {route} (h1: {record['h1_count']}, overflow: {record['has_overflow']})")
        
        context.close()
    
    browser.close()

with open(".work/audit_crawl_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"Audit crawl finished: {len(results)} checks performed.")

