import { test, expect } from '@playwright/test';

async function ready(page, hash) {
  await page.goto(`/#${hash}`);
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
}
for (const [width, height] of [[375, 667], [375, 812], [390, 844], [393, 873], [412, 915], [430, 932], [375, 560], [390, 660]]) {
  test(`Contact composition and route fit ${width} x ${height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const page = await context.newPage(); await ready(page, 'contact');
    await expect(page.locator('#contact')).toHaveAttribute('data-contact-progress', '1.000');
    const measurements = await page.locator('#contact').evaluate(section => {
      const selectors = ['h2', ...['.contact-symbol img', '.contact-value'].flatMap(selector => [...section.querySelectorAll(selector)])];
      const elements = selectors.map(selector => typeof selector === 'string' ? section.querySelector(selector) : selector);
      const rects = elements.map(el => el.getBoundingClientRect().toJSON());
      const icons = [...section.querySelectorAll('.contact-symbol img')].map(icon => icon.getBoundingClientRect().toJSON());
      const stage = section.querySelector('.contact-stage').getBoundingClientRect();
      const segments = section.querySelector('.contact-route-line').getAttribute('d').trim().split(/(?=M)/).map(d => d.match(/-?\d+(?:\.\d+)?/g).map(Number));
      return { rects, icons, segments, stage: stage.toJSON(), section: section.getBoundingClientRect().toJSON() };
    });
    expect(measurements.section.height).toBe(height);
    measurements.rects.forEach(rect => { expect(rect.top).toBeGreaterThanOrEqual(0); expect(rect.bottom).toBeLessThanOrEqual(height - 20); expect(rect.left).toBeGreaterThanOrEqual(20); expect(rect.right).toBeLessThanOrEqual(width - 20); });
    expect(measurements.segments).toHaveLength(2);
    measurements.segments.forEach((segment, i) => {
      expect(segment[1] + measurements.stage.y).toBeCloseTo(measurements.icons[i].bottom + 5, 1);
      expect(segment.at(-1) + measurements.stage.y).toBeCloseTo(measurements.icons[i + 1].top - 5, 1);
    });
    if (width === 390 && height === 844) await page.screenshot({ path: 'test-results/mobile-contact-390.png' });
    await context.close();
  });
}

for (const width of [375, 390, 430]) {
  test(`Mobile Work preview switches without changing anchors at ${width}px`, async ({ page }) => {
    page.on('pageerror', error => console.log(`Browser error: ${error.stack}`));
    await page.setViewportSize({ width, height: 844 }); await ready(page, 'shunshi');
    const geometry = () => page.locator('.project-island').evaluateAll(rows => rows.map(row => ({ top: row.getBoundingClientRect().top + scrollY, height: row.offsetHeight })));
    const before = await geometry();
    const active = page.locator('#shunshi'), inactive = page.locator('#sanshan');
    await expect(active.locator('.project-number')).toBeVisible(); await expect(active.locator('.project-description')).toBeVisible();
    await expect(inactive.locator('.project-title')).toBeVisible(); await expect(inactive.locator('.project-number')).toBeVisible(); await expect(inactive.locator('.project-description')).toBeHidden();
    const scale = row => row.locator('.island-art').evaluate(el => parseFloat(getComputedStyle(el).scale));
    expect(await scale(inactive) / await scale(active)).toBeCloseTo(.7, 3);
    const typography = await active.evaluate(el => ['.project-title', '.project-category', '.project-description'].map(selector => parseFloat(getComputedStyle(el.querySelector(selector)).fontSize)));
    expect(typography).toEqual([19, 13, 11]);
    const textBox = await active.locator('.project-description').boundingBox();
    expect(textBox.width).toBeGreaterThan(width * .78); expect(textBox.width).toBeLessThanOrEqual(width * .86); // Includes the existing stable scrollbar allocation.
    expect(textBox.x).toBeGreaterThanOrEqual(24);
    expect(textBox.x + textBox.width).toBeLessThanOrEqual(width - 24);
    await expect(page.locator('.exploration-path')).toBeVisible(); await expect(page.locator('.trail-mark')).not.toHaveCount(0);
    const trails = await page.locator('#projects').evaluate(section => {
      const origin = section.getBoundingClientRect();
      const bounds = [...section.querySelectorAll('.island-composition')].map(el => {
        const r = el.getBoundingClientRect(), center = r.top + r.height / 2 - origin.top;
        const art = el.querySelector('.island-art').getBoundingClientRect();
        const copy = el.querySelector('.project-copy').getBoundingClientRect();
        const activeHeight = art.height / (el.closest('.project-island').classList.contains('is-centered') ? 1 : .7);
        return { top: Math.min(art.bottom - activeHeight, copy.top) - origin.top, bottom: Math.max(art.bottom, copy.bottom) - origin.top };
      });
      return Array.from({length: 5}, (_, segment) => ({ a: bounds[segment], b: bounds[segment + 1],
        marks: [...section.querySelectorAll(`.trail-mark[data-segment="${segment}"]`)].map(el => {
          const m = el.transform.baseVal.consolidate().matrix; return { x: m.e, y: m.f };
        }) }));
    });
    for (const { a, b, marks } of trails) {
      expect(marks.length).toBeGreaterThanOrEqual(3); expect(marks.length).toBeLessThanOrEqual(5);
      marks.forEach((mark, i) => {
        expect(mark.y).toBeGreaterThan(a.bottom + 12); expect(mark.y).toBeLessThan(b.top - 12);
        expect(Math.abs(mark.x - width / 2)).toBeLessThan(35);
        if (i) expect(Math.hypot(mark.x - marks[i-1].x, mark.y - marks[i-1].y)).toBeGreaterThan(30);
      });
    }
    for (const index of [3, 4, 5, 6, 7, 6, 5, 4, 3, 2]) {
      await page.evaluate(index => dispatchEvent(new CustomEvent('section-request', { detail: { id: ['hero', 'about', 'shunshi', 'sanshan', 'yugeng', 'eat', 'muse', 'experiments'][index] } })), index);
      await expect(page.locator('html')).toHaveAttribute('data-scroll-index', String(index));
      await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
      expect(await geometry()).toEqual(before);
      const centered = page.locator('.project-island.is-centered');
      await expect(centered).toHaveCount(1);
      const rect = await centered.boundingBox(); expect(rect.y + rect.height / 2).toBeCloseTo(422, 1);
      await expect(centered.locator('.project-number')).toBeVisible();
      await expect(centered.locator('.project-description')).toBeVisible();
    }
    if (width === 390) await page.screenshot({ path: 'test-results/mobile-work-390.png' });
  });
}

for (const width of [769, 1440]) {
  test(`Desktop Work and Contact styles are unchanged at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await ready(page, 'contact');
    const comparison = await page.evaluate(() => {
      const sheet = document.querySelector('style[data-vite-dev-id$="mobile-work-contact.css"]').sheet;
      const keys = ['fontSize', 'lineHeight', 'width', 'height', 'padding', 'margin', 'scale', 'transform', 'visibility', 'opacity', 'gap'];
      const read = () => ['.project-island', '.island-art', '.project-title', '.project-number', '.project-category', '.project-description', '.exploration-path', '#contact', '.contact-stage', '#contact h2', '.contact-links', '.contact-row', '.contact-symbol img'].map(selector => {
        const style = getComputedStyle(document.querySelector(selector)); return keys.map(key => style[key]);
      });
      const current = read(); sheet.disabled = true; const baseline = read(); sheet.disabled = false;
      return { current, baseline };
    });
    expect(comparison.current).toEqual(comparison.baseline);
  });
}

