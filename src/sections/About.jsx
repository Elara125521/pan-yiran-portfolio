import React, { useRef } from 'react';
import { asset } from '../data/assets';
import usePinnedDecoration from '../components/usePinnedDecoration';

function AboutText() {
  return <><h2>ABOUT ME</h2><p>潘依然</p><p>中国成都的产品设计师</p><p>我通过交互、文化与新兴技术探索数字体验<br />让想法流动并逐渐成形</p><p className="about-skills">UI/UX 设计 · 交互设计 · 视觉设计</p></>;
}

export default function About() {
  const copy = useRef(null);
  const decoration = useRef(null);
  usePinnedDecoration(decoration);
  function moveMoon(event) {
    if (event.pointerType === 'touch') return;
    const rect = copy.current.getBoundingClientRect();
    const heroHeight = document.getElementById('hero').offsetHeight;
    copy.current.style.setProperty('--moon-x', `${event.clientX - rect.left}px`);
    copy.current.style.setProperty('--moon-y', `${event.clientY - rect.top}px`);
    copy.current.style.setProperty('--moon-radius', `${Math.min(innerWidth * .032, heroHeight * .055)}px`);
    copy.current.classList.add('moon-hover');
  }
  return <section id="about" data-observe className="about" aria-labelledby="about-title">
    <div ref={copy} className="about-copy" onPointerMove={moveMoon} onPointerLeave={() => copy.current.classList.remove('moon-hover')}>
      <div id="about-title"><AboutText /></div>
      <div className="about-moon-copy" aria-hidden="true"><AboutText /></div>
    </div>
    <img ref={decoration} className="about-island" src={asset('content/decorate-island.svg')} alt="" />
  </section>;
}
