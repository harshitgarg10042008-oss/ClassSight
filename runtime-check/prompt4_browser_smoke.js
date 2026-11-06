const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'runtime-check/screenshots/01_login.png', fullPage: true });
  await page.getByLabel('Username or Email').fill('teacher');
  await page.getByLabel('Password').fill('teacher123');
  await page.getByRole('button', { name: /Sign In/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'runtime-check/screenshots/02_teacher_dashboard.png', fullPage: true });
  const text = await page.locator('body').innerText();
  fs.writeFileSync('runtime-check/screenshots/console-errors.txt', errors.join('\n'));
  fs.writeFileSync('runtime-check/screenshots/body.txt', text);
  await browser.close();
  if (errors.length) process.exitCode = 2;
})();
