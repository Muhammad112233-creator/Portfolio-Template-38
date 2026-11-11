'use client';

import { useEffect } from 'react';
import Clients from '@/components/clients/Clients';
import Contact from '@/components/contact/Contact';
import Films from '@/components/films/Films';
import Intro from '@/components/intro/Intro';
import Navigation from '@/components/nav/Navigation';
import CardShift from '@/components/shift/CardShift';
import PanelShift from '@/components/shift/PanelShift';
import Shorts from '@/components/shorts/Shorts';
import Lightbox from '@/components/ui/Lightbox';
import Works from '@/components/works/Works';
import { initScroll } from '@/lib/scroll';
import { scrollToSection, trackSections } from '@/lib/sections';
import { manageTabKey } from '@/lib/tabkey';

/**
 * The whole page, top to bottom. Each scene owns its own scroll choreography;
 * this component only starts the shared machinery they rely on.
 */
export default function Experience() {
  useEffect(() => {
    const stopScroll = initScroll();
    const stopSections = trackSections();
    const stopTabKey = manageTabKey();
    return () => {
      stopTabKey();
      stopSections();
      stopScroll();
    };
  }, []);

  return (
    <>
      <a
        className="skip-link"
        href="#about"
        data-tab-always
        onClick={(event) => {
          event.preventDefault();
          scrollToSection('about');
          document.getElementById('main-content')?.focus({ preventScroll: true });
        }}
      >
        Skip the intro
      </a>

      <Navigation />

      <main id="main-content" tabIndex={-1}>
        <h1 className="sr-only">Aris — video editor</h1>
        <Intro />
        <PanelShift />
        <Works />
        <Shorts />
        <CardShift />
        <Films />
        <Clients />
        <Contact />
      </main>

      <Lightbox />
    </>
  );
}
