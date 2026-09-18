import React from 'react';
import HeroExperienceAnimation from '../components/HeroExperienceAnimation';

export default function Hero({ ready, handoff }) {
  return <section id="hero" data-observe className="hero experience-host" aria-labelledby="hero-title">
    <HeroExperienceAnimation ready={ready} handoff={handoff} />
  </section>;
}
