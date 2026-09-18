import { test, expect } from '@playwright/test';

test('Both Shunshi videos advance, loop, stop on close and play after reopening', async ({ page }) => {
  await page.goto('/#shunshi');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.getByRole('button', { name: '探索项目：顺时' }).click();
  const videos = page.locator('dialog video');
  await expect(videos).toHaveCount(2);
  await page.evaluate(() => window.savedVideos = [...document.querySelectorAll('dialog video')]);
  expect(await page.locator('.case-study-images > :nth-child(5)').evaluate(el => el.tagName === 'VIDEO' && decodeURI(el.src).includes('5.core interaction2.mp4'))).toBe(true);
  for (const video of await videos.all()) {
    await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 15000 }).toBeGreaterThan(.3);
    await video.evaluate(v => v.scrollIntoView());
    const time = await video.evaluate(v => v.currentTime);
    await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(time + .2);
    expect(await video.evaluate(v => v.muted && v.loop && v.autoplay && v.playsInline && !v.controls)).toBe(true);
    await video.evaluate(v => { v.currentTime = v.duration - .15; });
    await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 5000 }).toBeLessThan(2);
  }
  await page.getByRole('button', { name: '关闭项目详情' }).click();
  expect(await page.evaluate(() => window.savedVideos.every(v => v.paused))).toBe(true);
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.savedVideos.every(v => v.paused))).toBe(true);
  await page.getByRole('button', { name: '探索项目：顺时' }).click();
  for (const video of await videos.all()) await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 15000 }).toBeGreaterThan(.3);
});
