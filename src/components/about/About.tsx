import { site } from '@/content/site';
import { asset } from '@/lib/asset';
import ChipButton from './ChipButton';
import styles from './About.module.scss';

/** Visible words are decorative; screen readers get the plain sentence. */
function Words({ text }: { text: string }) {
  return (
    <>
      <span className="sr-only">{text} </span>
      {text.split(' ').map((word, index) => (
        <span key={index} aria-hidden="true">
          <span className={styles.word}>
            <span className={styles.wordInner} data-reveal="word">
              {word}
            </span>
          </span>{' '}
        </span>
      ))}
    </>
  );
}

export default function About() {
  const { about, person } = site;
  return (
    <section className={styles.reel} aria-label={`About ${person.name}`} data-scene="about">
      <h2 className="sr-only">About {person.name}</h2>
      <div className={styles.inner}>
        <p className={styles.lead}>
          <Words text={about.lead} />
          <ChipButton
            feature
            label={about.feature.label}
            preview={asset(about.feature.video)}
            full={asset(about.feature.video)}
            poster={asset(about.feature.poster)}
          />
        </p>
        <p className={styles.paragraph}>
          {about.phrases.map((phrase) => (
            <span key={phrase.text}>
              <Words text={phrase.text} />
              <ChipButton label={phrase.chip.label} preview={asset(phrase.chip.video)} full={asset(phrase.chip.full)} />{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
