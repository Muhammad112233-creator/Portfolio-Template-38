'use client';

import { useEffect, useRef, useState } from 'react';
import { site } from '@/content/site';
import { asset } from '@/lib/asset';
import { prefersReducedMotion, requestRefresh } from '@/lib/scroll';
import { openPlayer } from '@/lib/stage';
import { setPlaying } from '@/lib/video';
import styles from './Shorts.module.scss';

export default function Shorts() {
  const { title, note, items } = site.shorts;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = prefersReducedMotion();
    if (reduced) setStill(true);

    // On small screens the stage is taller than the viewport. It should stick
    // when its bottom edge reaches the bottom of the screen, not its top.
    let lastTop = Number.NaN;
    const measure = () => {
      const top = Math.min(0, window.innerHeight - stage.offsetHeight);
      if (top === lastTop) return;
      lastTop = top;
      section.style.setProperty('--stick-top', `${top}px`);
      requestRefresh();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    window.addEventListener('resize', measure);
    measure();

    const videos = Array.from(section.querySelectorAll('video'));
    const onData = (event: Event) => ((event.target as HTMLVideoElement).dataset.ready = 'true');
    videos.forEach((video) => video.addEventListener('loadeddata', onData));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === stage) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.2) setShown(true);
          } else if (!reduced) {
            setPlaying(entry.target as HTMLVideoElement, entry.isIntersecting);
          }
        }
      },
      { threshold: [0, 0.2, 0.5] },
    );
    observer.observe(stage);
    videos.forEach((video) => observer.observe(video));

    return () => {
      resize.disconnect();
      observer.disconnect();
      window.removeEventListener('resize', measure);
      videos.forEach((video) => {
        video.removeEventListener('loadeddata', onData);
        video.pause();
      });
    };
  }, []);

  return (
    <section
      className={styles.table}
      ref={sectionRef}
      id="shorts"
      aria-label={title}
      data-still={still}
      data-shown={shown}
      data-anchor="shorts"
      data-nav-section="shorts"
      data-nav-line="0.5"
      data-nav-theme="light"
      data-shift-source="shorts"
    >
      <div className={styles.stage} ref={stageRef} data-shift-surface>
        <div className={styles.inner}>
          <header className={styles.head}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.note}>{note}</p>
          </header>
          <ol className={styles.strips}>
            {items.map((item, index) => (
              <li className={styles.strip} key={item.id} style={{ '--i': index } as React.CSSProperties}>
                <button
                  type="button"
                  className={styles.frameButton}
                  aria-label={`Watch ${item.label}`}
                  onClick={(event) =>
                    openPlayer({
                      src: asset(item.video),
                      poster: asset(item.poster),
                      title: item.label,
                      discipline: item.word,
                      ratio: 9 / 16,
                      origin: event.currentTarget.getBoundingClientRect(),
                    })
                  }
                >
                  <span className={styles.frameReveal} aria-hidden="true">
                    <span className={styles.frameMedia}>
                      <img className={styles.frame} src={asset(item.poster)} alt="" loading="lazy" decoding="async" />
                      <video className={styles.frame} muted loop playsInline preload="none" tabIndex={-1} data-src={asset(item.video)} />
                    </span>
                  </span>
                </button>
                <div className={styles.caption}>
                  <h3 className={styles.word}>{item.word}</h3>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
