'use client';

import { useEffect, useRef, useState } from 'react';
import { site, type PersonalFilm } from '@/content/site';
import { asset } from '@/lib/asset';
import { gsap, prefersReducedMotion, requestRefresh, ScrollTrigger } from '@/lib/scroll';
import { openPlayer, player, stage } from '@/lib/stage';
import { prime, setPlaying } from '@/lib/video';
import styles from './Films.module.scss';

// The pinned screen is scored like a cue sheet, in arbitrary time units.
const ARRIVE = 0.9; // a chapter cuts, dissolves or wipes in
const HOLD = 1.7; // …stays up
const LAST_HOLD = 2.8; // …the closing chapter a little longer
const CLEAR = 0.84; // …and fades back to paper
const BREATH = 0.24; // blank paper between chapters
const TAIL = 1.2; // blank paper before the next section
const SCREENS_PER_UNIT = 0.2917;

const { films } = site.personal;
const holdOf = (index: number) => (index === films.length - 1 ? LAST_HOLD : HOLD);
const starts = films.map((_, index) =>
  films.slice(0, index).reduce((time, __, before) => time + ARRIVE + holdOf(before) + CLEAR + BREATH, 0),
);
const exitOf = (index: number) => starts[index] + ARRIVE + holdOf(index);
const TOTAL = exitOf(films.length - 1) + CLEAR + TAIL;
const SCREENS = 1 + TOTAL * SCREENS_PER_UNIT;

const ratioOf = (film: PersonalFilm) => {
  const [width, height] = film.ratio.split('/').map(Number);
  return width && height ? width / height : 16 / 9;
};

