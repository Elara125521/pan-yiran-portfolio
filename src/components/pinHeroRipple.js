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
  function prepare(next) {
    const key = `${next.w}:${next.h}`;
    if (key === imageKey) return;
    const canvas = document.createElement('canvas'); canvas.width = next.w + 40; canvas.height = next.h + 40;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Only rasterize the small protected footprint and its feathered collar.
    const left = Math.max(0, Math.floor(next.x - 52 + 20)), top = Math.max(0, Math.floor(next.y - 52 + 20));
    const width = Math.min(canvas.width - left, Math.ceil(next.width + 106));
    const height = Math.min(canvas.height - top, Math.ceil(next.height + 106));
    const pixels = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const px = x + left - 20, py = y + top - 20;
      const dx = Math.max(next.x - 10 - px, 0, px - next.x - next.width - 10);
      const dy = Math.max(next.y - 10 - py, 0, py - next.y - next.height - 10);
      const t = Math.min(1, Math.hypot(dx, dy) / 42), i = (y * width + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
    ctx.putImageData(pixels, left, top); image = canvas.toDataURL(); imageKey = key;
  }
  return {
    prepare,
    update(next) {
      // Image preparation belongs to initialization/resize, never completion.
      const changed = geometry?.active !== next.active || geometry?.w !== next.w || geometry?.h !== next.h;
      geometry = next;
      if (changed) { lastStyle = ''; protect(); }
    },
    dispose() { observer.disconnect(); installed.forEach(({ displacement, original, nodes }) => { displacement.setAttribute('in2', original); nodes.forEach(node => node.remove()); }); },
  };
}
