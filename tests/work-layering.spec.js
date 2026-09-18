import { test, expect } from '@playwright/test';

test('Inspect Work paint layers with trail hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#yugeng');
  await page.getByRole('button', { name: '跳过动画' }).click();
  await page.locator('.hero-experience-animation').evaluate(el => { el.heroTimeline.pause().progress(1); el.heroRender(); });
  await page.addStyleTag({ content: '.exploration-path { visibility:hidden!important } #projects svg, #projects .island-composition, .contact-stage, .experience-window-scene { outline:1px solid red }' });
  const report = await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) { document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, pointerType:'mouse', clientX:700+i*35, clientY:350+i*10 })); await new Promise(requestAnimationFrame); }
    const el = document.querySelector('#yugeng .island-composition');
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    const id = /#([^)"]+)/.exec(style.filter)?.[1];
    const filter = id && document.getElementById(id);
    const layers = [...document.querySelectorAll('#projects, .islands, .island-composition, .exploration-path, #about, .contact-stage, .experience-window-scene')].map(node => {
      const s = getComputedStyle(node), rect = node.getBoundingClientRect();
      return { name:node.id || node.className.baseVal || node.className, rect:rect.toJSON(), z:s.zIndex, opacity:s.opacity, pointer:s.pointerEvents, clip:s.clipPath, mask:s.maskImage, overflow:s.overflow, filter:s.filter };
    });
    return { layers, hits:document.elementsFromPoint(r.right-20,r.bottom-20).map(node=>node.id || node.className.baseVal || node.className || node.tagName), project:{rect:r.toJSON(), width:el.offsetWidth,height:el.offsetHeight,filter:style.filter}, filter:filter?.outerHTML.slice(0,420) };
  });
  console.log(JSON.stringify(report, null, 2));
  await page.screenshot({ path:'test-results/work-layer-debug.png' });
  expect(report.project.width).toBeGreaterThan(0);
});
