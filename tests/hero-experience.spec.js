import { test, expect } from '@playwright/test';

async function seek(page, time) {
  await page.locator('.hero-experience-animation').evaluate((el, t) => { el.heroTimeline.pause().time(t); el.heroRender(); }, time);
}

test('Hero liquid remains continuous through the seven narrative stages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  const scene = page.locator('.hero-experience-animation');
  await expect.poll(() => scene.evaluate(el => Boolean(el.heroTimeline))).toBe(true);
  expect(await scene.evaluate(el => el.heroTimeline.duration())).toBe(7.75);
  await seek(page, 0);
  const window = page.locator('.experience-open-window');
  const start = await window.boundingBox();
  expect(start.width / start.height).toBeCloseTo(142 / 189, 2);
  expect(start.y + start.height / 2).toBeCloseTo(450, 0);
  await seek(page, .55);
  const simultaneous = await page.evaluate(() => [document.querySelector('#hero-title'), document.querySelector('.liquid-typography')].map(el => Number(getComputedStyle(el).opacity)));
  expect(simultaneous[0]).toBeGreaterThan(0);
  expect(simultaneous[0]).toBeLessThan(1);
  expect(simultaneous[0]).toBe(simultaneous[1]);
  await expect(page.locator('.experience-name-caret')).toHaveCSS('visibility', 'hidden');
  await seek(page, 1);
  const positioned = await window.boundingBox();
  expect(positioned.y).toBeGreaterThan(start.y);
  expect(positioned.width / positioned.height).toBeCloseTo(142 / 189, 2);
  const intact = await page.locator('.liquid-glyph').first().getAttribute('d');
  await page.screenshot({ path: 'test-results/experience-intact.png' });
  const textTransform = await page.locator('.liquid-glyph').first().evaluate(el => { const m = el.transform.baseVal.consolidate().matrix; return { x: m.e, scale: m.a }; });
  expect(textTransform.x + 1086 * textTransform.scale / 2).toBeCloseTo(720, 0);
  expect(positioned.x + positioned.width / 2).toBeCloseTo(720, 0);
  await seek(page, 1.9);
  expect(await page.locator('.liquid-glyph').first().getAttribute('d')).not.toBe(intact);
  await expect(page.locator('.liquid-typography')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/experience-soften.png' });
  await seek(page, 3);
  await expect(scene).toHaveAttribute('data-stage', 'inflow');
  await expect(page.locator('.contained-water')).toHaveAttribute('visibility', 'visible');
  await expect(page.locator('.flow-island').first()).toHaveAttribute('visibility', 'hidden');
  await page.screenshot({ path: 'test-results/experience-inflow.png' });
  await seek(page, 4.21);
  await expect(page.locator('.experience-name-caret')).toHaveCSS('visibility', 'visible');
  await expect(scene).toHaveAttribute('data-fill', '1.000');
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
  expect(await page.locator('.contained-water').evaluate(el => el.parentElement.hasAttribute('clip-path'))).toBe(true);
  const surface = await page.locator('.contained-water').getAttribute('d');
  await expect.poll(() => page.locator('.contained-water').getAttribute('d')).not.toBe(surface);
  await page.screenshot({ path: 'test-results/experience-filled.png' });
  await seek(page, 4.8);
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
  await expect(page.locator('.experience-outflow')).toHaveAttribute('visibility', 'hidden');
  const noteOpacity = Number(await page.locator('.experience-end-notes p').evaluate(el => getComputedStyle(el).opacity));
  expect(noteOpacity).toBeGreaterThan(0);
  expect(noteOpacity).toBeLessThan(1);
  expect(await page.locator('.contained-water').evaluate(el => el.closest('.experience-window-group') === document.querySelector('.experience-open-window').parentElement)).toBe(true);
  const expanded = await window.boundingBox();
  expect(expanded.width).toBeGreaterThan(positioned.width);
  expect(expanded.width / expanded.height).toBeCloseTo(142 / 189, 2);
  await page.screenshot({ path: 'test-results/experience-escape.png' });
  await seek(page, 6.4);
  await expect(page.locator('.experience-outflow')).toHaveAttribute('visibility', 'hidden');
  await seek(page, 6.75);
  const fullWater = await page.locator('.contained-water').getAttribute('d');
  const moonBefore = Number(await page.locator('.experience-moon').getAttribute('cy'));
  await seek(page, 6.85);
  expect(Number(await page.locator('.experience-moon').getAttribute('cy'))).toBeLessThan(moonBefore);
  expect(await page.locator('.contained-water').getAttribute('d')).not.toBe(fullWater);
  await expect(page.locator('.experience-outflow')).toHaveAttribute('visibility', 'visible');
  await seek(page, 7.5);
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'visible');
  await expect(page.locator('.flow-island').first()).toHaveAttribute('visibility', 'visible');
  const exclusion = await page.locator('.island-window-exclusion').boundingBox();
  const frameDuringOutflow = await window.boundingBox();
  expect(exclusion.x).toBeCloseTo(frameDuringOutflow.x, 0);
  expect(exclusion.width).toBeCloseTo(frameDuringOutflow.width, 0);
  expect(Number(await page.locator('.experience-moon').getAttribute('cy'))).toBeLessThan(113.331);
  await page.screenshot({ path: 'test-results/experience-outflow.png' });
  await seek(page, 10.25);
  await expect(scene).toHaveAttribute('data-stage', 'final');
  await expect(page.locator('.night-reveal')).toHaveAttribute('height', '189');
  const moon = await page.locator('.experience-moon').boundingBox();
  const finalWindow = await window.boundingBox();
  expect(moon.y + moon.height).toBeLessThan(finalWindow.y);
  const island = await page.locator('.flow-island').first().getAttribute('d');
  await expect.poll(() => page.locator('.flow-island').first().getAttribute('d')).not.toBe(island);
  await page.screenshot({ path: 'test-results/experience-final.png' });
});

