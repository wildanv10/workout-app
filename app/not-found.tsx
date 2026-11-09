import Link from 'next/link';
import Icon from '@/components/Icon';
import styles from './not-found.module.css';

export const metadata = {
  title: 'Not found · Workout',
};

export default function NotFound() {
  return (
    <main className={`screen ${styles.wrap}`}>
      <span className={styles.mark} aria-hidden="true">
        <Icon name="target" size={28} />
      </span>

      <div className={styles.text}>
        <span className="eyebrow">404</span>
        <h1 className={styles.title}>This page does not exist.</h1>
        <p className="muted">
          The link may be out of date, or the exercise may have been renamed.
        </p>
      </div>

      <div className={styles.actions}>
        <Link href="/" className="btn btnPrimary">
          <Icon name="home" />
          Go home
        </Link>
        <Link href="/new/muscles" className="btn">
          <Icon name="sparkles" />
          New workout
        </Link>
      </div>
    </main>
  );
}
