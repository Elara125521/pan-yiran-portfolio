import { asset } from './assets';

// This allowlist intentionally excludes project artwork and case-study media.
export const criticalAssetPaths = [
  'loading/window.svg', 'loading/window close.svg', 'loading/moon.svg',
  ...['shunshi', 'sanshan', 'yugeng', 'eat', 'muse'].map(id => `loading/${id}-island.svg`),
  'hero/window-open.svg', 'hero/window-night.svg', 'hero/moon.svg',
  // Island and typography are ?raw imports rendered as inline paths; the
  // application module already contains them, so no duplicate image fetch.
];

// Failure/timeout releases the mask using the existing artwork's fallback
// rendering; a failed request must never leave navigation permanently blocked.
export function preloadCriticalAssets(signal, timeout = 8000) {
  function bounded(start) {
    return new Promise(resolve => {
      let cleanup = () => {};
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        cleanup(); resolve();
      };
      const timer = setTimeout(finish, timeout);
      signal.addEventListener('abort', finish, { once: true });
      if (signal.aborted) { finish(); return; }
      cleanup = start(finish) || cleanup;
    });
  }
  const images = criticalAssetPaths.map(path => bounded(done => {
    const image = new Image();
    image.onload = () => image.decode().catch(() => {}).then(done);
    image.onerror = done;
    try { image.src = asset(path); } catch { done(); }
    return () => { image.onload = null; image.onerror = null; };
  }));
  const fonts = bounded(done => {
    if (!document.fonts) { done(); return; }
    // Load only the existing first-screen font family, not document.fonts.ready
    // (which could also wait for fonts belonging to later sections).
    const style = getComputedStyle(document.documentElement);
    document.fonts.load(`32px ${style.fontFamily}`, 'PAN YIRAN 加载中进入创意空间').then(done, done);
  });
  return Promise.all([...images, fonts]);
}
