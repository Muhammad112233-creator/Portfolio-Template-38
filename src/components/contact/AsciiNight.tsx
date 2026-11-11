'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/scroll';
import styles from './Contact.module.scss';

/**
 * The night sky behind the contact form, drawn entirely with text characters
 * on a 2D canvas: stars, a moon, and a meadow that comes into view as the
 * "camera" tilts down while you scroll.
 */

const STAR_GLYPHS = ['.', '.', '·', '+', 'x', '*', 'o', "'"];
const MEADOW_GLYPHS = ['x', 'X', 'o', '0', '%', 'x', ':', 'X', 'o', '#'];
const STAR_TINTS = ['#c9c4ff', '#aab4ff', '#e8e6ff', '#8f9bd9', '#d9d2ff'];
const MEADOW_TINTS = ['#2f7fd0', '#3aa0e6', '#58c8ee', '#2a66b8', '#49b4ea'];

// small deterministic random source, so the sky is the same on every visit
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// smooth 1D noise for the rolling top edge of the meadow
function ridge(x: number) {
  return Math.sin(x * 0.19) * 0.5 + Math.sin(x * 0.53 + 1.7) * 0.3 + Math.sin(x * 1.31 + 0.4) * 0.2;
}

type Star = { x: number; y: number; glyph: string; tint: string; phase: number; speed: number; depth: number };

export default function AsciiNight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const section = canvas?.closest('section');
    if (!canvas || !context || !section) return;

    const reduced = prefersReducedMotion();
    const pointer = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let cellW = 12;
    let cellH = 20;
    let stars: Star[] = [];
    let meadow: { glyph: string; tint: string; lift: number }[][] = [];
    let frame = 0;
    let last = 0;
    let visible = false;

    const build = () => {
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const compact = width < 640;
      cellW = compact ? 10 : 12;
      cellH = compact ? 17 : 20;

      const random = seeded(20261110);
      const count = Math.round((width * height) / (compact ? 5200 : 7600));
      stars = Array.from({ length: count }, () => ({
        x: random(),
        y: random() * 1.12,
        glyph: STAR_GLYPHS[Math.floor(random() * STAR_GLYPHS.length)],
        tint: STAR_TINTS[Math.floor(random() * STAR_TINTS.length)],
        phase: random() * Math.PI * 2,
        speed: 0.4 + random() * 1.3,
        depth: 0.35 + random() * 0.65,
      }));

      // the meadow is a grid of characters; taller where the ridge is higher
      const columns = Math.ceil(width / cellW) + 1;
      const rows = Math.ceil((height * 0.36) / cellH);
      meadow = Array.from({ length: columns }, (_, column) => {
        const crest = 0.55 + ridge(column * (compact ? 1.3 : 1)) * 0.45; // 0.1 … 1
        return Array.from({ length: rows }, (_, row) => {
          const depth = row / rows; // 0 at the top of the meadow
          const filled = random() < Math.min(0.92, Math.max(0, depth * 1.7 - (1 - crest) * 0.9 + 0.08));
          return {
            glyph: filled ? MEADOW_GLYPHS[Math.floor(random() * MEADOW_GLYPHS.length)] : '',
            tint: MEADOW_TINTS[Math.floor(random() * MEADOW_TINTS.length)],
            lift: random(),
          };
        });
      });
    };

    const draw = (now: number) => {
      const time = now / 1000;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const scroll = Math.min(1, Math.max(0, -rect.top / travel));
      // the camera tilts quickly at first, then settles
      const tilt = 1 - Math.pow(1 - scroll, 12);

      context.clearRect(0, 0, width, height);
      context.textBaseline = 'middle';
      context.textAlign = 'center';
      context.font = `500 ${Math.round(cellH * 0.66)}px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace`;

      // ── stars ──
      for (const star of stars) {
        let x = star.x * width;
        let y = (star.y - tilt * 0.09 * star.depth) * height;
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / 130);
        if (near > 0) {
          const push = near * near * 16;
          const length = Math.hypot(dx, dy) || 1;
          x += (dx / length) * push;
          y += (dy / length) * push;
        }
        const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
        context.globalAlpha = Math.min(1, (0.25 + 0.6 * star.depth) * twinkle + near * 0.6);
        context.fillStyle = star.tint;
        context.fillText(star.glyph, x, y);
      }

      // ── moon ──
      const radius = Math.min(Math.min(width, height) * 0.089, 96);
      const moonX = width * (width < 640 ? 0.2 : 0.212);
      const moonY = height * (0.555 - 0.239 * tilt);
      const stepX = cellW * 0.78;
      const stepY = cellH * 0.56;
      context.fillStyle = '#c3c5cf';
      for (let row = -Math.ceil(radius / stepY); row <= Math.ceil(radius / stepY); row++) {
        const y = row * stepY;
        const offset = row % 2 ? stepX / 2 : 0;
        for (let column = -Math.ceil(radius / stepX) - 1; column <= Math.ceil(radius / stepX) + 1; column++) {
          const x = column * stepX + offset;
          const distance = Math.hypot(x, y) / radius;
          if (distance > 1) continue;
          // lit from the upper left, with a soft terminator
          const light = 0.62 + 0.38 * Math.max(-1, Math.min(1, (-x * 0.7 - y * 0.5) / radius + 0.35));
          context.globalAlpha = Math.min(0.92, light * (distance > 0.9 ? 0.6 : 0.86));
          context.fillText('0', moonX + x, moonY + y);
        }
      }

      // ── meadow ──
      const meadowTop = height * (1.035 - 0.262 * tilt - 0.045 * scroll);
      if (meadowTop < height) {
        for (let column = 0; column < meadow.length; column++) {
          const cells = meadow[column];
          const sway = reduced ? 0 : Math.sin(time * 0.9 + column * 0.31) * 1.6;
          for (let row = 0; row < cells.length; row++) {
            const cell = cells[row];
            if (!cell.glyph) continue;
            const y = meadowTop + row * cellH + cellH / 2;
            if (y > height + cellH) break;
            const x = column * cellW + cellW / 2 + sway * (1 - row / cells.length);
            const near = Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 110);
            const shimmer = reduced ? 0.8 : 0.68 + 0.32 * Math.sin(time * 1.4 + cell.lift * 9 + column * 0.2);
            context.globalAlpha = Math.min(1, (0.32 + 0.5 * (row / cells.length)) * shimmer + near * 0.55);
            context.fillStyle = near > 0.5 ? '#bfeaff' : cell.tint;
            context.fillText(cell.glyph, x, y - near * 5);
          }
        }
      }
      context.globalAlpha = 1;
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 33) return; // ~30 fps
      last = now;
      draw(now);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (!visible) return;
      if (reduced) draw(0);
      else frame = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    observer.observe(canvas);

    const onResize = () => {
      build();
      if (visible) draw(performance.now());
    };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    const onScroll = () => {
      if (reduced && visible) draw(0);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    build();
    canvas.dataset.ready = 'true';
    start();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className={styles.night} aria-hidden="true">
      <canvas className={styles.nightCanvas} ref={canvasRef} />
    </div>
  );
}
