import { site } from '@/content/site';
import styles from './Statement.module.scss';

type Props = {
  /** 'paper' = light type on the dark field, 'ink' = dark type on the light field */
  tone: 'paper' | 'ink';
  /** copies used by the wipe are decorative and hidden from assistive tech */
  decorative?: boolean;
  children?: React.ReactNode;
};

/** The one-line title that hands the page over from "about" to the work. */
export default function Statement({ tone, decorative = false, children }: Props) {
  const { title, handoff } = site.statement;
  const Title = decorative ? 'p' : 'h2';
  return (
    <section
      className={styles.outro}
      data-tone={tone}
      data-scene={decorative ? undefined : 'statement'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
    >
      {children ? <div className={styles.media}>{children}</div> : null}
      <div className={styles.layout} data-statement-copy>
        <Title className={styles.title} aria-label={decorative ? undefined : title}>
          {title.split(' ').map((word, w, words) => (
            <span key={w} aria-hidden="true" style={{ whiteSpace: 'nowrap' }}>
              {Array.from(word).map((char, c) => (
                <span className={styles.char} data-statement-char key={c}>
                  {char}
                </span>
              ))}
              {w < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </Title>
        <p className={styles.handoff} data-statement-handoff>
          {handoff}
        </p>
      </div>
    </section>
  );
}
