import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`Loading hands off without exposing restored content at ${width}px over five reloads`, async ({ page }) => {
    test.setTimeout(65000);
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      window.handoffFrames = [];
      let remaining = 650;
      function inspect() {
        const hero = document.querySelector('.hero-experience-animation');
        if (hero && !document.querySelector('.loading-screen')) {
          const about = document.querySelector('#about');
          const frame = document.querySelector('.experience-window-scene');
          window.handoffFrames.push({ y: scrollY, clip: about.style.clipPath, windowVisible: getComputedStyle(frame).visibility });
        }
        if (--remaining > 0) requestAnimationFrame(inspect);
      }
      requestAnimationFrame(inspect);
    });
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!attempt) await page.goto('/'); else await page.reload();
      await expect(page.locator('.loading-screen')).toBeVisible();
      // Reproduce a browser-restored content position underneath the loader.
      await page.evaluate(() => window.scrollTo(0, document.querySelector('#about').offsetTop));
      await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
      await expect.poll(() => page.evaluate(() => window.handoffFrames.length)).toBeGreaterThan(2);
      const frames = await page.evaluate(() => window.handoffFrames);
      expect(frames.every(frame => frame.y === 0 && frame.clip.includes('100%') && frame.windowVisible === 'visible')).toBe(true);
    }
  });
}

