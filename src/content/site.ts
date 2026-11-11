/**
 * Everything a visitor can read or watch lives in this one file.
 * Swap the copy, point the paths at your own media, and the layout follows.
 *
 * Media paths are relative to /public. Keep videos short and web-friendly
 * (H.264 .mp4, no wider than 1280px) so scroll-scrubbing stays smooth.
 */

export type Film = {
  id: string;
  discipline: string;
  title: string;
  context: string;
  credit: string;
  video: string;
  poster: string;
};

export type Short = { id: string; word: string; label: string; video: string; poster: string };

export type PersonalFilm = {
  id: string;
  title: string;
  kicker: string;
  video: string;
  poster: string;
  /** how this chapter arrives on screen */
  cut: 'hard' | 'dissolve' | 'wipe';
  ratio: string;
  font: 'collage' | 'poster' | 'engraved';
  paper: string;
  ink: string;
  accent: string;
  glow: string;
  /** colour lent to the navigation while this film is up (defaults to accent) */
  nav?: string;
  titleCase: 'uppercase' | 'none';
  titleTracking: string;
  titleScale: number;
};

export type Creator = { name: string; count: string; unit: string; avatar: string };

export const site = {
  meta: {
    title: 'Aris — Video Editor',
    description:
      'Portfolio of Aris, a freelance video editor cutting long-form videos, short-form pieces and motion work for creators and small brands.',
    url: 'https://example.com',
    themeColor: '#020408',
    locale: 'en',
  },

  person: {
    name: 'Aris',
    role: 'Video editor.',
    focusLead: 'Cutting stories with',
    keywords: ['Rhythm', 'Colour', 'Motion Design', 'Sound Design'],
    credit: 'Open-source template',
    year: new Date().getFullYear(),
  },

  loader: {
    label: 'Loading the reel',
    steps: ['Threading the reel', 'Syncing the frames', 'Almost rolling', 'Rolling'],
  },

  cues: {
    start: { mouse: 'Scroll to explore', touch: 'Swipe to explore' },
    walk: { mouse: 'Keep scrolling', touch: 'Keep swiping' },
  },

  nav: {
    home: 'Home',
    items: [
      { id: 'about', label: 'About' },
      { id: 'work', label: 'Work' },
      { id: 'shorts', label: 'Shorts' },
      { id: 'personal', label: 'After Hours' },
      { id: 'clients', label: 'Clients' },
    ],
    contactLabel: 'Contact',
    cta: 'Start a project',
  },

  about: {
    lead: "Hey, good to see you here. I'm",
    feature: { label: 'Aris', video: '/assets/videos/about-feature.mp4', poster: '/assets/images/poster-about.jpg' },
    phrases: [
      {
        text: 'I started cutting footage five years ago on a borrowed laptop',
        chip: { label: 'Title sequence', video: '/assets/videos/chip-1.mp4', full: '/assets/videos/work-titles.mp4' },
      },
      {
        text: 'and never really closed the timeline since',
        chip: { label: 'Low Tide', video: '/assets/videos/chip-2.mp4', full: '/assets/videos/film-lowtide.mp4' },
      },
      {
        text: 'Now I edit for creators and small brands',
        chip: { label: 'Documentary cut', video: '/assets/videos/chip-3.mp4', full: '/assets/videos/work-doc.mp4' },
      },
      {
        text: 'in whatever style the story asks for',
        chip: { label: 'Launch film', video: '/assets/videos/chip-4.mp4', full: '/assets/videos/work-launch.mp4' },
      },
    ],
  },

  statement: {
    title: 'Day shift.',
    handoff: 'The work people hire me for, from long cuts to quick ones.',
  },

  trail: {
    tall: ['/assets/videos/trail-tall-1.mp4', '/assets/videos/trail-tall-2.mp4', '/assets/videos/trail-tall-3.mp4'],
    wide: ['/assets/videos/trail-wide-1.mp4', '/assets/videos/trail-wide-2.mp4', '/assets/videos/trail-wide-3.mp4'],
  },

  cover: {
    title: 'A handful of edits made for the channels and brands I work with.',
    reel: {
      label: 'View showreel',
      soundOff: 'Sound off',
      soundOn: 'Sound on',
      video: '/assets/videos/showreel.mp4',
      poster: '/assets/images/poster-showreel.jpg',
      title: 'Showreel 2026',
    },
  },

  works: {
    cue: {
      invite: { mouse: 'Scroll to run the film', touch: 'Swipe to run the film' },
      keep: { mouse: 'Keep scrolling', touch: 'Keep swiping' },
      play: 'Press play to watch it in full',
      tail: 'Quick cuts',
    },
    endLabel: 'End of reel',
    films: [
      {
        id: 'launch',
        discipline: 'Product launch film',
        title: 'Three Drops',
        context:
          'A twenty-second launch piece for a small accessories label. Type, colour and timing do the selling, so every beat lands on the music.',
        credit: 'Edit, motion design and sound',
        video: '/assets/videos/work-launch.mp4',
        poster: '/assets/images/poster-work-1.jpg',
      },
      {
        id: 'doc',
        discipline: 'Long-form documentary cut',
        title: 'A Year Outside',
        context:
          'Six hours of handheld footage shaped into a calm half-hour film. Most of the job was deciding what to leave on the floor.',
        credit: 'Edit, grade and titles',
        video: '/assets/videos/work-doc.mp4',
        poster: '/assets/images/poster-work-2.jpg',
      },
      {
        id: 'titles',
        discipline: 'Channel title sequence',
        title: 'Episode 07',
        context:
          'A loud twelve-second open for a weekly show. Built to survive being skipped past: it reads in the first second.',
        credit: 'Design, animation and edit',
        video: '/assets/videos/work-titles.mp4',
        poster: '/assets/images/poster-work-3.jpg',
      },
    ] as Film[],
  },

  shorts: {
    title: 'Quick cuts',
    note: 'Vertical pieces made for the scroll.',
    items: [
      { id: 'hooks', word: 'Hooks', label: 'The slow pour', video: '/assets/videos/short-1.mp4', poster: '/assets/images/poster-short-1.jpg' },
      { id: 'loops', word: 'Loops', label: 'Forty-five seconds', video: '/assets/videos/short-2.mp4', poster: '/assets/images/poster-short-2.jpg' },
      { id: 'payoffs', word: 'Payoffs', label: 'Attempt fourteen', video: '/assets/videos/short-3.mp4', poster: '/assets/images/poster-short-3.jpg' },
    ] as Short[],
  },

  personal: {
    title: 'Night shift',
    description: 'Things I cut after hours, when nobody was waiting on a deadline.',
    emoji: '🌙',
    cover: '/assets/images/night-cover.jpg',
    films: [
      {
        id: 'papercut',
        title: 'Papercut',
        kicker:
          'I wanted to see how many clashing textures one cut could hold before it fell apart. Scissors, glue and a lot of undo.',
        video: '/assets/videos/film-papercut.mp4',
        poster: '/assets/images/poster-film-1.jpg',
        cut: 'hard',
        ratio: '1 / 1',
        font: 'collage',
        paper: '#1b0d08',
        ink: '#f4ece6',
        accent: '#d7401f',
        glow: '#bbf397',
        titleCase: 'uppercase',
        titleTracking: '-0.02em',
        titleScale: 1,
      },
      {
        id: 'afterglow',
        title: 'Afterglow',
        kicker: 'Two colours that got along so well I built a whole piece around keeping them on screen a little longer.',
        video: '/assets/videos/film-afterglow.mp4',
        poster: '/assets/images/poster-film-2.jpg',
        cut: 'dissolve',
        ratio: '16 / 9',
        font: 'poster',
        paper: '#1e0529',
        ink: '#f6efe6',
        accent: '#f4cc51',
        glow: '#5a117b',
        titleCase: 'uppercase',
        titleTracking: '0.015em',
        titleScale: 1.18,
      },
      {
        id: 'lowtide',
        title: 'Low Tide',
        kicker: 'A slow one. Mist, a lantern and three words. Sometimes the best edit is knowing when to hold the shot.',
        video: '/assets/videos/film-lowtide.mp4',
        poster: '/assets/images/poster-film-3.jpg',
        cut: 'wipe',
        ratio: '16 / 9',
        font: 'engraved',
        paper: '#16211f',
        ink: '#e5e3d2',
        accent: '#c34b2d',
        glow: '#4a7177',
        nav: '#9db3b0',
        titleCase: 'none',
        titleTracking: '0.06em',
        titleScale: 0.92,
      },
    ] as PersonalFilm[],
  },

  clients: {
    title: { before: 'Creators who', strong: 'Count', after: 'on my cuts.' },
    unit: 'subscribers',
    featured: [
      { name: 'NORTHLANE', count: '4.2M', unit: 'subscribers', avatar: '/assets/images/creator-1.jpg' },
      { name: 'Foxtrot FM', count: '1.36M', unit: 'subscribers', avatar: '/assets/images/creator-2.jpg' },
      { name: 'grumpbot', count: '874K', unit: 'subscribers', avatar: '/assets/images/creator-3.jpg' },
      { name: 'Mika Odell', count: '212K', unit: 'subscribers', avatar: '/assets/images/creator-4.jpg' },
    ] as Creator[],
    more: {
      left: [
        { name: 'Halden Rides', count: '64K', unit: 'subscribers', avatar: '/assets/images/creator-5.jpg' },
        { name: 'SlowPour', count: '31.5K', unit: 'subscribers', avatar: '/assets/images/creator-6.jpg' },
        { name: 'Tidewalker', count: '18.2K', unit: 'subscribers', avatar: '/assets/images/creator-7.jpg' },
      ] as Creator[],
      right: [
        { name: 'Wheel & Kiln', count: '96K', unit: 'subscribers', avatar: '/assets/images/creator-8.jpg' },
        { name: 'pixelmoth', count: '9.4K', unit: 'subscribers', avatar: '/assets/images/creator-9.jpg' },
      ] as Creator[],
    },
  },

  contact: {
    eyebrow: 'Taking bookings from next month',
    title: ['Got footage?', "Let's cut it."],
    lead: 'Creator channels first, the odd brand film second.',
    fields: {
      name: { label: 'Name', placeholder: 'What should I call you' },
      email: { label: 'Email', placeholder: 'where I can reach you' },
      project: { label: 'The project', placeholder: 'Footage link, due date, and the mood you’re after' },
    },
    submit: 'Send the brief',
    sending: 'Sending…',
    success: 'Got it. I’ll reply within two working days.',
    error: 'That didn’t go through. Try again, or use one of the links below.',
    demo: 'Demo mode: nothing was sent. Add your Web3Forms key to start receiving briefs.',
    invalid: 'Please fill in every field with a working email.',
    socials: [
      { label: 'Instagram', href: 'https://instagram.com/' },
      { label: 'YouTube', href: 'https://youtube.com/' },
      { label: 'Behance', href: 'https://behance.net/' },
    ],
  },

  notFound: {
    title: '404',
    subtitle: 'This frame was left on the cutting room floor.',
    note: 'The page you were after has moved, or never made the final edit.',
    back: 'Back to the reel',
  },
};

export type SectionId = 'hero' | 'about' | 'work' | 'shorts' | 'personal' | 'clients' | 'contact';
