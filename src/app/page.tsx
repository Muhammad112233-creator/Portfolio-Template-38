import Experience from '@/components/Experience';
import { site } from '@/content/site';
import { asset } from '@/lib/asset';

export default function Page() {
  const films = [...site.works.films, ...site.personal.films];
  return (
    <>
      <div id="experience">
        <Experience />
      </div>

      {/* The page is a scroll-driven film and needs JavaScript. Without it, show a plain, complete version instead. */}
      <noscript>
        <style>{'#experience{display:none}'}</style>
        <div className="plain">
          <h1>{site.meta.title}</h1>
          <p>{site.meta.description}</p>
          <p>This site is animated with JavaScript. With scripts turned off, here is everything in plain form.</p>
          <h2>Films</h2>
          <ul>
            {films.map((film) => (
              <li key={film.id}>
                <a href={asset(film.video)}>{film.title}</a>
              </li>
            ))}
            <li>
              <a href={asset(site.cover.reel.video)}>{site.cover.reel.title}</a>
            </li>
          </ul>
          <h2>Contact</h2>
          <ul>
            {site.contact.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href}>{social.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </noscript>
    </>
  );
}
