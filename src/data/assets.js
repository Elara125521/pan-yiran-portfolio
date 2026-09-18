// Keep the original assets intact. Vite emits only the imported production assets.
const files = import.meta.glob('../../assets/**/*.{svg,png}', { eager: true, query: '?url', import: 'default' });
export function asset(path) {
  const url = files[`../../assets/${path}`];
  if (!url) throw new Error(`Missing portfolio asset: ${path}`);
  return url;
}
