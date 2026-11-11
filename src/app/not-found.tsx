import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/content/site';
import styles from './not-found.module.scss';

export const metadata: Metadata = {
  title: `Page not found — ${site.person.name}`,
  robots: { index: false },
};

export default function NotFound() {
  const { title, subtitle, note, back } = site.notFound;
  return (
    <main className={styles.scene}>
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.caption}>
        <h1>{title}</h1>
        <div className={styles.recovery}>
          <p className={styles.subtitle}>
            {subtitle}
            <span className={styles.note}>{note}</span>
          </p>
          <Link className={styles.back} href="/">
            {back}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
