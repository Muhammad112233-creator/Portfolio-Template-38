'use client';

import { useEffect, useRef, useState } from 'react';
import { site, type Creator } from '@/content/site';
import { asset } from '@/lib/asset';
import { gsap, prefersReducedMotion, requestRefresh, ScrollTrigger } from '@/lib/scroll';
import styles from './Clients.module.scss';

/** Beats, as fractions of the pinned scroll distance. */
const BEAT = {
  write: [0.02, 0.18],
  creators: [0.2, 0.25, 0.32, 0.4],
  handover: [0.55, 0.64],
  settle: [0.76, 0.82],
};

/** Draws a portrait as a coarse mosaic that sharpens as `reveal` goes 0 → 1. */
function drawMosaic(canvas: HTMLCanvasElement, image: HTMLImageElement, reveal: number) {
  const context = canvas.getContext('2d');
  if (!context) return;
  if (reveal <= 0 || !image.complete || !image.naturalWidth) {
    canvas.width = canvas.height = 1;
    context.clearRect(0, 0, 1, 1);
    return;
  }
  const cells = Math.round(2 + Math.pow(reveal, 1.7) * 54);
  if (canvas.width !== cells) canvas.width = canvas.height = cells;
  context.globalAlpha = Math.min(1, reveal * 4);
  context.clearRect(0, 0, cells, cells);
  context.drawImage(image, 0, 0, cells, cells);
}

/** A few slow specks of dust in the air, so the paper never sits completely still. */
function startDust(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;
  const specks = Array.from({ length: 64 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.6 + Math.random() * 1.6,
    drift: 0.004 + Math.random() * 0.012,
    sway: Math.random() * Math.PI * 2,
    alpha: 0.05 + (index % 5) * 0.022,
  }));
  let frame = 0;
  let last = 0;
  let visible = false;
  let width = 0;
  let height = 0;

  const fit = () => {
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (now - last < 40) return; // 25 fps is plenty
    const step = Math.min(0.1, (now - last) / 1000);
    last = now;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#10100f';
    for (const speck of specks) {
      speck.y -= speck.drift * step;
      speck.sway += step * 0.4;
      if (speck.y < -0.02) speck.y = 1.02;
      const x = (speck.x + Math.sin(speck.sway) * 0.012) * width;
      // gather the dust near the middle of the screen, where the title sits
      const focus = 1 - Math.min(1, Math.hypot(speck.x - 0.5, speck.y - 0.48) * 1.5);
      context.globalAlpha = speck.alpha * (0.35 + focus);
      context.beginPath();
      context.arc(x, speck.y * height, speck.size, 0, Math.PI * 2);
      context.fill();
    }
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(frame);
    if (visible) {
      fit();
      frame = requestAnimationFrame(loop);
    }
  });
  observer.observe(canvas);
  window.addEventListener('resize', fit);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', fit);
  };
}

function Chars({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((char, index) => (
        <span className={styles.char} data-trust-char key={index}>
          {char}
        </span>
      ))}
    </>
  );
}

