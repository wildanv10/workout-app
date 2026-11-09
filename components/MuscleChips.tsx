'use client';

import type { BodyRegion, MuscleGroupId } from '@/data/muscles';
import { MUSCLE_GROUPS, REGION_LABELS } from '@/data/muscles';
import styles from './MuscleChips.module.css';

const REGIONS: BodyRegion[] = ['upper', 'core', 'lower'];

/** All 16 muscle groups as toggles, grouped by body region. */
export default function MuscleChips({
  selected,
  onToggle,
}: {
  selected: readonly MuscleGroupId[];
  onToggle: (id: MuscleGroupId) => void;
}) {
  return (
    <div className={styles.wrap}>
      {REGIONS.map((region) => {
        const groups = MUSCLE_GROUPS.filter((g) => g.region === region);
        if (!groups.length) return null;
        return (
          <div key={region} className={styles.group}>
            <span className={styles.label} id={`region-${region}`}>
              {REGION_LABELS[region]}
            </span>
            <div className={styles.chips} role="group" aria-labelledby={`region-${region}`}>
              {groups.map((group) => {
                const on = selected.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={styles.chip}
                    aria-pressed={on}
                    onClick={() => onToggle(group.id)}
                  >
                    <span className={styles.dot} style={{ background: group.color }} />
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
