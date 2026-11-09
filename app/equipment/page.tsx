'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { availableExercises } from '@/lib/availability';
import Icon from '@/components/Icon';
import BottomNav from '@/components/BottomNav';
import styles from './equipment.module.css';

export default function EquipmentPage() {
  const { state, dispatch, ready } = useStore();

  return (
    <>
      <main className="screen">
      <header className={styles.head}>
        <h1 className={styles.title}>Equipment</h1>
        <p className="muted">Save a setup for each place you train.</p>
      </header>

      <div className={styles.list}>
        {state.setups.map((setup) => {
          const active = setup.id === state.activeSetupId;
          const count = availableExercises(new Set(setup.items)).length;
          return (
            <div key={setup.id} className={styles.row}>
              <Link href={`/equipment/${setup.id}`} className={styles.link}>
                <Icon name="dumbbell" className={styles.icon} />
                <span className={styles.main}>
                  <span className={styles.name}>
                    {setup.name}
                    {active && <span className={styles.badge}>In use</span>}
                  </span>
                  <span className="muted">
                    {setup.items.length} item{setup.items.length === 1 ? '' : 's'} ·{' '}
                    {ready ? `${count} exercises` : '…'}
                  </span>
                </span>
                <Icon name="next" className={styles.chev} />
              </Link>
              {!active && (
                <button
                  type="button"
                  className={styles.use}
                  onClick={() => dispatch({ type: 'setActiveSetup', id: setup.id })}
                >
                  Use
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Link href="/equipment/new" className="btn" style={{ textDecoration: 'none' }}>
        <Icon name="plus" />
        New setup
      </Link>

      <p className={styles.note}>
        Bodyweight exercises need no equipment, so they are always available.
      </p>
      </main>
      <BottomNav current="/equipment" />
    </>
  );
}