test('Loading hands the same prepared timeline an uninterrupted window position', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.locator('.hero-experience-animation').evaluate(el => Boolean(el.heroTimeline))).toBe(true);
  const continuity = await page.evaluate(() => new Promise(resolve => {
    const root = document.querySelector('.hero-experience-animation');
    const prepared = root.heroTimeline;
    let previousLoading = null;
    const heroFrames = [];
    function sample() {
      const loading = document.querySelector('.loading-frame');
      const rect = (loading || document.querySelector('.experience-open-window')).getBoundingClientRect();
      const frame = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width };
      if (loading) previousLoading = frame;
      else heroFrames.push(frame);
      if (heroFrames.length === 24) resolve({ sameTimeline: root.heroTimeline === prepared, previousLoading, heroFrames });
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }));
  expect(continuity.sameTimeline).toBe(true);
  const first = continuity.heroFrames[0];
  expect(Math.abs(first.x - continuity.previousLoading.x)).toBeLessThan(3);
  expect(Math.abs(first.y - continuity.previousLoading.y)).toBeLessThan(12);
  expect(Math.abs(first.width - continuity.previousLoading.width)).toBeLessThan(3);
  expect(continuity.heroFrames.at(-1).y - first.y).toBeGreaterThan(30);
  for (let i = 1; i < continuity.heroFrames.length; i++) expect(continuity.heroFrames[i].y).toBeGreaterThanOrEqual(continuity.heroFrames[i - 1].y - .1);
});

test('Suction accelerates whole glyphs after softening without changing its duration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  const shape = page.locator('.liquid-glyph').first();
  await seek(page, 2.55);
  const initial = await shape.boundingBox();
  await seek(page, 3.075);
  const halfway = await shape.boundingBox();
  await seek(page, 3.5);
  const late = await shape.boundingBox();
  const center = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const a = center(initial), b = center(halfway), c = center(late);
  expect(Math.hypot(c.x - b.x, c.y - b.y)).toBeGreaterThan(Math.hypot(b.x - a.x, b.y - a.y) * 2);
  await seek(page, 3.75);
  await expect(page.locator('.hero-experience-animation')).toHaveAttribute('data-fill', '1.000');
});

