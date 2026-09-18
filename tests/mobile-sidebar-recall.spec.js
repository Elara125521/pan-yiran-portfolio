import { test, expect } from '@playwright/test';

test('Mobile sidebar typography keeps media rules and desktop typography', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#shunshi');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.locator('#shunshi .island-button').click();
  await expect(page.locator('.project-sidebar')).toBeVisible();
  for (const [width, height] of [[375,667],[375,812],[390,844],[393,873],[412,915],[430,932],[769,900],[1440,900]]) {
    await page.setViewportSize({ width, height });
    const values = await page.evaluate(() => {
      const sheet = document.querySelector('style[data-vite-dev-id$="mobile-work-contact.css"]').sheet;
      const read = selectors => selectors.map(selector => {
        const s = getComputedStyle(document.querySelector(selector));
        return [s.fontSize, s.lineHeight, s.width, s.height, s.maxHeight, s.objectFit];
      });
      const text = ['.sidebar-introduction', '.design-highlights h3', '.design-highlights ul'];
      const media = ['.project-image', '.project-video-image-width', '#sidebar-title', '.sidebar-category'];
      const current = read(text), currentMedia = read(media);
      sheet.disabled = true;
      const baseline = read(text), baselineMedia = read(media);
      sheet.disabled = false;
      return { current, baseline, currentMedia, baselineMedia };
    });
    expect(values.currentMedia).toEqual(values.baselineMedia);
    if (width <= 768) expect(values.current.map(item => parseFloat(item[0]))).toEqual([14,18,13]);
    else expect(values.current).toEqual(values.baseline);
  }
});
