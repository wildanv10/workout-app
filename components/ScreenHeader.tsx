'use client';

import { useRouter } from 'next/navigation';
import Icon from './Icon';
import styles from './ScreenHeader.module.css';

/** Back arrow, title, and an optional step counter or trailing control. */
export default function ScreenHeader({
  title,
  step,
  fallbackHref = '/',
  trailing,
}: {
  title: string;
  step?: string;
  fallbackHref?: string;
  trailing?: React.ReactNode;
}) {
  const router = useRouter();

  const back = () => {
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
    </div>
  );
}
