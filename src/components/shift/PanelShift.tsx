'use client';

import { useEffect, useRef, useState } from 'react';
import About from '@/components/about/About';
import Cover from '@/components/cover/Cover';
import Statement from '@/components/statement/Statement';
import { site } from '@/content/site';
import { asset } from '@/lib/asset';
import { gsap, prefersReducedMotion, ScrollTrigger } from '@/lib/scroll';
import { setImmersive, stage } from '@/lib/stage';
import { setAllPlaying } from '@/lib/video';
import styles from './PanelShift.module.scss';

/** Where each beat sits, as a fraction of the pinned scroll distance. */
const BEAT = {
  hold: 0.04, // the paper page rests
  shrunk: 0.14, // …then becomes a small tilted card
  flipped: 0.24, // …turns over to the statement
  full: 0.4, // …which grows to fill the screen
  wipeStart: 0.47,
  wipeEnd: 0.72,
  cleared: 0.75,
  title: 0.79,
  reel: 0.9,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, from: number, to: number) => clamp01((value - from) / (to - from));

// The edge of the white field: a curve that starts as a steep fin in the
// bottom-left corner and flattens as it climbs. x and y are 0–1 fractions.
const frontAt = (x: number, t: number) => 1 - 1.17 * t * t - Math.max(0.12, 1.5 - 1.6 * t) * Math.pow(x, 1.35);
const reachAt = (t: number) => Math.min(1, t * 2.5);

function wipePolygon(t: number) {
  if (t <= 0) return 'polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%, 0% 100%, 0% 100%, 0% 100%, 0% 100%)';
  const reach = reachAt(t);
  const points = ['0% 100%'];
  for (let i = 0; i <= 5; i++) {
    const x = (reach * i) / 5;
    points.push(`${(x * 100).toFixed(2)}% ${(Math.max(-0.02, frontAt(x, t)) * 100).toFixed(2)}%`);
  }
  points.push(`${(reach * 100).toFixed(2)}% 100%`);
  return `polygon(${points.join(', ')})`;
}

// Little clips ride the edge of the wipe: tall ones ahead of it on the dark
// side, wide ones just behind it on the light side.
const TALL = [
  { x: 0.2, gap: 0.2, drift: -0.05, tilt: -4, width: 'clamp(5.5rem, 7.5vw, 7.2rem)' },
  { x: 0.5, gap: 0.27, drift: 0.03, tilt: 3, width: 'clamp(6rem, 8.5vw, 8rem)' },
  { x: 0.8, gap: 0.16, drift: 0.05, tilt: -2, width: 'clamp(5rem, 7vw, 6.7rem)' },
];
const WIDE = [
  { x: 0.16, gap: 0.2, drift: 0.04, tilt: 2, width: 'clamp(10rem, 15vw, 14.5rem)' },
  { x: 0.46, gap: 0.3, drift: -0.03, tilt: -3, width: 'clamp(11rem, 17vw, 16rem)' },
  { x: 0.74, gap: 0.22, drift: 0.02, tilt: 4, width: 'clamp(9rem, 14vw, 13rem)' },
];

function Trail({ kind }: { kind: 'tall' | 'wide' }) {
  const sources = kind === 'tall' ? site.trail.tall : site.trail.wide;
  const specs = kind === 'tall' ? TALL : WIDE;
  return (
    <div className={styles.trail} aria-hidden="true">
      {sources.map((src, index) => (
        <figure
          className={styles.trailItem}
          key={src}
          data-trail={kind}
          style={{ '--trail-ratio': kind === 'tall' ? '9 / 16' : '16 / 9', '--trail-width': specs[index].width } as React.CSSProperties}
        >
          <video muted loop playsInline preload="none" disablePictureInPicture data-src={asset(src)} />
        </figure>
      ))}
    </div>
  );
}

type Phase = 'about' | 'statement' | 'cover';

