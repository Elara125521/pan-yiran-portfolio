import React, { useId, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './Contact.css';
import { asset } from '../data/assets';

// Contact details from reference/contact.jpg.
export default function Contact() {
  const root = useRef(null);
  const routeMask = `contact-route-${useId().replace(/:/g, "")}`;
  useLayoutEffect(() => {
    const section = root.current;
    const stage = section.querySelector('.contact-stage');
    const wave = section.querySelector('.contact-wave path');
    const route = section.querySelector('.contact-route-line');
    const routeReveal = section.querySelector('.contact-route-reveal');
    const icons = [...section.querySelectorAll('.contact-symbol img')];
    const wobbleTweens = new Map();
    let width, height, headingTop, nodes = [], from = 0, top = 0, lastProgress = -1;
    const clamp = value => Math.max(0, Math.min(1, value));
    function measure() {
      width = section.clientWidth; height = stage.offsetHeight;
      const box = stage.getBoundingClientRect();
      const title = section.querySelector('h2').getBoundingClientRect();
      headingTop = title.top - box.top;
      const last = document.querySelector('.project-island:last-child').getBoundingClientRect();
      from = last.top + scrollY + last.height / 2 - innerHeight / 2;
      top = section.offsetTop;
      lastProgress = -1;
      nodes = icons.map(icon => { const r = icon.getBoundingClientRect(); return { x: r.left + r.width * .78 - box.left, top: r.top - box.top, bottom: r.bottom - box.top }; });
      section.querySelectorAll('.contact-wave, .contact-route').forEach(svg => svg.setAttribute('viewBox', `0 0 ${width} ${height}`));
      // Contact-only route: stop beside each icon, never above ADDRESS.
      let d = '';
      nodes.slice(1).forEach((node, i) => {
        const previous = nodes[i];
        const start = previous.bottom + 5, end = node.top - 5;
        const mid = (start + end) / 2;
        d += ` M ${previous.x} ${start} C ${previous.x + 16} ${mid}, ${node.x + 20} ${mid}, ${node.x} ${end}`;
      });
      routeReveal.setAttribute('d', d);
      route.setAttribute('d', d);
      draw();
    }
    function draw(event) {
      if (!height) return;
      if (event?.type === 'scroll' && document.documentElement.dataset.scrollTransitioning === 'true') return;
      const yScroll = event?.detail?.y ?? scrollY;
      const progress = clamp((yScroll - from) / Math.max(1, top - from));
      if (progress === lastProgress) return;
      lastProgress = progress;
      section.dataset.contactProgress = progress.toFixed(3);
      // Read-only companion to the single scroll controller; no extra duration.
      stage.style.transform = `translate3d(0, ${Math.min(0, Math.max(from, yScroll) - top)}px, 0)`;
      const edgeY = height * progress, edgeBend = Math.sin(progress * Math.PI) * 28;
      stage.style.clipPath = progress < 1 ? `path('M0 0 H${width} V${edgeY} C${width * .7} ${edgeY - edgeBend}, ${width * .4} ${edgeY + edgeBend}, 0 ${edgeY} Z')` : 'none';
      const deformation = Math.sin(progress * Math.PI) * 14;
      const y = headingTop + (width < 901 ? -25 : 65);
      wave.setAttribute('d', `M0 0 H${width} V${y + 45 + deformation * .5} C${width * .84} ${y + 80}, ${width * .7} ${y - 65 - deformation}, ${width * .52} ${y - 48} C${width * .4} ${y - 37 + deformation}, ${width * .2} ${y - 10}, 0 ${Math.max(0, y - 105)} Z`);
      routeReveal.style.strokeDashoffset = 1 - progress;
    }
    function enter(event) {
      const icon = event.currentTarget;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      wobbleTweens.get(icon)?.kill();
      const tween = gsap.timeline().to(icon, { rotation: 2, x: 7, y: -2, duration: .13, ease: 'sine.out' })
        .to(icon, { rotation: -1.5, x: 3, y: 1, duration: .14, ease: 'sine.inOut' })
        .to(icon, { rotation: .5, x: 5.5, y: -.5, duration: .1, ease: 'sine.inOut' })
        .to(icon, { rotation: 0, x: 5, y: 0, duration: .13, ease: 'sine.out' });
      wobbleTweens.set(icon, tween);
    }
    function mobileIconLoaded() { if (innerWidth <= 768) measure(); }
    icons.forEach(icon => { icon.addEventListener('pointerenter', enter); icon.addEventListener('load', mobileIconLoaded); });
    const resize = new ResizeObserver(measure); resize.observe(stage);
    window.addEventListener('scroll', draw, { passive: true });
    window.addEventListener('section-progress', draw);
    measure();
    return () => { resize.disconnect(); window.removeEventListener('scroll', draw); window.removeEventListener('section-progress', draw); icons.forEach(icon => { icon.removeEventListener('pointerenter', enter); icon.removeEventListener('load', mobileIconLoaded); wobbleTweens.get(icon)?.kill(); }); };
  }, []);
  return <section ref={root} id="contact" data-observe className="contact" aria-labelledby="contact-title">
    <div className="contact-stage">
    <h2 id="contact-title">LET’S CREATE<br />SOMETHING<br />TOGETHER.</h2>
    <address className="contact-links">
      <div className="contact-row"><span className="contact-symbol"><img src={asset('content/contact/address-island.svg')} alt="" /></span><span className="contact-value">成都</span></div>
      <a className="contact-row" href="mailto:3076126564@qq.com"><span className="contact-symbol"><img src={asset('content/contact/email-island.svg')} alt="" /></span><span className="contact-value">3076126564@qq.com</span></a>
      <a className="contact-row" href="tel:+8618867337200"><span className="contact-symbol"><img src={asset('content/contact/phone-island.svg')} alt="" /></span><span className="contact-value">18867337200</span></a>
    </address>
    <svg className="contact-wave" aria-hidden="true"><path /></svg>
    <svg className="contact-route" aria-hidden="true"><defs><mask id={routeMask} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><path className="contact-route-reveal" pathLength="1" /></mask></defs><path className="contact-route-line" mask={`url(#${routeMask})`} /></svg>
    </div>
  </section>;
}
