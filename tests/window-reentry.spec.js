import { test, expect } from '@playwright/test';

async function loaded(page) {
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
}
async function seek(page, time) {
  await page.locator('.hero-experience-animation').evaluate((el, time) => { el.heroTimeline.pause().time(time); el.heroRender(); }, time);
}

test('Window is black before its first movement after returns from all content sections', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/'); await loaded(page);
  await seek(page, 4.8);
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
  await seek(page, 7.75);
  const window = page.locator('.experience-window-group');
  await window.evaluate(el => window.originalWindow = el);
  for (const id of ['about', 'yugeng', 'contact']) {
    await page.evaluate(id => dispatchEvent(new CustomEvent('section-request', { detail: { id } })), id);
    await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-index', '0');
    await page.getByRole('button', { name: '返回 Hero 首页' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '0');
    await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
    await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
    const before = await window.getAttribute('transform');
    const start = await page.evaluate(() => {
      let result;
      addEventListener('section-transition-start', () => { result = { visibility: document.querySelector('.window-night-mask').getAttribute('visibility'), height: document.querySelector('.night-reveal').getAttribute('height'), transform: document.querySelector('.experience-window-group').getAttribute('transform') }; }, { once: true });
      dispatchEvent(new WheelEvent('wheel', { deltaY: 50, cancelable: true }));
      return result;
    });
    expect(start).toEqual({ visibility: 'visible', height: '189', transform: before });
    await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '1');
    await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
    expect(await window.evaluate(el => el === window.originalWindow)).toBe(true);
  }
});

test('Reload with restored content scroll does not cover water during the complete upward phase', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/'); await loaded(page);
  await seek(page, 7.75);
  await page.evaluate(() => dispatchEvent(new CustomEvent('section-request', { detail: { id: 'yugeng' } })));
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '4');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  await page.evaluate(() => history.replaceState(null, '', '#hero'));
  await page.reload(); await loaded(page);
  const surfaces = [];
  for (const time of [4.25, 4.8, 5.5, 6.4, 6.75]) {
    await seek(page, time);
    await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
    await expect(page.locator('.contained-water')).toHaveAttribute('visibility', 'visible');
    expect(await page.locator('.contained-water').evaluate(el => el.closest('.experience-window-group') === document.querySelector('.experience-open-window').parentElement)).toBe(true);
    surfaces.push(await page.locator('.contained-water').getAttribute('d'));
  }
  expect(new Set(surfaces).size).toBeGreaterThan(3);
  await seek(page, 6.85);
  await expect(page.locator('.experience-outflow')).toHaveAttribute('visibility', 'visible');
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'visible');
  await seek(page, 7.75);
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().time(0); el.heroRender(); });
  await seek(page, 4.8);
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
  await expect(page.locator('.contained-water')).toHaveAttribute('visibility', 'visible');
});
