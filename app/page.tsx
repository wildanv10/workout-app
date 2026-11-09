'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { EXERCISES } from '@/data/exercises';
import { MUSCLE_GROUPS } from '@/data/muscles';
import { availableExercises } from '@/lib/availability';
import { workoutName } from '@/lib/generate';
import Icon from '@/components/Icon';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

export default function HomePage() {
  const { state, activeSetup, ready } = useStore();
  const available = availableExercises(new Set(activeSetup.items)).length;
  const plan = state.plan;

  return (
    <>
      <main className="screen">
      <header className={styles.hero}>
        <span className="eyebrow">Workout</span>
        <h1 className={styles.title}>Choose what to train today.</h1>
        <p className="muted">
          Pick your muscles and the equipment you have. We only suggest exercises you can
          actually do.
        </p>
      </header>

      <Link href="/new/muscles" className={`btn btnPrimary ${styles.cta}`}>
        <Icon name="sparkles" />
        New workout
      </Link>

      {plan && plan.exerciseIds.length > 0 && (
        <Link href="/plan" className={styles.resume}>
          <span className={styles.resumeMain}>
            <span className={styles.resumeName}>{workoutName(plan.muscles)}</span>
            <span className="muted">
              {plan.exerciseIds.length} exercise{plan.exerciseIds.length === 1 ? '' : 's'} · last
              generated
            </span>
          </span>
          <Icon name="next" />
        </Link>
      )}

      {state.programs.length > 0 && (
        <section className={styles.block}>
          <div className={styles.blockHead}>
            <h2 className={styles.h2}>Saved programs</h2>
            <Link href="/programs" className={styles.viewAll}>
              View all
            </Link>
          </div>
          {state.programs.slice(0, 2).map((program) => (
            <Link key={program.id} href="/programs" className={styles.resume}>
              <Icon name="bookmark" className={styles.setupIcon} />
              <span className={styles.resumeMain}>
                <span className={styles.resumeName}>{program.name}</span>
                <span className="muted">
                  {program.exerciseIds.length}{' '}
                  {program.exerciseIds.length === 1 ? 'exercise' : 'exercises'}
                </span>
              </span>
              <Icon name="next" />
            </Link>
          ))}
        </section>
      )}

      <section className={styles.block}>
        <h2 className={styles.h2}>Your setup</h2>
        <Link href="/equipment" className={styles.setup}>
          <Icon name="dumbbell" className={styles.setupIcon} />
          <span className={styles.resumeMain}>
            <span className={styles.resumeName}>{activeSetup.name}</span>
            <span className="muted">
              {activeSetup.items.length} item{activeSetup.items.length === 1 ? '' : 's'} ·{' '}
              {ready ? `${available} exercises available` : '…'}
            </span>
          </span>
          <Icon name="next" />
        </Link>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>What is in here</h2>
        <dl className={styles.stats}>
          <div>
            <dt className="muted">Exercises</dt>
            <dd>{EXERCISES.length}</dd>
          </div>
          <div>
            <dt className="muted">Muscle groups</dt>
            <dd>{MUSCLE_GROUPS.length}</dd>
          </div>
        </dl>
      </section>
      </main>
      <BottomNav current="/" />
    </>
  );
}
