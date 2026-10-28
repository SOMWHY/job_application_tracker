import { chromium } from '@playwright/test';

const APP = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const email = `probe-${Date.now()}@example.com`;

  await page.goto(`${APP}/register`);
  await page.getByTestId('register-name').fill('Probe');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill('probe-password-123');
  await page.getByTestId('register-submit').click();
  await page.waitForTimeout(2000);

  console.log('=== URL after register:', page.url());
  console.log('=== cookies:', JSON.stringify(await ctx.cookies(), null, 2));

  // Fetch get-session through the SAME-ORIGIN path (proxied by vite to :4000)
  const proxied = await page.evaluate(async () => {
    const res = await fetch('/api/auth/get-session', { credentials: 'include' });
    return { status: res.status, body: await res.text() };
  });
  console.log('=== PROXIED get-session (5173 -> 4000):', JSON.stringify(proxied, null, 2));

  // Direct to 4000
  const direct = await ctx.request.get('http://localhost:4000/api/auth/get-session');
  console.log('=== DIRECT get-session (4000):', direct.status(), await direct.text());

  await browser.close();
})();