test('Hero keeps its stage during resizing and pauses away from view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await seek(page, 4.21);
  await page.setViewportSize({ width: 390, height: 844 });
  const scene = page.locator('.hero-experience-animation');
  await expect(scene).toHaveAttribute('data-stage', 'filled');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/experience-mobile-filled.png' });
  await page.evaluate(() => window.scrollTo({ top: document.getElementById('about').offsetTop, behavior: 'instant' }));
  await expect.poll(() => scene.evaluate(el => el.heroTimeline.paused())).toBe(true);
});

test('About covers Hero downward and retains the same window with a moon text mask', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.evaluate(() => { window.originalFrame = document.querySelector('.experience-open-window'); });
  await expect(page.locator('.side-navigation')).toBeHidden();
  await expect(page.locator('.name-logo')).toHaveCount(0);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
  expect((await page.locator('#about').boundingBox()).y).toBeCloseTo(0, 0);
  await page.screenshot({ path: 'test-results/about-transition.png' });
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect.poll(() => page.locator('.experience-open-window').evaluate(el => el.getBoundingClientRect().x)).toBeCloseTo(28.8, 0);
  expect(await page.evaluate(() => window.originalFrame === document.querySelector('.experience-open-window'))).toBe(true);
  await expect(page.locator('.experience-open-window')).toBeVisible();
  await expect(page.locator('.side-navigation')).toBeHidden();
  await page.locator('.about-copy h2').first().hover();
  await expect(page.locator('.about-moon-copy')).toBeVisible();
  await page.screenshot({ path: 'test-results/about-moon-hover.png' });
  await page.locator('#shunshi').scrollIntoViewIfNeeded();
  await expect(page.locator('.side-navigation')).toBeVisible();
});

test('Docked window returns smoothly and keeps the original element; scroll settles locally', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await seek(page, 10.25);
  await page.evaluate(() => { window.savedWindow = document.querySelector('.experience-open-window'); });
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
  await page.waitForTimeout(1100);
  const button = page.getByRole('button', { name: '返回 Hero 首页' });
  const resting = await button.boundingBox();
  await button.hover();
  await expect.poll(async () => (await button.boundingBox()).y).toBeLessThan(resting.y - 2);
  await button.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect.poll(() => page.locator('.hero-experience-animation').evaluate(el => el.heroTimeline.time())).toBe(1);
  expect(await page.evaluate(() => window.savedWindow === document.querySelector('.experience-open-window'))).toBe(true);
  await expect(page.locator('.hero-experience-animation')).toHaveAttribute('data-stage', 'typography');
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
});

test('Tiny and fast wheel gestures dock full sections without leaking into Work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await seek(page, 10.25);
  await page.mouse.move(700, 650);
  await page.mouse.wheel(0, 8);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
  expect((await page.locator('#projects').boundingBox()).y).toBeGreaterThanOrEqual(900);
  await page.mouse.wheel(0, -8);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.mouse.wheel(0, 1900);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(900);
});

test('Projects snap to centers and gate the full hover region, keeping the original window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#shunshi');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await seek(page, 10.25);
  await expect(page.locator('#shunshi')).toHaveClass(/is-centered/);
  await page.evaluate(() => { window.projectFrame = document.querySelector('.experience-open-window'); });
  await page.locator('#shunshi .island-button').hover({ position: { x: 30, y: 30 } });
  await expect(page.locator('#shunshi')).toHaveClass(/is-revealed/);
  const before = await page.locator('.path-progress').evaluate(el => Number(el.style.strokeDashoffset));
  await page.mouse.wheel(0, 1400);
  await expect(page.locator('#sanshan')).toHaveClass(/is-centered/);
  await expect(page.locator('#shunshi')).not.toHaveClass(/is-revealed/);
  await expect.poll(async () => { const box = await page.locator('#sanshan').boundingBox(); return Math.abs(box.y + box.height / 2 - 450); }).toBeLessThanOrEqual(1);
  expect(await page.locator('.path-progress').evaluate(el => Number(el.style.strokeDashoffset))).toBeLessThan(before);
  expect(await page.evaluate(() => window.projectFrame === document.querySelector('.experience-open-window'))).toBe(true);
  expect((await page.locator('.experience-open-window').boundingBox()).y).toBeCloseTo(36, 0);
  await page.screenshot({ path: 'test-results/projects-path.png' });
});

