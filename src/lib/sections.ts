import type { SectionId } from '@/content/site';
import { scrollToY, ScrollTrigger } from './scroll';
import { stage, type NavTheme } from './stage';

/**
 * Sections overlap and pin, so "which section is this?" cannot be read from
 * simple offsets. Instead, elements carry small markers:
 *
 *   data-nav-section="work" data-nav-line="0.5"
 *       the label switches once the element's top passes 50% of the viewport
 *   data-nav-theme="dark" [data-nav-edge="bottom"] [data-nav-at="top"]
 *       the rail takes this theme once the element's top (or bottom) edge
 *       passes the rail, or the top of the screen with data-nav-at="top"
 *       (for sections that only show once they are pinned)
 *   data-anchor="work" [data-anchor-offset="0.4"]
 *       where the menu scrolls to, plus an offset in viewport heights
 *
 * In every case the last matching marker in document order wins.
 */
export function trackSections() {
  let sectionMarks: HTMLElement[] = [];
  let themeMarks: HTMLElement[] = [];

  // sections also change theme mid-pin (see PanelShift), so watch the markers
  const observer = new MutationObserver(() => update());

  const collect = () => {
    sectionMarks = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-section]'));
    themeMarks = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-theme]'));
    observer.disconnect();
    themeMarks.forEach((mark) => observer.observe(mark, { attributes: true, attributeFilter: ['data-nav-theme'] }));
  };

  const update = () => {
    const height = window.innerHeight;
    const rail = document.querySelector<HTMLElement>('[data-nav-rail]');
    const railY = rail ? height - parseFloat(getComputedStyle(rail).bottom) - rail.offsetHeight / 2 : height - 80;

    let section: SectionId = 'hero';
    for (const mark of sectionMarks) {
      const line = Number(mark.dataset.navLine ?? 0.5) * height;
      if (mark.getBoundingClientRect().top <= line) section = mark.dataset.navSection as SectionId;
    }

    let theme: NavTheme = 'dark';
    for (const mark of themeMarks) {
      const rect = mark.getBoundingClientRect();
      const edge = mark.dataset.navEdge === 'bottom' ? rect.bottom : rect.top;
      const limit = mark.dataset.navAt === 'top' ? 0.5 : railY;
      if (edge <= limit && mark.dataset.navTheme) theme = mark.dataset.navTheme as NavTheme;
    }

    const doc = document.documentElement;
    const footerEnd = window.scrollY > 0 && window.scrollY + height >= doc.scrollHeight - Math.max(24, height * 0.06);

    stage.set({ section, theme, footerEnd });
  };

  collect();
  update();
  const onRefresh = () => {
    collect();
    update();
  };
  ScrollTrigger.addEventListener('refresh', onRefresh);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  return () => {
    ScrollTrigger.removeEventListener('refresh', onRefresh);
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    observer.disconnect();
  };
}

export function sectionTop(id: SectionId): number {
  if (id === 'hero') return 0;
  const anchor = document.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
  if (!anchor) return 0;
  const offset = Number(anchor.dataset.anchorOffset ?? 0) * window.innerHeight;
  return anchor.getBoundingClientRect().top + window.scrollY + offset;
}

export function scrollToSection(id: SectionId) {
  scrollToY(sectionTop(id));
}
