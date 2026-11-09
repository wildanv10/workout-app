'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import styles from './ScreenHeader.module.css';

interface Props {
  title: string;
  step?: string;
  /**
   * Where back goes. Given, it navigates there instead of using history, which
   * is how screens keep the user out of pages that should not be revisited -
   * the generate step after a session has been built, for one.
   */
  backHref?: string;
  /** Used when there is no history to go back to. */
  fallbackHref?: string;
  trailing?: React.ReactNode;
  /** A home shortcut at the far right. On by default. */
  showHome?: boolean;
}

/** Back arrow, title, optional step counter, trailing control, home shortcut. */
export default function ScreenHeader({
  title,
  step,
  backHref,
  fallbackHref = '/',
  trailing,
  showHome = true,
}: Props) {
  const router = useRouter();

  const back = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.icon} aria-label="Back" onClick={back}>
        <Icon name="back" />
      </button>
      <h2 className={styles.title}>{title}</h2>
      {step && <span className={styles.step}>{step}</span>}
      {trailing}
      {showHome && (
        <Link href="/" className={styles.icon} aria-label="Home">
          <Icon name="home" />
        </Link>
      )}
    </div>
  );
}
