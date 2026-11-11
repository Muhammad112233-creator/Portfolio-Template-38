'use client';

import { useEffect, useRef } from 'react';
import { SplitText } from 'gsap/SplitText';
import { site } from '@/content/site';
import { gsap, prefersReducedMotion } from '@/lib/scroll';
import { stage } from '@/lib/stage';
import styles from './Intro.module.scss';

gsap.registerPlugin(SplitText);

const HOLD = 2.4;

function ArrowDown() {
  return (
    <svg viewBox="0 0 12 18" aria-hidden="true">
      <path d="M6 1v16M2 13l4 4 4-4" />
    </svg>
  );
}

/** Swaps the keyword letter by letter, like a cut made on the beat. */
function useKeywordLoop(active: boolean, ref: React.RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!active || !element || prefersReducedMotion()) return;
    const words = site.person.keywords;
    let index = 0;
    let split: SplitText | null = null;
    let call: gsap.core.Tween | null = null;
    let cancelled = false;

    const swap = () => {
      if (cancelled) return;
      split?.revert();
      split = new SplitText(element, { type: 'chars' });
      gsap.to(split.chars, {
        yPercent: -38,
        opacity: 0,
        filter: 'blur(6px)',
        duration: 0.34,
        ease: 'power2.in',
        stagger: { each: 0.022, from: 'random' },
        onComplete: () => {
          if (cancelled) return;
          split?.revert();
          index = (index + 1) % words.length;
          element.textContent = words[index];
          split = new SplitText(element, { type: 'chars' });
          gsap.from(split.chars, {
            yPercent: 42,
            opacity: 0,
            filter: 'blur(6px)',
            duration: 0.5,
            ease: 'power3.out',
            stagger: { each: 0.026, from: 'start' },
          });
          call = gsap.delayedCall(HOLD, swap);
        },
      });
    };
    call = gsap.delayedCall(HOLD, swap);

    return () => {
      cancelled = true;
      call?.kill();
      if (split) {
        gsap.killTweensOf(split.chars);
        split.revert();
      }
      element.textContent = words[0];
    };
  }, [active, ref]);
}

export default function HeroInterface({ active }: { active: boolean }) {
  const keywordRef = useRef<HTMLSpanElement>(null);
  const walk = stage.use((s) => s.walk);
  const ready = stage.use((s) => s.ready);
  useKeywordLoop(active, keywordRef);

  const { person, cues } = site;

  return (
    <div className={styles.interface} data-active={active}>
      <div className={styles.copy}>
        <div className={`${styles.text} ${styles.copyFade}`}>
          <h1 className={styles.title}>
            <span className={styles.name}>{person.name}.</span>
            <span className={styles.role}>{person.role}</span>
          </h1>
          <p className={styles.focus}>
            <span className={styles.focusLead}>{person.focusLead}</span>
            <span className={styles.keyword}>
              <span className={styles.keywordWord} ref={keywordRef}>
                {person.keywords[0]}
              </span>
            </span>
          </p>
          <p className={`${styles.cue} ${styles.cueStart}`} data-visible={active && ready && walk === 'start'}>
            <ArrowDown />
            <span className={styles.cueMouse}>{cues.start.mouse}</span>
            <span className={styles.cueTouch}>{cues.start.touch}</span>
          </p>
        </div>
      </div>

      <p className={`${styles.credit} ${styles.copyFade}`}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.2" />
          <path d="M1.8 10h16.4M10 1.8c2.6 2.3 3.9 5 3.9 8.2s-1.3 5.9-3.9 8.2c-2.6-2.3-3.9-5-3.9-8.2s1.3-5.9 3.9-8.2z" />
        </svg>
        <span>
          {person.credit} · © {person.year}
        </span>
      </p>

      <p className={`${styles.cue} ${styles.cueWalk}`} data-visible={ready && walk === 'walking'} aria-hidden="true">
        <ArrowDown />
        <span className={styles.cueMouse}>{cues.walk.mouse}</span>
        <span className={styles.cueTouch}>{cues.walk.touch}</span>
      </p>
    </div>
  );
}
