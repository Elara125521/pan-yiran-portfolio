import { test, expect } from '@playwright/test';

test('Pause on third project, hover, then one light wheel directly reaches fourth', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#sanshan');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.mouse.move(950, 450);
  await page.mouse.wheel(0, 120);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '4');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await page.waitForTimeout(1200);
  await page.locator('#yugeng .island-button').hover();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.framesWork = []; window.workStarts = 0; window.commitsWork = [];
    window.addEventListener('section-transition-start', () => window.workStarts++);
    window.addEventListener('section-settled', e => window.commitsWork.push(e.detail.index));
    const end = performance.now() + 2500;
    function frame() { const r = document.querySelector('#eat').getBoundingClientRect(); window.framesWork.push({ y: scrollY, current: document.documentElement.dataset.scrollIndex, moving: document.documentElement.dataset.scrollTransitioning, error: r.top + r.height / 2 - innerHeight / 2 }); if (performance.now() < end) requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  });
  await page.mouse.wheel(0, 4);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '5');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  await page.waitForTimeout(1400);
  const record = await page.evaluate(() => ({ frames: window.framesWork, starts: window.workStarts, commits: window.commitsWork }));
  expect(record.starts).toBe(1);
  expect(record.commits).toEqual([5]);
  await expect(page.locator('html')).not.toHaveAttribute('data-scroll-target');
  expect(record.frames.filter(f => f.current === '5').every(f => Math.abs(f.error) <= 1)).toBe(true);
  await page.screenshot({ path: 'test-results/work-fourth-settled.png' });
});

test('Work has no native wheel fallback even when a child consumes the wheel event', async ({ page }) => {
  await page.goto('/#yugeng');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.mouse.move(1100, 550);
  const initial = await page.evaluate(() => {
    document.addEventListener('wheel', event => event.stopPropagation(), { capture: true, once: true });
    return { y: scrollY, widths: [...document.querySelectorAll('.island-composition')].map(el => el.offsetWidth) };
  });
  await page.mouse.wheel(0, 170);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => scrollY)).toBe(initial.y);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '4');
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 4);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '5');
  expect(await page.locator('.island-composition').evaluateAll(els => els.map(el => el.offsetWidth))).toEqual(initial.widths);
});
