'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EcorcheCanvas from './EcorcheCanvas';
import Icon from './Icon';
import { motionIdOf, type EcorcheViewer, type ExerciseState } from '@/engine/ecorche';
import { phaseLabel } from '@/engine/phase-labels';
import type { Exercise } from '@/data/exercises';
import { getEquipment } from '@/data/equipment';
import { requiredEquipment } from '@/lib/availability';
import styles from './ExerciseVisual.module.css';

const SPEEDS = [0.5, 1, 2] as const;

/**
 * The exercise animation. Every one of the 104 exercises has a motion in the
 * engine, so this is the real movement rather than a still - with a fallback to
 * the isometric equipment illustration where WebGL2 is unavailable.
 */
export default function ExerciseVisual({
  exercise,
  height = 320,
}: {
  exercise: Exercise;
  height?: number;
}) {
  const viewerRef = useRef<EcorcheViewer | null>(null);
  const [state, setState] = useState<ExerciseState | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const lastTick = useRef(0);

  const handleReady = useCallback(
    (viewer: EcorcheViewer) => {
      viewerRef.current = viewer;
      viewer.setExercise(motionIdOf(exercise.id));
      viewer.on('frame', () => {
        const now = performance.now();
        if (now - lastTick.current < 60) return;
        lastTick.current = now;
        const next = viewer.exerciseState();
        if (next) setState({ ...next });
      });
    },
    [exercise.id],
  );

  useEffect(() => {
    viewerRef.current?.setExercise(motionIdOf(exercise.id));
  }, [exercise.id]);

  const togglePlay = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.exercisePlay(!state?.playing);
  };

  const seek = (value: number) => {
    viewerRef.current?.exerciseSeek(value / 1000);
  };

  const startScrub = () => {
    scrubbingRef.current = state?.playing ?? true;
    setScrubbing(true);
    viewerRef.current?.exercisePlay(false);
  };

  const endScrub = () => {
    setScrubbing(false);
    if (scrubbingRef.current) viewerRef.current?.exercisePlay(true);
  };

  const label = state ? phaseLabel(state.label) : null;

  return (
    <div className={styles.wrap}>
      <EcorcheCanvas
        onReady={handleReady}
        label={`3D demonstration of ${exercise.name}`}
        loadingLabel="Building the 3D model…"
        height={height}
        fallback={<EquipmentFallback exercise={exercise} height={height} />}
      >
        <span className={styles.hint}>
          <Icon name="rotate" size={14} />
          Drag to change the angle
        </span>
      </EcorcheCanvas>

      {state && (
        <div className={styles.player}>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.play}
              onClick={togglePlay}
              aria-label={state.playing ? 'Pause' : 'Play'}
            >
              <Icon name={state.playing ? 'pause' : 'play'} size={18} />
            </button>
            <span className={styles.phase}>
              {label && <b>{label}</b>}
              <span>
                Rep {state.rep + 1} · {state.t.toFixed(1)} / {state.cycle.toFixed(1)} s
              </span>
            </span>
            <span className={styles.speeds} role="group" aria-label="Speed">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={state.speed === speed}
                  onClick={() => viewerRef.current?.exerciseSpeed(speed)}
                >
                  {speed}×
                </button>
              ))}
            </span>
          </div>

          <div className={styles.track}>
            <span className={styles.fill} style={{ width: `${state.frac * 100}%` }} />
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(state.frac * 1000)}
              onPointerDown={startScrub}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Position in the movement"
            />
            <span
              className={styles.knob}
              style={{ left: `${state.frac * 100}%` }}
              data-scrubbing={scrubbing || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Shown when WebGL2 is unavailable: the isometric illustration of its gear. */
function EquipmentFallback({ exercise, height }: { exercise: Exercise; height: number }) {
  const illustration = requiredEquipment(exercise)
    .map((code) => getEquipment(code))
    .find((item) => item?.svg);

  return (
    <div className={styles.fallback} style={{ height }}>
      {illustration?.svg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/equipment/${illustration.svg}`}
          alt={illustration.alt ?? `Illustration of ${illustration.name}`}
          className={styles.svg}
        />
      ) : (
        <span className={styles.none}>{exercise.name} uses no equipment.</span>
      )}
    </div>
  );
}
