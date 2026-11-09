'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AnatomyCanvas from '@/components/AnatomyCanvas';
import MuscleChips from '@/components/MuscleChips';
import ScreenHeader from '@/components/ScreenHeader';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';
import styles from './muscles.module.css';

export default function MusclesPage() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const selected = state.selectedMuscles;

  return (
    <>
      <ScreenHeader title="Target muscles" step="Step 1 of 2" />

      <div className={styles.stage}>
        <AnatomyCanvas
          selected={selected}
          onToggle={(id) => dispatch({ type: 'toggleMuscle', id })}
          facing={facing}
        />
        <div className={styles.hint}>
          <Icon name="rotate" size={16} />
          Drag to rotate · tap a muscle to select
        </div>
        <div className={styles.facing} role="group" aria-label="Viewpoint">
          <button
            type="button"
            aria-pressed={facing === 'front'}
            onClick={() => setFacing('front')}
          >
            Front
          </button>
          <button type="button" aria-pressed={facing === 'back'} onClick={() => setFacing('back')}>
            Back
          </button>
        </div>
      </div>

      <main className={`screen ${styles.list}`}>
        <MuscleChips selected={selected} onToggle={(id) => dispatch({ type: 'toggleMuscle', id })} />
      </main>

      <div className="actions">
        <button
          type="button"
          className="btn btnPrimary"
          disabled={selected.length === 0}
          onClick={() => router.push('/new/equipment')}
        >
          {selected.length === 0
            ? 'Select at least one muscle'
            : `Continue with ${selected.length} muscle${selected.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </>
  );
}
