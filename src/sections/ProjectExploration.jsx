import React, { useLayoutEffect, useRef, useState } from 'react';
import { projects } from '../data/projects';
import ProjectIsland from '../components/ProjectIsland';
import useWorkPaintBounds from '../components/useWorkPaintBounds';
import { trailAsset, trailConfigs } from '../data/islandTrail';
import './ProjectExploration.css';

export default function ProjectExploration({ onOpen }) {
  const root = useRef(null);
  useWorkPaintBounds(root);
  const [centered, setCentered] = useState(-1);
  useLayoutEffect(() => {
    const section = root.current;
    const rows = [...section.querySelectorAll('.project-island')];
    const svg = section.querySelector('.exploration-path');
    const ns = 'http://www.w3.org/2000/svg';
    let marks = [], revealProgress = 0;
    function reveal(value) {
      revealProgress = value;
      marks.forEach(({ element, segment, order, count }) => {
        const local = value * (rows.length - 1) - segment;
        const start = order / count;
        const amount = Math.max(0, Math.min(1, (local - start) * count));
        element.style.opacity = amount;
        element.firstElementChild.setAttribute('transform', `scale(${.8 + .2 * amount})`);
      });
      svg.dataset.progress = value;
    }
    function measure() {
      const box = section.getBoundingClientRect();
      const boxes = rows.map(row => {
        const composition = row.querySelector('.island-composition');
        const r = composition.getBoundingClientRect();
        const center = r.top + r.height / 2 - box.top;
        return { left: r.right - box.left - composition.offsetWidth, right: r.right - box.left,
          top: center - composition.offsetHeight / 2, bottom: center + composition.offsetHeight / 2 };
      });
      svg.setAttribute('viewBox', `0 0 ${box.width} ${section.offsetHeight}`);
      const fragment = document.createDocumentFragment();
      marks = [];
      if (trailAsset) trailConfigs.forEach(({ from, to, points }, segment) => {
        const a = boxes[from], b = boxes[to];
        // Padding includes the small graphic's half-height and hover art overshoot.
        const rawGap = b.top - a.bottom;
        const padding = rawGap >= 70 ? 22 : 14;
        const startY = a.bottom + padding, endY = b.top - padding;
        const gap = endY - startY;
        if (gap < 0) return; // Never manufacture space or overlap existing content.
        let count = rawGap < 220 ? 3 : rawGap < 360 ? 4 : rawGap < 520 ? 5 : rawGap < 700 ? 6 : rawGap < 900 ? 7 : 8;
        const left = Math.max(box.width * .4, Math.min(a.left, b.left));
        const right = Math.min(box.width - 24, Math.max(a.right, b.right));
        const path = document.createElementNS(ns, 'path');
        const x = point => left + (right - left) * point.x;
        path.setAttribute('d', `M ${x(points[0])} ${startY} C ${x(points[1])} ${startY + gap / 3}, ${x(points[2])} ${startY + gap * 2 / 3}, ${x(points[3])} ${endY}`);
        const length = path.getTotalLength();
        // Leave at least a graphic's width plus clear air between samples.
        while (count > 3 && length / (count - 1) < 34) count--;
        const samples = Array.from({ length: count }, (_, order) => points[order % points.length]);
        samples.forEach((point, order) => {
          const element = document.createElementNS(ns, 'g');
          const image = document.createElementNS(ns, 'image');
          const { x, y } = path.getPointAtLength(length * order / (count - 1));
          element.setAttribute('class', 'trail-mark');
          element.dataset.segment = segment;
          element.dataset.order = order;
          element.setAttribute('transform', `translate(${x} ${y}) rotate(${point.rotation}) scale(${point.scale})`);
          element.style.opacity = 0;
          image.setAttribute('href', trailAsset);
          image.setAttribute('x', '-13.5'); image.setAttribute('y', '-10.5');
          image.setAttribute('width', '27'); image.setAttribute('height', '21');
          element.append(image); fragment.append(element);
          marks.push({ element, segment, order, count });
        });
      });
      svg.replaceChildren(fragment);
      // Geometry reads must never publish a settled state or change its progress.
      reveal(revealProgress);
    }
    function update(event) {
      const index = rows.findIndex(row => row.id === event.detail.id);
      setCentered(index);
      window.dispatchEvent(new CustomEvent('work-navigation', { detail: { visible: index >= 0, active: index >= 0 ? rows[index].id : null } }));
      reveal(index >= 0 ? index / (rows.length - 1) : event.detail.id === 'contact' ? 1 : 0);
    }
    function progress(event) {
      const value = index => Math.max(0, Math.min(1, (index - 2) / (rows.length - 1)));
      const { fromIndex, toIndex, progress } = event.detail;
      reveal(value(fromIndex) + (value(toIndex) - value(fromIndex)) * progress);
    }
    window.addEventListener('section-progress', progress);
    window.addEventListener('section-settled', update);
    const resize = new ResizeObserver(measure); resize.observe(section);
    measure();
    return () => { window.removeEventListener('section-progress', progress); resize.disconnect(); window.removeEventListener('section-settled', update); };
  }, []);
  return <section ref={root} id="projects" className="project-exploration" aria-label="项目探索">
    <svg className="exploration-path" aria-hidden="true" />
    <div className="islands">{projects.map((project, index) => <ProjectIsland key={project.id} project={project} index={index} onOpen={onOpen} centered={centered === index} />)}</div>
  </section>;
}
