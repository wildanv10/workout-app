'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ScreenHeader from '@/components/ScreenHeader';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';
import { generateWorkout, workoutName } from '@/lib/generate';
import { availableExercises } from '@/lib/availability';
import { MUSCLE_GROUPS } from '@/data/muscles';
import styles from './equipment.module.css';

/** Atlas showed the build step for a beat before revealing the session. */
const GENERATING_MS = 1300;

export default function ChooseEquipmentPage() {
  const router = useRouter();
  const { state, dispatch, ready } = useStore();
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = state.selectedMuscles;

  // Nothing to generate from: send them back to step 1.
  useEffect(() => {
    if (ready && selected.length === 0) router.replace('/new/muscles');
  }, [ready, selected.length, router]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const generate = () => {
    const setup = state.setups.find((s) => s.id === state.activeSetupId) ?? state.setups[0];
    setGenerating(true);
    timer.current = setTimeout(() => {
      const result = generateWorkout({ muscles: selected, owned: setup.items });
      dispatch({
        type: 'setPlan',
        plan: {
          muscles: [...selected],
          setupId: setup.id,
          exerciseIds: result.exercises.map((e) => e.id),
          variant: 0,
        },
      });
      // replace, so going back from the session never returns to this step
      router.replace('/plan');
    }, GENERATING_MS);
  };

  if (generating) {
    return (
      <main className={styles.generating}>
        <span className={styles.spinner} aria-hidden="true" />
        <h2 className={styles.genTitle}>Building your session</h2>
        <p className="muted">
          {selected.map((id) => MUSCLE_GROUPS.find((g) => g.id === id)?.name).join(', ')}
        </p>
      </main>
    );
  }

  return (
    <>
      <ScreenHeader title="Your equipment" step="Step 2 of 2" fallbackHref="/new/muscles" />

      <main className="screen">
        <p className="muted">
          Where are you training? We only pick exercises that work with this setup.
        </p>

        <div className={styles.setups}>
          {state.setups.map((setup) => {
            const on = setup.id === state.activeSetupId;
            const count = availableExercises(new Set(setup.items)).length;
            return (
              <button
                key={setup.id}
                type="button"
                className={styles.setup}
                aria-pressed={on}
                onClick={() => dispatch({ type: 'setActiveSetup', id: setup.id })}
              >
                <span className={styles.setupMain}>
                  <span className={styles.setupName}>{setup.name}</span>
                  <span className="muted">
                    {setup.items.length} item{setup.items.length === 1 ? '' : 's'} · {count}{' '}
                    exercises available
                  </span>
                </span>
                {on && <Icon name="check" className={styles.tick} />}
              </button>
            );
          })}

          <Link href="/equipment/new" className={`btn ${styles.newSetup}`}>
            <Icon name="plus" />
            New setup
          </Link>
        </div>

        <p className={styles.note}>
          Training <strong>{workoutName(selected)}</strong>
        </p>
      </main>

      <div className="actions">
        <button type="button" className="btn btnPrimary" onClick={generate}>
          <Icon name="sparkles" />
          Generate workout
        </button>
      </div>
    </>
  );
}
