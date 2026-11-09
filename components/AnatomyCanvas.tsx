'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EcorcheCanvas from './EcorcheCanvas';
import type { EcorcheEngine, EcorcheViewer } from '@/engine/ecorche';
import type { MuscleGroupId } from '@/data/muscles';
import styles from './AnatomyCanvas.module.css';

interface Props {
  selected: readonly MuscleGroupId[];
  onToggle: (id: MuscleGroupId) => void;
  /** Animates the body around when it changes. */
  facing: 'front' | 'back';
  height?: number;
}

/**
 * The anatomical body for picking muscle groups. Tapping a muscle toggles its
 * group; every selected group is highlighted at once, which the engine's
 * single-group `selectGroup` cannot do, so we drive `setFocus` with the muscle
 * keys of all selected groups.
 */
export default function AnatomyCanvas({ selected, onToggle, facing, height = 330 }: Props) {
  const viewerRef = useRef<EcorcheViewer | null>(null);
  const keysByGroupRef = useRef<Map<string, string[]>>(new Map());
  const onToggleRef = useRef(onToggle);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  const applyFocus = useCallback((groups: readonly MuscleGroupId[]) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const keys = groups.flatMap((group) => keysByGroupRef.current.get(group) ?? []);
    viewer.setFocus(keys.length ? { primary: keys } : null);
  }, []);

  const handleReady = useCallback(
    (viewer: EcorcheViewer, engine: EcorcheEngine) => {
      viewerRef.current = viewer;

      const byGroup = new Map<string, string[]>();
      for (const muscle of engine.MUSCLES) {
        if (!muscle.group) continue;
        const list = byGroup.get(muscle.group);
        if (list) list.push(muscle.key);
        else byGroup.set(muscle.group, [muscle.key]);
      }
      keysByGroupRef.current = byGroup;

      viewer.on('select', (muscle) => {
        if (muscle?.group) onToggleRef.current(muscle.group as MuscleGroupId);
      });
      viewer.on('hover', (muscle) => {
        setHovered(muscle ? [muscle.name, muscle.part].filter(Boolean).join(' · ') : null);
      });

      viewer.view(facing, true);
      applyFocus(selected);
    },
    // Only the first mount matters; later changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyFocus],
  );

  useEffect(() => {
    applyFocus(selected);
  }, [selected, applyFocus]);

  useEffect(() => {
    viewerRef.current?.view(facing);
  }, [facing]);

  return (
    <EcorcheCanvas
      onReady={handleReady}
      label="Interactive 3D body. Drag to rotate, tap a muscle to select its group."
      loadingLabel="Building the muscle model…"
      height={height}
      fallback={null}
    >
      {hovered && <span className={styles.tip}>{hovered}</span>}
    </EcorcheCanvas>
  );
}
