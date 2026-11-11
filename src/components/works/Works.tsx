'use client';

import { useEffect, useRef, useState } from 'react';
import { site, type Film } from '@/content/site';
import { asset } from '@/lib/asset';
import { prefersReducedMotion, requestRefresh, scrollToY, ScrollTrigger } from '@/lib/scroll';
import { openPlayer } from '@/lib/stage';
import { formatTime, prime } from '@/lib/video';
import styles from './Works.module.scss';

/**
 * How one film's share of the scroll is spent: most of it cranks the film
 * forward, then it rests with a play button, then the next one slides in.
 */
const SCRUB = 0.62;
const HOLD = 0.14;
const SLIDE = 0.24;
/** The last stretch is a quiet "end of reel" before the next section. */
const TAIL_AT = 0.85;
/** Screens of scrolling the whole section takes. */
const SCREENS = 7.2;

type Beat = 'scrub' | 'hold' | 'slide' | 'tail';
type Spot = { index: number; beat: Beat; local: number; film: number; position: number };

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const unitsFor = (count: number) => count * (SCRUB + HOLD) + (count - 1) * SLIDE;

function locate(progress: number, count: number): Spot {
  if (progress >= TAIL_AT) {
    return { index: count - 1, beat: 'tail', local: (progress - TAIL_AT) / (1 - TAIL_AT), film: 1, position: count - 1 };
  }
  const at = (Math.max(0, progress) / TAIL_AT) * unitsFor(count);
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    if (at < cursor + SCRUB) {
      const local = (at - cursor) / SCRUB;
      return { index, beat: 'scrub', local, film: local, position: index };
    }
    cursor += SCRUB;
    if (at < cursor + HOLD || index === count - 1) {
      return { index, beat: 'hold', local: Math.min(1, (at - cursor) / HOLD), film: 1, position: index };
    }
    cursor += HOLD;
    if (at < cursor + SLIDE) {
      const local = (at - cursor) / SLIDE;
      return { index, beat: 'slide', local, film: 1, position: index + easeInOut(local) };
    }
    cursor += SLIDE;
  }
  return { index: count - 1, beat: 'hold', local: 1, film: 1, position: count - 1 };
}

/** Scroll progress at which a film starts running. */
const startOf = (index: number, count: number) => ((index * (SCRUB + HOLD + SLIDE)) / unitsFor(count)) * TAIL_AT;

/** Seeks a video as fast as the decoder allows, always chasing the latest target. */
function createScrubber(video: HTMLVideoElement) {
  let target = 0;
  let busy = false;
  let watchdog = 0;
  const seek = () => {
    if (video.readyState < 1 || Math.abs(video.currentTime - target) < 0.02) return;
    busy = true;
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(() => (busy = false), 400);
    video.currentTime = target;
  };
  const onSeeked = () => {
    busy = false;
    seek();
  };
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('loadedmetadata', onSeeked);
  return {
    to(time: number) {
      target = time;
      if (!busy) seek();
    },
    destroy() {
      window.clearTimeout(watchdog);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadedmetadata', onSeeked);
    },
  };
}

type CuePhase = 'none' | 'invite' | 'keep' | 'play' | 'tail';

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 18" aria-hidden="true">
      <path d="M6 1v16M2 13l4 4 4-4" />
    </svg>
  );
}

