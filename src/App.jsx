import React, { useCallback, useEffect, useRef, useState } from 'react';
import LoadingScreen from './components/LoadingScreen';
import Navigation from './components/Navigation';
import MouseFluid from './components/MouseFluid';
import ProjectSidebar from './components/ProjectSidebar';
import Hero from './sections/Hero';
import ProjectExploration from './sections/ProjectExploration';
import About from './sections/About';
import Contact from './sections/Contact';
import useSectionController from './components/useSectionController';

export default function App() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState('hero');
  const [project, setProject] = useState(null);
  const page = useRef(null);
  const heroHandoff = useRef(null);
  const finishLoading = useCallback(frame => { heroHandoff.current = frame; setReady(true); }, []);
  const closeProject = useCallback(() => setProject(null), []);
  useEffect(() => {
    page.current.inert = !ready;
    if (ready) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [ready]);
  useSectionController(ready, setActive);
  return <>
    <div ref={page}>
      <a className="skip-link" href="#projects">跳到项目</a>
      <Navigation active={active} />
      {ready && <MouseFluid />}
      <main><Hero ready={ready} handoff={heroHandoff.current} /><About /><ProjectExploration onOpen={setProject} /><Contact /></main>
    </div>
    {!ready && <LoadingScreen onComplete={finishLoading} />}
    {project && <ProjectSidebar key={project.id} project={project} onClose={closeProject} />}
  </>;
}
