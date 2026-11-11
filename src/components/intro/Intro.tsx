'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { site } from '@/content/site';
import { PortalRenderer, type PortalMotion } from '@/gl/portal';
import { asset } from '@/lib/asset';
import { gsap, lockScroll, prefersReducedMotion, requestRefresh, ScrollTrigger, unlockScroll } from '@/lib/scroll';
import { stage } from '@/lib/stage';
import HeroInterface from './HeroInterface';
import HeroScene from './HeroScene';
import styles from './Intro.module.scss';

type Phase =
  | 'booting'
  | 'loading'
  | 'rupturing'
  | 'holding'
  | 'diving'
  | 'dissolving'
  | 'arriving'
  | 'fallback'
  | 'complete';

const ARRIVED: Phase[] = ['holding', 'diving', 'dissolving', 'arriving', 'fallback', 'complete'];

/** Resolves when the things the first screen needs are in, or after a grace period. */
function firstScreenReady() {
  const image = new Promise<void>((resolve) => {
    const probe = new Image();
    probe.onload = probe.onerror = () => resolve();
    probe.src = asset(
      window.matchMedia('(max-aspect-ratio: 17/20)').matches ? '/assets/images/hero-mobile.jpg' : '/assets/images/hero-desktop.jpg',
    );
  });
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const grace = new Promise<void>((resolve) => window.setTimeout(resolve, 4500));
  return Promise.race([Promise.all([image, fonts]).then(() => undefined), grace]);
}

export default function Intro() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const motion = useRef<PortalMotion>({ progress: 0, rupture: 0, palette: 0, dive: 0, dissolve: 0 });

  const [phase, setPhase] = useState<Phase>('booting');
  const [noPortal, setNoPortal] = useState(false);
  const [staticHero, setStaticHero] = useState(false);
  const makeStatic = useCallback(() => setStaticHero(true), []);

  useEffect(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;

    lockScroll('intro');
    let cancelled = false;
    let renderer: PortalRenderer | null = null;
    let timeline: gsap.core.Timeline | null = null;
    let shown = -1;
    const ready = firstScreenReady();
    const { steps } = site.loader;

    const report = (value: number) => {
      const percent = Math.round(100 * Math.min(1, Math.max(0, value)));
      if (percent === shown) return;
      shown = percent;
      if (percentRef.current) percentRef.current.textContent = `${String(percent).padStart(3, '0')}%`;
      if (statusRef.current) {
        statusRef.current.textContent = percent < 58 ? steps[0] : percent < 84 ? steps[1] : percent < 100 ? steps[2] : steps[3];
      }
      barRef.current?.setAttribute('aria-valuenow', String(percent));
    };

    const finish = () => {
      if (cancelled) return;
      renderer?.destroy();
      renderer = null;
      setPhase('complete');
      stage.set({ ready: true });
      unlockScroll('intro');
      requestRefresh();
    };

    // No WebGL, a lost context or reduced motion: a short, quiet handover.
    const fallback = (instant: boolean) => {
      if (cancelled) return;
      timeline?.kill();
      renderer?.destroy();
      renderer = null;
      setNoPortal(true);
      setPhase('fallback');
      const m = motion.current;
      timeline = gsap.timeline({ onComplete: finish });
      if (instant) {
        report(1);
        timeline.to(overlay, { opacity: 0, duration: 0.15, ease: 'none' });
        return;
      }
      timeline
        .to(m, { progress: 1, duration: 0.9, ease: 'sine.inOut', onUpdate: () => report(m.progress) })
        .add(() => {
          timeline?.pause();
          ready.then(() => {
            if (!cancelled) timeline?.resume();
          });
        })
        .to(overlay, { opacity: 0, duration: 0.62, ease: 'power2.out' });
    };

    if (prefersReducedMotion()) {
      fallback(true);
    } else {
      try {
        renderer = new PortalRenderer(canvas, () => motion.current, { onContextLost: () => fallback(false) });
        renderer.start();
      } catch {
        renderer = null;
      }

      if (!renderer) {
        fallback(false);
      } else {
        const m = motion.current;
        const tick = () => report(m.progress);
        setPhase('loading');
        timeline = gsap
          .timeline({ onComplete: finish })
          .to(m, { palette: 1, duration: 1.5, ease: 'sine.inOut' }, 0.15)
          .to(m, { progress: 0.36, duration: 0.8, ease: 'power1.out', onUpdate: tick }, 0)
          .to(m, { progress: 0.64, duration: 0.55, ease: 'sine.inOut', onUpdate: tick }, 0.8)
          .to(m, { rupture: 0.3, duration: 0.75, ease: 'sine.inOut', onStart: () => setPhase('rupturing') }, 0.6)
          .to(m, { progress: 0.88, duration: 0.44, ease: 'power1.inOut', onUpdate: tick }, 1.35)
          .to(m, { progress: 1, rupture: 1, duration: 0.38, ease: 'power3.in', onUpdate: tick }, 1.78)
          .add(() => {
            // hold at 100% until the first screen can actually be shown
            report(1);
            setPhase('holding');
            timeline?.pause();
            ready.then(() => {
            if (!cancelled) timeline?.resume();
          });
          }, 2.16)
          .to(m, { dive: 1, duration: 0.48, ease: 'power2.in', onStart: () => setPhase('diving') }, 2.18)
          .to(m, { dissolve: 1, duration: 0.86, ease: 'power2.inOut', onStart: () => setPhase('dissolving') }, 2.36)
          .add(() => setPhase('arriving'), 3.2)
          .to(overlay, { opacity: 0, duration: 0.18, ease: 'none' }, 3.22);
      }
    }

    return () => {
      cancelled = true;
      timeline?.kill();
      renderer?.destroy();
      unlockScroll('intro');
    };
  }, []);

  // The hero softens and falls back as the next section slides over it.
  useEffect(() => {
    const shell = shellRef.current;
    const inner = innerRef.current;
    if (!shell || !inner || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      inner,
      { scale: 1, yPercent: 0, filter: 'blur(0px) brightness(1)' },
      {
        scale: 1.1,
        // drifts down while its window scrolls up, so the next page appears to slide over it
        yPercent: 70,
        filter: 'blur(12px) brightness(0.55)',
        ease: 'none',
        scrollTrigger: { trigger: shell, start: 'bottom bottom', end: 'bottom top', scrub: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [staticHero]);

  const done = phase === 'complete';

  return (
    <>
      <div
        className={styles.shell}
        ref={shellRef}
        id="home"
        data-phase={phase}
        data-scene="hero"
        data-static={staticHero}
        data-nav-theme="dark"
      >
        <div className={styles.arrival} aria-hidden={!done} inert={!done}>
          <div className={styles.arrivalInner} ref={innerRef}>
            <HeroScene onStatic={makeStatic} />
            <HeroInterface active={ARRIVED.includes(phase)} />
          </div>
        </div>
      </div>

      {!done ? (
        <div className={styles.overlay} ref={overlayRef} data-phase={phase}>
          {noPortal ? <div className={styles.portalFallback} /> : <canvas className={styles.portal} ref={canvasRef} aria-hidden="true" />}
          <div
            className={styles.hud}
            ref={barRef}
            role="progressbar"
            aria-label={site.loader.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <span className={styles.percent} ref={percentRef} aria-hidden="true">
              000%
            </span>
            <span className="sr-only" ref={statusRef} aria-live="polite">
              {site.loader.steps[0]}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
