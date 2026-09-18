// Protect only the actual moving window footprint in the existing ripple field.
export default function pinHeroRipple(scene) {
  const ns = 'http://www.w3.org/2000/svg';
  let geometry = null, image = '', imageKey = '', lastStyle = '', installed = new Map();
  function protect() {
    if (scene.style.filter === lastStyle) return;
    lastStyle = scene.style.filter;
    const id = /#([^)" ]+)/.exec(scene.style.filter)?.[1];
    const filter = id && document.getElementById(id);
    const displacement = filter?.querySelector('feDisplacementMap');
    if (!displacement || !geometry) return;
    let entry = installed.get(filter);
    if (!geometry.active) {
      if (entry) displacement.setAttribute('in2', entry.original);
      return;
    }
    if (!entry) {
      installed.forEach((_, old) => { if (!old.isConnected) installed.delete(old); });
      const nodes = [];
      function node(tag, attrs) {
        const el = document.createElementNS(ns, tag);
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
        filter.insertBefore(el, displacement); nodes.push(el); return el;
      }
      const gain = node('feImage', { preserveAspectRatio: 'none', result: 'hero-window-gain' });
      const original = displacement.getAttribute('in2');
      node('feComposite', { in: original, in2: 'hero-window-gain', operator: 'in', result: 'hero-free-field' });
      node('feFlood', { 'flood-color': 'rgb(50%,50%,50%)', result: 'hero-neutral' });
      node('feComposite', { in: 'hero-free-field', in2: 'hero-neutral', operator: 'over', result: 'hero-pinned-field' });
      entry = { gain, original, displacement, nodes, key: '' }; installed.set(filter, entry);
    }
    displacement.setAttribute('in2', 'hero-pinned-field');
    if (entry.key === imageKey) return;
    const { w, h } = geometry;
    Object.entries({ x: -20, y: -20, width: w + 40, height: h + 40, href: image }).forEach(([key, value]) => entry.gain.setAttribute(key, value));
    entry.key = imageKey;
  }
  const observer = new MutationObserver(protect);
  observer.observe(scene, { attributes: true, attributeFilter: ['style'] });
  return {
    update(next) {
      // The final footprint is static. Motion immediately bypasses protection;
      // no mask images, geometry or filter nodes are regenerated during travel.
      if (next.active) {
        const key = `${next.w}:${next.h}`;
        if (key !== imageKey) {
          const canvas = document.createElement('canvas'); canvas.width = next.w + 40; canvas.height = next.h + 40;
          const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(canvas.width, canvas.height);
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            const dx = Math.max(next.x - 10 - (x - 20), 0, (x - 20) - next.x - next.width - 10);
            const dy = Math.max(next.y - 10 - (y - 20), 0, (y - 20) - next.y - next.height - 10);
            const t = Math.min(1, Math.hypot(dx, dy) / 42), i = (y * canvas.width + x) * 4;
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
            pixels.data[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
          }
          ctx.putImageData(pixels, 0, 0); image = canvas.toDataURL(); imageKey = key;
        }
      }
      const changed = geometry?.active !== next.active || geometry?.w !== next.w || geometry?.h !== next.h;
      geometry = next;
      if (changed) { lastStyle = ''; protect(); }
    },
    dispose() { observer.disconnect(); installed.forEach(({ displacement, original, nodes }) => { displacement.setAttribute('in2', original); nodes.forEach(node => node.remove()); }); },
  };
}
