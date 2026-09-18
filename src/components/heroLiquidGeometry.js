// Sample supplied SVG contours without changing the source artwork.
export const svgPaths = source => [...source.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
export const clamp = value => Math.max(0, Math.min(1, value));
export const mix = (a, b, p) => a + (b - a) * p;
export const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };

export function sampleContours(d, count = 64) {
  return d.split(/(?=[Mm])/).filter(Boolean).map(contour => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', contour);
    const length = path.getTotalLength();
    const samples = Math.max(20, Math.min(count, Math.ceil(length / 5)));
    return Array.from({ length: samples }, (_, i) => {
      const p = path.getPointAtLength(length * i / samples);
      return { x: p.x, y: p.y };
    });
  });
}

// Closed Catmull–Rom curves avoid polygonal edges during the liquid phase.
export function curve(points) {
  const f = value => value.toFixed(2);
  let d = `M${f(points[0].x)},${f(points[0].y)}`;
  for (let i = 0; i < points.length; i++) {
    const a = points[(i + points.length - 1) % points.length], b = points[i];
    const c = points[(i + 1) % points.length], e = points[(i + 2) % points.length];
    d += `C${f(b.x + (c.x - a.x) / 6)},${f(b.y + (c.y - a.y) / 6)} ${f(c.x - (e.x - b.x) / 6)},${f(c.y - (e.y - b.y) / 6)} ${f(c.x)},${f(c.y)}`;
  }
  return `${d}Z`;
}
export function bounds(contours) {
  const points = contours.flat();
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) };
}
export function waterSurface(fill, time, rise = 0) {
  const y = 174 - fill * 142; // Leave a small air gap in the upper aperture.
  // One broad lag and counter-swing, returning to zero at both ends of the rise.
  const inertia = Math.sin(rise * Math.PI * 2) * Math.sin(rise * Math.PI) * 17;
  const wave = x => y + Math.sin(x / 39 + time * .48) * 5 + Math.sin(x / 21 - time * .31) * 2
    + inertia * ((x - 71) / 71 + Math.sin(x / 142 * Math.PI * 2) * .3);
  return `M0 ${wave(0)} C24 ${wave(24)} 42 ${wave(42)} 65 ${wave(65)} S108 ${wave(108)} 142 ${wave(142)} L142 189 L0 189Z`;
}
