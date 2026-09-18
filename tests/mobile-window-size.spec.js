import { test, expect } from '@playwright/test';

for (const width of [375, 390, 393, 412, 430, 768, 769, 1440]) {
  test(`Window stage sizes at ${width}px preserve the desktop boundary`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const loadingWidth = await page.locator('.loading-window').evaluate(el => parseFloat(getComputedStyle(el).width));
    expect(loadingWidth).toBeCloseTo(142 * (width <= 768 ? .72 : 1), 1);
    await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
    const metrics = await page.locator('.hero-experience-animation').evaluate(el => {
      const timeline = el.heroTimeline;
      timeline.pause().time(1); el.heroRender();
      const frame = el.querySelector('.experience-open-window');
      const small = frame.getBoundingClientRect().toJSON();
      const typography = [...el.querySelectorAll('.liquid-glyph')].map(node => node.getBoundingClientRect().toJSON());
      timeline.progress(1); el.heroRender();
      return { small, final: frame.getBoundingClientRect().toJSON(), height: el.getBoundingClientRect().height, typography, duration: timeline.duration() };
    });
    expect(metrics.small.width).toBeCloseTo(Math.min(Math.max(width * .10, 72), metrics.height * .22) * (width <= 768 ? .58 : 1), 2);
    expect(metrics.final.width).toBeCloseTo(Math.min(Math.max(width * .14, 112), metrics.height * .31) * (width <= 768 ? .62 : 1), 2);
    expect(metrics.final.x + metrics.final.width / 2).toBeCloseTo(width / 2, 2);
    expect(metrics.final.y + metrics.final.height / 2).toBeCloseTo(metrics.height * .55, 2);
    expect(metrics.small.height / metrics.small.width).toBeCloseTo(189 / 142, 3);
    expect(metrics.duration).toBe(7.75);
    if (width <= 430) {
      const overlaps = metrics.typography.filter(rect => Math.min(rect.right, metrics.small.right) - Math.max(rect.left, metrics.small.left) > 1 && Math.min(rect.bottom, metrics.small.bottom) - Math.max(rect.top, metrics.small.top) > 1);
      expect(overlaps).toHaveLength(0);
    }
  });
}
