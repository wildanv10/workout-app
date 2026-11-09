'use client';

import Link from 'next/link';
import type { Exercise } from '@/data/exercises';
import { LEVEL_LABELS } from '@/data/exercises';
import { MUSCLE_GROUPS } from '@/data/muscles';
import { equipmentName } from '@/data/equipment';
import { primaryGroups } from '@/lib/generate';
import { requiredEquipment } from '@/lib/availability';
import Icon from './Icon';
import styles from './ExerciseCard.module.css';

const colorOf = (id: string) => MUSCLE_GROUPS.find((g) => g.id === id)?.color ?? 'var(--line)';
const nameOf = (id: string) => MUSCLE_GROUPS.find((g) => g.id === id)?.name ?? id;

/** One line of description: the muscles it trains and the gear it needs. */
export function exerciseMeta(exercise: Exercise): string {
  const muscles = primaryGroups(exercise).slice(0, 2).map(nameOf).join(', ');
  const gear = requiredEquipment(exercise).map(equipmentName);
  return `${muscles} · ${gear.length ? gear.slice(0, 2).join(', ') : 'No equipment'}`;
}

function LevelPips({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className={styles.level} title={LEVEL_LABELS[level]}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= level ? 'on' : undefined} />
      ))}
      <span className={styles.levelText}>{LEVEL_LABELS[level]}</span>
    </span>
  );
}

/** A row in the generated plan, with a remove control. */
export default function ExerciseCard({
  exercise,
  onRemove,
}: {
  exercise: Exercise;
  onRemove?: () => void;
}) {
  return (
    <div className={styles.card}>
      <Link href={`/exercise/${exercise.id}`} className={styles.link}>
        <span className={styles.dots} aria-hidden="true">
          {primaryGroups(exercise)
            .slice(0, 3)
            .map((g) => (
              <span key={g} className={styles.dot} style={{ background: colorOf(g) }} />
            ))}
        </span>
        <span className={styles.main}>
          <span className={styles.name}>{exercise.name}</span>
          <span className={styles.meta}>{exerciseMeta(exercise)}</span>
          <span className={styles.badges}>
            <LevelPips level={exercise.level} />
          </span>
        </span>
      </Link>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove ${exercise.name}`}
          onClick={onRemove}
        >
          <Icon name="x" size={18} />
        </button>
      )}
    </div>
  );
}

/** A suggestion row, with an add control. */
export function SuggestionRow({
  exercise,
  onAdd,
}: {
  exercise: Exercise;
  onAdd: () => void;
}) {
  return (
    <div className={styles.card}>
      <Link href={`/exercise/${exercise.id}`} className={styles.link}>
        <span className={styles.main}>
          <span className={styles.name}>{exercise.name}</span>
          <span className={styles.meta}>{exerciseMeta(exercise)}</span>
        </span>
      </Link>
      <button type="button" className={styles.add} aria-label={`Add ${exercise.name}`} onClick={onAdd}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
