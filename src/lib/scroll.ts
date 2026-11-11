import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
const locks = new Set<string>();

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 64rem)').matches;

export function getLenis() {
  return lenis;
}

function applyLocks() {
  const locked = locks.size > 0;
  document.documentElement.classList.toggle('is-locked', locked);
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

/** Freeze scrolling for as long as at least one key is held. */
export function lockScroll(key: string) {
  locks.add(key);
  applyLocks();
}
export function unlockScroll(key: string) {
  locks.delete(key);
  applyLocks();
}

export function scrollToY(y: number, immediate = false) {
  const top = Math.max(0, Math.round(y));
  if (lenis && !immediate) {
    lenis.scrollTo(top, { duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 4), lock: false });
  } else {
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }
}

let refreshQueued = 0;
/** Collapse bursts of refresh requests (fonts, images, resize) into one. */
export function requestRefresh() {
  window.clearTimeout(refreshQueued);
  refreshQueued = window.setTimeout(() => ScrollTrigger.refresh(), 120);
}

export function initScroll() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const tick = (time: number) => lenis?.raf(time * 1000);

  if (!prefersReducedMotion()) {
    lenis = new Lenis({ lerp: 0.105, wheelMultiplier: 0.95, touchMultiplier: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }
  applyLocks();

  const onResize = () => requestRefresh();
  window.addEventListener('orientationchange', onResize);
  document.fonts?.ready.then(requestRefresh);
  window.addEventListener('load', requestRefresh);

  return () => {
    window.removeEventListener('orientationchange', onResize);
    window.removeEventListener('load', requestRefresh);
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

export { gsap, ScrollTrigger };
