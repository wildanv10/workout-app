'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';
import { getExercise } from '@/data/exercises';
import { MUSCLE_GROUPS } from '@/data/muscles';
import styles from './programs.module.css';

const groupName = (id: string) => MUSCLE_GROUPS.find((g) => g.id === id)?.name ?? id;

const savedOn = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export default function ProgramsPage() {
  const router = useRouter();
  const { state, dispatch, ready } = useStore();

  const open = (id: string) => {
    dispatch({ type: 'openProgram', id });
    router.push('/plan');
  };

  return (
    <>
      <main className="screen">
        <header className={styles.head}>
          <h1 className={styles.title}>Programs</h1>
          <p className="muted">Sessions you saved, with the exercises they hold.</p>
        </header>

        {!ready ? null : state.programs.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="bookmark" size={24} />
            <p>No saved programs yet.</p>
            <p className="muted">
              Generate a workout and tap the bookmark to keep it here.
            </p>
            <Link href="/new/muscles" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
              <Icon name="sparkles" />
              New workout
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {state.programs.map((program) => {
              const exercises = program.exerciseIds
                .map(getExercise)
                .filter((e): e is NonNullable<typeof e> => !!e);
              const setup = state.setups.find((s) => s.id === program.setupId);
              return (
                <article key={program.id} className={styles.card}>
                  <button type="button" className={styles.open} onClick={() => open(program.id)}>
                    <span className={styles.cardMain}>
                      <span className={styles.name}>{program.name}</span>
                      <span className="muted">
                        {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
                        {setup ? ` · ${setup.name}` : ''}
                        {program.savedAt ? ` · saved ${savedOn(program.savedAt)}` : ''}
                      </span>
                      <span className={styles.groups}>
                        {program.muscles.map((id) => (
                          <span key={id} className={styles.chip}>
                            <span
                              className={styles.dot}
                              style={{ background: MUSCLE_GROUPS.find((g) => g.id === id)?.color }}
                            />
                            {groupName(id)}
                          </span>
                        ))}
                      </span>
                      {exercises.length > 0 && (
                        <span className={styles.exercises}>
                          {exercises
                            .slice(0, 4)
                            .map((e) => e.name)
                            .join(' · ')}
                          {exercises.length > 4 && ` · +${exercises.length - 4} more`}
                        </span>
                      )}
                    </span>
                    <Icon name="next" className={styles.chev} />
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Delete ${program.name}`}
                    onClick={() => dispatch({ type: 'deleteProgram', id: program.id })}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav current="/programs" />
    </>
  );
}
