'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ScreenHeader from './ScreenHeader';
import EquipmentGrid from './EquipmentGrid';
import EquipmentModelDialog from './EquipmentModelDialog';
import Icon from './Icon';
import { newSetupId, useStore, type EquipmentSetup } from '@/lib/store';
import { availableExercises } from '@/lib/availability';
import type { EquipmentCode } from '@/data/equipment';
import styles from './EditSetupForm.module.css';

/**
 * Waits for the store to hydrate, then mounts the fields with the setup's
 * values as their initial state. Keying on the id means switching setups
 * remounts the fields rather than syncing them in an effect.
 */
export default function EditSetupForm({ id }: { id: string }) {
  const router = useRouter();
  const { state, ready } = useStore();

  const isNew = id === 'new';
  const existing = state.setups.find((s) => s.id === id);

  if (!ready) {
    return <ScreenHeader title={isNew ? 'New setup' : 'Equipment setup'} fallbackHref="/equipment" />;
  }

  if (!isNew && !existing) {
    return (
      <>
        <ScreenHeader title="Equipment setup" fallbackHref="/equipment" />
        <main className="screen">
          <p className="muted">That setup no longer exists.</p>
          <button type="button" className="btn" onClick={() => router.replace('/equipment')}>
            Back to setups
          </button>
        </main>
      </>
    );
  }

  const setup: EquipmentSetup = existing ?? { id: 'new', name: 'New setup', items: [] };
  return <Fields key={setup.id} setup={setup} isNew={isNew} />;
}

function Fields({ setup, isNew }: { setup: EquipmentSetup; isNew: boolean }) {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [name, setName] = useState(setup.name);
  const [modelCode, setModelCode] = useState<EquipmentCode | null>(null);
  const [items, setItems] = useState<EquipmentCode[]>([...setup.items]);

  const toggle = (code: EquipmentCode) =>
    setItems((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const toggleCategory = (codes: EquipmentCode[], on: boolean) =>
    setItems((prev) =>
      on ? [...new Set([...prev, ...codes])] : prev.filter((c) => !codes.includes(c)),
    );

  const save = () => {
    dispatch({
      type: 'saveSetup',
      setup: {
        id: isNew ? newSetupId() : setup.id,
        name: name.trim() || 'Untitled setup',
        items,
      },
    });
    router.push('/equipment');
  };

  const remove = () => {
    dispatch({ type: 'deleteSetup', id: setup.id });
    router.push('/equipment');
  };

  const canDelete = !isNew && state.setups.length > 1;
  const count = availableExercises(new Set(items)).length;

  return (
    <>
      <ScreenHeader
        title={isNew ? 'New setup' : 'Equipment setup'}
        fallbackHref="/equipment"
        trailing={
          canDelete ? (
            <button
              type="button"
              className={styles.trash}
              aria-label="Delete setup"
              onClick={remove}
            >
              <Icon name="trash" />
            </button>
          ) : undefined
        }
      />

      <main className="screen">
        <div className={styles.field}>
          <label htmlFor="setup-name" className={styles.label}>
            Setup name
          </label>
          <input
            id="setup-name"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Home, Office gym, Hotel…"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>What you have</span>
          <p className={styles.counter}>
            {items.length} selected · {count} exercises available
          </p>
          <EquipmentGrid
            owned={items}
            onToggle={toggle}
            onToggleCategory={toggleCategory}
            onShowModel={setModelCode}
          />
        </div>
      </main>

      <div className="actions">
        <button type="button" className="btn btnPrimary" onClick={save}>
          Save setup
        </button>
      </div>

      <EquipmentModelDialog code={modelCode} onClose={() => setModelCode(null)} />
    </>
  );
}
