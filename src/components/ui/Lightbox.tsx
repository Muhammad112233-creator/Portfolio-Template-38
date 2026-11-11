'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { lockScroll, prefersReducedMotion, unlockScroll } from '@/lib/scroll';
import { closePlayer, player, type PlayerSource } from '@/lib/stage';
import { formatTime } from '@/lib/video';
import styles from './Lightbox.module.scss';

const RATES = [1, 1.25, 1.5, 2, 0.5];
const IDLE_AFTER = 2400;

const Icon = {
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M7 5h4v14H7zM13 5h4v14h-4z" />,
  sound: <path d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5zm-2-8.2v2.1a7 7 0 0 1 0 12.2v2.1a9 9 0 0 0 0-16.4z" />,
  muted: <path d="M4 9v6h4l5 4V5L8 9H4zm17.3.1-1.4-1.4L17.5 10l-2.4-2.3-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4-2.4-2.4z" />,
  expand: <path d="M5 5h6v2H7v4H5V5zm14 0v6h-2V7h-4V5h6zM5 19v-6h2v4h4v2H5zm14 0h-6v-2h4v-4h2v6z" />,
  shrink: <path d="M11 5v6H5V9h4V5h2zm2 0h2v4h4v2h-6V5zM5 13h6v6H9v-4H5v-2zm8 0h6v2h-4v4h-2v-6z" />,
};

