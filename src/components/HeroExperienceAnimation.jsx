import React, { useLayoutEffect, useRef, useId } from 'react';
import { gsap } from 'gsap';
import { asset } from '../data/assets';
import ideasSource from '../../assets/hero/hero-text-ideas.svg?raw';
import experiencesSource from '../../assets/hero/hero-text-experiences.svg?raw';
import mobileIntoSource from '../../assets/hero/Hero-mobile-text-into.svg?raw';
import mobileExperiencesSource from '../../assets/hero/Hero-mobile-text-experience.svg?raw';
import islandSource from '../../assets/hero/island.svg?raw';
import { svgPaths, sampleContours, bounds, curve, clamp, mix, smooth, waterSurface } from './heroLiquidGeometry';
import './HeroExperienceAnimation.css';
import pinHeroRipple from './pinHeroRipple';

const ideas = svgPaths(ideasSource);
const experiences = svgPaths(experiencesSource);
// The first path in the provided EXPERIENCES artwork is the vertical caret.
const textPaths = [...ideas.map(d => ({ d, row: 0 })), ...experiences.slice(1).map(d => ({ d, row: 1 }))];
const mobileTextPaths = [...ideas.map(d => ({ d, row: 0 })), ...svgPaths(mobileIntoSource).map(d => ({ d, row: 1 })), ...svgPaths(mobileExperiencesSource).map(d => ({ d, row: 2 }))];
const islands = svgPaths(islandSource);
// Exact apertures from window-open.svg, reused as the container boundary.
const aperture = 'M19.0176 162.92H93.8867C97.5604 145.248 122.081 130.971 122.157 130.927C122.103 130.901 82.6992 112.057 80.0898 79.875H19.0176Z M19.0176 55.1523H122.982V25.3574H19.0176Z';

