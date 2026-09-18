import { useLayoutEffect } from 'react';

// Work compositions use proximity scale. Their paint filters must remain in
// unscaled local coordinates, not the smaller getBoundingClientRect space.
export default function useWorkPaintBounds(root) {
  useLayoutEffect(() => {
    const cache = new WeakMap();
    function fit(element) {
      const id = /#([^)"]+)/.exec(element.style.filter)?.[1];
      if (!id) return;
      const filter = document.getElementById(id);
      if (!filter || filter.tagName.toLowerCase() !== 'filter') return;
      const rect = element.getBoundingClientRect();
      const width = element.offsetWidth, height = element.offsetHeight;
      if (!rect.width || !rect.height || !width || !height) return;
      const key = `${width},${height},${rect.x},${rect.y},${rect.width},${rect.height}`;
      if (cache.get(filter) === key) return;
      cache.set(filter, key);
      // Include existing hover enlargement and the local custom cursor.
      filter.setAttribute('x', '-64'); filter.setAttribute('y', '-64');
      filter.setAttribute('width', width + 128); filter.setAttribute('height', height + 128);
      const map = filter.querySelector('feImage');
      if (map) {
        const sx = rect.width / width, sy = rect.height / height;
        map.setAttribute('x', -rect.left / sx); map.setAttribute('y', -rect.top / sy);
        map.setAttribute('width', innerWidth / sx); map.setAttribute('height', innerHeight / sy);
      }
    }
    const observer = new MutationObserver(records => {
      const targets = new Set();
      records.forEach(({ target }) => {
        if (target.matches('.island-composition')) targets.add(target);
        else if (target.matches('.project-island')) targets.add(target.querySelector('.island-composition'));
      });
      targets.forEach(element => element && fit(element));
    });
    root.current.querySelectorAll('.island-composition').forEach(fit);
    observer.observe(root.current, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
    return () => observer.disconnect();
  }, [root]);
}
