import React, { useEffect, useRef, useState } from 'react';
import { projects } from '../data/projects';

export default function Navigation({ active }) {
  const [work, setWork] = useState({ visible: false, active: null });
  const navigation = useRef(null);
  useEffect(() => {
    const update = event => {
      setWork(previous => previous.visible === event.detail.visible && previous.active === event.detail.active ? previous : event.detail);
      const nav = navigation.current;
      if (nav.dataset.contactTransition) {
        nav.style.opacity = event.detail.visible ? '1' : '0';
        nav.style.visibility = event.detail.visible ? 'visible' : 'hidden';
      }
    };
    const paint = (from, to, progress) => {
      if (!((from === 7 && to === 8) || (from === 8 && to === 7))) return;
      const nav = navigation.current;
      nav.dataset.contactTransition = 'true';
      const opacity = from === 7 ? Math.max(0, 1 - progress / .3) : Math.max(0, Math.min(1, (progress - .45) / .4));
      nav.style.opacity = String(opacity);
      nav.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      nav.style.pointerEvents = 'none';
      nav.inert = true;
    };
    const start = () => {
      const { scrollIndex, scrollTarget } = document.documentElement.dataset;
      if ((Number(scrollIndex) === 7 && Number(scrollTarget) === 8) || (Number(scrollIndex) === 8 && Number(scrollTarget) === 7)) paint(Number(scrollIndex), Number(scrollTarget), 0);
      else { const nav = navigation.current; delete nav.dataset.contactTransition; nav.style.opacity = ''; nav.style.visibility = ''; nav.style.pointerEvents = ''; }
    };
    const progress = event => paint(event.detail.fromIndex, event.detail.toIndex, event.detail.progress);
    const settled = () => { navigation.current.style.pointerEvents = ''; };
    window.addEventListener('work-navigation', update);
    window.addEventListener('section-transition-start', start);
    window.addEventListener('section-progress', progress);
    window.addEventListener('section-settled', settled);
    return () => { window.removeEventListener('work-navigation', update); window.removeEventListener('section-transition-start', start); window.removeEventListener('section-progress', progress); window.removeEventListener('section-settled', settled); };
  }, []);
  const dark = active === 'hero' || active === 'contact';
  return <header className={`site-navigation ${work.visible ? 'work-visible' : ''} ${dark ? 'on-dark' : ''} ${active === 'hero' ? 'at-hero' : ''} ${projects.some(project => project.id === active) ? 'in-projects' : ''} ${active === 'hero' || active === 'about' ? 'before-work' : ''}`}>
    <nav ref={navigation} className="side-navigation" aria-label="探索导航" inert={!work.visible}>
      <a href="#hero" className="nav-section">HOME</a>
      <a href="#about" aria-current={active === 'about' ? 'location' : undefined} className="nav-section">ABOUT ME</a>
      <div className="project-navigation">{projects.map((project, i) => <a key={project.id} href={`#${project.id}`} className={`nav-project ${work.active === project.id ? 'is-current' : ''}`} aria-current={work.active === project.id ? 'location' : undefined} aria-label={`${String(i + 1).padStart(2, '0')} ${project.name}`}><span className="nav-dot" /><span className="nav-label">{String(i + 1).padStart(2, '0')}　{project.name}</span></a>)}</div>
      <a href="#contact" aria-current={active === 'contact' ? 'location' : undefined} className="nav-section">CONTACT</a>
    </nav>
  </header>;
}
