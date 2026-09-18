import React, { useEffect, useRef, useState } from 'react';
import { asset } from '../data/assets';

export default function ProjectIsland({ project, index, onOpen, centered }) {
  const cursor = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!centered) { setHovered(false); setFocused(false); } }, [centered]);
  function move(event) {
    if (event.pointerType === 'touch') return;
    if (!centered) return;
    setHovered(true);
    const rect = event.currentTarget.getBoundingClientRect();
    if (cursor.current) cursor.current.style.transform = `translate(${event.clientX - rect.left}px, ${event.clientY - rect.top}px) translate(-50%, -50%)`;
  }
  return <article id={project.id} data-observe className={`project-island project-${index + 1} ${centered ? 'is-centered' : ''} ${centered && (hovered || focused) ? 'is-revealed' : ''}`}>
    <div className="island-composition">
      <span className="project-copy"><span className="project-title"><span className="project-number">{String(index + 1).padStart(2, '0')}　</span>{project.name}</span><span className="project-description"><span className="project-category">{project.category}</span>{project.description}</span></span>
      <span className="island-art"><img className="island-default" src={asset(`content/work/${project.id}/default.svg`)} alt="" /><img className="island-hover" src={asset(`content/work/${project.id}/hover.svg`)} alt="" />{project.image && <img className={`island-mockup ${project.id === 'muse' ? 'is-web' : ''}`} src={asset(`content/work/${project.id}/${project.image}`)} alt="" />}</span>
      <button className="island-button" aria-label={`探索项目：${project.name}`} aria-haspopup="dialog" onFocus={event => setFocused(event.currentTarget.matches(':focus-visible'))} onBlur={() => setFocused(false)} onClick={() => { if (!centered) { document.getElementById(project.id).dispatchEvent(new CustomEvent('center-project', { bubbles: true })); return; } setHovered(false); setFocused(false); onOpen(project); }} onPointerMove={move} onPointerLeave={() => setHovered(false)}>
        <img ref={cursor} className={`project-cursor ${centered && hovered ? 'is-visible' : ''}`} src={asset(`content/work/${project.id}/cursor.svg`)} alt="" aria-hidden="true" />
      </button>
    </div>
  </article>;
}
