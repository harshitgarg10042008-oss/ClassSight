import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const routes = ['/', '/pricing', '/privacy', '/terms', '/app', '/app/enrollment', '/app/analytics', '/app/student', '/app/hod', '/app/teacher', '/admin', '/owner'];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
await context.route('http://127.0.0.1:8080/api/analytics', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ averageAttendance: 0, shortfallCount: 0, students: [] }),
  });
});
const loginResponse = await fetch('http://127.0.0.1:8080/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usernameOrEmail: 'teacher', password: 'teacher123' }),
});
assert.equal(loginResponse.status, 200, 'teacher login API');
const loginBody = await loginResponse.json();
await context.addInitScript((token) => {
  window.localStorage.setItem('classsight_token', token);
}, loginBody.token);
const login = await context.newPage();
await login.goto('http://localhost:3000/app', { waitUntil: 'networkidle' });
if (await login.locator('.login-card').count()) {
  await login.locator("input:not([type]), input[type='text']").first().fill('teacher');
  await login.locator("input[type='password']").fill('teacher123');
  await login.locator('button.login-btn').click();
  await login.waitForTimeout(1200);
}
await login.close();
const rows = [];
for (const width of [360, 768, 1280]) {
  for (const route of routes) {
    const page = await context.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const response = await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, `${route} at ${width}`);
    assert.equal(await page.locator('h1').count(), 1, `${route} must have one h1`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} overflows at ${width}`);
    assert.equal(errors.length, 0, `${route} console errors: ${errors.join('; ')}`);
    for (const image of await page.locator('img').all()) assert.ok(await image.getAttribute('alt'), `${route} image needs alt`);
    rows.push({ route, width, title: await page.title() });
    await page.close();
  }
}
const cookie = await browser.newPage({ viewport: { width: 360, height: 900 } });
await cookie.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await cookie.getByRole('button', { name: 'Understand' }).focus();
assert.equal(await cookie.getByRole('button', { name: 'Understand' }).evaluate((element) => document.activeElement === element), true);
await cookie.getByRole('button', { name: 'Understand' }).click();
assert.equal(await cookie.getByRole('dialog').count(), 0);
const pricing = await browser.newPage();
await pricing.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
assert.match(await pricing.locator('body').innerText(), /Essential/i);
fs.mkdirSync('../.work/after', { recursive: true });
fs.writeFileSync('../.work/after/route-results.json', JSON.stringify(rows, null, 2));
await browser.close();
console.log(`Route smoke passed: ${rows.length} route/viewport checks.`);
