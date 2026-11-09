'use client';

import { useEffect, useRef, useState } from 'react';
import {
  loadEngine,
  FIGURE_COLORS,
  FIGURE_COLORS_DARK,
  type AnatomyControl,
} from '@/engine/gf';
import type { MuscleGroupId } from '@/data/muscles';
import styles from './AnatomyCanvas.module.css';

interface Props {
  selected: readonly MuscleGroupId[];
  onToggle: (id: MuscleGroupId) => void;
  /** 'front' | 'back' - animates the body around when it changes. */
  facing: 'front' | 'back';
  height?: number;
}

export default function AnatomyCanvas({ selected, onToggle, facing, height = 318 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlRef = useRef<AnatomyControl | null>(null);
  const onToggleRef = useRef(onToggle);
  const [failed, setFailed] = useState(false);

  // Keep the latest callback without re-mounting the engine.
  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;

    loadEngine()
      .then((gf) => {
        if (!active || !canvas.isConnected) return;
        const control = gf.mountAnatomy(canvas);
        const dark =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        control.colors = dark ? FIGURE_COLORS_DARK : FIGURE_COLORS;
        control.onToggle = (id) => onToggleRef.current(id as MuscleGroupId);
        controlRef.current = control;
        control.setSelected(selected);
        control.face(facing === 'back');
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      // The engine's render loop stops on its own once the canvas is detached.
      if (controlRef.current) controlRef.current.onToggle = null;
      controlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controlRef.current?.setSelected(selected);
  }, [selected]);

  useEffect(() => {
    controlRef.current?.face(facing === 'back');
  }, [facing]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      data-gf="anatomy"
      className={styles.canvas}
      style={{ height }}
      aria-label="Interactive 3D body. Drag to rotate, tap a muscle to select it."
    />
  );
}
