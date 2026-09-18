// Stable placements; an absent future asset leaves the route empty.
const files = import.meta.glob('../../assets/content/*island*.svg', { eager: true, query: '?url', import: 'default' });
export const trailAsset = files['../../assets/content/island SVG asset.svg'];
// Each pair has its own fixed lateral route, expressed inside its content span.
// Vertical coordinates are resolved only from the empty gap between the pair.
export const trailConfigs = [
  { from: 0, to: 1, points: [[.79, -.14], [.66, .12], [.76, -.05], [.60, .18]] },
  { from: 1, to: 2, points: [[.65, .12], [.80, -.18], [.70, .08], [.83, -.06]] },
  { from: 2, to: 3, points: [[.79, -.12], [.64, .15], [.74, -.08], [.62, .10]] },
  { from: 3, to: 4, points: [[.61, .17], [.77, -.10], [.68, .06], [.81, -.15]] },
  { from: 4, to: 5, points: [[.78, -.14], [.62, .10], [.72, -.06], [.65, .16]] },
].map(config => ({ ...config, points: config.points.map(([x, angle], i) => ({
  x, y: i / 3, rotation: angle * 100, scale: [.72, .82, .68, .78][i],
})) }));