export default function PanelShift() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('about');
  const [wiping, setWiping] = useState(false);
  const [coverShown, setCoverShown] = useState(false);
  const [reelActive, setReelActive] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;
    const q = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(runway.querySelectorAll<T>(selector));
    const chips = q<HTMLVideoElement>('video[data-chip-video]');
    const trailVideos = q<HTMLVideoElement>('[data-trail] video');

    // No motion: the pages are laid out one after another, nothing is pinned.
    if (prefersReducedMotion()) {
      setStill(true);
      setCoverShown(true);
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target.matches('[data-face="about"]')) setAllPlaying(chips, entry.isIntersecting);
          else setReelActive(entry.isIntersecting);
        }
      });
      q('[data-face="about"], [data-face="cover"]').forEach((element) => observer.observe(element));
      return () => observer.disconnect();
    }

    const card = q('[data-card]')[0];
    const faces = q('[data-face="about"], [data-face="statement"]');
    const sheens = q('[data-sheen]');
    const grain = q('[data-void-grain]')[0];
    const lightField = q('[data-field="light"]')[0];
    const lightCopy = lightField.querySelector<HTMLElement>('[data-statement-copy]');
    const tall = q('[data-trail="tall"]');
    const wide = q('[data-trail="wide"]');
    const statementFace = q('[data-face="statement"]')[0];
    const statementChars = Array.from(statementFace.querySelectorAll('[data-statement-char]'));
    const statementHandoff = statementFace.querySelector('[data-statement-handoff]');
    const coverChars = q('[data-cover-char]');
    const reel = q('[data-cover-reel]')[0];
    const words = q('[data-face="about"] [data-reveal="word"]');
    const chipWraps = q('[data-face="about"] [data-reveal="chip"]');

    const context = gsap.context(() => {
      // 1 ─ the paper rises over the hero and its words settle in
      const entry = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: runway, start: 'top 92%', end: 'top 8%', scrub: 0.4 },
      });
      entry
        .fromTo(words, { yPercent: 112 }, { yPercent: 0, duration: 0.4, stagger: 0.012 }, 0)
        .fromTo(
          chipWraps,
          { scale: 0.55, opacity: 0, yPercent: 30 },
          { scale: 1, opacity: 1, yPercent: 0, duration: 0.42, stagger: 0.085, ease: 'back.out(1.6)' },
          0.1,
        );

      // 2 ─ everything that happens while the screen is pinned
      const flow = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
      flow
        .to(card, { scale: 0.5, rotation: -8, duration: BEAT.shrunk - BEAT.hold, ease: 'power2.inOut' }, BEAT.hold)
        .to(faces, { borderRadius: '1.75rem', duration: 0.05 }, BEAT.hold)
        .to(sheens, { opacity: 1, duration: 0.05 }, BEAT.hold)
        .to(grain, { opacity: 0.6, duration: 0.06 }, BEAT.hold)
        .to(card, { rotationY: 180, rotation: 0, duration: BEAT.flipped - BEAT.shrunk, ease: 'power2.inOut' }, BEAT.shrunk)
        .to(card, { scale: 1, duration: BEAT.full - 0.16, ease: 'sine.out' }, 0.16)
        .fromTo(
          statementChars,
          { yPercent: 70, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.05, stagger: 0.004, ease: 'power3.out' },
          0.2,
        )
        .fromTo(statementHandoff, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.27)
        .to(faces, { borderRadius: '0rem', duration: 0.08 }, 0.31)
        .to(sheens, { opacity: 0, duration: 0.06 }, 0.33)
        .to(grain, { opacity: 0, duration: 0.05 }, 0.35)
        .to(lightCopy, { opacity: 0, y: -36, duration: 0.07, ease: 'power1.in' }, 0.665)
        .fromTo(
          coverChars,
          { yPercent: 58, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.045, stagger: (BEAT.reel - BEAT.title - 0.045) / Math.max(1, coverChars.length), ease: 'power2.out' },
          BEAT.title,
        )
        .fromTo(reel, { y: 64, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.07, ease: 'power3.out' }, BEAT.reel)
        .set({}, {}, 1);

      let lastWipe = -1;
      const placeTrail = (items: HTMLElement[], specs: typeof TALL, side: 1 | -1, t: number, width: number, height: number) => {
        items.forEach((item, index) => {
          const spec = specs[index];
          // each clip appears as the edge reaches it and leaves before the wipe ends
          const local = range(t, spec.x / 2.5 - 0.02, spec.x / 2.5 + 0.5);
          const alpha = Math.min(range(local, 0, 0.18), 1 - range(local, 0.72, 1));
          if (alpha <= 0.001) {
            item.style.visibility = 'hidden';
            item.style.opacity = '0';
            return;
          }
          const edge = frontAt(spec.x, t) * height;
          const x = (spec.x + spec.drift * local) * width - item.offsetWidth / 2;
          const y = edge - side * (spec.gap * height * (0.55 + 0.45 * local)) - item.offsetHeight / 2;
          item.style.visibility = 'visible';
          item.style.opacity = alpha.toFixed(3);
          item.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(spec.tilt * (1 - local)).toFixed(2)}deg) scale(${(0.86 + 0.14 * alpha).toFixed(3)})`;
        });
      };

      const local = { phase: 'about' as Phase, immersive: false, wiping: false, cover: false, reel: false, chips: false, trail: false };

      const render = (progress: number, inView: boolean) => {
        flow.progress(progress);

        const t = range(progress, BEAT.wipeStart, BEAT.wipeEnd);
        if (t !== lastWipe) {
          lastWipe = t;
          const polygon = wipePolygon(t);
          lightField.style.clipPath = polygon;
          document.documentElement.style.setProperty('--wipe-clip', polygon);
          const width = runway.clientWidth;
          const height = window.innerHeight;
          placeTrail(tall, TALL, 1, t, width, height);
          placeTrail(wide, WIDE, -1, t, width, height);
        }

        const flipMid = (BEAT.shrunk + BEAT.flipped) / 2;
        const nextPhase: Phase = progress < flipMid ? 'about' : progress < BEAT.wipeEnd ? 'statement' : 'cover';
        if (nextPhase !== local.phase) {
          local.phase = nextPhase;
          setPhase(nextPhase);
          runway.dataset.navTheme = nextPhase === 'statement' ? 'dark' : 'light';
        }
        const immersive = inView && progress > BEAT.hold + 0.004 && progress < BEAT.full - 0.02;
        if (immersive !== local.immersive) {
          local.immersive = immersive;
          setImmersive('panel', immersive);
        }
        const isWiping = inView && t > 0 && t < 1;
        if (isWiping !== local.wiping) {
          local.wiping = isWiping;
          stage.set({ wiping: isWiping });
        }
        const thresholdOn = progress >= BEAT.wipeStart - 0.01 && progress < BEAT.cleared;
        if (thresholdOn !== local.trail) {
          local.trail = thresholdOn;
          setWiping(thresholdOn);
          setAllPlaying(trailVideos, thresholdOn);
        }
        const cover = progress > BEAT.wipeStart + 0.08;
        if (cover !== local.cover) {
          local.cover = cover;
          setCoverShown(cover);
        }
        const reelOn = inView && progress > BEAT.reel - 0.02;
        if (reelOn !== local.reel) {
          local.reel = reelOn;
          setReelActive(reelOn);
        }
        const chipsOn = inView && progress < flipMid;
        if (chipsOn !== local.chips) {
          local.chips = chipsOn;
          setAllPlaying(chips, chipsOn);
        }
      };

      let pinned = 0;
      let visible = false;
      ScrollTrigger.create({
        trigger: runway,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          visible = self.isActive;
          render(pinned, visible);
        },
      });
      ScrollTrigger.create({
        trigger: runway,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          pinned = self.progress;
          render(pinned, visible);
        },
        onRefresh: (self) => {
          pinned = self.progress;
          lastWipe = -1;
          render(pinned, visible);
        },
      });
      render(0, false);
    }, runway);

    return () => {
      context.revert();
      setImmersive('panel', false);
      stage.set({ wiping: false });
      document.documentElement.style.removeProperty('--wipe-clip');
    };
  }, []);

  return (
    <div
      className={styles.runway}
      ref={runwayRef}
      id="about"
      data-shift="panel"
      data-anchor="about"
      data-nav-section="about"
      data-nav-line="1"
      data-nav-theme="light"
    >
      {/* the label reads "Work" from the moment the page folds away */}
      <span className={styles.mark} style={{ top: 'calc(0.25 * var(--screen))' }} data-nav-section="work" data-nav-line="0" />

      <div className={styles.viewport}>
        <div className={styles.void} aria-hidden="true">
          <span className={styles.voidGrain} data-void-grain />
        </div>

        <div className={styles.card} data-card>
          <div className={styles.face} data-face="about" inert={!still && phase !== 'about'}>
            <About />
            <span className={styles.faceSheen} data-sheen aria-hidden="true" />
          </div>
          <div className={`${styles.face} ${still ? '' : styles.faceBack}`} data-face="statement">
            <Statement tone="paper" />
            <span className={styles.faceSheen} data-sheen aria-hidden="true" />
          </div>
        </div>

        <div className={styles.cover} data-face="cover" data-shown={coverShown} inert={!still && phase !== 'cover'}>
          <Cover active={reelActive} />
        </div>

        <div className={styles.threshold} data-active={wiping} aria-hidden="true">
          <div className={`${styles.field} ${styles.fieldDark}`} data-field="dark">
            <Statement tone="paper" decorative>
              <Trail kind="tall" />
            </Statement>
          </div>
          <div className={`${styles.field} ${styles.fieldLight}`} data-field="light">
            <Statement tone="ink" decorative>
              <Trail kind="wide" />
            </Statement>
          </div>
        </div>
      </div>
    </div>
  );
}
