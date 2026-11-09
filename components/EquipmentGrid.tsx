'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { EquipmentCode } from '@/data/equipment';
import { EQUIPMENT, EQUIPMENT_CATEGORIES, getEquipment } from '@/data/equipment';
import Icon from './Icon';
import styles from './EquipmentGrid.module.css';

const byCode = new Map(EQUIPMENT.map((e) => [e.code, e]));

/**
 * The "what you have" picker: 41 items in collapsible categories, so the list
 * stays scannable on a phone. Bodyweight needs no entry - exercises with no
 * equipment are always available. Each row has an info button that opens the
 * item's 3D model.
 */
export default function EquipmentGrid({
  owned,
  onToggle,
  onToggleCategory,
  onShowModel,
}: {
  owned: readonly EquipmentCode[];
  onToggle: (code: EquipmentCode) => void;
  onToggleCategory: (codes: EquipmentCode[], on: boolean) => void;
  onShowModel?: (code: EquipmentCode) => void;
}) {
  const ownedSet = new Set(owned);
  const [open, setOpen] = useState<string[]>([EQUIPMENT_CATEGORIES[0].id]);

  return (
    <div className={styles.wrap}>
      {EQUIPMENT_CATEGORIES.map((category) => {
        const isOpen = open.includes(category.id);
        const picked = category.codes.filter((c) => ownedSet.has(c)).length;
        const allOn = picked === category.codes.length;

        return (
          <section key={category.id} className={styles.category}>
            <button
              type="button"
              className={styles.head}
              aria-expanded={isOpen}
              onClick={() =>
                setOpen((prev) =>
                  prev.includes(category.id)
                    ? prev.filter((id) => id !== category.id)
                    : [...prev, category.id],
                )
              }
            >
              <Icon
                name="next"
                size={18}
                className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`}
              />
              <span className={styles.headName}>{category.name}</span>
              <span className={styles.count}>
                {picked}/{category.codes.length}
              </span>
            </button>

            {isOpen && (
              <div className={styles.body}>
                <button
                  type="button"
                  className={styles.all}
                  onClick={() => onToggleCategory([...category.codes], !allOn)}
                >
                  {allOn ? 'Clear all' : 'Select all'}
                </button>
                {category.codes.map((code) => {
                  const item = byCode.get(code);
                  if (!item) return null;
                  const on = ownedSet.has(code);
                  const svg = getEquipment(code)?.svg;
                  return (
                    <div key={code} className={styles.row}>
                      <button
                        type="button"
                        className={styles.item}
                        aria-pressed={on}
                        onClick={() => onToggle(code)}
                      >
                        <span className={styles.box}>
                          {on && <Icon name="check" size={12} strokeWidth={3} />}
                        </span>
                        {svg && (
                          <Image
                            src={`/equipment/${svg}`}
                            alt=""
                            className={styles.thumb}
                            width={32}
                            height={32}
                            unoptimized
                          />
                        )}
                        <span className={styles.itemName}>{item.name}</span>
                      </button>
                      {onShowModel && (
                        <button
                          type="button"
                          className={styles.info}
                          onClick={() => onShowModel(code)}
                          aria-label={`See ${item.name} in 3D`}
                        >
                          <Icon name="info" size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
