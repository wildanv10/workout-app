import { notFound } from 'next/navigation';
import ScreenHeader from '@/components/ScreenHeader';
import ExerciseVisual from '@/components/ExerciseVisual';
import {
  CATEGORY_LABELS,
  EXERCISES,
  LEVEL_LABELS,
  SECTIONS,
  getExercise,
} from '@/data/exercises';
import { getMuscle, getMuscleGroup } from '@/data/muscles';
import { equipmentName } from '@/data/equipment';
import { optionalEquipment, requiredEquipment } from '@/lib/availability';
import styles from './exercise.module.css';

export function generateStaticParams() {
  return EXERCISES.map((exercise) => ({ id: exercise.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = getExercise(id);
  return { title: exercise ? `${exercise.name} · Workout` : 'Workout' };
}

function MuscleList({ ids, label }: { ids: string[]; label: string }) {
  if (!ids.length) return null;
  return (
    <section className={styles.block}>
      <h3 className={styles.h3}>{label}</h3>
      <ul className={styles.muscles}>
        {ids.map((id) => {
          const muscle = getMuscle(id);
          if (!muscle) return null;
          const group = getMuscleGroup(muscle.group);
          return (
            <li key={id}>
              <span className={styles.dot} style={{ background: group?.color }} />
              <span className={styles.muscleName}>{muscle.name}</span>
              <span className={styles.groupName}>{group?.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();

  const section = SECTIONS.find((s) => s.id === exercise.section);
  const required = requiredEquipment(exercise);
  const optional = optionalEquipment(exercise);

  return (
    <>
      <ScreenHeader title={section?.name ?? 'Exercise'} fallbackHref="/plan" />

      <main className="screen">
        <ExerciseVisual exercise={exercise} />

        <header className={styles.head}>
          <h1 className={styles.title}>{exercise.name}</h1>
          <div className={styles.tags}>
            {exercise.categories.map((category) => (
              <span key={category} className="tag">
                {CATEGORY_LABELS[category]}
              </span>
            ))}
            <span className="tag">{LEVEL_LABELS[exercise.level]}</span>
          </div>
        </header>

        <section className={styles.block}>
          <h3 className={styles.h3}>Equipment</h3>
          {required.length === 0 && optional.length === 0 ? (
            <p className="muted">No equipment needed.</p>
          ) : (
            <ul className={styles.equipment}>
              {required.map((code) => (
                <li key={code}>{equipmentName(code)}</li>
              ))}
              {optional.map((code) => (
                <li key={code}>
                  {equipmentName(code)} <span className="muted">(optional)</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.block}>
          <h3 className={styles.h3}>How to do it</h3>
          <ol className={styles.steps}>
            {exercise.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <MuscleList ids={exercise.primary} label="Primary muscles" />
        <MuscleList ids={exercise.secondary} label="Supporting muscles" />

        <p className={styles.disclaimer}>
          General guidance only — it is not a substitute for a coach.
        </p>
      </main>
    </>
  );
}
