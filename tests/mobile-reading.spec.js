import { test, expect } from '@playwright/test';

async function finishIntro(page) {
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
}
async function swipe(page, from, to) {
  await page.locator('.sidebar-scroll').evaluate((element, { from, to }) => {
    const touch = point => new Touch({ identifier: 1, target: element, clientX: point[0], clientY: point[1] });
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch(from)], changedTouches: [touch(from)] }));
    element.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch(to)], changedTouches: [touch(to)] }));
    element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [touch(to)] }));
  }, { from, to });
}

for (const width of [375, 390, 393, 412, 430]) {
  test(`Mobile reading, project scale and close gestures at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto('/#shunshi'); await finishIntro(page);
    const measurements = await page.evaluate(() => {
      const stylesheet = document.querySelector('style[data-vite-dev-id$="mobile-reading.css"]').sheet;
      const read = () => ({
        rows: [...document.querySelectorAll('.project-island')].map(el => el.getBoundingClientRect().height),
        arts: [...document.querySelectorAll('.island-art')].map(el => el.getBoundingClientRect().height),
        descriptions: [...document.querySelectorAll('.project-description')].map(el => getComputedStyle(el).fontSize),
        title: getComputedStyle(document.querySelector('.project-title')).fontSize,
        category: getComputedStyle(document.querySelector('.project-category')).fontSize,
      });
      const current = read(); stylesheet.disabled = true; const baseline = read(); stylesheet.disabled = false;
      const intro = document.querySelector('#about-title .about-introduction');
      const range = document.createRange(); range.selectNodeContents(intro.firstChild);
      return { current, baseline, font: parseFloat(getComputedStyle(intro).fontSize), lines: range.getClientRects().length, intro: intro.getBoundingClientRect().toJSON(), y: scrollY };
    });
    expect(measurements.font).toBeGreaterThanOrEqual(15); expect(measurements.font).toBeLessThanOrEqual(16.5);
    expect(measurements.lines).toBe(1);
    expect(measurements.intro.left).toBeGreaterThanOrEqual(24);
    expect(measurements.current.rows).toEqual(measurements.baseline.rows);
    expect(measurements.current.title).toBe(measurements.baseline.title);
    expect(measurements.current.category).toBe(measurements.baseline.category);
    const factor = width < 390 ? .72 : width < 412 ? .75 : .78;
    measurements.current.arts.forEach((height, i) => expect(height / measurements.baseline.arts[i]).toBeCloseTo(factor, 3));
    expect(measurements.current.descriptions.every(size => size === '12px')).toBe(true);
    await expect(page.locator('.exploration-path')).toBeHidden();
    await page.getByRole('button', { name: '探索项目：顺时' }).tap();
    const dialog = page.locator('dialog'); await expect(dialog).toBeVisible();
    await expect(page.locator('.sidebar-close')).toBeHidden();
    await expect(page.locator('.curtain-surface')).toBeHidden();
    const handle = page.getByRole('button', { name: '收起项目详情' }); await expect(handle).toBeVisible();
    await expect.poll(async () => (await dialog.boundingBox()).x).toBe(0);
    const box = await dialog.boundingBox(); expect(box.y).toBe(0); expect(box.width).toBe(width); expect(box.height).toBe(844);
    expect(await dialog.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(248, 246, 233)');
    await page.evaluate(() => { window.savedMedia = [...document.querySelectorAll('dialog video')]; window.backCalls = 0; history.back = () => window.backCalls++; });
    expect(await page.locator('dialog video').evaluateAll(videos => videos.length === 2 && videos.every(video => video.autoplay && video.loop && video.muted && video.playsInline && !video.controls))).toBe(true);
    await page.locator('.sidebar-scroll').evaluate(el => { el.scrollTop = 900; });
    const handleBox = await handle.boundingBox(); expect(handleBox.x).toBe(0); expect(handleBox.y + handleBox.height / 2).toBeCloseTo(422, 1);
    await swipe(page, [120, 400], [250, 410]); await expect(dialog).not.toHaveClass(/is-closing/);
    await swipe(page, [10, 500], [15, 330]); await expect(dialog).not.toHaveClass(/is-closing/);
    await swipe(page, [10, 400], [50, 402]); await expect(dialog).not.toHaveClass(/is-closing/);
    if (width === 390) await page.screenshot({ path: 'test-results/mobile-reading-390.png' });
    await swipe(page, [10, 400], [125, 410]);
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => scrollY)).toBe(measurements.y);
    await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '2');
    expect(await page.evaluate(() => window.savedMedia.every(video => video.paused) && window.backCalls === 0)).toBe(true);
    await page.getByRole('button', { name: '探索项目：顺时' }).tap();
    await page.getByRole('button', { name: '收起项目详情' }).tap();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => scrollY)).toBe(measurements.y);
    await context.close();
  });
}

test('Native mobile vertical reading scroll stays inside Yugeng and closes to its original stop', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/#yugeng'); await finishIntro(page);
  const anchor = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: '探索项目：禹耕乡野' }).tap();
  await expect.poll(async () => (await page.locator('dialog').boundingBox()).x).toBe(0);
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 720 }] });
  for (const y of [680, 630, 570, 510]) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.locator('.sidebar-scroll').evaluate(el => el.scrollTop)).toBeGreaterThan(60);
  await expect(page.locator('dialog')).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(anchor);
  await page.getByRole('button', { name: '收起项目详情' }).tap();
  await expect(page.locator('dialog')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '4');
  expect(await page.evaluate(() => scrollY)).toBe(anchor);
  await context.close();
});

for (const width of [769, 1440]) {
  test(`Desktop reading styles and curtain remain unchanged at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#shunshi'); await finishIntro(page);
    await page.getByRole('button', { name: '探索项目：顺时' }).click();
    await expect(page.locator('.sidebar-close')).toBeVisible();
    await expect(page.locator('.sidebar-mobile-collapse')).toBeHidden();
    await expect(page.locator('.curtain-surface')).toBeVisible();
    const comparison = await page.evaluate(() => {
      const sheet = document.querySelector('style[data-vite-dev-id$="mobile-reading.css"]').sheet;
      const handle = document.querySelector('.sidebar-mobile-collapse');
      handle.style.display = 'none';
      const properties = ['fontSize', 'lineHeight', 'width', 'height', 'padding', 'margin', 'transform', 'scale', 'clipPath', 'animationName', 'backgroundColor'];
      const read = () => ['.about-introduction', '.island-art', '.project-title', '.project-description', '.project-category', '.exploration-path', '.project-sidebar', '.sidebar-scroll', '.curtain-surface', '.sidebar-close'].map(selector => {
        const style = getComputedStyle(document.querySelector(selector)); return Object.fromEntries(properties.map(key => [key, style[key]]));
      });
      // Pause the existing curtain at its final frame for a deterministic comparison.
      document.querySelectorAll('dialog *').forEach(el => el.getAnimations().forEach(animation => { animation.finish(); }));
      const current = read(); sheet.disabled = true; const baseline = read(); sheet.disabled = false;
      handle.style.removeProperty('display'); return { current, baseline };
    });
    expect(comparison.current).toEqual(comparison.baseline);
    await swipe(page, [10, 400], [125, 410]);
    await expect(page.locator('dialog')).not.toHaveClass(/is-closing/);
    await page.getByRole('button', { name: '关闭项目详情' }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '2');
  });
}
