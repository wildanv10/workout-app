'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './error.module.css';

/**
 * Catches unexpected render-time throws anywhere in a route subtree - including
 * anything the vendored WebGL2 engine throws once it is past loading. The
 * "WebGL2 is not supported" and engine-failed-to-init cases are already handled
 * inside EcorcheCanvas, which renders its own fallback rather than throwing.
 */
export default function RouteError({
  error,
  reset,
}: {
  // A value thrown in a Client Component is forwarded as-is and need not be an
  // Error, so narrow it before reading anything off it.
  error: unknown;
  reset: () => void;
}) {
  useEffect(() => {
    // Local only - nothing is reported anywhere.
    console.error(error);
  }, [error]);

  const digest = errorDigest(error);

  return (
    <main className="screen">
      {/* The boundary swaps in while the page is already on screen, so this is
          the one spot where role="alert" genuinely fits. */}
      <div className={styles.card} role="alert">
        <span className="eyebrow">Error</span>
        <h1 className={styles.title}>This screen did not load.</h1>
        <p className="muted">
          Something went wrong while showing it. Trying again usually fixes it.
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btnPrimary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className={`btn ${styles.link}`}>
          Home
        </Link>
      </div>

      {digest && <p className={styles.digest}>Reference {digest}</p>}
    </main>
  );
}

/** The hash Next.js attaches to a server error - safe to show, unlike the message. */
function errorDigest(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' ? digest : undefined;
}
