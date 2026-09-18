import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';

// The only owner of document scroll position. Visual components only observe it.
export default function useSectionController(ready, onActive) {
  // Initialize the existing controller before the loading handoff is painted.
  // A passive effect permits one frame at the browser's previous scroll position.
  useLayoutEffect(() => {
    if (!ready) return;
    const stops = [...document.querySelectorAll('#hero, #about, .project-island, #contact')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, targetIndex = null, transitioning = false, tween, disposed = false;
    let lastWheel = -Infinity, consumed = false, amount = 0, touchY = null, touchUsed = false;
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    const originalOverflow = html.style.overflowY, originalGutter = html.style.scrollbarGutter;
    let workLocked = false;
    function lockWork(locked) {
      if (workLocked === locked) return;
      workLocked = locked;
      // Keep the existing scrollbar allocation, but remove native user scrolling.
      // Programmatic movement still belongs exclusively to the section tween.
      html.style.scrollbarGutter = locked ? 'stable' : originalGutter;
      html.style.overflowY = locked ? 'hidden' : originalOverflow;
    }
    let projectCenters = [];
    function measureProjects() {
      projectCenters = stops.filter(el => el.classList.contains('project-island')).map(el => ({
        el, center: el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2,
      }));
    }
    html.style.scrollBehavior = 'auto';
    const isWork = index => stops[index]?.classList.contains('project-island');
    function position(index) {
      const el = stops[index];
      const anchor = projectCenters.find(item => item.el === el);
      if (anchor) return Math.max(0, anchor.center - innerHeight / 2);
      const top = el.id === 'about' ? el.offsetTop : el.getBoundingClientRect().top + scrollY;
      return Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight,
        top + (el.classList.contains('project-island') ? el.offsetHeight / 2 - innerHeight / 2 : 0)));
    }
    function nearest() { return stops.reduce((best, _, i) => Math.abs(position(i) - scrollY) < Math.abs(position(best) - scrollY) ? i : best, 0); }
    function publish() {
      const id = stops[current].id;
      html.dataset.scrollIndex = current;
      html.dataset.scrollTransitioning = String(transitioning);
      window.dispatchEvent(new CustomEvent('section-settled', { detail: { id, index: current } }));
      onActive(id);
    }
    function renderProjects(y) {
      const center = innerHeight * .48;
      projectCenters.forEach(({ el, center: documentCenter }) => {
        el.style.setProperty('--proximity', Math.max(.52, 1 - Math.abs(documentCenter - y - center) / innerHeight * .55).toFixed(3));
      });
    }
    function visualScroll() {
      if (!isWork(current) && !isWork(targetIndex)) renderProjects(scrollY);
    }
    function write(y) { window.scrollTo({ top: y, behavior: 'instant' }); }
    function go(index, after, instant = false) {
      if (transitioning || index < 0 || index >= stops.length) return;
      if (isWork(current) && index === current && !after) return;
      targetIndex = index;
      html.dataset.scrollTarget = String(index);
      if (isWork(current) || isWork(index)) lockWork(true);
      transitioning = true; html.dataset.scrollTransitioning = 'true';
      window.dispatchEvent(new Event('section-transition-start'));
      const motion = { progress: 0 }, from = scrollY, destination = position(index), fromIndex = current;
      const projectToProject = isWork(fromIndex) && isWork(index);
      const finish = async () => {
        // The tween has already written its exact endpoint. Work must not
        // receive a second scroll write after the settle interval.
        if (!isWork(index) && stops[index].id !== 'contact') write(destination);
        current = index;
        renderProjects(destination);
        publish();
        try { await after?.(); } finally {
          if (!disposed) {
            targetIndex = null; delete html.dataset.scrollTarget;
            // Contact keeps the exact gutter/viewport geometry used during its
            // reveal. Unlocking here resized typography in the completion frame.
            lockWork(isWork(current) || stops[current].id === 'contact');
            transitioning = false; html.dataset.scrollTransitioning = 'false';
          }
        }
      };
      tween = gsap.timeline().to(motion, { progress: 1, duration: instant || reduced.matches ? 0 : projectToProject ? .58 : .78, ease: projectToProject ? 'power3.out' : 'power3.inOut',
        onUpdate: () => {
          const y = from + (destination - from) * motion.progress;
          write(y);
          if (isWork(fromIndex) || isWork(index)) renderProjects(y);
          window.dispatchEvent(new CustomEvent('section-progress', { detail: { fromIndex, toIndex: index, progress: motion.progress, y } }));
        }, onComplete: projectToProject ? finish : undefined });
      if (!projectToProject) tween.to({}, { duration: instant || reduced.matches ? 0 : .1, onComplete: finish });
    }
    function blocked(target) { return target.closest?.('dialog, input, textarea, select, [contenteditable="true"]'); }
    function wheel(event) {
      if (blocked(event.target) || event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        // A diagonal trackpad tail must not leak into browser scrolling, which
        // used to start a separate scrollend correction after Work had docked.
        if (isWork(current)) event.preventDefault();
        return;
      }
      event.preventDefault();
      const now = performance.now(), newGesture = now - lastWheel > 180;
      lastWheel = now;
      if (newGesture) { consumed = false; amount = 0; }
      if (transitioning) { consumed = true; return; }
      if (consumed) return;
      amount += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(amount) < 4) return;
      consumed = true; go(current + Math.sign(amount));
    }
    function key(event) {
      if (blocked(event.target) || (event.key === ' ' && event.target.closest('button, a, [role="button"]')) || event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = ['ArrowDown', 'PageDown', 'End', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp', 'Home'].includes(event.key) ? -1 : 0;
      if (!direction) return;
      event.preventDefault(); if (!event.repeat) go(current + direction);
    }
    function touchStart(event) { if (!blocked(event.target) && event.touches.length === 1) { touchY = event.touches[0].clientY; touchUsed = false; } }
    function touchMove(event) {
      if (touchY === null || blocked(event.target) || event.touches.length !== 1) return;
      event.preventDefault(); const delta = touchY - event.touches[0].clientY;
      if (transitioning) { touchUsed = true; return; }
      if (!touchUsed && Math.abs(delta) >= 12) { touchUsed = true; go(current + Math.sign(delta)); }
    }
    function touchEnd() { touchY = null; }
    function request(event) { const i = stops.findIndex(el => el.id === event.detail.id); if (i >= 0) go(i, event.detail.after); }
    function click(event) {
      const link = event.target.closest('a[href^="#"]'); if (!link || blocked(event.target)) return;
      const id = link.hash.slice(1) === 'projects' ? stops[2].id : link.hash.slice(1);
      const i = stops.findIndex(el => el.id === id); if (i < 0) return;
      event.preventDefault(); if (!transitioning) { history.pushState(null, '', `#${id}`); go(i); }
    }
    function focus(event) {
      if (blocked(event.target)) return;
      const row = event.target.closest('.project-island');
      if (row) { const i = stops.indexOf(row); if (i !== current) go(i); }
    }
    function center(event) { const row = event.target.closest('.project-island'); if (row) go(stops.indexOf(row)); }
    function nativeEnd() { if (isWork(current)) return; if (!transitioning && !document.querySelector('dialog[open]')) { const i = nearest(); if (Math.abs(position(i) - scrollY) > 1) go(i); else { current = i; publish(); } } }
    function resize() { measureProjects(); if (!transitioning) { write(position(current)); renderProjects(position(current)); publish(); } }
    function historyChange() { const i = stops.findIndex(el => el.id === location.hash.slice(1)); if (i >= 0) go(i); }
    window.addEventListener('scroll', visualScroll, { passive: true });
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd); window.addEventListener('touchcancel', touchEnd);
    window.addEventListener('section-request', request); window.addEventListener('scrollend', nativeEnd); window.addEventListener('resize', resize);
    window.addEventListener('popstate', historyChange);
    document.addEventListener('click', click); document.addEventListener('focusin', focus); document.addEventListener('center-project', center);
    current = Math.max(0, stops.findIndex(el => el.id === location.hash.slice(1)));
    measureProjects(); lockWork(isWork(current) || stops[current].id === 'contact'); write(position(current)); renderProjects(position(current)); publish();
    return () => { disposed = true; tween?.kill(); lockWork(false); delete html.dataset.scrollTarget; html.style.scrollBehavior = previousBehavior;
      window.removeEventListener('scroll', visualScroll);
      window.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key);
      window.removeEventListener('touchstart', touchStart); window.removeEventListener('touchmove', touchMove); window.removeEventListener('touchend', touchEnd); window.removeEventListener('touchcancel', touchEnd);
      window.removeEventListener('section-request', request); window.removeEventListener('scrollend', nativeEnd); window.removeEventListener('resize', resize); window.removeEventListener('popstate', historyChange);
      document.removeEventListener('click', click); document.removeEventListener('focusin', focus); document.removeEventListener('center-project', center);
    };
  }, [ready, onActive]);
}