export default function Works() {
  const { films, cue, endLabel } = site.works;
  const count = films.length;

  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [still, setStill] = useState(false);
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<CuePhase>('invite');
  const [info, setInfo] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStill(true);
      requestRefresh();
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const strip = stripRef.current;
    if (still || !section || !strip) return;

    const videos = videoRefs.current.filter(Boolean) as HTMLVideoElement[];
    const scrubbers = videos.map(createScrubber);
    const state = { active: -1, phase: '' as string, clock: '', total: '' };

    const onData = (event: Event) => ((event.target as HTMLVideoElement).dataset.ready = 'true');
    videos.forEach((video) => video.addEventListener('loadeddata', onData));

    // fetch the films a little before they are needed
    const loader = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        videos.forEach((video) => {
          video.preload = 'auto';
          prime(video);
        });
        loader.disconnect();
      },
      { rootMargin: '150% 0px' },
    );
    loader.observe(section);

    const render = (progress: number) => {
      const spot = locate(progress, count);
      strip.style.setProperty('--pos', spot.position.toFixed(4));

      videos.forEach((video, index) => {
        const length = Number.isFinite(video.duration) ? video.duration : 0;
        const end = Math.max(0, length - 0.05);
        const share = index < spot.index ? 1 : index > spot.index ? 0 : spot.film;
        scrubbers[index].to(share * end);
        const slide = slideRefs.current[index];
        slide?.style.setProperty('--dim', Math.min(0.72, Math.abs(index - spot.position) * 0.72).toFixed(3));
      });

      const video = videos[spot.index];
      const length = video && Number.isFinite(video.duration) ? video.duration : 0;
      fillRef.current?.style.setProperty('transform', `scaleX(${spot.film.toFixed(4)})`);
      headRef.current?.style.setProperty('left', `${(spot.film * 100).toFixed(2)}%`);
      if (tailRef.current) tailRef.current.style.transform = `scaleY(${spot.beat === 'tail' ? spot.local.toFixed(3) : 0})`;

      const clock = spot.beat === 'tail' ? endLabel : formatTime(spot.film * length);
      if (clock !== state.clock && nowRef.current) nowRef.current.textContent = state.clock = clock;
      const total = formatTime(length);
      if (total !== state.total && totalRef.current) totalRef.current.textContent = state.total = total;

      const nextActive = Math.round(spot.position);
      if (nextActive !== state.active) {
        state.active = nextActive;
        setActive(nextActive);
        setInfo(false);
      }
      const nextPhase: CuePhase =
        spot.beat === 'tail' ? 'tail' : spot.beat === 'hold' ? 'play' : spot.beat === 'slide' ? 'none' : progress < 0.012 ? 'invite' : 'keep';
      if (nextPhase !== state.phase) {
        state.phase = nextPhase;
        setPhase(nextPhase);
      }
    };

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
    const onMeta = () => render(trigger.progress);
    videos.forEach((video) => video.addEventListener('loadedmetadata', onMeta));
    render(0);

    return () => {
      trigger.kill();
      loader.disconnect();
      scrubbers.forEach((scrubber) => scrubber.destroy());
      videos.forEach((video) => {
        video.removeEventListener('loadeddata', onData);
        video.removeEventListener('loadedmetadata', onMeta);
      });
    };
  }, [still, count, endLabel]);

  useEffect(() => {
    if (!info) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setInfo(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [info]);

  const watch = (film: Film, element: Element | null) =>
    openPlayer({
      src: asset(film.video),
      poster: asset(film.poster),
      title: film.title,
      discipline: film.discipline,
      context: film.context,
      credit: film.credit,
      origin: element?.getBoundingClientRect(),
    });

  const onSlide = (index: number) => {
    if (index === active) return watch(films[index], slideRefs.current[index]);
    // a neighbouring film: wind the page to where it starts
    const section = sectionRef.current;
    if (!section) return;
    const distance = section.offsetHeight - window.innerHeight;
    scrollToY(section.getBoundingClientRect().top + window.scrollY + startOf(index, count) * distance + 2);
  };

  if (still) {
    return (
      <section className={styles.works} id="work" aria-label="Selected work" data-still="true" data-anchor="work" data-nav-section="work" data-nav-theme="dark">
        <h2 className="sr-only">Selected work</h2>
        <ol className={styles.list}>
          {films.map((film) => (
            <li className={styles.listItem} key={film.id}>
              <button type="button" className={styles.listButton} onClick={(event) => watch(film, event.currentTarget)}>
                <img src={asset(film.poster)} alt="" loading="lazy" decoding="async" />
                <span className="sr-only">Play {film.title}</span>
              </button>
              <div className={styles.listDetails}>
                <div className={styles.listLine}>
                  <span className={styles.listDiscipline}>{film.discipline}</span>
                  <span className={styles.listTitle}>{film.title}</span>
                </div>
                <p className={styles.listContext}>{film.context}</p>
                <p className={styles.listCredit}>{film.credit}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const live = phase === 'play';

  return (
    <section
      className={styles.works}
      ref={sectionRef}
      id="work"
      aria-label="Selected work"
      data-still="false"
      data-anchor="work"
      data-nav-section="work"
      data-nav-theme="dark"
      style={{ '--rail-screens': SCREENS } as React.CSSProperties}
    >
      <h2 className="sr-only">Selected work</h2>
      <div className={styles.stage}>
        <div className={styles.deck}>
          <div className={styles.column}>
            <div className={styles.captions}>
              {films.map((film, index) => (
                <p className={styles.caption} key={film.id} data-active={index === active} inert={index !== active}>
                  <button
                    type="button"
                    className={styles.infoTrigger}
                    aria-expanded={info && index === active}
                    aria-controls={`work-info-${film.id}`}
                    onClick={() => setInfo((value) => !value)}
                  >
                    <span>{film.discipline}</span>
                    <span className={styles.infoMark} aria-hidden="true">
                      i
                    </span>
                    <span className="sr-only">, about this project</span>
                  </button>
                  <span className={styles.infoDescription} id={`work-info-${film.id}`} hidden={!(info && index === active)}>
                    <span>
                      {film.context}
                      <small>
                        {film.title} · {film.credit}
                      </small>
                    </span>
                  </span>
                </p>
              ))}
            </div>

            <div className={styles.viewer}>
              <div className={styles.strip} ref={stripRef}>
                {films.map((film, index) => (
                  <button
                    type="button"
                    className={styles.slide}
                    key={film.id}
                    ref={(element) => {
                      slideRefs.current[index] = element;
                    }}
                    style={{ '--i': index } as React.CSSProperties}
                    aria-label={index === active ? `Play ${film.title} in full` : `Go to ${film.title}`}
                    onClick={() => onSlide(index)}
                  >
                    <img src={asset(film.poster)} alt="" loading="lazy" decoding="async" />
                    <video
                      ref={(element) => {
                        videoRefs.current[index] = element;
                      }}
                      muted
                      playsInline
                      preload="none"
                      tabIndex={-1}
                      aria-hidden="true"
                      disablePictureInPicture
                      data-src={asset(film.video)}
                    />
                    <span className={styles.slideShade} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.play}
                data-live={live}
                tabIndex={live ? 0 : -1}
                aria-hidden={!live}
                aria-label={`Play ${films[active].title} in full`}
                onClick={() => watch(films[active], slideRefs.current[active])}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div className={styles.rail} data-beat={phase === 'tail' ? 'tail' : 'run'} aria-hidden="true">
              <span className={styles.railLine}>
                <span className={styles.railFill} ref={fillRef} />
                <span className={styles.railHead} ref={headRef} />
              </span>
              <div className={styles.railClock}>
                <span ref={nowRef}>0:00</span>
                <span className={styles.railTotal} ref={totalRef}>
                  0:00
                </span>
              </div>
            </div>

            <p className={styles.cue} data-phase={phase} aria-hidden="true">
              <span className={styles.cueGlyph}>
                <ArrowDown className={styles.cueArrow} />
                <svg className={styles.cuePlay} viewBox="0 0 12 18">
                  <path d="M2 4.5v9l8-4.5z" />
                </svg>
              </span>
              <span className={styles.cueLabel}>
                <span data-copy="invite">
                  <span className={styles.cueMouse}>{cue.invite.mouse}</span>
                  <span className={styles.cueTouch}>{cue.invite.touch}</span>
                </span>
                <span data-copy="keep">
                  <span className={styles.cueMouse}>{cue.keep.mouse}</span>
                  <span className={styles.cueTouch}>{cue.keep.touch}</span>
                </span>
                <span data-copy="play">{cue.play}</span>
                <span data-copy="tail">{cue.tail}</span>
              </span>
              <span className={styles.tailLine} ref={tailRef} />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