test('Work preserves default colors, isolates its navigation and keeps paths outside content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#eat');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.mouse.move(700, 20);
  const active = page.locator('#eat');
  await expect(active).toHaveClass(/is-centered/);
  await expect(active.locator('.island-default')).toHaveCSS('opacity', '1');
  await expect(active.locator('.island-default')).toHaveCSS('filter', 'none');
  await expect(active.locator('.island-hover')).toHaveCSS('opacity', '0');
  await expect(page.locator('.side-navigation')).toHaveCSS('opacity', '1');
  await expect(page.locator('.nav-dot').first()).toHaveCSS('visibility', 'visible');
  await active.locator('.island-button').hover();
  await expect(active.locator('.island-hover')).toHaveCSS('opacity', '1');
  await expect(active.locator('.island-default')).toHaveCSS('opacity', '0');
  const collision = await page.evaluate(() => {
    const path = document.querySelector('.path-progress');
    const matrix = path.getScreenCTM();
    const boxes = [...document.querySelectorAll('.project-copy, .island-art')].map(el => el.getBoundingClientRect());
    const length = path.getTotalLength();
    for (let i = 0; i <= 800; i++) {
      const point = path.getPointAtLength(length * i / 800).matrixTransform(matrix);
      if (boxes.some(r => point.x >= r.left - 8 && point.x <= r.right + 8 && point.y >= r.top - 8 && point.y <= r.bottom + 8)) return true;
    }
    return false;
  });
  expect(collision).toBe(false);
  await page.screenshot({ path: 'test-results/work-safe-path.png' });
  await active.locator('.island-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.project-image')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.move(700, 20);
  await expect(active.locator('.island-default')).toHaveCSS('opacity', '1');
  await page.locator('#contact').evaluate(el => window.scrollTo({ top: el.offsetTop, behavior: 'instant' }));
  await expect(page.locator('.side-navigation')).toHaveCSS('opacity', '0');
});

test('Contact rows align and the same black window survives reverse content scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await seek(page, 10.25);
  await page.evaluate(() => { window.contactFrame = document.querySelector('.experience-open-window'); });
  for (const id of ['contact', 'projects', 'about', 'contact']) {
    await page.evaluate(id => window.dispatchEvent(new CustomEvent('section-request', { detail: { id: id === 'projects' ? 'shunshi' : id } })), id);
    await expect(page.locator('html')).toHaveAttribute('data-scroll-index', String(id === 'contact' ? 8 : id === 'projects' ? 2 : 1));
    await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
    await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'visible');
    await expect(page.locator('.night-reveal')).toHaveAttribute('height', '189');
    expect(await page.evaluate(() => window.contactFrame === document.querySelector('.experience-open-window'))).toBe(true);
    await expect(page.getByRole('button', { name: '返回 Hero 首页' })).toBeVisible();
  }
  const rows = await page.locator('.contact-row').evaluateAll(rows => rows.map(row => {
    const image = row.querySelector('img').getBoundingClientRect();
    const value = row.querySelector('.contact-value').getBoundingClientRect();
    return { right: value.right, center: image.y + image.height / 2, delta: Math.abs(image.y + image.height / 2 - value.y - value.height / 2), overlap: image.right - value.left };
  }));
  expect(Math.max(...rows.map(row => row.right)) - Math.min(...rows.map(row => row.right))).toBeLessThan(1);
  await expect(page.locator('.contact-symbol small')).toHaveCount(0);
  rows.forEach(row => { expect(row.delta).toBeLessThan(1); });
  expect(rows[1].center - rows[0].center).toBeCloseTo(rows[2].center - rows[1].center, 0);
  await page.screenshot({ path: 'test-results/contact-aligned.png' });
  await page.getByRole('button', { name: '返回 Hero 首页' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'hidden');
});
