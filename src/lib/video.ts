/**
 * Background clips are declared with data-src instead of src so nothing is
 * downloaded until a scene actually needs it.
 */
export function prime(video: HTMLVideoElement) {
  if (!video.getAttribute('src') && video.dataset.src) {
    video.src = video.dataset.src;
    video.load();
  }
}

/** Idempotent play/pause for silent background clips. */
export function setPlaying(video: HTMLVideoElement | null | undefined, playing: boolean, forceMuted = true) {
  if (!video) return;
  if (playing) {
    prime(video);
    if (forceMuted) video.muted = true;
    if (video.paused) video.play().catch(() => undefined);
  } else if (!video.paused) {
    video.pause();
  }
}

export function setAllPlaying(videos: Iterable<HTMLVideoElement>, playing: boolean) {
  for (const video of videos) setPlaying(video, playing);
}

/** Plays every [data-autoplay] clip inside root while it is on screen. */
export function autoplayInView(root: ParentNode, rootMargin = '12% 0px') {
  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-autoplay]'));
  if (!videos.length) return () => undefined;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) setPlaying(entry.target as HTMLVideoElement, entry.isIntersecting);
    },
    { rootMargin },
  );
  videos.forEach((video) => observer.observe(video));
  return () => {
    observer.disconnect();
    videos.forEach((video) => video.pause());
  };
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
