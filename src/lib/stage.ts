import type { SectionId } from '@/content/site';
import { createStore } from './store';

export type WalkPhase = 'start' | 'walking' | 'complete';
export type NavTheme = 'dark' | 'light';

/** Page-level state shared by the navigation, the hero and the sections. */
export const stage = createStore({
  /** true once the intro has handed over to the page */
  ready: false,
  section: 'hero' as SectionId,
  theme: 'dark' as NavTheme,
  walk: 'start' as WalkPhase,
  heroScrolling: false,
  /** the page is folded into a card: hide the chrome */
  immersive: false,
  footerEnd: false,
  /** accent picked up from the personal film currently on screen */
  accent: null as string | null,
  /** the diagonal wipe is crossing the screen */
  wiping: false,
});

export type PlayerSource = {
  src: string;
  poster?: string;
  title: string;
  discipline?: string;
  context?: string;
  credit?: string;
  /** width / height, e.g. 16 / 9 */
  ratio?: number;
  startAt?: number;
  /** where the click came from, so the player can grow out of it */
  origin?: DOMRect;
};

export const player = createStore({ source: null as PlayerSource | null });

export function openPlayer(source: PlayerSource) {
  player.set({ source });
}
export function closePlayer() {
  player.set({ source: null });
}

const immersiveKeys = new Set<string>();
/** Several scenes can fold the page away; the chrome returns when none of them does. */
export function setImmersive(key: string, on: boolean) {
  if (on) immersiveKeys.add(key);
  else immersiveKeys.delete(key);
  stage.set({ immersive: immersiveKeys.size > 0 });
}
