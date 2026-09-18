import { test, expect } from '@playwright/test';

test('Settled Work ignores subthreshold diagonal input without native correction', async ({ page }) => {
  await page.goto('/#yugeng');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '4');
  await page.evaluate(() => {
    window.workLog = { starts: 0, writes: [], initial: scrollY };
    const original = window.scrollTo.bind(window);
    window.scrollTo = (...args) => { window.workLog.writes.push(args); return original(...args); };
    window.addEventListener('section-transition-start', () => window.workLog.starts++);
  });
  await page.mouse.move(1100, 700);
  await page.mouse.wheel(30, 2);
  await page.waitForTimeout(1300);
  const log = await page.evaluate(() => ({ ...window.workLog, y: scrollY, inner: document.querySelector('#projects').scrollTop }));
  expect(log.y).toBe(log.initial);
  expect(log.inner).toBe(0);
  expect(log.starts).toBe(0);
  expect(log.writes).toHaveLength(0);
});

test('Every Work stop stays anchored after tiny input and advances exactly once both ways', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/#shunshi');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.mouse.move(100, 650);
  for (const index of [2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2]) {
    await expect(page.locator('html')).toHaveAttribute('data-scroll-index', String(index));
    await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
    const before = await page.evaluate(() => scrollY);
    await page.waitForTimeout(220);
    await page.mouse.wheel(20, 1);
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => scrollY)).toBe(before);
    const error = await page.locator('.project-island').nth(index - 2).evaluate(el => {
      const r = el.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - innerHeight / 2);
    });
    expect(error).toBeLessThanOrEqual(1);
    await expect(page.locator('.project-island.is-centered')).toHaveCount(1);
    if (index === 2 && before === await page.evaluate(() => window.lastWorkY)) break;
    if (index === 2) await page.evaluate(y => window.lastWorkY = y, before);
    const direction = await page.evaluate(i => {
      if (i === 7) window.reversingWork = true;
      return window.reversingWork ? -1 : 1;
    }, index);
    await page.mouse.wheel(0, direction * (index % 2 ? 2400 : 4));
  }
});
