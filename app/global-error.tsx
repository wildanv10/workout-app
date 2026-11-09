'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Replaces the root layout when the layout itself throws. Because the layout is
 * gone, `app/globals.css` never loads here, so the handful of tokens and rules
 * this screen needs are inlined below. Values are copied from globals.css; there
 * is no `data-theme` guard because the app shell that could set that attribute
 * is exactly what failed, leaving the OS colour scheme as the only signal.
 */
const css = `
:root {
  --surface: #ffffff;
  --sunk: #f1f2f4;
  --ink: #172b4d;
  --mut: #626f86;
  --line: #dcdfe4;
  --brand: #0c66e4;
  --brand-hover: #0055cc;
  --focus: #388bff;
  --shadow: 0 1px 1px rgb(9 30 66 / 25%), 0 0 1px rgb(9 30 66 / 31%);
  --r-md: 8px;
  --r-lg: 12px;
  --touch: 48px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --surface: #22272b;
    --sunk: #161a1d;
    --ink: #b6c2cf;
    --mut: #8c9bab;
    --line: #38414a;
    --brand: #579dff;
    --brand-hover: #85b8ff;
    --focus: #85b8ff;
    --shadow: 0 1px 1px rgb(3 4 4 / 50%), 0 0 1px rgb(3 4 4 / 50%);
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--sunk);
  color: var(--ink);
  font: 15px/22px ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, Ubuntu, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
}
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.ge-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100%;
  max-width: 460px;
  margin: 0 auto;
  padding: 28px 16px 24px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  background: var(--surface);
}
.ge-eyebrow {
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mut);
}
.ge-title {
  margin: 8px 0 0;
  font-family: 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-size: 30px;
  line-height: 38px;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
.ge-text { margin: 8px 0 0; color: var(--mut); }
.ge-actions { display: flex; flex-direction: column; gap: 10px; }
.ge-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--touch);
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.ge-btn:hover { background: var(--sunk); }
.ge-primary {
  border-color: var(--brand);
  background: var(--brand);
  color: #fff;
  box-shadow: var(--shadow);
}
.ge-primary:hover { background: var(--brand-hover); border-color: var(--brand-hover); }
.ge-digest {
  margin: 0;
  color: var(--mut);
  font-size: 12px;
  line-height: 16px;
  word-break: break-all;
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

export default function GlobalError({
  error,
  reset,
}: {
  // The thrown value is forwarded as-is and need not be an Error.
  error: unknown;
  reset: () => void;
}) {
  useEffect(() => {
    // Local only - nothing is reported anywhere.
    console.error(error);
  }, [error]);

  const digest = errorDigest(error);

  return (
    // global-error renders its own document: the root layout is what failed.
    <html lang="en">
      <body>
        <title>Workout</title>
        <style>{css}</style>
        <div className="ge-shell">
          <div>
            <span className="ge-eyebrow">Error</span>
            <h1 className="ge-title">The app did not start.</h1>
            <p className="ge-text">
              Something went wrong before any screen could load. Trying again usually fixes
              it.
            </p>
          </div>

          <div className="ge-actions">
            <button type="button" className="ge-btn ge-primary" onClick={reset}>
              Try again
            </button>
            <Link className="ge-btn" href="/">
              Home
            </Link>
          </div>

          {digest && <p className="ge-digest">Reference {digest}</p>}
        </div>
      </body>
    </html>
  );
}

/** The hash Next.js attaches to a server error - safe to show, unlike the message. */
function errorDigest(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' ? digest : undefined;
}
