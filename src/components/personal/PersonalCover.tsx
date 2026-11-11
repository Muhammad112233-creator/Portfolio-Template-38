import { site } from '@/content/site';
import { asset } from '@/lib/asset';
import styles from './PersonalCover.module.scss';

/** "Night shift": the cover that opens the personal films. */
export default function PersonalCover() {
  const { title, description, emoji, cover } = site.personal;
  return (
    <section className={styles.cover} data-scene="personal-cover" aria-label={title}>
      <div className={styles.media} aria-hidden="true">
        <img className={styles.image} src={asset(cover)} alt="" loading="lazy" decoding="async" />
        <span className={styles.tint} />
      </div>
      <h2 className={styles.title}>
        <span className={styles.line}>
          <span className={styles.lineInner} data-text={title} data-cover-line>
            {title}
          </span>
        </span>
      </h2>
      <div className={styles.descriptionGroup} data-cover-note>
        <p className={styles.description}>
          <span className={styles.descriptionText} data-text={description}>
            {description}
          </span>
        </p>
        <span className={styles.emoji} aria-hidden="true">
          {emoji}
        </span>
      </div>
    </section>
  );
}
