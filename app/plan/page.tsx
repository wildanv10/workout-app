'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ScreenHeader from '@/components/ScreenHeader';
import ExerciseCard, { SuggestionRow } from '@/components/ExerciseCard';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';
import { getExercise } from '@/data/exercises';
import { MUSCLE_GROUPS } from '@/data/muscles';
import {
  generateWorkout,
  groupsWithNothingAvailable,
  planCoverage,
  suggestions,
  workoutName,
} from '@/lib/generate';
import styles from './plan.module.css';

const SHOW_SUGGESTIONS = 6;

const groupName = (id: string) => MUSCLE_GROUPS.find((g) => g.id === id)?.name ?? id;

export default function PlanPage() {
  const router = useRouter();
  const { state, dispatch, ready } = useStore();
  const [showAll, setShowAll] = useState(false);
  const plan = state.plan;

  useEffect(() => {
    if (ready && !plan) router.replace('/new/muscles');
  }, [ready, plan, router]);

  const setup = useMemo(
    () => state.setups.find((s) => s.id === plan?.setupId) ?? state.setups[0],
    [state.setups, plan?.setupId],
  );

  const exercises = useMemo(
    () => (plan?.exerciseIds ?? []).map(getExercise).filter((e): e is NonNullable<typeof e> => !!e),
    [plan?.exerciseIds],
  );

  const coverage = useMemo(
    () => (plan ? planCoverage(exercises, plan.muscles) : []),
    [exercises, plan],
  );

  const impossible = useMemo(
    () => (plan && setup ? groupsWithNothingAvailable(plan.muscles, setup.items) : []),
    [plan, setup],
  );

  const more = useMemo(
    () =>
      plan && setup
        ? suggestions(exercises, { muscles: plan.muscles, owned: setup.items })
        : [],
    [exercises, plan, setup],
  );

  if (!plan || !setup) return null;

  /** Groups that are in the plan only as supporting muscles, or not at all. */
  const thin = coverage.filter((c) => c.primaryCount === 0 && !impossible.includes(c.group));

  const regenerate = () => {
    const variant = plan.variant + 1;
    const result = generateWorkout({ muscles: plan.muscles, owned: setup.items, variant });
    dispatch({
      type: 'setPlan',
      plan: { ...plan, exerciseIds: result.exercises.map((e) => e.id), variant },
    });
    setShowAll(false);
  };

  const shown = showAll ? more : more.slice(0, SHOW_SUGGESTIONS);

  return (
    <>
      <ScreenHeader title={workoutName(plan.muscles)} fallbackHref="/" />

      <main className="screen">
        <section className={styles.summary}>
          <p className={styles.meta}>
            {exercises.length} exercise{exercises.length === 1 ? '' : 's'} · {setup.name}
          </p>
          <ul className={styles.coverage}>
            {coverage.map((c) => (
              <li key={c.group} className={styles.cov}>
                <span
                  className={styles.dot}
                  style={{ background: MUSCLE_GROUPS.find((g) => g.id === c.group)?.color }}
                />
                {groupName(c.group)}
                <span className={styles.covCount}>
                  {c.primaryCount > 0
                    ? `${c.primaryCount} direct`
                    : c.secondaryCount > 0
                      ? 'support only'
                      : 'none'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {impossible.length > 0 && (
          <div className={styles.warn} role="status">
            <Icon name="alert" size={18} />
            <span>
              Nothing in <strong>{setup.name}</strong> trains{' '}
              <strong>{impossible.map(groupName).join(', ')}</strong>. Add equipment to that setup
              to include {impossible.length === 1 ? 'it' : 'them'}.
            </span>
          </div>
        )}

        {thin.length > 0 && (
          <div className={styles.info} role="status">
            <Icon name="info" size={18} />
            <span>
              <strong>{thin.map((c) => groupName(c.group)).join(', ')}</strong>{' '}
              {thin.length === 1 ? 'is' : 'are'} only worked as a supporting muscle here. Add an
              exercise below to train {thin.length === 1 ? 'it' : 'them'} directly.
            </span>
          </div>
        )}

        <section>
          {exercises.length === 0 ? (
            <p className="muted">
              No exercises in this session yet. Add one from the list below, or regenerate.
            </p>
          ) : (
            <div className={styles.list}>
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onRemove={() => dispatch({ type: 'removeFromPlan', exerciseId: exercise.id })}
                />
              ))}
            </div>
          )}
        </section>

        {more.length > 0 && (
          <section className={styles.block}>
            <h2 className={styles.h2}>
              {more.length} more {more.length === 1 ? 'exercise' : 'exercises'} you can do
            </h2>
            <p className={styles.sub}>These match your muscles and equipment. Tap to add.</p>
            <div className={styles.list}>
              {shown.map((exercise) => (
                <SuggestionRow
                  key={exercise.id}
                  exercise={exercise}
                  onAdd={() => dispatch({ type: 'addToPlan', exerciseId: exercise.id })}
                />
              ))}
            </div>
            {more.length > SHOW_SUGGESTIONS && (
              <button type="button" className={styles.showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show all ${more.length}`}
              </button>
            )}
          </section>
        )}

        <Link href="/new/muscles" className={styles.restart}>
          Start a different workout
        </Link>
      </main>

      <div className={`actions ${styles.bar}`}>
        <button type="button" className="btn" onClick={regenerate} aria-label="Regenerate">
          <Icon name="refresh" />
          Regenerate
        </button>
      </div>
    </>
  );
}
