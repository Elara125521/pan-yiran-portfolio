import React, { useEffect, useRef, useState } from 'react';
import caseStudyDimensions from '../data/caseStudyDimensions.json';
const caseStudyFiles = import.meta.glob(['../../assets/projects/**/*.{svg,png,jpg,jpeg,webp,avif,mp4,webm,mov}', '!../../assets/projects/shunshi/4.core interaction1.jpg', '!../../assets/projects/shunshi/5.core interaction2.jpg', '!../../assets/projects/yugeng/5小程序展示.mp4'], { eager: true, query: '?url', import: 'default' });
const natural = value => value.split('/').pop().localeCompare(value.split('/').pop(), undefined, { numeric: true, sensitivity: 'base' });
const isVideo = file => /\.(mp4|webm|mov)$/i.test(file);

export default function ProjectSidebar({ project, onClose }) {
  const files = Object.entries(caseStudyFiles)
    .filter(([file]) => file.startsWith(`../../assets/projects/${project.id}/`))
    .sort(([a], [b]) => natural(a) - natural(b));
  const firstImage = files.find(([file]) => !isVideo(file))?.[0];
  const dialog = useRef(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const playbackAllowed = useRef(true);
  const closeAction = useRef(null);
  function requestClose() {
    if (closing) return;
    playbackAllowed.current = false;
    if (project.id === 'shunshi') dialog.current.querySelectorAll('video').forEach(video => video.pause());
    setClosing(true);
    closeTimer.current = setTimeout(onClose, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : matchMedia('(max-width: 768px)').matches ? 300 : 650);
  }
  closeAction.current = requestClose;
  useEffect(() => {
    const element = dialog.current;
    const mobile = matchMedia('(max-width: 768px)');
    let start = null;
    function begin(event) {
      const touch = event.touches[0];
      start = mobile.matches && event.touches.length === 1 && touch.clientX <= 28 ? { x: touch.clientX, y: touch.clientY } : null;
    }
    function move(event) {
      if (!start || !mobile.matches) return;
      if (event.touches.length !== 1) { start = null; return; }
      const dx = event.touches[0].clientX - start.x, dy = event.touches[0].clientY - start.y;
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { start = null; return; }
      if (dx > 12 && dx > Math.abs(dy) && event.cancelable) event.preventDefault();
    }
    function end(event) {
      if (!start || !mobile.matches) { start = null; return; }
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
      start = null;
      if (dx >= 75 && dx > Math.abs(dy)) closeAction.current();
    }
    function cancel() { start = null; }
    element.addEventListener('touchstart', begin, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', cancel);
    return () => {
      element.removeEventListener('touchstart', begin); element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', end); element.removeEventListener('touchcancel', cancel);
    };
  }, []);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    if (matchMedia('(max-width: 768px)').matches) element.querySelector('.sidebar-mobile-collapse').focus({ preventScroll: true });
    playbackAllowed.current = true;
    const videos = project.id === 'shunshi' ? [...element.querySelectorAll('video')] : [];
    let disposed = false;
    function play(event) {
      const video = event.currentTarget;
      if (disposed || !element.open || !playbackAllowed.current) return;
      video.muted = true;
      video.defaultMuted = true;
      video.play()?.catch(error => {
        // Cleanup may abort an outstanding request; the next setup/canplay
        // owns playback. Report actual autoplay/decoder failures in development.
        if (!disposed && error.name !== 'AbortError' && import.meta.env.DEV) {
          console.warn('Shunshi video playback failed', { src: video.currentSrc, name: error.name, readyState: video.readyState, paused: video.paused, currentTime: video.currentTime, duration: video.duration, error: video.error });
        }
      });
    }
    videos.forEach(video => {
      video.addEventListener('canplay', play);
      play({ currentTarget: video });
    });
    element.querySelector('.sidebar-scroll').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    return () => { disposed = true; videos.forEach(video => { video.removeEventListener('canplay', play); video.pause(); }); clearTimeout(closeTimer.current); element.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className={`project-sidebar ${closing ? 'is-closing' : ''}`} aria-labelledby="sidebar-title" onCancel={event => { event.preventDefault(); requestClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right) requestClose(); } }}>
    <svg className="curtain-mask" width="0" height="0" aria-hidden="true"><defs><clipPath id="curtain-edge" clipPathUnits="objectBoundingBox"><path d="M .015 0 C -.015 .2,.065 .43,.085 .61 C .095 .66,.01 .88,.015 1 L 1 1 L 1 0 Z" /></clipPath></defs></svg>
    <div className="curtain-surface" aria-hidden="true" />
    <button className="sidebar-mobile-collapse" aria-label="收起项目详情" onClick={requestClose}>‹</button>
    <div className="sidebar-scroll">
    <button className="sidebar-close" onClick={requestClose} aria-label="关闭项目详情" autoFocus>×</button>
    <div className="sidebar-content">
      <h2 id="sidebar-title">{project.name} <span>{project.english}</span></h2>
      <p className="sidebar-category">{project.category}</p>
      <p className="sidebar-introduction">{project.introduction}</p>
      {project.id === 'experiments' ? <ExperimentMedia files={files} /> : files.length > 0 && <section className="case-study-images" aria-label="项目图片">{files.map(([file, src]) => <Media key={file} file={file} src={src} priority={file === firstImage} alt={`${project.name}项目展示`} />)}</section>}
      <section className="design-highlights"><h3>设计亮点</h3><ul>{project.highlights.map(item => <li key={item}>{item}</li>)}</ul></section>
      {project.tools.length > 0 && <p className="project-tools">{project.tools.join(' / ')}</p>}
      {project.id !== 'experiments' && project.id !== 'muse' && project.id !== 'yugeng' && <footer className="sidebar-footer">{project.url ? <a className="external-link" href={project.url} target="_blank" rel="noopener noreferrer">{project.linkLabel}<span aria-hidden="true">↗</span></a> : <button className="external-link" disabled>{project.linkLabel} · 待添加<span aria-hidden="true">↗</span></button>}</footer>}
    </div>
    </div>
  </dialog>;
}

function Media({ file, src, alt, priority = false }) {
  const [width, height] = caseStudyDimensions[file] || [];
  return isVideo(file)
    ? <video className={`project-video${['../../assets/projects/shunshi/4.core interaction（改）.mp4', '../../assets/projects/shunshi/5.core interaction2.mp4'].includes(file) ? ' project-video-image-width' : ''}`} src={src} autoPlay loop muted playsInline preload="metadata" aria-label={alt} />
    : <img className="project-image" src={src} alt={alt} width={width} height={height} decoding="async" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />;
}

function ExperimentMedia({ files }) {
  const groups = [
    ['品牌探索', files.filter(([file]) => /[\\/]branding[\\/]/i.test(file))],
    ['动态探索', files.filter(([file]) => /[\\/]motion[\\/]([12])\./i.test(file))],
    ['交互探索', files.filter(([file]) => /[\\/]motion[\\/]3\./i.test(file))],
    ['三维探索', files.filter(([file]) => /[\\/]motion[\\/]4\./i.test(file))],
  ];
  const firstImage = groups.flatMap(([, media]) => media).find(([file]) => !isVideo(file))?.[0];
  return <section className="experiment-media">{groups.map(([title, media]) => media.length > 0 && <section className="experiment-group" key={title}><h3>{title}</h3>{media.map(([file, src]) => <Media key={file} file={file} src={src} priority={file === firstImage} alt={`Experiments ${title}`} />)}</section>)}</section>;
}
