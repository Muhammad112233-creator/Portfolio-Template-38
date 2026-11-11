'use client';

import { useEffect, useRef, useState } from 'react';
import { HeroRenderer } from '@/gl/hero';
import { asset } from '@/lib/asset';
import { frameLoop } from '@/lib/gl';
import { prefersReducedMotion, ScrollTrigger } from '@/lib/scroll';
import { stage } from '@/lib/stage';
import styles from './Intro.module.scss';

const DESKTOP = '/assets/images/hero-desktop.jpg';
const MOBILE = '/assets/images/hero-mobile.jpg';

type Props = { onStatic: () => void };

export default function HeroScene({ onStatic }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const shell = root?.closest<HTMLElement>('[data-scene="hero"]');
    if (!root || !canvas || !shell) return;

    let renderer: HeroRenderer | null = null;
    let stopLoop: (() => void) | null = null;
    let disposed = false;

    if (prefersReducedMotion()) {
      onStatic();
    } else {
      try {
        renderer = new HeroRenderer(canvas);
        const portrait = window.matchMedia('(max-aspect-ratio: 17/20)').matches;
        renderer
          .load(asset(portrait ? MOBILE : DESKTOP))
          .then(() => {
            if (disposed || !renderer) return;
            const active = renderer;
            stopLoop = frameLoop(shell, (time, delta) => active.draw(time, delta));
            setReady(true);
          })
          .catch(() => onStatic());
      } catch {
        renderer = null;
        onStatic();
      }
    }

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      renderer?.setPointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // One trigger drives the walk, the cue and the navigation state.
    const sync = (self: ScrollTrigger) => {
      const progress = self.progress;
      if (renderer) renderer.walkTarget = progress;
      shell.style.setProperty('--walk', progress.toFixed(4));
      stage.set({
        heroScrolling: self.isActive && self.scroll() > self.start,
        walk: progress <= 0.0005 ? 'start' : progress < 0.998 ? 'walking' : 'complete',
      });
    };
    const trigger = ScrollTrigger.create({
      trigger: shell,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: sync,
      onToggle: sync,
      onRefresh: sync,
    });

    return () => {
      disposed = true;
      trigger.kill();
      window.removeEventListener('pointermove', onPointer);
      stopLoop?.();
      renderer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.scene} ref={rootRef} data-hero-scene>
      <picture className={styles.scenePoster}>
        <source media="(max-aspect-ratio: 17/20)" srcSet={asset(MOBILE)} />
        <img src={asset(DESKTOP)} alt="" decoding="async" fetchPriority="high" />
      </picture>
      <canvas className={styles.sceneCanvas} ref={canvasRef} data-ready={ready} aria-hidden="true" />
      <div className={styles.sceneShade} />
    </div>
  );
}
