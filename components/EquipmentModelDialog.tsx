'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EcorcheCanvas from './EcorcheCanvas';
import Icon from './Icon';
import type { EcorcheViewer } from '@/engine/ecorche';
import { getEquipment, type EquipmentCode } from '@/data/equipment';
import { EQUIPMENT_CATEGORIES } from '@/data/equipment';
import { EXERCISES } from '@/data/exercises';
import styles from './EquipmentModelDialog.module.css';

/** Exercises that cannot be done without this piece of equipment. */
const usedBy = (code: EquipmentCode) =>
  EXERCISES.filter((e) => e.equipment.some((q) => q.code === code && !q.optional));

/**
 * A modal showing one piece of equipment as a 3D model, opened from the info
 * button beside its name in the picker. Native <dialog> gives us Escape, focus
 * containment and a backdrop for free.
 */
export default function EquipmentModelDialog({
  code,
  onClose,
}: {
  code: EquipmentCode | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerRef = useRef<EcorcheViewer | null>(null);
  const [spinning, setSpinning] = useState(true);
  const [hasModel, setHasModel] = useState(true);

  const item = code ? getEquipment(code) : undefined;
  const category = EQUIPMENT_CATEGORIES.find((c) => c.id === item?.category);
  const exercises = code ? usedBy(code) : [];

  // Open and close the native dialog in step with the `code` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (code && !dialog.open) {
      setSpinning(true);
      setHasModel(true);
      dialog.showModal();
    } else if (!code && dialog.open) {
      dialog.close();
    }
  }, [code]);

  const handleReady = useCallback(
    (viewer: EcorcheViewer) => {
      viewerRef.current = viewer;
      if (!item) return;
      // The engine matches by display name, which our data shares with it.
      const ok = viewer.setEquipment(item.name, { spin: true });
      setHasModel(ok);
      if (ok) setSpinning(viewer.equipmentSpin());
    },
    [item],
  );

  const toggleSpin = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    setSpinning(viewer.equipmentSpin(!viewer.equipmentSpin()));
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} aria-label="Equipment model">
      {item && (
        <div className={styles.inner}>
          <header className={styles.head}>
            <div className={styles.titles}>
              <span className={styles.category}>{category?.name}</span>
              <h2 className={styles.title}>{item.name}</h2>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </header>

          {hasModel ? (
            <EcorcheCanvas
              key={item.code}
              onReady={handleReady}
              label={`3D model of ${item.name}`}
              loadingLabel="Building the 3D model…"
              height={260}
              fallback={<SvgFallback name={item.name} svg={item.svg} alt={item.alt} />}
            />
          ) : (
            <SvgFallback name={item.name} svg={item.svg} alt={item.alt} note />
          )}

          {item.alt && <p className={styles.caption}>{item.alt}</p>}

          <div className={styles.controls}>
            {hasModel && (
              <button
                type="button"
                className={styles.spin}
                onClick={toggleSpin}
                aria-pressed={spinning}
              >
                <Icon name="spin" size={16} />
                {spinning ? 'Stop rotation' : 'Auto-rotate'}
              </button>
            )}
          </div>

          {exercises.length > 0 && (
            <section className={styles.uses}>
              <h3 className={styles.usesHead}>
                Needed for {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
              </h3>
              <p className={styles.usesList}>
                {exercises
                  .slice(0, 8)
                  .map((e) => e.name)
                  .join(' · ')}
                {exercises.length > 8 && ` · +${exercises.length - 8} more`}
              </p>
            </section>
          )}
        </div>
      )}
    </dialog>
  );
}

function SvgFallback({
  name,
  svg,
  alt,
  note,
}: {
  name: string;
  svg?: string;
  alt?: string;
  note?: boolean;
}) {
  return (
    <div className={styles.fallback}>
      {svg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/equipment/${svg}`} alt={alt ?? name} className={styles.fallbackSvg} />
      ) : (
        <span>{name}</span>
      )}
      {note && <span className={styles.note}>No 3D model for this one yet.</span>}
    </div>
  );
}
