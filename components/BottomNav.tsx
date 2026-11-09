import Link from 'next/link';
import Icon, { type IconName } from './Icon';
import styles from './BottomNav.module.css';

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/programs', label: 'Programs', icon: 'bookmark' },
  { href: '/equipment', label: 'Equipment', icon: 'dumbbell' },
];

/**
 * Shown only on the top-level screens, as in the Atlas flow. The current tab is
 * passed in rather than read from the router, so these screens still prerender.
 */
export default function BottomNav({ current }: { current: string }) {
  return (
    <nav className={styles.nav} aria-label="Main">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={styles.tab}
          aria-current={tab.href === current ? 'page' : undefined}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
