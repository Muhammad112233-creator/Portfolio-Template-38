'use client';

import { openPlayer } from '@/lib/stage';
import styles from './About.module.scss';

type Props = { label: string; preview: string; full: string; poster?: string; feature?: boolean };

/** A tiny looping clip set inline with the text. Click to watch the full piece. */
export default function ChipButton({ label, preview, full, poster, feature = false }: Props) {
  return (
    <span className={`${styles.chipWrap} ${feature ? '' : styles.chipWrapInline}`} data-reveal="chip">
      <button
        type="button"
        className={`${styles.chip} ${feature ? styles.chipFeature : ''}`}
        aria-label={`Play video: ${label}`}
        onClick={(event) => openPlayer({ src: full, poster, title: label, origin: event.currentTarget.getBoundingClientRect() })}
      >
        <span className={styles.chipMedia} aria-hidden="true">
          <video muted loop playsInline preload="none" tabIndex={-1} data-src={preview} data-chip-video />
        </span>
        <span className={styles.chipPlay}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
        <span className={styles.chipLabel} aria-hidden="true">
          {label}
        </span>
      </button>
    </span>
  );
}