function Title({ film }: { film: PersonalFilm }) {
  if (film.font === 'collage') {
    // cut-out letters: each one gets its own scrap of paper
    return (
      <h3 className={styles.title} aria-label={film.title}>
        {Array.from(film.title).map((letter, index) =>
          letter === ' ' ? (
            ' '
          ) : (
            <span className={styles.letter} aria-hidden="true" key={index}>
              {letter}
            </span>
          ),
        )}
      </h3>
    );
  }
  if (film.font === 'engraved') {
    return (
      <h3 className={styles.title} aria-label={film.title}>
        {film.title.split(' ').map((word, index, words) => (
          <span aria-hidden="true" key={index}>
            <span className={styles.word}>{word}</span>
            {index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h3>
    );
  }
  return <h3 className={styles.title}>{film.title}</h3>;
}

export default function Films() {
  const sectionRef = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);
  const [painted, setPainted] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const playerOpen = player.use((s) => s.source !== null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setPinned(true);
    requestRefresh();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!pinned || !section) return;

    const chapters = Array.from(section.querySelectorAll<HTMLElement>('[data-film-chapter]'));
    const videos = Array.from(section.querySelectorAll<HTMLVideoElement>('video'));
    const onData = (event: Event) => ((event.target as HTMLVideoElement).dataset.ready = 'true');
    videos.forEach((video) => video.addEventListener('loadeddata', onData));

    const loader = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        videos.forEach(prime);
        loader.disconnect();
      },
      { rootMargin: '200% 0px' },
    );
    loader.observe(section);

    const local = { active: null as string | null, tint: null as string | null, theme: '' };
    let inView = false;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.1,
          onEnter: () => setPainted(true),
          onEnterBack: () => setPainted(true),
          onLeaveBack: () => setPainted(false),
        },
      });

      chapters.forEach((chapter, index) => {
        const ground = chapter.querySelector('[data-chapter-ground]');
        const glow = chapter.querySelector('[data-chapter-glow]');
        const content = chapter.querySelector('[data-chapter-content]');
        if (!ground || !glow || !content) return;
        const at = starts[index];
        const cut = films[index].cut;
        gsap.set([ground, glow, content], { autoAlpha: 0 });

        if (cut === 'hard') {
          // a flash cut: on, off, on again
          timeline
            .set(ground, { autoAlpha: 1 }, at + 0.01)
            .set(ground, { autoAlpha: 0 }, at + 0.1)
            .set(ground, { autoAlpha: 1 }, at + 0.16)
            .fromTo(glow, { autoAlpha: 0, scale: 1.4 }, { autoAlpha: 0.55, scale: 1, duration: 0.63, ease: 'power2.out' }, at + 0.16)
            .fromTo(content, { autoAlpha: 0, yPercent: 6 }, { autoAlpha: 1, yPercent: 0, duration: 0.54, ease: 'steps(5)' }, at + 0.04);
        } else if (cut === 'dissolve') {
          timeline
            .fromTo(glow, { autoAlpha: 0, scale: 1.3 }, { autoAlpha: 0.55, scale: 1, duration: 0.9, ease: 'power2.out' }, at)
            .fromTo(ground, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.81, ease: 'power1.inOut' }, at + 0.25)
            .fromTo(
              content,
              { autoAlpha: 0, yPercent: 4, filter: 'blur(14px)' },
              { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.72, ease: 'power2.out' },
              at + 0.45,
            );
        } else {
          // the ground rolls up from the bottom edge (see the mask in the styles)
          timeline
            .set(ground, { autoAlpha: 1 }, at)
            .fromTo(ground, { '--film-wipe': 0 }, { '--film-wipe': 1, duration: 0.9, ease: 'power2.inOut' }, at)
            .fromTo(glow, { autoAlpha: 0 }, { autoAlpha: 0.55, duration: 0.9, ease: 'power1.out' }, at + 0.27)
            .fromTo(content, { autoAlpha: 0, yPercent: 3 }, { autoAlpha: 1, yPercent: 0, duration: 0.675, ease: 'power2.out' }, at + 0.4);
        }

        const exit = exitOf(index);
        const ease = cut === 'hard' ? 'steps(2)' : 'power2.in';
        timeline
          .to(content, { autoAlpha: 0, yPercent: -3, duration: 0.49, ease }, exit)
          .to([ground, glow], { autoAlpha: 0, duration: CLEAR - 0.14, ease }, exit + 0.14);
      });
      timeline.set({}, {}, TOTAL);

      const sync = () => {
        const time = timeline.time();
        const running = Boolean(timeline.scrollTrigger?.isActive) && time > 0;

        let current: string | null = null;
        let tint: string | null = null;
        let dark = false;
        films.forEach((film, index) => {
          if (inView && time >= starts[index] + 0.135 && time <= exitOf(index) + 0.245) current = film.id;
          if (running && time >= starts[index]) tint = `color-mix(in srgb, ${film.nav ?? film.accent} 82%, ${film.ink})`;
          const lit = starts[index] + (film.cut === 'dissolve' ? 0.6 : film.cut === 'wipe' ? 0.45 : 0.01);
          if (time >= lit && time <= exitOf(index) + 0.5) dark = true;
        });

        if (current !== local.active) {
          local.active = current;
          setActive(current);
        }
        if (tint !== local.tint) {
          local.tint = tint;
          stage.set({ accent: tint });
        }
        const theme = dark ? 'dark' : 'light';
        if (theme !== local.theme) {
          local.theme = theme;
          section.dataset.navTheme = theme;
        }
      };
      timeline.eventCallback('onUpdate', sync);

      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          inView = self.isActive;
          sync();
        },
        onRefresh: (self) => {
          inView = self.isActive;
          sync();
        },
      });
      sync();
    }, section);

    return () => {
      context.revert();
      loader.disconnect();
      videos.forEach((video) => {
        video.removeEventListener('loadeddata', onData);
        video.pause();
      });
      stage.set({ accent: null });
    };
  }, [pinned]);

  // only the chapter on screen plays
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    section.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      setPlaying(video, !playerOpen && video.dataset.film === active);
    });
  }, [active, playerOpen]);

  return (
    <section
      className={styles.films}
      ref={sectionRef}
      aria-label="Personal films"
      data-stage={pinned ? 'pinned' : 'flow'}
      data-paint={painted ? 'active' : 'waiting'}
      data-nav-section="personal"
      data-nav-line="0.5"
      data-nav-theme={pinned ? 'light' : 'dark'}
      data-nav-at={pinned ? 'top' : undefined}
      style={{ '--film-screens': SCREENS.toFixed(4) } as React.CSSProperties}
    >
      <div className={styles.stage}>
        <ol className={styles.chapters}>
          {films.map((film) => {
            const live = !pinned || active === film.id;
            return (
              <li
                className={styles.chapter}
                key={film.id}
                data-film-chapter={film.id}
                data-cut={film.cut}
                data-font={film.font}
                style={
                  {
                    '--film-paper': film.paper,
                    '--film-ink': film.ink,
                    '--film-accent': film.accent,
                    '--film-glow': film.glow,
                    '--film-ratio': film.ratio,
                    '--film-title-case': film.titleCase,
                    '--film-title-tracking': film.titleTracking,
                    '--film-title-scale': film.titleScale,
                  } as React.CSSProperties
                }
              >
                <div className={styles.chapterInner}>
                  <span className={styles.ground} data-chapter-ground />
                  <span className={styles.glow} data-chapter-glow />
                  <div className={styles.layout} data-chapter-content>
                    <div className={styles.head}>
                      <Title film={film} />
                      <p className={styles.kicker}>{film.kicker}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.frame}
                      data-active={live}
                      style={{ aspectRatio: film.ratio }}
                      aria-label={`Watch ${film.title}`}
                      onClick={(event) =>
                        openPlayer({
                          src: asset(film.video),
                          poster: asset(film.poster),
                          title: film.title,
                          context: film.kicker,
                          ratio: ratioOf(film),
                          origin: event.currentTarget.getBoundingClientRect(),
                        })
                      }
                    >
                      <img className={styles.poster} src={asset(film.poster)} alt="" loading="lazy" decoding="async" />
                      <video
                        className={styles.video}
                        muted
                        loop
                        playsInline
                        preload="none"
                        tabIndex={-1}
                        aria-hidden="true"
                        disablePictureInPicture
                        data-film={film.id}
                        data-src={asset(film.video)}
                      />
                      <span className={styles.play} aria-hidden="true">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 5v14l11-7z" fill="currentColor" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
