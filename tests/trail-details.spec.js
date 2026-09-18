import { test, expect } from '@playwright/test';

test('Trail occupies only right-hand gaps and reverses without previews; dots are opaque', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#shunshi');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  const result = await page.evaluate(() => {
    const marks = [...document.querySelectorAll('.trail-mark')];
    const boxes = [...document.querySelectorAll('.island-composition')].map(el => {
      const r = el.getBoundingClientRect(); return { left: r.right - el.offsetWidth, right: r.right, top: r.top + r.height / 2 - el.offsetHeight / 2, bottom: r.top + r.height / 2 + el.offsetHeight / 2 };
    });
    const safe = marks.every(el => {
      const r = el.getBoundingClientRect();
      const segment = Number(el.dataset.segment);
      return r.left > innerWidth * .6 && r.top > boxes[segment].bottom + 8 && r.bottom < boxes[segment + 1].top - 8;
    });
    const spacing = marks.every((el, i) => {
      if (el.dataset.order === '0') return true;
      const a = marks[i - 1].getBoundingClientRect(), b = el.getBoundingClientRect();
      return Math.hypot((a.left + a.right - b.left - b.right) / 2, (a.top + a.bottom - b.top - b.bottom) / 2) >= 28;
    });
    const sample = progress => {
      window.dispatchEvent(new CustomEvent('section-progress', { detail: { fromIndex: 2, toIndex: 3, progress } }));
      return marks.map(el => Number(el.style.opacity));
    };
    const geometry = () => [...document.querySelectorAll('#projects, .project-island')].map(el => [el.offsetTop, el.offsetHeight]);
    const before = geometry();
    const start = sample(0), mid = sample(.5), end = sample(1);
    const after = geometry();
    window.dispatchEvent(new CustomEvent('section-progress', { detail: { fromIndex: 3, toIndex: 2, progress: 1 } }));
    return { safe, spacing, before, after, counts: Array.from({ length: 5 }, (_, i) => marks.filter(el => Number(el.dataset.segment) === i).length), start, mid, end, reverse: marks.map(el => Number(el.style.opacity)), dots: [...document.querySelectorAll('.nav-dot')].map(el => ({ opacity: getComputedStyle(el).opacity, color: getComputedStyle(el).backgroundColor })) };
  });
  expect(result.safe).toBe(true);
  expect(result.spacing).toBe(true);
  expect(result.before).toEqual(result.after);
  expect(result.counts.every(count => count >= 3 && count <= 4)).toBe(true);
  expect(result.start.every(x => x === 0)).toBe(true);
  expect(result.mid.slice(0, result.counts[0]).some(x => x > 0)).toBe(true);
  expect(result.mid.slice(0, result.counts[0]).some(x => x === 0)).toBe(true);
  expect(result.end.slice(0, result.counts[0]).every(x => x === 1)).toBe(true);
  expect(result.end.slice(result.counts[0]).every(x => x === 0)).toBe(true);
  expect(result.reverse.every(x => x === 0)).toBe(true);
  expect(result.dots.every(x => x.opacity === '1' && x.color.startsWith('rgb('))).toBe(true);
});
