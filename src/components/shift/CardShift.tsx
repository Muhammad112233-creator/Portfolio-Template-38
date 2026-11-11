'use client';

import { useEffect, useRef, useState } from 'react';
import PersonalCover from '@/components/personal/PersonalCover';
import { gsap, prefersReducedMotion, ScrollTrigger } from '@/lib/scroll';
import { setImmersive } from '@/lib/stage';
import styles from './CardShift.module.scss';

/** Beats, as fractions of the pinned scroll distance (1.65 screens). */
const BEAT = {
  shrunk: 0.17,
  flipFrom: 0.13,
  flipTo: 0.29,
  growFrom: 0.31,
  full: 0.6,
};
const SMALL = 0.47;
const PERSPECTIVE = 1800;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, from: number, to: number) => clamp01((value - from) / (to - from));

export default function CardShift() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;
    if (prefersReducedMotion()) {
      setStill(true);
      setTurned(true);
      return;
    }

    const card = runway.querySelector<HTMLElement>('[data-card]');
    // the front of the card is the Shorts stage itself
    const front = document.querySelector<HTMLElement>('[data-shift-surface]');
    const line = runway.querySelector<HTMLElement>('[data-cover-line]');
    const note = runway.querySelector<HTMLElement>('[data-cover-note]');
    if (!card) return;

    const inOut = gsap.parseEase('power2.inOut');
    const settle = gsap.parseEase('sine.inOut');
    const rise = gsap.parseEase('power3.out');
    const local = { turned: false, immersive: false, folding: false };

    const render = (progress: number, inView: boolean) => {
      const shrink = inOut(range(progress, 0, BEAT.shrunk));
      const flip = inOut(range(progress, BEAT.flipFrom, BEAT.flipTo));
      const grow = settle(range(progress, BEAT.growFrom, BEAT.full));

      const scale = 1 - (1 - SMALL) * shrink + (1 - SMALL) * grow;
      const tilt = -6 * shrink + 3.5 * flip + 2.5 * grow;
      const angle = 180 * flip;
      const radius = 28 * Math.min(range(progress, 0, 0.07), 1 - range(progress, 0.5, BEAT.full));
      const isTurned = angle >= 90;
      const resting = progress <= 0 || progress >= BEAT.full;
      const pose = (turn: number) =>
        `perspective(${PERSPECTIVE}px) rotate(${tilt.toFixed(3)}deg) rotateY(${turn.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

      if (front) {
        const folding = progress > 0 && !isTurned;
        if (folding !== local.folding) {
          local.folding = folding;
          front.dataset.folding = String(folding);
        }
        front.style.visibility = isTurned ? 'hidden' : '';
        front.style.transform = folding ? pose(angle) : '';
        front.style.setProperty('--card-radius', `${radius.toFixed(1)}px`);
      }

      card.style.transform = isTurned && !resting ? pose(angle - 180) : '';
      card.style.borderRadius = `${radius.toFixed(1)}px`;

      // the title slides up from behind its own baseline as the card grows
      const reveal = rise(range(progress, BEAT.flipTo, BEAT.full - 0.04));
      if (line) line.style.transform = `translate3d(0, ${((1 - reveal) * 105).toFixed(2)}%, 0)`;
      note?.style.setProperty('--reveal', range(progress, BEAT.growFrom + 0.08, BEAT.full).toFixed(3));

      if (isTurned !== local.turned) {
        local.turned = isTurned;
        setTurned(isTurned);
      }
      const immersive = inView && progress > 0.012 && progress < BEAT.full - 0.015;
      if (immersive !== local.immersive) {
        local.immersive = immersive;
        setImmersive('card', immersive);
      }
    };

    let pinned = 0;
    let visible = false;
    const watch = ScrollTrigger.create({
      trigger: runway,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        visible = self.isActive;
        render(pinned, visible);
      },
    });
    const pin = ScrollTrigger.create({
      trigger: runway,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        pinned = self.progress;
        render(pinned, visible);
      },
      onRefresh: (self) => {
        pinned = self.progress;
        render(pinned, visible);
      },
    });
    render(0, false);

    return () => {
      watch.kill();
      pin.kill();
      setImmersive('card', false);
      if (front) {
        front.style.transform = '';
        front.style.visibility = '';
        front.style.removeProperty('--card-radius');
        delete front.dataset.folding;
      }
    };
  }, []);

  return (
    <div
      className={styles.runway}
      ref={runwayRef}
      id="personal"
      data-shift="card"
      data-turned={turned}
      data-anchor="personal"
      data-anchor-offset={still ? 0 : 1.02}
    >
      {/* the label reads "After Hours" as soon as the table starts to fold */}
      <span className={styles.mark} style={{ top: 'calc(0.2 * var(--screen))' }} data-nav-section="personal" data-nav-line="0" />
      <div className={styles.viewport}>
        <div className={styles.void} aria-hidden="true" />
        <div className={styles.card} data-card inert={!still && !turned}>
          <PersonalCover />
        </div>
      </div>
    </div>
  );
}
