import React, { useEffect, useId, useRef } from 'react';

// A low-resolution vector field refracts existing artwork; it draws no visible rings.
export default function MouseFluid() {
  const root = useRef(null);
  const id = `water-field-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const host = root.current, ns = 'http://www.w3.org/2000/svg';
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    const media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame = 0, impulses = [], previous = null, lastPaint = 0, targets = [], resolution = 112;
    const selectors = '.experience-scene, #hero-title, .experience-end-notes, .about-copy, .about-island, .island-composition, #contact h2, .contact-links';
    function clear() {
      cancelAnimationFrame(frame); frame = 0; impulses = []; previous = null;
      targets.forEach(({ el, original }) => { el.style.filter = original; });
      targets = []; host.replaceChildren(); host.dataset.active = 'false';
    }
    function prepare() {
      canvas.width = resolution; canvas.height = Math.max(48, Math.round(resolution * innerHeight / innerWidth));
      document.querySelectorAll(selectors).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || !r.width || !r.height) return;
        // Filter only artwork containers, never a scroll section or fixed-window ancestor.
        const filter = document.createElementNS(ns, 'filter'), map = document.createElementNS(ns, 'feImage');
        const displacement = document.createElementNS(ns, 'feDisplacementMap');
        const filterId = `${id}-${targets.length}`;
        filter.id = filterId; filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('x', '-20'); filter.setAttribute('y', '-20');
        filter.setAttribute('width', r.width + 40); filter.setAttribute('height', r.height + 40);
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        map.setAttribute('x', -r.left); map.setAttribute('y', -r.top);
        map.setAttribute('width', innerWidth); map.setAttribute('height', innerHeight);
        map.setAttribute('preserveAspectRatio', 'none'); map.setAttribute('result', 'field');
        displacement.setAttribute('in', 'SourceGraphic'); displacement.setAttribute('in2', 'field');
        displacement.setAttribute('scale', '18'); displacement.setAttribute('xChannelSelector', 'R'); displacement.setAttribute('yChannelSelector', 'G');
        filter.append(map, displacement); host.append(filter);
        targets.push({ el, map, filterId, original: el.style.filter });
      });
    }
    function paint(now) {
      frame = 0;
      if (!media.matches || document.hidden || document.documentElement.dataset.scrollTransitioning === 'true') { clear(); return; }
      impulses = impulses.filter(p => now - p.time < 1450);
      if (!impulses.length) { clear(); return; }
      if (now - lastPaint < 33) { frame = requestAnimationFrame(paint); return; }
      lastPaint = now;
      const started = performance.now(), w = canvas.width, h = canvas.height;
      const pixels = ctx.createImageData(w, h);
      const radius = Math.min(320, Math.max(180, innerWidth * .19));
      const waves = impulses.map(p => ({ ...p, age: (now - p.time) / 1450 }));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let vx = 0, vy = 0;
        const px = x / w * innerWidth, py = y / h * innerHeight;
        for (const p of waves) {
          const dx = px - p.x, dy = py - p.y;
          const distance = Math.hypot(dx, dy * 1.08);
          const reach = radius * (.28 + .72 * p.age);
          if (distance > reach * 1.3) continue;
          const envelope = Math.exp(-(((distance - reach * .58) / (radius * .24)) ** 2));
          const amplitude = Math.sin(distance / radius * 7 - p.age * 6) * envelope * (1 - p.age) ** 2 * p.strength;
          vx += dx / Math.max(24, distance) * amplitude;
          vy += dy / Math.max(24, distance) * amplitude;
        }
        const i = (y * w + x) * 4;
        pixels.data[i] = 128 + Math.max(-1, Math.min(1, vx)) * 110;
        pixels.data[i + 1] = 128 + Math.max(-1, Math.min(1, vy)) * 110;
        pixels.data[i + 2] = 128; pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      const url = canvas.toDataURL();
      targets.forEach(({ el, map, filterId }) => { map.setAttribute('href', url); el.style.filter = `url(#${filterId})`; });
      host.dataset.active = 'true';
      // Adapt the field resolution, never the navigation or animation frame rate.
      if (performance.now() - started > 16 && resolution > 64) {
        resolution = Math.max(64, resolution - 16); canvas.width = resolution; canvas.height = Math.max(40, Math.round(resolution * innerHeight / innerWidth));
      }
      frame = requestAnimationFrame(paint);
    }
    function move(event) {
      if (!media.matches || event.pointerType !== 'mouse' || document.documentElement.dataset.scrollTransitioning === 'true' || event.target.closest('dialog')) return;
      const now = performance.now(), next = { x: event.clientX, y: event.clientY, time: now };
      if (previous) {
        const speed = Math.hypot(next.x - previous.x, next.y - previous.y) / Math.max(8, now - previous.time);
        if (speed > .03 && (!impulses.length || now - impulses[impulses.length - 1].time > 85)) {
          if (!targets.length) prepare();
          impulses.push({ ...next, strength: Math.min(1, .18 + speed * .4) });
          if (impulses.length > 6) impulses.shift();
          if (!frame) frame = requestAnimationFrame(paint);
        }
      }
      previous = next;
    }
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('section-transition-start', clear); window.addEventListener('resize', clear);
    document.addEventListener('visibilitychange', clear); media.addEventListener('change', clear);
    return () => { clear(); window.removeEventListener('pointermove', move); window.removeEventListener('section-transition-start', clear); window.removeEventListener('resize', clear); document.removeEventListener('visibilitychange', clear); media.removeEventListener('change', clear); };
  }, [id]);
  return <svg aria-hidden="true" width="0" height="0" className="mouse-fluid" style={{ position: 'fixed', pointerEvents: 'none' }}><defs ref={root} /></svg>;
}
