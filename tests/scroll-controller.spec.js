import { test, expect } from '@playwright/test';

test('All nine stops lock bursts, dock exactly and commit project states once in both directions', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.evaluate(() => { window.commits = []; window.addEventListener('section-settled', e => window.commits.push(e.detail.index)); window.savedFrame = document.querySelector('.experience-open-window'); });
  const html = page.locator('html');
  for (const direction of [1, -1]) {
    for (let step = 1; step <= 8; step++) {
      const expected = direction > 0 ? step : 8 - step;
      await page.waitForTimeout(220); // A new gesture after the preceding inertia stream ended.
      await page.evaluate(async direction => {
        for (let n = 0; n < 36; n++) {
          window.dispatchEvent(new WheelEvent('wheel', { deltaY: direction * (n % 2 ? 2400 : 6), bubbles: true, cancelable: true }));
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }, direction);
      await expect(html).toHaveAttribute('data-scroll-index', String(expected));
      await expect(html).toHaveAttribute('data-scroll-transitioning', 'false');
      const error = await page.evaluate(index => {
        const el = [...document.querySelectorAll('#hero, #about, .project-island, #contact')][index];
        const r = el.getBoundingClientRect();
        return Math.abs(el.classList.contains('project-island') ? r.top + r.height / 2 - innerHeight / 2 : r.top);
      }, expected);
      expect(error).toBeLessThanOrEqual(1);
      if (expected >= 2 && expected <= 7) {
        await expect(page.locator('.project-island.is-centered')).toHaveCount(1);
        await expect(page.locator('.project-island').nth(expected - 2)).toHaveClass(/is-centered/);
      }
      expect(await page.evaluate(() => window.savedFrame === document.querySelector('.experience-open-window'))).toBe(true);
    }
  }
  expect(await page.evaluate(() => window.commits.filter((x,i,a) => i === 0 || x !== a[i-1]))).toEqual([1,2,3,4,5,6,7,8,7,6,5,4,3,2,1,0]);
});

test('Contact has one right alignment guide and no English labels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#contact');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  const right = await page.locator('.contact-value').evaluateAll(els => els.map(el => el.getBoundingClientRect().right));
  expect(Math.max(...right) - Math.min(...right)).toBeLessThan(1);
  await expect(page.locator('.contact-symbol small')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/contact-right-aligned.png' });
});

test('Small trackpad deltas and a long touch gesture each advance one stop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, cancelable: true }));
  });
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '0');
  await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, cancelable: true })));
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '1');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  await page.evaluate(async () => {
    const target = document.querySelector('#about');
    const fire = (type, y) => target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target, clientY: y, clientX: 300 })] }));
    fire('touchstart', 650);
    for (let i = 0; i < 75; i++) { fire('touchmove', 630 - i * 6); await new Promise(resolve => requestAnimationFrame(resolve)); }
    fire('touchend', 100);
  });
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '2');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
});

test('Contact wave and route follow snap in both directions and icons wobble once', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#experiments');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  const contact = page.locator('#contact');
  await page.mouse.move(700, 650);
  await page.mouse.wheel(0, 1000);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '8');
  await expect(contact).toHaveAttribute('data-contact-progress', '1.000');
  await expect(page.locator('.contact-route-reveal')).toHaveCSS('stroke-dashoffset', '0px');
  const collision = await page.evaluate(() => {
    const path = document.querySelector('.contact-route-line'), matrix = path.getScreenCTM();
    const boxes = [...document.querySelectorAll('#contact h2, .contact-value')].flatMap(el => { const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()]; });
    for (let i = 0; i <= 500; i++) { const p = path.getPointAtLength(path.getTotalLength() * i / 500).matrixTransform(matrix); if (boxes.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom)) return true; }
    return false;
  });
  expect(collision).toBe(false);
  const icon = page.locator('.contact-symbol img').first();
  const original = await icon.evaluate(el => getComputedStyle(el).transform);
  await icon.hover();
  await expect.poll(() => icon.evaluate(el => getComputedStyle(el).transform)).not.toBe(original);
  await expect.poll(() => icon.evaluate(el => getComputedStyle(el).transform)).toBe(original);
  await page.screenshot({ path: 'test-results/contact-wave.png' });
  await page.mouse.move(700, 650);
  await page.mouse.wheel(0, -1000);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '7');
  await expect(contact).toHaveAttribute('data-contact-progress', '0.000');
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'visible');
});

test('Work path draws before activation; persistent Moon is clipped and reduced motion stops it', async ({ page }) => {
  await page.goto('/#shunshi');
  await page.getByRole('button', { name: '跳过动画' }).click();
  const scene = page.locator('.hero-experience-animation');
  await scene.evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); window.loop = el.contentMoonTimeline; });
  expect(await page.locator('.trail-mark').count()).toBeGreaterThanOrEqual(15);
  expect(await page.locator('.trail-mark').count()).toBeLessThanOrEqual(20);
  expect(await page.locator('.trail-mark').evaluateAll(els => els.every(el => Number(getComputedStyle(el).opacity) === 0))).toBe(true);
  const before = await page.locator('.exploration-path').evaluate(el => Number(el.dataset.progress));
  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => page.locator('.exploration-path').evaluate(el => Number(el.dataset.progress))).toBeGreaterThan(before + .01);
  await expect(page.locator('#sanshan')).not.toHaveClass(/is-centered/);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '3');
  expect(await scene.evaluate(el => window.loop === el.contentMoonTimeline)).toBe(true);
  const moon = page.locator('.content-loop-moon');
  expect(await moon.evaluate(el => el.parentElement.getAttribute('clip-path'))).toMatch(/window-aperture/);
  const initial = await moon.getAttribute('transform');
  await expect.poll(() => moon.getAttribute('transform')).not.toBe(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => scene.evaluate(el => el.contentMoonTimeline.paused())).toBe(true);
  await expect(page.locator('.mouse-fluid')).toHaveCSS('pointer-events', 'none');
});

test('Fluid stays noninteractive, clears during navigation, and is disabled for reduced motion', async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/');
  await page.getByRole('button', { name: '跳过动画' }).click();
  const fluid = page.locator('.mouse-fluid');
  await expect(fluid).toHaveCSS('pointer-events', 'none');
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  const didRefract = await page.evaluate(async () => {
    let active = false;
    for (let i = 0; i < 12; i++) { document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 100 + i * 40, clientY: 100 + i * 15 })); await new Promise(resolve => requestAnimationFrame(resolve)); active ||= document.querySelector('.mouse-fluid defs').dataset.active === 'true'; }
    return active && [...document.querySelectorAll('.mouse-fluid feImage')].some(el => el.getAttribute('href')?.startsWith('data:image/png'));
  });
  const painted = () => fluid.locator('defs').evaluate(el => el.dataset.active === 'true');
  expect(didRefract).toBe(true);
  await expect.poll(painted, { timeout: 2500 }).toBe(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(100, 100); await page.mouse.move(900, 500, { steps: 10 });
  expect(await painted()).toBe(false);
});
