import { test, expect } from '@playwright/test';

test('Case-study bytes load only for an opened project and later images remain lazy', async ({ page }) => {
  const requests = [];
  page.on('request', request => {
    if (['image', 'media'].includes(request.resourceType()) && request.url().includes('/assets/projects/')) requests.push(decodeURIComponent(request.url()));
  });
  await page.goto('/#shunshi');
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 11000 });
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  expect(requests).toEqual([]);
  await expect(page.locator('.project-sidebar')).toHaveCount(0);
  await page.locator('#shunshi .island-button').click();
  const images = page.locator('.project-sidebar .project-image');
  await expect(images.first()).toHaveAttribute('loading', 'eager');
  await expect.poll(() => images.first().evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  const sources = await images.evaluateAll(nodes => nodes.map(el => ({src: decodeURIComponent(el.src), loading: el.loading})));
  expect(sources.slice(1).every(image => image.loading === 'lazy')).toBe(true);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every(url => url.includes('/projects/shunshi/'))).toBe(true);
  const lastSource = sources.at(-1).src;
  console.log('Shunshi images requested on open:', requests.filter(url => /\.(jpg|png|svg)(\?|$)/.test(url)).length, '/', sources.length);
  expect(requests.includes(lastSource)).toBe(false);
  await images.last().scrollIntoViewIfNeeded();
  await expect.poll(() => requests.includes(lastSource)).toBe(true);
  await page.locator('.sidebar-close').click();
  await expect(page.locator('.project-sidebar')).toHaveCount(0);
  await page.evaluate(() => dispatchEvent(new CustomEvent('section-request', {detail: {id:'sanshan'}})));
  await expect(page.locator('html')).toHaveAttribute('data-scroll-transitioning', 'false');
  await page.locator('#sanshan .island-button').click();
  await expect.poll(() => requests.some(url => url.includes('/projects/sanshan/'))).toBe(true);
  expect(requests.every(url => /\/projects\/(shunshi|sanshan)\//.test(url))).toBe(true);
});
