import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const paths = filename => [...readFileSync(new URL(`../assets/hero/${filename}`, import.meta.url), 'utf8').matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
const into = paths('Hero-mobile-text-into.svg');
const experiences = paths('Hero-mobile-text-experience.svg');
const desktop = paths('hero-text-experiences.svg').slice(1);

for (const width of [375, 390, 393, 412, 430, 769, 1440]) {
  test(`Hero text uses the correct assets and composition at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
    const hero = page.locator('.hero-experience-animation');
    const result = await hero.evaluate(el => {
      const tl = el.heroTimeline; tl.pause().time(1); el.heroRender();
      const row = n => [...el.querySelectorAll(`.liquid-glyph[data-text-row="${n}"]`)];
      const bounds = nodes => {
        const rects = nodes.map(node => node.getBoundingClientRect());
        return { left: Math.min(...rects.map(r => r.left)), right: Math.max(...rects.map(r => r.right)), top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom)) };
      };
      const rows = [0, 1, 2].map(n => row(n).length ? bounds(row(n)) : null);
      const sources = [1, 2].map(n => row(n).map(node => node.getAttribute('d')));
      const frame = el.querySelector('.experience-open-window').getBoundingClientRect().toJSON();
      const before = [...el.querySelectorAll('.liquid-glyph')].map(node => node.getAttribute('d'));
      tl.time(2); el.heroRender();
      const melted = [...el.querySelectorAll('.liquid-glyph')].map(node => node.getAttribute('d'));
      tl.time(3.1); el.heroRender();
      const sucked = [...el.querySelectorAll('.liquid-glyph')].map(node => node.getAttribute('d'));
      tl.time(3.8); el.heroRender();
      const hidden = el.querySelector('.liquid-typography').getAttribute('visibility');
      return { rows, sources, frame, before, melted, sucked, hidden, duration: tl.duration(), height: el.getBoundingClientRect().height };
    });
    expect(result.duration).toBe(7.75);
    expect(result.melted).not.toEqual(result.before);
    expect(result.sucked).not.toEqual(result.melted);
    expect(result.hidden).toBe('hidden');
    if (width <= 768) {
      expect(result.sources[0]).toEqual(into);
      expect(result.sources[1]).toEqual(experiences);
      result.rows.forEach(row => { expect(row.left).toBeGreaterThanOrEqual(20); expect(row.right).toBeLessThanOrEqual(width - 20); expect(row.bottom).toBeLessThan(844); });
      expect(result.frame.top - result.rows[1].bottom).toBeGreaterThan(23);
      const intoOffset = (result.rows[1].left + result.rows[1].right) / 2 - (result.frame.x + result.frame.width / 2);
      expect(intoOffset).toBeCloseTo(-Math.min(25, Math.max(10, width * .04)), 0);
      await expect(page.locator('.mobile-into-position')).toHaveCount(1);
      expect(result.rows[2].top - result.frame.bottom).toBeGreaterThan(23);
      expect(result.frame.width).toBeCloseTo(72 * .58, 2);
      if (width === 390) {
        await hero.evaluate(el => { el.heroTimeline.time(1); el.heroRender(); });
        await page.screenshot({ path: 'test-results/mobile-hero-390.png' });
        await page.setViewportSize({ width: 1440, height: 844 });
        await expect(page.locator('.liquid-glyph[data-text-row="2"]')).toHaveCount(0);
        const resized = await hero.evaluate(el => ({ time: el.heroTimeline.time(), paths: [...el.querySelectorAll('.liquid-glyph[data-text-row="1"]')].map(p => p.getAttribute('d')) }));
        expect(resized.time).toBe(1); expect(resized.paths).toEqual(desktop);
      }
    } else {
      expect(result.sources[0]).toEqual(desktop); expect(result.sources[1]).toEqual([]);
      expect(result.frame.width).toBeCloseTo(width * .1, 2);
      expect(result.rows[1].top).toBeCloseTo(result.height * .53, 1);
    }
  });
}
