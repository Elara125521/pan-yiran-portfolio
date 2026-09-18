import { test, expect } from '@playwright/test';

for (const width of [1920, 1440, 375, 390, 430]) {
  test(`Natural Island reveal finishes without geometry handoff at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 768 ? 1080 : 844 });
    await page.goto('/');
    await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
    const result = await page.locator('.hero-experience-animation').evaluate(async el => {
      const paths = [...el.querySelectorAll('.flow-island')];
      const samples = [];
      let completeFrames = 0, completionWrites = 0, maskBuilds = 0;
      const encode = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) { maskBuilds++; return encode.apply(this, args); };
      const observer = new MutationObserver(records => { if (completeFrames > 1) completionWrites += records.length; });
      paths.forEach(path => observer.observe(path, { attributes: true, attributeFilter: ['d', 'transform'] }));
      await new Promise(resolve => {
        function frame() {
          const time = el.heroTimeline.time();
          if (time >= 7.65) samples.push({ time, stage: el.dataset.stage, d: paths.map(path => path.getAttribute('d')), mask: el.querySelector('.island-window-exclusion').outerHTML });
          if (time >= 7.75) completeFrames++;
          if (completeFrames >= 12) resolve(); else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      observer.disconnect(); HTMLCanvasElement.prototype.toDataURL = encode;
      return { samples, completionWrites, maskBuilds, sameElements: paths.every((path, i) => el.querySelectorAll('.flow-island')[i] === path), duration: el.heroTimeline.duration(), filter: el.querySelector('.experience-scene').style.filter };
    });
    expect(result.sameElements).toBe(true);
    expect(result.duration).toBe(7.75);
    expect(result.maskBuilds).toBe(0);
    expect(result.completionWrites).toBe(0);
    expect(result.filter).toBe('');
    const final = result.samples.find(sample => sample.stage === 'final');
    const prior = result.samples.filter(sample => sample.stage !== 'final').at(-1);
    expect(prior).toBeDefined();
    expect(prior.mask).toBe(final.mask);
    const numbers = d => d.join(' ').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const before = numbers(prior.d), after = numbers(final.d);
    expect(before.length).toBe(after.length);
    expect(Math.max(...after.map((value, i) => Math.abs(value - before[i])))).toBeLessThan(.05);
    expect(result.samples.filter(sample => sample.stage === 'final').every(sample => JSON.stringify(sample.d) === JSON.stringify(final.d))).toBe(true);
  });
}
