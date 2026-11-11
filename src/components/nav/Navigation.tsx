'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { site, type SectionId } from '@/content/site';
import { scrollToSection } from '@/lib/sections';
import { stage } from '@/lib/stage';
import styles from './Navigation.module.scss';

const LABELS: Record<SectionId, string> = {
  hero: site.nav.home,
  contact: site.nav.contactLabel,
  ...(Object.fromEntries(site.nav.items.map((item) => [item.id, item.label])) as Record<
    Exclude<SectionId, 'hero' | 'contact'>,
    string
  >),
};

/** Two clips with a cut between them. */
function Mark() {
  return (
    <svg viewBox="0 0 40 18" aria-hidden="true">
      <path d="M1 3.2h13.6l5 11.6H1z" fill="currentColor" />
      <path d="M19.4 3.2H39v11.6H24.4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M30.2 6.4v5.2l4-2.6z" fill="currentColor" />
    </svg>
  );
}

function Wordmark({ decorative = false, onClick }: { decorative?: boolean; onClick?: (event: React.MouseEvent) => void }) {
  const inner = (
    <span className={styles.logoSwap} aria-hidden="true">
      <span className={styles.mark}>
        <span className={styles.smoke}>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <Mark />
      </span>
      <span className={styles.signature}>
        {site.person.name}
        <span className={styles.signatureTip} />
      </span>
    </span>
  );
  if (decorative) return <span className={styles.wordmark}>{inner}</span>;
  return (
    <a className={styles.wordmark} href="#home" aria-label={`${site.person.name}, back to the top`} onClick={onClick}>
      {inner}
    </a>
  );
}

/** Letters roll to a copy of themselves, one after another. */
function SlotLabel({ text }: { text: string }) {
  let count = 0;
  return (
    <span className={styles.slotLabel} aria-hidden="true">
      {text.split(' ').map((word, w) => (
        <span className={styles.slotWord} key={w}>
          {Array.from(word).map((char, c) => {
            const index = count++;
            return (
              <span className={styles.slotWindow} key={c}>
                <span className={styles.slotGlyph} style={{ '--c': index } as React.CSSProperties}>
                  <span>{char}</span>
                  <span>{char}</span>
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

export default function Navigation() {
  const ready = stage.use((s) => s.ready);
  const section = stage.use((s) => s.section);
  const theme = stage.use((s) => s.theme);
  const heroScrolling = stage.use((s) => s.heroScrolling);
  const immersive = stage.use((s) => s.immersive);
  const footerEnd = stage.use((s) => s.footerEnd);
  const accent = stage.use((s) => s.accent);
  const wiping = stage.use((s) => s.wiping);

  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const hidden = !ready || heroScrolling || immersive || footerEnd;
  const tinted = section === 'personal' && theme === 'dark' && Boolean(accent);

  useEffect(() => {
    if (hidden && open) setOpen(false);
  }, [hidden, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
    };
    const onPointer = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const go = useCallback(
    (id: SectionId) => (event: React.MouseEvent) => {
      event.preventDefault();
      setOpen(false);
      scrollToSection(id);
    },
    [],
  );

  const label = LABELS[section];

  return (
    <>
      <div
        className={styles.shell}
        ref={shellRef}
        data-nav-rail
        data-active={ready}
        data-open={open}
        data-theme={theme}
        data-section={section}
        data-tinted={tinted}
        data-immersive={immersive}
        data-footer-end={footerEnd}
        data-hero-scrolling={heroScrolling}
        style={tinted ? ({ '--nav-accent': accent } as React.CSSProperties) : undefined}
      >
        <div className={styles.frame} inert={hidden}>
          <div className={styles.menuViewport} id={menuId} inert={!open}>
            <nav className={styles.menuPanel} aria-label="Sections">
              <ul className={styles.menuList}>
                {site.nav.items.map((item, index) => (
                  <li key={item.id} data-current={section === item.id} style={{ '--i': index } as React.CSSProperties}>
                    <a href={`#${item.id}`} onClick={go(item.id as SectionId)} aria-current={section === item.id ? 'true' : undefined}>
                      <span className="sr-only">{item.label}</span>
                      <SlotLabel text={item.label} />
                    </a>
                  </li>
                ))}
              </ul>
              <a className={styles.cta} href="#contact" onClick={go('contact')}>
                <span>{site.nav.cta}</span>
              </a>
            </nav>
          </div>

          <div className={styles.bar}>
            <Wordmark onClick={go('hero')} />
            <a className={styles.current} href={`#${section === 'hero' ? 'home' : section}`} onClick={go(section)} aria-live="polite">
              {label}
            </a>
            <button
              className={styles.menuButton}
              ref={buttonRef}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </div>

      {/* a paper-coloured twin of the rail, revealed by the same wipe that turns the page white */}
      <div className={`${styles.skin} ${styles.skinLight}`} data-active={wiping && !hidden && !open} aria-hidden="true">
        <div className={styles.skinRail}>
          <div className={styles.frame}>
            <div className={styles.bar}>
              <Wordmark decorative />
              <span className={styles.current}>{label}</span>
              <span className={styles.menuButton}>
                <span />
                <span />
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