function RailCards({ creators }: { creators: Creator[] }) {
  // one copy to read, the rest to make the loop seamless (short lists need more)
  const copies = Math.max(3, Math.ceil(8 / Math.max(1, creators.length)));
  return (
    <div className={styles.track} style={{ '--copies': copies } as React.CSSProperties}>
      {Array.from({ length: copies }, (_, copy) => copy).map((copy) => (
        <ul className={styles.group} key={copy} aria-hidden={copy > 0 || undefined}>
          {creators.map((creator) => (
            <li className={styles.card} key={creator.name}>
              <div className={styles.cardPortrait}>
                <img src={asset(creator.avatar)} alt="" loading="lazy" decoding="async" />
              </div>
              <div>
                <p className={styles.cardName}>{creator.name}</p>
                <p className={styles.cardReach}>
                  <strong>{creator.count}</strong>
                  <span>{creator.unit}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export default function Clients() {
  const { title, featured, more } = site.clients;
  const sectionRef = useRef<HTMLElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const [pinned, setPinned] = useState(false);
  const [entered, setEntered] = useState(false);
  const [railsOn, setRailsOn] = useState(false);
  const [resolved, setResolved] = useState<boolean[]>(() => featured.map(() => true));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setPinned(true);
    setResolved(featured.map(() => false));
    requestRefresh();
  }, [featured]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!pinned || !section) return;

    const stopDust = dustRef.current ? startDust(dustRef.current) : () => undefined;
    const chars = Array.from(section.querySelectorAll<HTMLElement>('[data-trust-char]'));
    const lines = Array.from(section.querySelectorAll<HTMLElement>('[data-trust-line]'));
    const strong = section.querySelector<HTMLElement>('[data-trust-strong]');
    const creators = Array.from(section.querySelectorAll<HTMLElement>('[data-creator]'));
    const rails = Array.from(section.querySelectorAll<HTMLElement>('[data-rail]'));
    const local = { rails: false, resolved: featured.map(() => false) };

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onToggle: (self) => setEntered(self.isActive || self.progress >= 1),
          onUpdate: (self) => {
            const on = self.isActive && self.progress > BEAT.handover[0] + 0.02;
            if (on !== local.rails) {
              local.rails = on;
              setRailsOn(on);
            }
          },
        },
      });

      // 1 ─ the sentence writes itself, letter by letter
      const [from, to] = BEAT.write;
      timeline.fromTo(
        chars,
        { opacity: 0, filter: 'blur(9px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 0.03, stagger: (to - from - 0.03) / Math.max(1, chars.length - 1), ease: 'power1.out' },
        from,
      );

      // 2 ─ the featured creators arrive one at a time, portraits resolving from a mosaic
      creators.forEach((creator, index) => {
        const at = BEAT.creators[index % BEAT.creators.length];
        const canvas = creator.querySelector('canvas');
        const image = creator.querySelector('img');
        const identity = creator.querySelector('[data-creator-identity]');
        const reveal = { value: 0 };
        const paint = () => {
          if (canvas && image) drawMosaic(canvas, image, reveal.value);
          const done = reveal.value >= 0.999;
          if (done !== local.resolved[index]) {
            local.resolved[index] = done;
            setResolved([...local.resolved]);
          }
        };
        image?.addEventListener('load', paint);
        timeline
          .fromTo(creator, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.03, ease: 'power2.out' }, at)
          .fromTo(reveal, { value: 0 }, { value: 1, duration: 0.075, ease: 'power1.inOut', onUpdate: paint }, at)
          .fromTo(identity, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.04, ease: 'power2.out' }, at + 0.03);
      });

      // 3 ─ they make room for everyone else
      const [out, outEnd] = BEAT.handover;
      const span = outEnd - out;
      timeline
        .to(creators, { autoAlpha: 0, filter: 'blur(14px)', scale: 1.04, duration: span * 0.8, stagger: span * 0.05, ease: 'power1.in' }, out)
        .to(lines, { autoAlpha: 0, filter: 'blur(10px)', duration: span * 0.7, ease: 'power1.in' }, out)
        .to(strong, { color: '#a3a3a1', duration: span, ease: 'power1.inOut' }, out)
        .fromTo(rails, { autoAlpha: 0 }, { autoAlpha: 1, duration: span, ease: 'power1.out' }, out + span * 0.3)
        .to(strong, { color: '#10100f', duration: BEAT.settle[1] - BEAT.settle[0], ease: 'power1.inOut' }, BEAT.settle[0])
        .set({}, {}, 1);
    }, section);

    return () => {
      context.revert();
      stopDust();
    };
  }, [pinned, featured]);

  const sentence = `${title.before} ${title.strong} ${title.after}`;

  return (
    <section
      className={styles.trust}
      ref={sectionRef}
      id="clients"
      aria-label="Clients"
      data-stage={pinned ? 'pinned' : 'flow'}
      data-entry={entered ? 'active' : 'waiting'}
      data-anchor="clients"
      data-anchor-offset={pinned ? 0.85 : 0}
      data-nav-section="clients"
      data-nav-line="0.5"
      data-nav-theme="light"
      data-nav-at={pinned ? 'top' : undefined}
    >
      <div className={styles.stage}>
        <div className={styles.dust} aria-hidden="true">
          <canvas ref={dustRef} />
        </div>

        <div className={styles.statement}>
          <h2 className={styles.title} aria-label={sentence}>
            <span className={styles.line} data-trust-line aria-hidden="true">
              <Chars text={title.before} />
            </span>
            <strong data-trust-strong aria-hidden="true">
              <Chars text={title.strong} />
            </strong>
            <span className={styles.line} data-trust-line aria-hidden="true">
              <Chars text={title.after} />
            </span>
          </h2>
        </div>

        <ul className={styles.creators}>
          {featured.map((creator, index) => (
            <li className={styles.creator} key={creator.name} data-creator data-side={index % 2 ? 'right' : 'left'}>
              <div className={styles.portrait} data-resolving={!resolved[index]}>
                <img src={asset(creator.avatar)} alt="" decoding="async" />
                <canvas aria-hidden="true" />
              </div>
              <div className={styles.identity} data-creator-identity>
                <p className={styles.name}>{creator.name}</p>
                <p className={styles.proof}>
                  <span className={styles.count}>{creator.count}</span>
                  <span className={styles.unit}>{creator.unit}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.more} data-active={railsOn}>
          <div className={styles.rail} data-rail data-side="left" data-direction="down">
            <RailCards creators={more.left} />
          </div>
          <div className={styles.rail} data-rail data-side="right" data-direction="up">
            <RailCards creators={more.right} />
          </div>
        </div>
      </div>
    </section>
  );
}
