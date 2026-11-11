import { site } from '@/content/site';
import Showreel from './Showreel';
import styles from './Cover.module.scss';

/** The title card for the client work, with the showreel underneath. */
export default function Cover({ active }: { active: boolean }) {
  const { title } = site.cover;
  return (
    <section className={styles.cover} data-scene="work-cover">
      <div className={styles.copy}>
        <h2 className={styles.title} aria-label={title}>
          {title.split(' ').map((word, w, words) => (
            <span key={w} aria-hidden="true">
              <span className={styles.word}>
                {Array.from(word).map((char, c) => (
                  <span className={styles.char} data-cover-char key={c}>
                    {char}
                  </span>
                ))}
              </span>
              {w < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>
        <Showreel active={active} />
      </div>
    </section>
  );
}
