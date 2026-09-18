import { useLayoutEffect } from 'react';

// Blend the existing ripple field with a neutral field at attached section
// edges. The ripple producer and all other filtered elements stay unchanged.
export default function usePinnedDecoration(reference) {
  useLayoutEffect(() => {
    const element = reference.current;
    const ns = 'http://www.w3.org/2000/svg';
    const installed = new Map();
    let cached = null, lastStyle = '', disposed = false, revision = 0;
    function measure() {
      const currentRevision = ++revision;
      const box = element.getBoundingClientRect();
      const section = element.closest('section').getBoundingClientRect();
      const width = element.offsetWidth, height = element.offsetHeight;
      const sx = box.width / width, sy = box.height / height;
      const edges = [];
      const band = 56;
      if (box.left <= section.left + 8) {
        const x = (section.left - box.left) / sx;
        edges.push(`x1="${x}" y1="0" x2="${x + band}" y2="0"`);
      }
      if (box.right >= section.right - 8) {
        const x = (section.right - box.left) / sx;
        edges.push(`x1="${x}" y1="0" x2="${x - band}" y2="0"`);
      }
      if (box.top <= section.top + 8) {
        const y = (section.top - box.top) / sy;
        edges.push(`x1="0" y1="${y}" x2="0" y2="${y + band}"`);
      }
      if (box.bottom >= section.bottom - 8) {
        const y = (section.bottom - box.top) / sy;
        edges.push(`x1="0" y1="${y}" x2="0" y2="${y - band}"`);
      }
      if (!edges.length) { cached = null; return; }
      const rect = `x="-20" y="-20" width="${width + 40}" height="${height + 40}"`;
      const defs = edges.map((edge, i) => `<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" ${edge}><stop stop-color="white" stop-opacity="0"/><stop offset=".25" stop-color="white" stop-opacity=".08"/><stop offset=".65" stop-color="white" stop-opacity=".65"/><stop offset="1" stop-color="white"/></linearGradient><mask id="m${i}" maskUnits="userSpaceOnUse" ${rect}><rect ${rect} fill="url(#g${i})"/></mask>`).join('');
      const groups = edges.map((_, i) => `<g mask="url(#m${i})">`).join('');
      const svg = `<svg xmlns="${ns}" width="${width + 40}" height="${height + 40}" viewBox="-20 -20 ${width + 40} ${height + 40}"><defs>${defs}</defs>${groups}<rect ${rect} fill="white"/>${'</g>'.repeat(edges.length)}</svg>`;
      // Rasterize the fixed gradient once per layout, never during pointer input.
      const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      image.decode().then(() => {
        if (disposed || currentRevision !== revision) return;
        const canvas = document.createElement('canvas'); canvas.width = width + 40; canvas.height = height + 40;
        canvas.getContext('2d').drawImage(image, 0, 0);
        cached = { width, height, href: canvas.toDataURL() };
        installed.forEach(({ nodes }) => {
          Object.entries({ width: width + 40, height: height + 40, href: cached.href }).forEach(([key, value]) => nodes[0].setAttribute(key, value));
        });
        lastStyle = ''; protect();
      }).catch(() => {});
    }
    function protect() {
      if (!cached || element.style.filter === lastStyle) return;
      lastStyle = element.style.filter;
      const id = /#([^)"]+)/.exec(lastStyle)?.[1];
      const filter = id && document.getElementById(id);
      if (!filter || installed.has(filter)) return;
      installed.forEach((_, old) => { if (!old.isConnected) installed.delete(old); });
      const displacement = filter.querySelector('feDisplacementMap');
      if (!displacement) return;
      const { width, height, href } = cached;
      function node(tag, attributes) {
        const el = document.createElementNS(ns, tag);
        Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
        filter.insertBefore(el, displacement);
        return el;
      }
      const gain = node('feImage', { x: -20, y: -20, width: width + 40, height: height + 40, href, preserveAspectRatio: 'none', result: 'decor-edge-gain' });
      const weighted = node('feComposite', { in: displacement.getAttribute('in2'), in2: 'decor-edge-gain', operator: 'in', result: 'decor-free-field' });
      const neutral = node('feFlood', { 'flood-color': 'rgb(50%,50%,50%)', result: 'decor-neutral' });
      const blend = node('feComposite', { in: 'decor-free-field', in2: 'decor-neutral', operator: 'over', result: 'decor-pinned-field' });
      const original = displacement.getAttribute('in2');
      displacement.setAttribute('in2', 'decor-pinned-field');
      installed.set(filter, { displacement, original, nodes: [gain, weighted, neutral, blend] });
    }
    const observer = new MutationObserver(protect);
    observer.observe(element, { attributes: true, attributeFilter: ['style'] });
    const resize = new ResizeObserver(measure);
    resize.observe(element); resize.observe(element.closest('section'));
    measure();
    return () => {
      disposed = true; resize.disconnect();
      observer.disconnect();
      installed.forEach(({ displacement, original, nodes }) => { displacement.setAttribute('in2', original); nodes.forEach(node => node.remove()); });
    };
  }, [reference]);
}
