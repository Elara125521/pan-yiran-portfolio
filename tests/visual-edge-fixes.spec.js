import { test, expect } from '@playwright/test';

async function checkCachedProtection(page, selector, result) {
  const report = await page.locator(selector).evaluate(async (element, result) => {
    const filter = document.getElementById(/#([^)" ]+)/.exec(element.style.filter)[1]);
    const gain = filter.querySelector(`feImage[result="${result}"]`);
    const displacement = filter.querySelector('feDisplacementMap');
    let maskWrites = 0, measurements = 0;
    const originalBounds = element.getBoundingClientRect;
    element.getBoundingClientRect = function () { measurements++; return originalBounds.call(this); };
    const observer = new MutationObserver(records => { maskWrites += records.length; });
    observer.observe(gain, { attributes: true });
    async function sample(protectedMode) {
      displacement.setAttribute('in2', protectedMode ? result === 'hero-window-gain' ? 'hero-pinned-field' : 'decor-pinned-field' : 'field');
      const times = []; let previous = performance.now();
      for (let i = 0; i < 60; i++) {
        document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 420 + (i % 16) * 19, clientY: 420 + Math.sin(i) * 100 }));
        await new Promise(requestAnimationFrame);
        const now = performance.now(); if (i > 4) times.push(now - previous); previous = now;
      }
      times.sort((a, b) => a - b); return { median: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * .95)] };
    }
    const baseline = await sample(false), protectedMode = await sample(true);
    observer.disconnect(); element.getBoundingClientRect = originalBounds;
    return { maskWrites, measurements, baseline, protectedMode };
  }, result);
  console.log(`${selector} cached protection comparison: ${JSON.stringify(report)}`);
  expect(report.maskWrites).toBe(0);
  expect(report.measurements).toBe(0);
}

test('Completed island loses the central exclusion as its black window departs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  const scene = page.locator('.hero-experience-animation');
  await scene.evaluate(el => { el.heroTimeline.pause().time(7.2); el.heroRender(); });
  expect(Number(await page.locator('.island-window-exclusion').getAttribute('width'))).toBeGreaterThan(0);
  await scene.evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.evaluate(async () => {
    for (let i = 0; i < 12; i++) {
      document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 600 + i * 15, clientY: 430 }));
      await new Promise(requestAnimationFrame);
    }
  });
  const protection = await page.locator('.experience-scene').evaluate(async el => {
    const id = /#([^)" ]+)/.exec(el.style.filter)?.[1];
    const filter = document.getElementById(id);
    const map = filter?.querySelector('feImage[result="hero-window-gain"]');
    if (!map) return null;
    const image = new Image(); image.src = map.getAttribute('href'); await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const exclusion = document.querySelector('.island-window-exclusion');
    const x = Number(exclusion.getAttribute('x')), y = Number(exclusion.getAttribute('y'));
    const width = Number(exclusion.getAttribute('width')), height = Number(exclusion.getAttribute('height'));
    const alpha = dx => ctx.getImageData(Math.round(x + width + dx + 20), Math.round(y + height / 2 + 20), 1, 1).data[3];
    return { covered: alpha(-10), seam: alpha(0), collar: alpha(16), free: alpha(70), strength: filter.querySelector('feDisplacementMap').getAttribute('scale') };
  });
  expect(protection).not.toBeNull();
  expect(protection.covered).toBe(0);
  expect(protection.seam).toBe(0);
  expect(protection.collar).toBeGreaterThan(0);
  expect(protection.collar).toBeLessThan(protection.free);
  expect(protection.free).toBe(255);
  expect(protection.strength).toBe('18');
  await checkCachedProtection(page, '.experience-scene', 'hero-window-gain');
  await page.evaluate(() => {
    window.exclusions = [];
    addEventListener('section-progress', e => {
      if (e.detail.fromIndex === 0 && e.detail.progress > 0) window.exclusions.push(Number(document.querySelector('.island-window-exclusion').getAttribute('width')));
    });
    dispatchEvent(new CustomEvent('section-request', { detail: { id: 'about' } }));
  });
  await expect(page.locator('html')).toHaveAttribute('data-scroll-index', '1');
  expect(await page.evaluate(() => window.exclusions.length > 0 && window.exclusions.every(width => width === 0))).toBe(true);
  await expect(page.locator('.window-night-mask')).toHaveAttribute('visibility', 'visible');
  await expect(page.locator('.night-reveal')).toHaveAttribute('height', '189');
});

test('Decoration retains displacement at the free edge and pins its attached edge', async ({ page }) => {
  await page.goto('/#about');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.evaluate(async () => {
    for (let i = 0; i < 16; i++) {
      document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 80 + i * 17, clientY: 750 - i * 3 }));
      await new Promise(requestAnimationFrame);
    }
  });
  const pinned = await page.locator('.about-island').evaluate(async element => {
    const id = /#([^)"]+)/.exec(element.style.filter)?.[1];
    const filter = id && document.getElementById(id);
    const map = filter?.querySelector('feImage[result="decor-edge-gain"]');
    if (!map) return null;
    const image = new Image(); image.src = map.getAttribute('href'); await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const alpha = x => ctx.getImageData(x + 20, 45, 1, 1).data[3];
    return { edge: alpha(0), middle: alpha(24), free: alpha(90), input: filter.querySelector('feDisplacementMap').getAttribute('in2'), strength: filter.querySelector('feDisplacementMap').getAttribute('scale') };
  });
  expect(pinned).not.toBeNull();
  expect(pinned.edge).toBeLessThan(3);
  expect(pinned.middle).toBeGreaterThan(pinned.edge);
  expect(pinned.middle).toBeLessThan(pinned.free);
  expect(pinned.free).toBe(255);
  expect(pinned.input).toBe('decor-pinned-field');
  expect(pinned.strength).toBe('18');
  await checkCachedProtection(page, '.about-island', 'decor-edge-gain');
  await page.waitForTimeout(1700);
  await expect(page.locator('.about-island')).toHaveCSS('filter', 'none');
});
