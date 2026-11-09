'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  loadEcorche,
  themeFromTokens,
  webgl2Supported,
  type EcorcheEngine,
  type EcorcheViewer,
} from '@/engine/ecorche';
import styles from './EcorcheCanvas.module.css';

interface Props {
  /** Called once the viewer exists, to load an exercise, group or equipment. */
  onReady: (viewer: EcorcheViewer, engine: EcorcheEngine) => void;
  /** Shown instead of the canvas when WebGL2 is missing or the engine fails. */
  fallback?: ReactNode;
  /** Shown over the canvas while the muscle mesh is being built. */
  loadingLabel?: string;
  label: string;
  height?: number | string;
  className?: string;
  children?: ReactNode;
}

/**
 * Hosts one Écorché viewer. The engine builds its mesh procedurally and holds a
 * WebGL2 context, so there is one viewer per screen - never one per list row.
 */
export default function EcorcheCanvas({
  onReady,
  fallback,
  loadingLabel = 'Building the 3D model…',
  label,
  height = 320,
  className,
  children,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<EcorcheViewer | null>(null);
  const onReadyRef = useRef(onReady);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    // The WebGL2 check lives in here so we neither load the engine needlessly
    // nor call setState synchronously from the effect body.
    (async () => {
      if (!webgl2Supported()) throw new Error('WebGL2 is not available');
      const engine = await loadEcorche();
      if (disposed || !canvas.isConnected) return;
      const viewer = engine.createEcorcheViewer(canvas);
      viewerRef.current = viewer;
      viewer.setTheme(themeFromTokens());
      onReadyRef.current(viewer, engine);
      setStatus('ready');
    })().catch(() => {
      if (!disposed) setStatus('failed');
    });

    return () => {
      disposed = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, []);

  // Follow the OS colour scheme and any manual override.
  useEffect(() => {
    if (status !== 'ready') return;
    const apply = () => viewerRef.current?.setTheme(themeFromTokens());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', apply);
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      media?.removeEventListener('change', apply);
      observer.disconnect();
    };
  }, [status]);

  if (status === 'failed' && fallback !== undefined) return <>{fallback}</>;

  return (
    <div className={`${styles.stage} ${className ?? ''}`} style={{ height }}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={label} />
      {status === 'loading' && (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <span>{loadingLabel}</span>
        </div>
      )}
      {status === 'failed' && (
        <div className={styles.loading} role="status">
          <span>3D needs WebGL2, which this browser does not support.</span>
        </div>
      )}
      {status === 'ready' && children}
    </div>
  );
}
