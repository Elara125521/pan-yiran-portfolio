import { test, expect } from '@playwright/test';

test('Work navigation fades during Contact transition and Contact geometry stays fixed after arrival', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#experiments');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.mouse.move(100, 100);
  await page.evaluate(() => {
    window.boundarySamples = [];
    const record = (progress, phase) => {
      const title = document.querySelector('#contact h2').getBoundingClientRect();
      const stage = document.querySelector('.contact-stage').getBoundingClientRect();
      const nav = getComputedStyle(document.querySelector('.side-navigation'));
      window.boundarySamples.push({ progress, phase, width: stage.width, x: title.x, localY: title.y - stage.y, opacity: Number(nav.opacity), y: title.y });
    };
    window.addEventListener('section-progress', e => { if (e.detail.toIndex === 8 || e.detail.fromIndex === 8) record(e.detail.progress, e.detail.toIndex === 8 ? 'down' : 'up'); });
    window.addEventListener('section-settled', e => { if (e.detail.index === 8) requestAnimationFrame(() => record(1, 'settled')); });
  });
  await page.mouse.wheel(0, 100);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '8');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  await page.waitForTimeout(350);
  const down = await page.evaluate(() => ({ samples: window.boundarySamples, now: document.querySelector('#contact h2').getBoundingClientRect().toJSON() }));
  const early = down.samples.filter(s => s.phase === 'down' && s.progress >= .3 && s.progress < .8);
  expect(early.length).toBeGreaterThan(0);
  expect(early.every(s => s.opacity === 0)).toBe(true);
  expect(new Set(down.samples.map(s => s.width)).size).toBe(1);
  expect(new Set(down.samples.map(s => s.x)).size).toBe(1);
  const last = down.samples.filter(s => s.phase === 'down').at(-1);
  expect(Math.abs(last.y - down.now.y)).toBeLessThan(.01);
  await page.mouse.wheel(0, -100);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '7');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  const up = await page.evaluate(() => window.boundarySamples.filter(s => s.phase === 'up'));
  expect(up.filter(s => s.progress < .45).every(s => s.opacity === 0)).toBe(true);
  expect(up.some(s => s.opacity > 0 && s.opacity < 1)).toBe(true);
  await expect(page.locator('.side-navigation')).toHaveCSS('opacity', '1');
});
