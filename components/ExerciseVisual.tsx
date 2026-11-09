'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  loadEngine,
  FIGURE_COLORS,
  FIGURE_COLORS_DARK,
  type FigureColors,
} from '@/engine/gf';
import type { Exercise } from '@/data/exercises';
import { getEquipment } from '@/data/equipment';
import { primaryGroups } from '@/lib/generate';
import { requiredEquipment } from '@/lib/availability';
import styles from './ExerciseVisual.module.css';

const figureColors = (): FigureColors =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? FIGURE_COLORS_DARK
    : FIGURE_COLORS;

/**
 * Shows an exercise, falling back as the source material allows:
 *   1. an animation, where fig-poses.js has a template that really matches
 *   2. the isometric illustration of the equipment it uses
 *   3. a still body with the target muscles highlighted
 */
export default function ExerciseVisual({
  exercise,
  height = 280,
  zoom = 1.05,
}: {
  exercise: Exercise;
  height?: number;
  zoom?: number;
}) {
  const illustration = requiredEquipment(exercise)
    .map((code) => getEquipment(code))
    .find((item) => item?.svg);

  if (exercise.anim) {
    return <AnimatedFigure exercise={exercise} height={height} zoom={zoom} />;
  }

  if (illustration?.svg) {
    return (
      <div className={styles.frame} style={{ height }}>
        <Image
          src={`/equipment/${illustration.svg}`}
          alt={illustration.alt ?? `Illustration of ${illustration.name}`}
          className={styles.svg}
          width={320}
          height={240}
          unoptimized
        />
      </div>
    );
  }

  return <StillFigure exercise={exercise} height={height} zoom={zoom} />;
}

function AnimatedFigure({
  exercise,
  height,
  zoom,
}: {
  exercise: Exercise;
  height: number;
  zoom: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !exercise.anim) return;
    let active = true;

    loadEngine()
      .then((gf) => {
        if (!active || !canvas.isConnected) return;
        const control = gf.mountExercise(canvas);
        control.colors = figureColors();
        control.view.zoom = zoom;
        control.setAnim(exercise.anim!, primaryGroups(exercise));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [exercise, zoom]);

  return (
    <canvas
      ref={ref}
      className={styles.canvas}
      style={{ height }}
      aria-label={`Animated demonstration of ${exercise.name}`}
    />
  );
}

function StillFigure({
  exercise,
  height,
  zoom,
}: {
  exercise: Exercise;
  height: number;
  zoom: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let active = true;
    let observer: ResizeObserver | undefined;

    loadEngine()
      .then((gf) => {
        if (!active || !canvas.isConnected) return;
        const view = new gf.View(canvas);
        view.yaw = 0.6;
        view.pitch = 0.1;
        view.zoom = zoom;
        const joints = gf.build({ ab: 14, e: 6 });
        const groups = primaryGroups(exercise);

        const draw = () => {
          view.resize();
          gf.drawFigure(view, joints, {
            selected: groups,
            noIdle: true,
            colors: figureColors(),
          });
        };
        draw();
        setDrawn(true);
        observer = new ResizeObserver(draw);
        observer.observe(canvas);
      })
      .catch(() => {});

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [exercise, zoom]);

  const groups = primaryGroups(exercise);
  const label = `Target muscles for ${exercise.name}`;

  return (
    <div className={styles.frame} style={{ height }}>
      <canvas ref={ref} className={styles.canvas} aria-label={label} />
      {!drawn && <span className={styles.placeholder}>{groups.length} target muscles</span>}
    </div>
  );
}
