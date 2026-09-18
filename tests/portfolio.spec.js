import { test, expect } from '@playwright/test';

test('loading sequence reveals the original hero assets', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('加载中…');
  const openFrame = await page.waitForFunction(() => {
    if (document.querySelector('.loading-screen')?.dataset.phase !== '7') return false;
    return {
      closed: document.querySelector('.loading-window').classList.contains('is-closed'),
      moonZ: Number(getComputedStyle(document.querySelector('.loading-moon')).zIndex),
      frameZ: Number(getComputedStyle(document.querySelector('.loading-frame')).zIndex),
    };
  }, null, { timeout: 6000 });
  const opening = await openFrame.jsonValue();
  expect(opening.closed).toBe(false);
  expect(opening.moonZ).toBeLessThan(opening.frameZ);
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 9000 });
  await expect(page.getByRole('heading', { name: 'PAN YIRAN' })).toBeVisible();
  const scene = page.locator('.hero-experience-animation');
  await scene.evaluate(el => { el.heroTimeline.pause().time(1); el.heroRender(); });
  await expect(scene).toHaveAttribute('data-stage', 'typography');
  await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/hero-01-text.png' });
  await scene.evaluate(el => { el.heroTimeline.time(10.25); el.heroRender(); });
  await expect(scene).toHaveAttribute('data-stage', 'final');
  expect(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src))).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/desktop-hero.png' });
  expect(await page.locator('main > section').evaluateAll(elements => elements.map(el => el.id))).toEqual(['hero', 'about', 'projects', 'contact']);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favorites-icon/);
});

test('all six islands open an accessible sidebar and restore focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  const buttons = page.locator('.island-button');
  await expect(buttons).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    const button = buttons.nth(i);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await expect(button.locator('xpath=ancestor::article')).toHaveClass(/is-centered/);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Design Highlights' })).toBeVisible();
    const image = page.locator('.project-image');
    if (await image.count()) await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    if (i === 0) await page.screenshot({ path: 'test-results/desktop-sidebar.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(button).toBeFocused();
  }
});

test('hover, navigation status, backdrop dismissal and external links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#shunshi');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  const first = page.locator('.island-button').first();
  const region = await first.boundingBox();
  expect(region.width).toBeGreaterThan(300);
  const title = await page.locator('#shunshi .project-title').boundingBox();
  await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2);
  await expect(page.locator('.island-hover').first()).toHaveCSS('opacity', '1');
  await first.hover();
  await expect(page.locator('.island-hover').first()).toHaveCSS('opacity', '1');
  await expect(page.locator('#shunshi .island-mockup')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.nav-project').first()).toHaveAttribute('aria-current', 'location');
  await page.screenshot({ path: 'test-results/desktop-exploration.png' });
  await first.click();
  await expect(page.locator('.external-link')).toHaveAttribute('href', /figma.com/);
  await page.mouse.click(10, 300);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#eat .island-button').focus();
  await expect(page.locator('#eat')).toHaveClass(/is-centered/);
  await page.locator('#eat .island-button').click();
  await expect(page.locator('.external-link')).toHaveAttribute('href', 'https://eat-together-meituan.netlify.app/');
  await page.getByRole('button', { name: '关闭项目详情' }).click();
  await page.locator('#sanshan .island-button').focus();
  await expect(page.locator('#sanshan')).toHaveClass(/is-centered/);
  await page.locator('#sanshan .island-button').click();
  await expect(page.locator('.external-link')).toBeDisabled();
});

test('Eat mockup stays in the island on hover and navigation expands locally', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#eat');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.locator('#eat .island-button').hover();
  await expect(page.locator('#eat .island-mockup')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/eat-hover.png' });
  await page.mouse.move(600, 100);
  await expect(page.locator('#eat .island-mockup')).toHaveCSS('opacity', '0');
  const nav = page.locator('.side-navigation');
  await nav.hover();
  await expect.poll(async () => (await nav.boundingBox()).width).toBeGreaterThan(250);
  await page.mouse.move(600, 100);
  await expect.poll(async () => (await nav.boundingBox()).width).toBeLessThan(100);
});

test('mobile layout stays in viewport and supports touch exploration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-hero.png' });
  await page.locator('#muse .island-button').focus();
  await expect(page.locator('#muse')).toHaveClass(/is-centered/);
  await page.locator('#muse .island-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('button', { name: '关闭项目详情' }).click();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('a[href="mailto:3076126564@qq.com"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-contact.png' });
});
