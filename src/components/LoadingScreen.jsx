import React, { useCallback, useEffect, useRef, useState } from 'react';
import { asset } from '../data/assets';
import { preloadCriticalAssets } from '../data/criticalAssets';

const logos = ['shunshi', 'sanshan', 'yugeng', 'eat', 'muse'];
export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [introAnimationComplete, setIntroAnimationComplete] = useState(false);
  const [criticalAssetsReady, setCriticalAssetsReady] = useState(false);
  const frame = useRef(null);
  const finish = useCallback(() => {
    const rect = frame.current?.getBoundingClientRect();
    onComplete(rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null);
  }, [onComplete]);
  useEffect(() => {
    const controller = new AbortController();
    preloadCriticalAssets(controller.signal).then(() => {
      if (!controller.signal.aborted) setCriticalAssetsReady(true);
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const times = reduced ? [0, 0, 0, 0, 0, 0, 100, 200] : [450, 1050, 1650, 2250, 2850, 3450, 4000];
    const timers = times.map((time, i) => setTimeout(() => setPhase(i + 1), time));
    // Hand off as soon as the .45s opening completes, without the former idle hold.
    const completion = setTimeout(() => setIntroAnimationComplete(true), reduced ? 350 : 4450);
    return () => { timers.forEach(clearTimeout); clearTimeout(completion); };
  }, []);
  useEffect(() => {
    if (introAnimationComplete && criticalAssetsReady) finish();
  }, [introAnimationComplete, criticalAssetsReady, finish]);
  return <div data-phase={phase} className={`loading-screen ${phase >= 7 ? 'is-night' : ''} ${phase >= 8 && introAnimationComplete && criticalAssetsReady ? 'is-leaving' : ''}`}>
    <div className="loading-center">
      <div className={`loading-window ${phase === 6 ? 'is-closed' : ''}`}>
        <div className="loading-aperture">{logos.map((id, i) => <img key={id} className={`loading-logo ${phase === i + 1 ? 'is-visible' : ''}`} src={asset(`loading/${id}-island.svg`)} alt="" />)}</div>
        <img ref={frame} className="loading-frame" src={asset('loading/window.svg')} alt="" />
        <img className="loading-closed" src={asset('loading/window close.svg')} alt="" />
        {phase >= 7 && <img className="loading-moon" src={asset('loading/moon.svg')} alt="" />}
      </div>
      <p role="status">{phase >= 7 ? '进入创意空间' : '加载中…'}</p>
    </div>
  </div>;
}
