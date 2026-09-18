import { test, expect } from '@playwright/test';

test('Fast assets do not shorten the intro and no skip button remains', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /跳过动画/ })).toHaveCount(0);
  await page.waitForTimeout(2500);
  await expect(page.locator('.loading-screen')).toHaveCount(1);
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 4000 });
});

test('A slow critical SVG holds the final frame until ready without waiting for project media', async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/hero/window-open.svg', async route => { await held; await route.continue(); });
  const requests = [];
  page.on('request', request => { if (/\/assets\/projects\//.test(request.url()) && ['image', 'media'].includes(request.resourceType())) requests.push(request.url()); });
  await page.goto('/');
  await page.waitForTimeout(4900);
  await expect(page.locator('.loading-screen')).toHaveCount(1);
  await expect(page.locator('.loading-screen')).toHaveAttribute('data-phase', '7');
  await expect(page.locator('.loading-screen')).toHaveCSS('opacity', '1');
  expect(requests).toEqual([]);
  release();
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 2500 });
});

test('A stalled critical request times out and a failed request cannot trap the mask', async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/hero/window-open.svg', async route => { await held; await route.abort(); });
  await page.route('**/assets/hero/moon.svg', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  release();
});
