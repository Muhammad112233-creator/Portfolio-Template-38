'use client';

import { useEffect, useRef, useState } from 'react';
import { site } from '@/content/site';
import { asset } from '@/lib/asset';
import { openPlayer, player } from '@/lib/stage';
import { setPlaying } from '@/lib/video';
import styles from './Cover.module.scss';

/**
 * A silent loop on the page; click it for the full player with sound.
 * `active` is driven by the scroll scene that owns it.
 */
export default function Showreel({ active }: { active: boolean }) {
  const { reel } = site.cover;
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const [muted, setMuted] = useState(true);
  const [follow, setFollow] = useState(false);
  const [duration, setDuration] = useState(0);
  const playerOpen = player.use((s) => s.source !== null);

  // play only while the scene is on screen and the big player is closed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaying(video, active && !playerOpen, false);
    if (!active && !video.muted) {
      video.muted = true;
      setMuted(true);
    }
  }, [active, playerOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      const total = video.duration || 0;
      const ratio = total ? video.currentTime / total : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${ratio})`;
      if (scrubRef.current && document.activeElement !== scrubRef.current) scrubRef.current.value = String(video.currentTime);
    };
    const onMeta = () => setDuration(video.duration || 0);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  // the "view showreel" label trails the pointer
  useEffect(() => {
    const stage = stageRef.current;
    const cue = cueRef.current;
    if (!stage || !cue || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setFollow(true);
    let frame = 0;
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let inside = false;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cue.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame = inside || Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      tx = event.clientX - rect.left;
      ty = event.clientY - rect.top;
      if (!inside) {
        inside = true;
        x = tx;
        y = ty;
      }
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      inside = false;
    };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const open = (event: React.MouseEvent<HTMLButtonElement>) => {
    const video = videoRef.current;
    openPlayer({
      src: asset(reel.video),
      poster: asset(reel.poster),
      title: reel.title,
      startAt: video?.currentTime ?? 0,
      origin: event.currentTarget.getBoundingClientRect(),
    });
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <figure className={styles.reel} data-cover-reel>
      <div className={styles.stage} ref={stageRef}>
        <button type="button" className={styles.frame} aria-label="Open the showreel in the fullscreen player" onClick={open}>
          <video
            className={styles.film}
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            tabIndex={-1}
            aria-hidden="true"
            poster={asset(reel.poster)}
            data-src={asset(reel.video)}
          />
        </button>
        <span className={styles.cue} ref={cueRef} data-follow={follow} aria-hidden="true">
          <span className={styles.label}>{reel.label}</span>
        </span>
        <button type="button" className={styles.sound} aria-pressed={!muted} onClick={toggleSound}>
          <span className={styles.label}>{muted ? reel.soundOff : reel.soundOn}</span>
        </button>
        <span className={styles.edge} aria-hidden="true">
          <span className={styles.edgeFill} ref={fillRef} />
        </span>
        <input
          className={styles.scrub}
          ref={scrubRef}
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          defaultValue={0}
          aria-label="Showreel position"
          onChange={(event) => {
            const video = videoRef.current;
            if (video) video.currentTime = Number(event.target.value);
          }}
        />
      </div>
    </figure>
  );
}