export default function HeroExperienceAnimation({ ready, handoff }) {
  const root = useRef(null);
  const readyRef = useRef(ready);
  const handoffRef = useRef(handoff);
  const playback = useRef(null);
  const hasEnteredCreativeWorld = useRef(false);
  const unique = useId().replace(/:/g, '');
  const clipId = `window-aperture-${unique}`;
  const filterId = `text-liquid-${unique}`;

  useLayoutEffect(() => {
    const element = root.current;
    const svg = element.querySelector('.experience-scene');
    const pinnedRipple = pinHeroRipple(svg);
    const windowSvg = element.querySelector('.experience-window-scene');
    const about = document.getElementById('about');
    let glyphElements = [], glyphs = [], textMode = null;
    let mobileIntoGroup = null, mobileIntoBounds = null, lastIntoX = null;
    const glyphCache = new Map();
    const islandElements = [...element.querySelectorAll('.flow-island')];
    const outflowGroup = element.querySelector('.experience-outflow');
    const islandExclusion = element.querySelector('.island-window-exclusion');
    const islandMaskBounds = element.querySelector('.island-mask-bounds');
    const windowGroup = element.querySelector('.experience-window-group');
    const moon = element.querySelector('.experience-moon');
    const loopMoon = element.querySelector('.content-loop-moon');
    let loopStarted = false;
    const loopState = { y: 180, x: 0 };
    const moonLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .35, onUpdate: () => loopMoon.setAttribute('transform', `translate(${loopState.x} ${loopState.y})`) })
      .to(loopState, { y: -55, duration: 4.8, ease: 'none' }, 0)
      .to(loopState, { x: 2.5, duration: 2.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
    loopMoon.setAttribute('transform', 'translate(0 180)');
    const water = element.querySelector('.contained-water');
    const nightFrame = element.querySelector('.window-night-mask');
    const nightReveal = element.querySelector('.night-reveal');
    const textGroup = element.querySelector('.liquid-typography');
    const name = element.querySelector('h1');
    const nameCaret = element.querySelector('.experience-name-caret');
    const caret = element.querySelector('.experience-svg-caret');
    const blur = element.querySelector('feGaussianBlur');
    const displacement = element.querySelector('feDisplacementMap');
    const revealRect = element.querySelector('.type-reveal');
    const notes = element.querySelector('.experience-end-notes');
    const noteBlocks = [...notes.children];
    const islandContours = islands.map(d => sampleContours(d, 210));
    const state = { position: 0, reveal: 0, soften: 0, flow: 0, fill: 0, expand: 0, escape: 0, outflow: 0, nameSize: 0, notes: 0, final: 0 };
    const size = { width: 1440, height: 900 };
    const start = { x: null, y: null, scale: 1 };
    let time = 0, inView = true, disposed = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let timeline;
    let blackLatched = false, blackCoverage = 0;
    let lastHeroTime = 0;
    let islandWindowDeparting = false;
    let protectedFilterState = '', settledIslandSize = '';
    let scrollTween, floatTween;
    let returning = false, holdIntro = false, docked = false;
    const float = { y: 0 };
    const windowButton = element.querySelector('.experience-window-return');

    function draw() {
      const { width: w, height: h } = size;
      const s = Math.min(w * .95 / 1290, h * .42 / 364);
      const textX = w / 2 - 675 * s;
      const experienceY = h * .53;
      const mobileWindow = innerWidth <= 768;
      const smallWidth = Math.min(Math.max(w * .10, 72), h * .22) * (mobileWindow ? .58 : 1);
      const finalWidth = Math.min(Math.max(w * .14, 112), h * .31) * (mobileWindow ? .62 : 1);
      const mobileTextScale = (w - 48) / 1131;
      const mobileIntoY = h * .48;
      const mobileIntoX = mobileWindow && mobileIntoBounds ? 24 - mobileIntoBounds.minX * mobileTextScale : 0;
      if (mobileIntoGroup && mobileIntoX !== lastIntoX) {
        lastIntoX = mobileIntoX;
        mobileIntoGroup.setAttribute('transform', `translate(${mobileIntoX} 0)`);
      }
      const smallHeight = smallWidth * 189 / 142;
      // One parent transform binds the frame, water and moon throughout expansion.
      const windowScale = mix(mix(start.scale, smallWidth / 142, state.position), finalWidth / 142, state.expand);
      const smallCenterY = mobileWindow ? mobileIntoY + 124 * mobileTextScale + 24 + smallHeight / 2 : experienceY + 269 * s;
      const centerY = mix(mix(start.y ?? h / 2, smallCenterY, state.position), h * .55, state.expand);
      const centerX = mix(mix(start.x ?? w / 2, textX + 675 * s, state.position), w / 2, state.expand);
      const wx = centerX - 71 * windowScale, wy = centerY - 94.5 * windowScale;
      windowGroup.setAttribute('transform', `translate(${wx} ${wy}) scale(${windowScale})`);
      // Exclude the whole moving window from the island layer, independently of
      // the later black-background reveal. Water and moon remain above this mask.
      const flowingOut = state.outflow > 0 && state.expand === 1 && state.flow === 1 && state.fill === 1;
      outflowGroup.setAttribute('visibility', flowingOut ? 'visible' : 'hidden');
      // Keep the original window group in a fixed SVG while the paper covers Hero.
      const scroll = Math.max(0, -element.getBoundingClientRect().top);
      const progress = clamp(scroll / h);
      const heroTime = timeline?.time() ?? 0;
      if (heroTime === 0 && lastHeroTime > 0 && scroll < 1 && !returning) {
        blackLatched = false; blackCoverage = 0;
        islandWindowDeparting = false;
      }
      lastHeroTime = heroTime;
      const cover = reduced.matches ? progress : 1 - Math.pow(1 - progress, 2);
      const travel = smooth(cover);
      const dockWidth = w < 600 ? 45 : Math.min(111, Math.max(55, w * .077));
      const dockScale = dockWidth / 142;
      const dockX = w < 600 ? 20 : w * .02;
      const dockY = w < 600 ? 20 : innerHeight * .04;
      const dockedY = dockY + float.y;
      const canReturn = progress >= .99;
      windowButton.style.pointerEvents = canReturn ? 'all' : 'none';
      windowButton.setAttribute('tabindex', canReturn ? '0' : '-1');
      windowButton.setAttribute('aria-hidden', String(!canReturn));
      const movingX = mix(wx, dockX, travel);
      const movingY = mix(wy, dockedY, travel) - scroll * (1 - travel) * .25;
      const movingScale = mix(windowScale, dockScale, travel);
      windowGroup.setAttribute('transform', `translate(${movingX} ${movingY}) scale(${movingScale})`);
      // The exclusion uses Hero-local coordinates; the persistent frame is fixed.
      // Once the island is complete and the window departs, its own black asset
      // provides the cover. There must be no hole left at the old Hero center.
      islandExclusion.setAttribute('x', movingX);
      islandExclusion.setAttribute('y', movingY + scroll);
      islandExclusion.setAttribute('width', state.outflow === 1 && (scroll > 0 || islandWindowDeparting) ? 0 : 142 * movingScale);
      islandExclusion.setAttribute('height', 189 * movingScale);
      windowSvg.style.visibility = readyRef.current ? 'visible' : 'hidden';
      // The escaped moon leaves with Hero; it never becomes a second-page logo.
      moon.style.opacity = 1 - progress;
      element.querySelector('.experience-transition-backdrop').style.visibility = scroll < h ? 'visible' : 'hidden';
      about.style.transform = scroll < h ? `translateY(${scroll - h}px)` : '';
      about.style.clipPath = scroll < h ? `inset(0 0 ${(1 - cover) * 100}% 0)` : 'none';
      const inlet = { x: wx + 77 * windowScale, y: wy + 133 * windowScale };
      moon.setAttribute('cx', mix(80.874, (w * .64 - wx) / windowScale, state.escape));
      const moonY = h * (w < 600 ? .39 : .25);
      moon.setAttribute('cy', mix(113.331, (moonY - wy) / windowScale, state.escape) + Math.sin(time * .52) * 2 * state.escape);
      moon.setAttribute('r', mix(25.033, Math.min(w * .032, h * .055) / windowScale, state.escape));
      water.setAttribute('d', waterSurface(state.fill * (1 - state.outflow), time, state.expand));
      water.setAttribute('visibility', state.fill > 0 ? 'visible' : 'hidden');
      // Content navigation never clears the creative-world state. Only an
      // actual Hero reverse crossing the original reveal boundary may reset it.
      if (returning && scroll < 1 && state.outflow === 0) blackLatched = false;
      else if (readyRef.current && state.outflow > 0) {
        hasEnteredCreativeWorld.current = true;
        blackLatched = true;
      } else if (readyRef.current && hasEnteredCreativeWorld.current && progress >= .99) blackLatched = true;
      const inContent = progress >= .99;
      loopMoon.style.visibility = inContent ? 'visible' : 'hidden';
      if (inContent && !loopStarted) { loopStarted = true; if (!reduced.matches) moonLoop.play(); }
      if (reduced.matches) { moonLoop.pause(); loopMoon.setAttribute('transform', 'translate(0 85)'); }
      else if (loopStarted && !document.hidden && moonLoop.paused()) moonLoop.play();
      const heroReveal = state.outflow > 0 ? smooth(state.outflow * 3) : 1;
      const reversingHero = returning && scroll < 1;
      blackCoverage = !blackLatched ? 0 : reversingHero ? heroReveal : Math.max(blackCoverage, inContent ? 1 : heroReveal);
      nightFrame.setAttribute('visibility', blackLatched ? 'visible' : 'hidden');
      nightReveal.setAttribute('height', 189 * blackCoverage);
      const protectedSeam = blackLatched && blackCoverage > 0 && state.outflow > 0 && !islandWindowDeparting && scroll < 1;
      const protectionState = `${w}:${h}:${protectedSeam}`;
      if (protectionState !== protectedFilterState) {
        protectedFilterState = protectionState;
        pinnedRipple.update({ w, h, active: protectedSeam });
      }
      if (scroll >= h) return; // Offscreen Hero glyph/island geometry need not be rebuilt on content scroll.
      // Reveal all three blocks together, rather than a top-to-bottom wipe.
      revealRect.setAttribute('height', h);
      textGroup.style.opacity = state.reveal;
      caret.setAttribute('transform', `translate(${textX} ${experienceY}) scale(${s})`);
      caret.style.visibility = 'hidden';
      nameCaret.style.visibility = state.flow === 1 && state.fill === 1 ? 'visible' : 'hidden';
      textGroup.setAttribute('filter', state.soften > 0 && state.flow < 1 ? `url(#${filterId})` : 'none');
      textGroup.setAttribute('visibility', state.flow === 1 && state.fill === 1 ? 'hidden' : 'visible');
      blur.setAttribute('stdDeviation', state.soften * 2.5);
      displacement.setAttribute('scale', state.soften * 5 * (1 - state.flow * .7));

      glyphs.forEach((glyph, index) => {
        if (state.flow === 1 && state.fill === 1) return; // Already submerged beneath the contained water.
        const path = glyphElements[index];
        const glyphScale = mobileWindow && glyph.row > 0 ? mobileTextScale : s;
        const tx = glyph.row === 0 ? (w - 1086 * s) / 2 : mobileWindow ? glyph.row === 1 ? mobileIntoX : 24 : textX + 1;
        const wrapperX = mobileWindow && glyph.row === 1 ? mobileIntoX : 0;
        const ty = glyph.row === 0 ? h * .315 : mobileWindow ? glyph.row === 1 ? mobileIntoY : smallCenterY + smallHeight / 2 + 24 : experienceY;
        if (state.soften === 0 && state.flow === 0) {
          path.setAttribute('d', glyph.d);
          path.setAttribute('transform', `translate(${tx - wrapperX} ${ty}) scale(${glyphScale})`);
          return;
        }
        path.removeAttribute('transform');
        // All points of a glyph share the same accelerating suction progress.
        const flow = state.flow;
        const box = glyph.box;
        path.setAttribute('d', glyph.contours.map((contour, ci) => curve(contour.map((point, pi) => {
          const lower = clamp((point.y - box.minY) / Math.max(1, box.maxY - box.minY));
          const stretch = Math.pow(lower, 2.7) * state.soften * (24 + 30 * (.5 + .5 * Math.sin(index * 2.7)));
          const originalX = tx + point.x * glyphScale + Math.sin(point.y * .035 + time * .45) * lower * state.soften * 4;
          const originalY = ty + (point.y + stretch) * glyphScale;
          const angle = pi / contour.length * Math.PI * 2;
          const radius = ci === 0 ? (7 + (index % 4) * 2) * windowScale : (1 - flow) * 2;
          const dropletX = inlet.x + Math.cos(angle) * radius;
          const dropletY = inlet.y + Math.sin(angle) * radius * 1.2;
          const shapeBlend = flow * flow;
          const glyphCenterX = tx + (box.minX + box.maxX) * glyphScale / 2;
          const glyphCenterY = ty + (box.minY + box.maxY) * glyphScale / 2;
          const liquidRadius = ci === 0 ? Math.max(8, (box.maxX - box.minX) * glyphScale * .32) : (1 - shapeBlend) * 2;
          const liquidX = glyphCenterX + Math.cos(angle) * liquidRadius;
          const liquidY = glyphCenterY + Math.sin(angle) * (box.maxY - box.minY) * glyphScale * .6;
          const softenedX = mix(originalX, liquidX, shapeBlend);
          const softenedY = mix(originalY, liquidY, shapeBlend);
          const bend = Math.sin(flow * Math.PI) * Math.sin(index * 1.9) * w * .035;
          return { x: mix(softenedX, dropletX, flow) + bend - wrapperX, y: mix(softenedY, dropletY, flow) };
        }))).join(' '));
      });

      const islandScale = Math.min(w * .86 / 1227, h * .79 / 701);
      const ix = (w - 1227 * islandScale) / 2, iy = h * .55 - 701 * islandScale / 2;
      const outlet = { x: wx + 138 * windowScale, y: wy + 135 * windowScale };
      const islandSize = `${w}:${h}`;
      if (state.outflow < 1) settledIslandSize = '';
      if (settledIslandSize !== islandSize) islandContours.forEach((contours, index) => {
        const path = islandElements[index];
        path.setAttribute('visibility', flowingOut ? 'visible' : 'hidden');
        if (!flowingOut) return;
        path.setAttribute('d', contours.map(contour => curve(contour.map((point, pi) => {
          const tx = ix + point.x * islandScale, ty = iy + point.y * islandScale;
          const distance = Math.min(1, Math.hypot(tx - inlet.x, ty - inlet.y) / (w * .6));
          const arrival = smooth((state.outflow - distance * .2) / (1 - distance * .2));
          const angle = pi / contour.length * Math.PI * 2;
          const ripple = Math.sin(angle * 3 + time * .31) * (3 + 14 * Math.sin(arrival * Math.PI));
          // The formation ripple reaches zero within the original reveal.
          // The exact same geometry is then retained; pointer displacement is
          // supplied separately by the existing, protected mouse filter.
          const motionGain = 1 - smooth((arrival - .85) / .15);
          return { x: mix(outlet.x + Math.cos(angle) * 9, tx, arrival) + Math.sin(angle * 2 + time * .25) * 3 * arrival * motionGain,
            y: mix(outlet.y + Math.sin(angle) * 5, ty, arrival) + ripple * arrival * motionGain };
        }))).join(' '));
      });
      if (state.outflow === 1) settledIslandSize = islandSize;
      name.style.fontSize = `${mix(Math.min(w * .112, h * .18), w * .072, state.nameSize)}px`;
      name.style.clipPath = 'none';
      name.style.opacity = state.reveal;
      notes.style.visibility = state.notes > 0 ? 'visible' : 'hidden';
      noteBlocks.forEach(block => {
        block.style.opacity = state.notes;
        block.style.transform = `translateY(${12 * (1 - state.notes)}px)`;
      });
      element.dataset.stage = state.outflow >= 1 ? 'final' : state.outflow > 0 ? 'islands' : state.escape > 0 ? 'moon-escape' : state.expand > 0 ? 'expansion' : state.fill >= 1 ? 'filled' : state.flow > 0 ? 'inflow' : state.soften > 0 ? 'melting' : state.reveal > 0 ? 'typography' : 'positioning';
      element.dataset.fill = state.fill.toFixed(3);
    }
    function measure() {
      const mobile = innerWidth <= 768;
      if (textMode !== mobile) {
        textMode = mobile;
        if (!glyphCache.has(mobile)) glyphCache.set(mobile, (mobile ? mobileTextPaths : textPaths).map(item => {
          const contours = sampleContours(item.d); return { ...item, contours, box: bounds(contours) };
        }));
        glyphs = glyphCache.get(mobile);
        const fragment = document.createDocumentFragment();
        mobileIntoGroup = mobile ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : null;
        mobileIntoBounds = mobile ? { minX: Math.min(...glyphs.filter(glyph => glyph.row === 1).map(glyph => glyph.box.minX)), maxX: Math.max(...glyphs.filter(glyph => glyph.row === 1).map(glyph => glyph.box.maxX)) } : null;
        lastIntoX = null;
        if (mobileIntoGroup) { mobileIntoGroup.setAttribute('class', 'mobile-into-position'); fragment.append(mobileIntoGroup); }
        glyphElements = glyphs.map(glyph => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('class', 'liquid-glyph'); path.setAttribute('d', glyph.d);
          path.setAttribute('data-text-row', glyph.row);
          (mobile && glyph.row === 1 ? mobileIntoGroup : fragment).append(path); return path;
        });
        textGroup.replaceChildren(fragment);
      }
      const rect = element.getBoundingClientRect();
      size.width = rect.width; size.height = rect.height;
      const finalWidth = Math.min(Math.max(rect.width * .14, 112), rect.height * .31) * (mobile ? .62 : 1);
      const finalHeight = finalWidth * 189 / 142;
      pinnedRipple.prepare({ x: (rect.width - finalWidth) / 2, y: rect.height * .55 - finalHeight / 2,
        width: finalWidth, height: finalHeight, w: rect.width, h: rect.height });
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      windowSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      windowSvg.style.height = `${rect.height}px`;
      revealRect.setAttribute('width', rect.width);
      islandMaskBounds.setAttribute('width', rect.width);
      islandMaskBounds.setAttribute('height', rect.height);
      draw();
    }
    function floatWindow() {
      if (reduced.matches || returning) return;
      floatTween?.kill();
      floatTween = gsap.timeline({ onUpdate: draw }).to(float, { y: -4, duration: .35, ease: 'sine.out' }).to(float, { y: 0, duration: .65, ease: 'sine.inOut' });
    }
    function returnHome() {
      if (returning || document.documentElement.dataset.scrollTransitioning === 'true') return;
      returning = true; holdIntro = true; timeline.pause();
      floatTween?.kill(); float.y = 0;
      window.dispatchEvent(new CustomEvent('section-request', { detail: { id: 'hero', after: () => new Promise(resolve => {
        history.replaceState(null, '', '#hero');
        scrollTween = timeline.tweenTo(1, { duration: reduced.matches ? 0 : 1.1, ease: 'power2.inOut', onComplete: () => {
          returning = false; name.setAttribute('tabindex', '-1'); name.focus({ preventScroll: true }); resolve();
        } });
      }) } }));
    }
    function onKey(event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); returnHome(); }
    }
    function onScroll() {
      draw();
      if (holdIntro && !returning && scrollY > 5) { holdIntro = false; syncPlayback(); }
    }
    function onTransitionStart() {
      const { scrollIndex, scrollTarget } = document.documentElement.dataset;
      islandWindowDeparting = scrollIndex === '0' && Number(scrollTarget) > 0;
      if (scrollIndex === '0' && Number(scrollTarget) > 0 && hasEnteredCreativeWorld.current && !returning) {
        blackLatched = true; blackCoverage = 1;
        draw(); // Restore the preloaded black layer before the first movement frame.
      }
    }
    function onSettled(event) {
      if (event.detail.id !== 'hero' && readyRef.current) {
        hasEnteredCreativeWorld.current = true;
        blackLatched = true; blackCoverage = 1;
        draw();
      }
      if (event.detail.id === 'about') floatWindow();
    }
    window.addEventListener('section-transition-start', onTransitionStart);
    window.addEventListener('section-settled', onSettled);
    windowButton.addEventListener('click', returnHome);
    windowButton.addEventListener('keydown', onKey);
    windowButton.addEventListener('pointerenter', floatWindow);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('section-progress', draw);
    const resize = new ResizeObserver(measure);
    resize.observe(element); measure();
    const context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, onUpdate: draw, defaults: { ease: 'sine.inOut' } });
      timeline.addLabel('position', 0).to(state, { position: 1, duration: .85 }, 'position');
      timeline.addLabel('intact-type', .25).to(state, { reveal: 1, duration: .65 }, 'intact-type');
      timeline.addLabel('soften', 1.2).to(state, { soften: 1, duration: 1.3 }, 'soften');
      timeline.to(state, { nameSize: 1, duration: 1.3 }, 'soften');
      timeline.addLabel('inflow', 2.55).to(state, { flow: 1, duration: 1.05, ease: 'power3.in' }, 'inflow');
      timeline.to(state, { fill: 1, duration: 1.05, ease: 'power2.in' }, 2.7);
      timeline.addLabel('filled-hold', 4.2);
      timeline.addLabel('expansion', 4.25).to(state, { expand: 1, duration: 2.5 }, 'expansion');
      timeline.to(state, { notes: 1, duration: 1.15 }, 'expansion');
      // One final event, after the unchanged window rise: moon, drainage and islands.
      timeline.addLabel('moon-escape', 6.75).to(state, { escape: 1, duration: 1, ease: 'power3.out' }, 'moon-escape');
      timeline.addLabel('outflow', 6.75).to(state, { outflow: 1, duration: 1, ease: 'power3.out' }, 'outflow');
      timeline.set(state, { final: 1 }, 7.75);
    }, root);
    function tick(_elapsed, delta) {
      if (!readyRef.current || !inView || document.hidden || disposed || reduced.matches) return;
      time += Math.min(delta / 1000, .05);
      if (!timeline.isActive()) draw(); // Active frames are painted by timeline.onUpdate.
    }
    const syncPlayback = () => {
      if (document.hidden || reduced.matches) moonLoop.pause();
      else if (loopStarted) moonLoop.play();
      if (!readyRef.current || holdIntro) return;
      if (reduced.matches) { timeline.progress(1); draw(); }
      else if (inView && !document.hidden) timeline.play();
      else timeline.pause();
    };
    playback.current = () => {
      const frame = handoffRef.current;
      if (readyRef.current && frame && timeline.time() === 0) {
        const rect = element.getBoundingClientRect();
        start.x = frame.left + frame.width / 2 - rect.left;
        start.y = frame.top + frame.height / 2 - rect.top;
        start.scale = frame.width / 142;
      }
      measure();
      syncPlayback();
    };
    const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncPlayback(); }, { threshold: .01 });
    visibility.observe(element);
    document.addEventListener('visibilitychange', syncPlayback);
    reduced.addEventListener('change', syncPlayback);
    gsap.ticker.add(tick); syncPlayback();
    // Component-local handles allow precise visual keyframe verification.
    element.contentMoonTimeline = moonLoop; element.heroTimeline = timeline; element.heroRender = draw;
    return () => {
      pinnedRipple.dispose();
      scrollTween?.kill(); floatTween?.kill(); moonLoop.kill();
      windowButton.removeEventListener('click', returnHome);
      windowButton.removeEventListener('keydown', onKey);
      windowButton.removeEventListener('pointerenter', floatWindow);
      window.removeEventListener('section-settled', onSettled);
      window.removeEventListener('section-transition-start', onTransitionStart);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('section-progress', draw);
      about.style.transform = ''; about.style.clipPath = '';
      disposed = true; resize.disconnect(); visibility.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      reduced.removeEventListener('change', syncPlayback);
      gsap.ticker.remove(tick); context.revert();
      playback.current = null;
      delete element.contentMoonTimeline; delete element.heroTimeline; delete element.heroRender;
    };
  }, [filterId]);

  // Starting playback must not resample paths or recreate the prepared timeline.
  useLayoutEffect(() => {
    readyRef.current = ready;
    handoffRef.current = handoff;
    playback.current?.();
  }, [ready, handoff]);

  return <div ref={root} className="hero-experience-animation" data-stage="positioning">
    <div className="experience-transition-backdrop" aria-hidden="true" />
    <h1 id="hero-title">PAN YIRAN <span className="experience-name-caret" aria-hidden="true">|</span></h1>
    <svg className="experience-scene" role="img" aria-label="I TURN IDEAS INTO EXPERIENCES：文字融化成水流，汇入窗户并展开成为创意岛屿">
      <defs>
        <mask id={`${unique}-island-exclusion`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{ maskType: 'luminance' }}>
          <rect className="island-mask-bounds" width="1440" height="900" fill="white" />
          <rect className="island-window-exclusion" fill="black" />
        </mask>
        <clipPath id={clipId}><path d={aperture} /></clipPath>
        <clipPath id={`${unique}-night-reveal`}><rect className="night-reveal" width="142" height="0" /></clipPath>
        <clipPath id={`${unique}-type-reveal`}><rect className="type-reveal" width="1440" height="0" /></clipPath>
        <filter id={filterId} x="-15%" y="-25%" width="130%" height="170%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".012 .025" numOctaves="2" seed="9" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -7" />
        </filter>
      </defs>
      <g className="experience-outflow" visibility="hidden" mask={`url(#${unique}-island-exclusion)`} fill="#F0EEE1">{islands.map((d, i) => <path className="flow-island" key={i} d={d} visibility="hidden" />)}</g>
      <g clipPath={`url(#${unique}-type-reveal)`}>
        <g className="liquid-typography" fill="#F0EEE1">{textPaths.map((item, i) => <path className="liquid-glyph" key={i} d={item.d} />)}</g>
        <path className="experience-svg-caret" d={experiences[0]} fill="#F0EEE1" />
      </g>
    </svg>
    <svg className="experience-window-scene">
      <g className="experience-window-group">
        <circle className="experience-moon" cx="80.874" cy="113.331" r="25.033" fill="#F0EEE1" />
        <g clipPath={`url(#${clipId})`}><path className="contained-water" fill="#F0EEE1" visibility="hidden" /></g>
        <image className="experience-open-window" href={asset('hero/window-open.svg')} width="142" height="189" />
        <image className="window-night-mask" clipPath={`url(#${unique}-night-reveal)`} href={asset('hero/window-night.svg')} width="142" height="189" visibility="hidden" />
        <g clipPath={`url(#${clipId})`} pointerEvents="none"><image className="content-loop-moon" href={asset('hero/moon.svg')} x="55" y="0" width="50" height="50" visibility="hidden" /></g>
        <rect className="experience-window-return" width="142" height="189" fill="transparent" role="button" aria-label="返回 Hero 首页" tabIndex="-1" />
      </g>
    </svg>
    <div className="experience-end-notes"><p>LET<br /><span>EXPERIENCES</span><br /><br />TAKE<br />SHAPE</p><a href="#about"><span>IDEAS</span><br />　FLOW ↓</a></div>
  </div>;
}
