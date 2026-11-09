import type { EquipmentCode } from '@/data/equipment';
import type { Exercise } from '@/data/exercises';
import { EXERCISES } from '@/data/exercises';

/**
 * An exercise is available when every piece of equipment it *requires* is
 * owned. Equipment marked optional can be substituted or skipped, so it never
 * gates availability - it is only shown as a suggestion on the detail screen.
 *
 * Exercises with no equipment at all (bodyweight) are always available.
 */
export function isAvailable(exercise: Exercise, owned: ReadonlySet<EquipmentCode>): boolean {
  for (const item of exercise.equipment) {
    if (!item.optional && !owned.has(item.code)) return false;
  }
  return true;
}

/** The equipment an exercise cannot be performed without. */
export function requiredEquipment(exercise: Exercise): EquipmentCode[] {
  return exercise.equipment.filter((e) => !e.optional).map((e) => e.code);
}

/** The equipment that is nice to have but can be skipped. */
export function optionalEquipment(exercise: Exercise): EquipmentCode[] {
  return exercise.equipment.filter((e) => e.optional).map((e) => e.code);
}

/** Which required items are missing from a setup - used to explain a gap. */
export function missingEquipment(
  exercise: Exercise,
  owned: ReadonlySet<EquipmentCode>,
): EquipmentCode[] {
  return requiredEquipment(exercise).filter((code) => !owned.has(code));
}

export function availableExercises(owned: ReadonlySet<EquipmentCode>): Exercise[] {
  return EXERCISES.filter((e) => isAvailable(e, owned));
}

export const toOwnedSet = (codes: readonly EquipmentCode[]): ReadonlySet<EquipmentCode> =>
  new Set(codes);