export default function Lightbox() {
  const source = player.use((s) => s.source);
  // keep the last source mounted while the dialog animates out
  const [shown, setShown] = useState<PlayerSource | null>(null);
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const idleTimer = useRef(0);

  const [paused, setPaused] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [idle, setIdle] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [full, setFull] = useState(false);

  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused && !frameRef.current?.querySelector(':focus-visible')) setIdle(true);
    }, IDLE_AFTER);
  }, []);

  // ── open ──
  useEffect(() => {
    if (!source) return;
    setShown(source);
    setState('open');
    setPaused(false);
    setWaiting(true);
    setRate(1);
  }, [source]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const frame = frameRef.current;
    const video = videoRef.current;
    if (state !== 'open' || !shown || !dialog || !frame || !video) return;

    if (!dialog.open) dialog.showModal();
    lockScroll('player');

    // grow out of whatever was clicked
    const origin = shown.origin;
    if (origin && !prefersReducedMotion()) {
      const rect = frame.getBoundingClientRect();
      const scale = Math.max(origin.width / rect.width, origin.height / rect.height);
      const x = origin.left + origin.width / 2 - (rect.left + (rect.width * scale) / 2);
      const y = origin.top + origin.height / 2 - (rect.top + (rect.height * scale) / 2);
      frame.animate(
        [
          { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 0.4 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    } else {
      frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }

    video.muted = false;
    video.volume = volume;
    video.playbackRate = 1;
    const start = () => {
      if (shown.startAt && Number.isFinite(video.duration)) video.currentTime = Math.min(shown.startAt, Math.max(0, video.duration - 0.25));
    };
    if (video.readyState >= 1) start();
    else video.addEventListener('loadedmetadata', start, { once: true });
    video.play().catch(() => {
      // sound was refused without a gesture: fall back to silent playback
      video.muted = true;
      setMuted(true);
      video.play().catch(() => setPaused(true));
    });
    wake();

    return () => {
      video.removeEventListener('loadedmetadata', start);
      window.clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, shown]);

  // ── close ──
  const close = useCallback(() => {
    if (state !== 'open') return;
    setState('closing');
    videoRef.current?.pause();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    const frame = frameRef.current;
    const finish = () => {
      dialogRef.current?.close();
      unlockScroll('player');
      setState('closed');
      setShown(null);
      closePlayer();
    };
    if (!frame || prefersReducedMotion()) return finish();
    const animation = frame.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'scale(0.96)', opacity: 0 },
      ],
      { duration: 220, easing: 'ease-in', fill: 'forwards' },
    );
    animation.onfinish = finish;
    animation.oncancel = finish;
  }, [state]);

  useEffect(() => () => unlockScroll('player'), []);

  // ── keep the interface in step with the video ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shown) return;
    let frame = 0;
    const paint = () => {
      const total = Number.isFinite(video.duration) ? video.duration : 0;
      const seek = seekRef.current;
      if (seek) {
        seek.max = String(total || 1);
        if (document.activeElement !== seek || video.paused === false) seek.value = String(video.currentTime);
        seek.style.setProperty('--fill', `${total ? (video.currentTime / total) * 100 : 0}%`);
        seek.setAttribute('aria-valuetext', `${formatTime(video.currentTime)} of ${formatTime(total)}`);
      }
      if (timeRef.current) timeRef.current.textContent = `${formatTime(video.currentTime)} / ${formatTime(total)}`;
    };
    const loop = () => {
      paint();
      frame = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setPaused(false);
      cancelAnimationFrame(frame);
      loop();
      wake();
    };
    const onPause = () => {
      setPaused(true);
      setIdle(false);
      cancelAnimationFrame(frame);
      paint();
    };
    const onWaiting = () => setWaiting(true);
    const onReady = () => setWaiting(false);
    const onVolume = () => {
      setMuted(video.muted || video.volume === 0);
      setVolume(video.volume);
    };
    const onFull = () => setFull(document.fullscreenElement === frameRef.current);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('seeked', paint);
    video.addEventListener('loadedmetadata', paint);
    video.addEventListener('volumechange', onVolume);
    document.addEventListener('fullscreenchange', onFull);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('seeked', paint);
      video.removeEventListener('loadedmetadata', paint);
      video.removeEventListener('volumechange', onVolume);
      document.removeEventListener('fullscreenchange', onFull);
    };
  }, [shown, wake]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.6;
    } else {
      video.muted = true;
    }
  };
  const cycleRate = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    video.playbackRate = next;
    setRate(next);
  };
  const toggleFull = () => {
    const frame = frameRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!frame || !video) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else if (frame.requestFullscreen) frame.requestFullscreen().catch(() => undefined);
    else video.webkitEnterFullscreen?.(); // iPhone only offers the native player
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const video = videoRef.current;
    if (!video) return;
    const target = event.target as HTMLElement;
    const onRange = target instanceof HTMLInputElement;
    const onButton = target instanceof HTMLButtonElement;
    wake();
    switch (event.key) {
      case ' ':
      case 'k':
        if (onButton && event.key === ' ') return;
        event.preventDefault();
        toggle();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (onRange) return;
        event.preventDefault();
        video.currentTime = Math.min(video.duration || 0, Math.max(0, video.currentTime + (event.key === 'ArrowRight' ? 5 : -5)));
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        if (onRange) return;
        event.preventDefault();
        video.muted = false;
        video.volume = Math.min(1, Math.max(0, video.volume + (event.key === 'ArrowUp' ? 0.1 : -0.1)));
        break;
      case 'm':
        toggleMute();
        break;
      case 'f':
        toggleFull();
        break;
    }
  };

  const heading = shown?.discipline ?? shown?.title ?? '';
  const detail = shown ? [shown.discipline ? shown.title : null, shown.credit].filter(Boolean).join(' · ') : '';

  return (
    <dialog
      className={styles.lightbox}
      ref={dialogRef}
      data-state={state}
      aria-label={shown ? `Playing ${shown.title}` : 'Video player'}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
      data-lenis-prevent
    >
      <div className={styles.backdrop} onClick={close} />
      {shown ? (
        <>
          <div
            className={styles.frame}
            ref={frameRef}
            data-paused={paused}
            data-waiting={waiting && !paused}
            data-idle={idle}
            style={{ '--ratio': (shown.ratio ?? 16 / 9).toFixed(4) } as React.CSSProperties}
          >
            <div className={styles.media} onClick={toggle}>
              <video className={styles.film} ref={videoRef} src={shown.src} poster={shown.poster} playsInline preload="auto" loop={false} />
              <span className={styles.spinner} aria-hidden="true" />
              <button
                type="button"
                className={styles.bigPlay}
                aria-label="Play"
                tabIndex={paused ? 0 : -1}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {Icon.play}
                </svg>
              </button>
            </div>

            <div className={styles.controls}>
              <div className={styles.meta}>
                <p className={styles.caption}>{heading}</p>
                {detail ? <p className={styles.context}>{detail}</p> : null}
              </div>
              <input
                className={styles.range}
                ref={seekRef}
                type="range"
                min={0}
                max={1}
                step={0.05}
                defaultValue={0}
                aria-label="Seek"
                onInput={(event) => {
                  const video = videoRef.current;
                  if (video) video.currentTime = Number(event.currentTarget.value);
                }}
              />
              <div className={styles.row}>
                <button type="button" className={styles.button} aria-label={paused ? 'Play' : 'Pause'} onClick={toggle}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {paused ? Icon.play : Icon.pause}
                  </svg>
                </button>
                <span className={styles.time} ref={timeRef}>
                  0:00 / 0:00
                </span>
                <span className={styles.spacer} />
                <div className={styles.volume}>
                  <button type="button" className={styles.button} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} onClick={toggleMute}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {muted ? Icon.muted : Icon.sound}
                    </svg>
                  </button>
                  <input
                    className={styles.range}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    aria-label="Volume"
                    style={{ '--fill': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                    onChange={(event) => {
                      const video = videoRef.current;
                      if (!video) return;
                      video.volume = Number(event.target.value);
                      video.muted = video.volume === 0;
                    }}
                  />
                </div>
                <button type="button" className={styles.button} aria-label={`Playback speed ${rate}×`} onClick={cycleRate}>
                  {rate}×
                </button>
                <button type="button" className={styles.button} aria-label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFull}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {full ? Icon.shrink : Icon.expand}
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <button type="button" className={styles.close} aria-label="Close player" onClick={close}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </>
      ) : null}
    </dialog>
  );
}
